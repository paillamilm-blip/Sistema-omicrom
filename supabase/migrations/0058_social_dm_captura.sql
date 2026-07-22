-- =====================================================================
-- 0058_social_dm_captura.sql
-- Captura fiel de la capa SOCIAL / MENSAJES DIRECTOS / AUDITORÍA DE RANGO
-- que vivía SOLO en la base de datos real ("configuración previa") y no
-- estaba versionada. Extraído de producción vía pg_get_functiondef +
-- catálogo (ver supabase/EXTRAER_PROD.md, Opción A).
--
-- Incluye:
--   • Tablas:   connections, direct_messages, rank_audits
--   • Funciones (13): are_connected, connection_status, get_direct_thread,
--     get_leaderboard, get_public_credential, mark_dm_read, my_connections,
--     my_dm_conversations, my_pending_requests, resolve_audit,
--     respond_connection_request, send_connection_request, send_direct_message
--   • RLS + políticas de las 3 tablas
--
-- Idempotente. En producción las tablas ya existen (create if not exists
-- es no-op); en un entorno limpio/staging las crea desde cero.
--
-- 🔒 ENDURECIDO: resolve_audit() es un flujo de AUTO-REDENCIÓN (no de árbitro).
--    Ahora exige (a) que el usuario resuelva su propia auditoría PENDING y
--    (b) para reactivar el nodo, un examen APROBADO real verificado en el
--    servidor (skill_test_attempts.result='PASS' posterior al disparo).
--    Antes confiaba en el flag p_passed del cliente → se podía reactivar el
--    nodo llamando el RPC directo sin aprobar el reto. Cerrado.
-- =====================================================================

-- ── 1) Tablas ────────────────────────────────────────────────────────

-- Conexiones entre usuarios (solicitudes de red social)
create table if not exists public.connections (
  id            uuid primary key default gen_random_uuid(),
  requester_id  uuid not null references public.profiles(id) on delete cascade,
  addressee_id  uuid not null references public.profiles(id) on delete cascade,
  status        text not null default 'pending'
                  check (status in ('pending','accepted','rejected')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint connections_distinct check (requester_id <> addressee_id)
);
create index if not exists idx_conn_addressee on public.connections (addressee_id, status);
create index if not exists idx_conn_requester on public.connections (requester_id, status);
-- Evita pares duplicados sin importar quién inició (par no ordenado)
create unique index if not exists uq_connection_pair
  on public.connections (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- Mensajes directos (chat 1:1 fuera de las salas de contrato)
create table if not exists public.direct_messages (
  id            uuid primary key default gen_random_uuid(),
  sender_id     uuid not null references public.profiles(id) on delete cascade,
  recipient_id  uuid not null references public.profiles(id) on delete cascade,
  content       text not null check (char_length(content) >= 1 and char_length(content) <= 4000),
  is_read       boolean not null default false,
  created_at    timestamptz not null default now(),
  constraint dm_distinct check (sender_id <> recipient_id)
);
create index if not exists idx_dm_recipient on public.direct_messages (recipient_id, is_read);
create index if not exists idx_dm_pair      on public.direct_messages (sender_id, recipient_id, created_at);

-- Auditorías de rango (revisión de nodo)
create table if not exists public.rank_audits (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references public.profiles(id) on delete cascade,
  reason                 text,
  reputation_at_trigger  numeric,
  status                 text default 'PENDING',
  triggered_at           timestamptz default now()
);

-- ── 2) Helper are_connected() (usado por policy dm_insert y send_direct_message)
-- Debe crearse ANTES de las políticas de direct_messages que lo referencian.
create or replace function public.are_connected(a uuid, b uuid)
 returns boolean
 language sql
 stable security definer
 set search_path to 'public'
as $function$
  select exists(
    select 1 from public.connections c
    where c.status = 'accepted'
      and ((c.requester_id = a and c.addressee_id = b)
        or (c.requester_id = b and c.addressee_id = a))
  );
$function$;

-- ── 3) RLS + políticas ────────────────────────────────────────────────
alter table public.connections     enable row level security;
alter table public.direct_messages enable row level security;
alter table public.rank_audits     enable row level security;

-- connections
drop policy if exists conn_select on public.connections;
create policy conn_select on public.connections for select to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
drop policy if exists conn_insert on public.connections;
create policy conn_insert on public.connections for insert to authenticated
  with check (auth.uid() = requester_id);
drop policy if exists conn_update on public.connections;
create policy conn_update on public.connections for update to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- direct_messages
drop policy if exists dm_select on public.direct_messages;
create policy dm_select on public.direct_messages for select to authenticated
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
drop policy if exists dm_insert on public.direct_messages;
create policy dm_insert on public.direct_messages for insert to authenticated
  with check (auth.uid() = sender_id and public.are_connected(auth.uid(), recipient_id));
drop policy if exists dm_update on public.direct_messages;
create policy dm_update on public.direct_messages for update to authenticated
  using (auth.uid() = recipient_id);

-- rank_audits
drop policy if exists s_audit on public.rank_audits;
create policy s_audit on public.rank_audits for select to authenticated
  using (auth.uid() = user_id);

-- ── 4) Funciones (RPC) ────────────────────────────────────────────────
-- Reproducidas fielmente desde producción.

create or replace function public.connection_status(p_other uuid)
 returns table(status text, connection_id uuid, direction text)
 language sql security definer set search_path to 'public'
as $function$
  select
    c.status::text,
    c.id,
    (case when c.requester_id = auth.uid() then 'sent' else 'received' end)::text
  from public.connections c
  where (c.requester_id = auth.uid() and c.addressee_id = p_other)
     or (c.requester_id = p_other and c.addressee_id = auth.uid())
  limit 1;
$function$;

create or replace function public.get_direct_thread(p_other uuid)
 returns table(id uuid, sender_id uuid, recipient_id uuid, content text, created_at timestamptz)
 language sql security definer set search_path to 'public'
as $function$
  select id, sender_id, recipient_id, content, created_at
  from public.direct_messages
  where (sender_id = auth.uid() and recipient_id = p_other)
     or (sender_id = p_other and recipient_id = auth.uid())
  order by created_at asc limit 500;
$function$;

create or replace function public.get_leaderboard(p_limit integer default 10)
 returns table(rank integer, user_id uuid, username text, full_name text, avatar_url text,
               node_type text, reputation_score numeric, pe_points integer, total_contracts_completed integer)
 language sql security definer set search_path to 'public'
as $function$
  select
    (row_number() over (order by p.reputation_score desc nulls last, p.pe_points desc nulls last))::int as rank,
    p.id, p.username::text, p.full_name::text, p.avatar_url::text,
    p.node_type::text, p.reputation_score::numeric, p.pe_points::int, p.total_contracts_completed::int
  from public.profiles p
  order by p.reputation_score desc nulls last, p.pe_points desc nulls last
  limit greatest(1, least(coalesce(p_limit, 10), 100));
$function$;

create or replace function public.get_public_credential(p_username text)
 returns table(id uuid, username text, full_name text, avatar_url text, bio text, location text,
               node_type text, node_level integer, is_verified_professional boolean,
               reputation_score numeric, execution_score numeric, quality_score numeric,
               transcendence_score numeric, foundation_score numeric,
               pe_points integer, total_contracts_completed integer)
 language sql security definer set search_path to 'public'
as $function$
  select
    p.id, p.username::text, p.full_name::text, p.avatar_url::text, p.bio::text, p.location::text,
    p.node_type::text, p.node_level::int, p.is_verified_professional::boolean,
    p.reputation_score::numeric, p.execution_score::numeric, p.quality_score::numeric,
    p.transcendence_score::numeric, p.foundation_score::numeric,
    p.pe_points::int, p.total_contracts_completed::int
  from public.profiles p
  where lower(p.username) = lower(p_username)
  limit 1;
$function$;

create or replace function public.mark_dm_read(p_other uuid)
 returns void
 language sql security definer set search_path to 'public'
as $function$
  update public.direct_messages set is_read = true
  where recipient_id = auth.uid() and sender_id = p_other and is_read = false;
$function$;

create or replace function public.my_connections()
 returns table(connection_id uuid, user_id uuid, username text, full_name text,
               avatar_url text, node_type text, reputation_score numeric)
 language sql security definer set search_path to 'public'
as $function$
  select
    c.id,
    (case when c.requester_id = auth.uid() then ad.id        else rq.id        end),
    (case when c.requester_id = auth.uid() then ad.username   else rq.username   end)::text,
    (case when c.requester_id = auth.uid() then ad.full_name  else rq.full_name  end)::text,
    (case when c.requester_id = auth.uid() then ad.avatar_url else rq.avatar_url end)::text,
    (case when c.requester_id = auth.uid() then ad.node_type  else rq.node_type  end)::text,
    (case when c.requester_id = auth.uid() then ad.reputation_score else rq.reputation_score end)::numeric
  from public.connections c
  join public.profiles rq on rq.id = c.requester_id
  join public.profiles ad on ad.id = c.addressee_id
  where c.status = 'accepted'
    and (c.requester_id = auth.uid() or c.addressee_id = auth.uid())
  order by c.updated_at desc;
$function$;

create or replace function public.my_dm_conversations()
 returns table(user_id uuid, username text, full_name text, avatar_url text,
               last_message text, last_at timestamptz, unread integer)
 language sql security definer set search_path to 'public'
as $function$
  with threads as (
    select
      case when dm.sender_id = auth.uid() then dm.recipient_id else dm.sender_id end as other_id,
      dm.content, dm.created_at, dm.is_read, dm.recipient_id
    from public.direct_messages dm
    where dm.sender_id = auth.uid() or dm.recipient_id = auth.uid()
  ),
  ranked as (
    select other_id, content, created_at,
           row_number() over (partition by other_id order by created_at desc) as rn
    from threads
  ),
  unread as (
    select other_id, count(*)::int as cnt
    from threads
    where recipient_id = auth.uid() and is_read = false
    group by other_id
  )
  select
    p.id, p.username::text, p.full_name::text, p.avatar_url::text,
    r.content::text, r.created_at, coalesce(u.cnt, 0)
  from ranked r
  join public.profiles p on p.id = r.other_id
  left join unread u on u.other_id = r.other_id
  where r.rn = 1
  order by r.created_at desc;
$function$;

create or replace function public.my_pending_requests()
 returns table(connection_id uuid, user_id uuid, username text, full_name text,
               avatar_url text, node_type text, reputation_score numeric, created_at timestamptz)
 language sql security definer set search_path to 'public'
as $function$
  select
    c.id, p.id, p.username::text, p.full_name::text, p.avatar_url::text,
    p.node_type::text, p.reputation_score::numeric, c.created_at
  from public.connections c
  join public.profiles p on p.id = c.requester_id
  where c.addressee_id = auth.uid() and c.status = 'pending'
  order by c.created_at desc;
$function$;

-- ── Refuerzo de integridad para el anti-spoof de resolve_audit ───────
-- skill_test_attempts es la FUENTE DE VERDAD de "aprobó un examen" y solo
-- debe escribirla el servidor (run-code → handle_skill_attempt, service_role,
-- que ignora RLS). La política previa 'attempts_own' era FOR ALL → permitía
-- al usuario INSERTAR sus propias filas y fabricar result='PASS', burlando el
-- anti-spoof de abajo. La restringimos a SELECT. El frontend solo lee, así
-- que este cambio no rompe ningún flujo.
drop policy if exists "attempts_own" on public.skill_test_attempts;
drop policy if exists attempts_select_own on public.skill_test_attempts;
create policy attempts_select_own on public.skill_test_attempts
  for select to authenticated using (auth.uid() = user_id);
revoke insert, update, delete on public.skill_test_attempts from authenticated;
do $$ begin
  execute 'revoke insert, update, delete on public.skill_test_attempts from anon';
exception when others then null; end $$;
grant select on public.skill_test_attempts to authenticated;

-- Auto-redención endurecida: el usuario resuelve SU PROPIA auditoría, y para
-- reactivar el nodo (p_passed=true) el servidor exige un examen APROBADO real
-- (skill_test_attempts.result='PASS', registrado por run-code/handle_skill_attempt)
-- posterior al disparo de la auditoría. Impide reactivar llamando el RPC directo.
create or replace function public.resolve_audit(p_audit_id uuid, p_passed boolean)
 returns void
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_uid       uuid;
  v_status    text;
  v_triggered timestamptz;
  v_has_pass  boolean;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select user_id, status, triggered_at
    into v_uid, v_status, v_triggered
  from public.rank_audits where id = p_audit_id for update;

  if not found then raise exception 'Auditoría no encontrada'; end if;
  if v_uid is null or v_uid <> auth.uid() then
    raise exception 'Solo puedes resolver tu propia auditoría de rango';
  end if;
  if coalesce(v_status, 'PENDING') <> 'PENDING' then
    raise exception 'La auditoría ya fue resuelta';
  end if;

  if p_passed then
    -- Anti-spoof: exige un examen aprobado (verificado en el servidor por
    -- run-code → handle_skill_attempt) posterior al disparo de la auditoría.
    select exists (
      select 1 from public.skill_test_attempts a
      where a.user_id = auth.uid()
        and a.result = 'PASS'
        and a.attempted_at >= coalesce(v_triggered, to_timestamp(0))
    ) into v_has_pass;

    if not v_has_pass then
      raise exception 'Debes aprobar el examen de redención antes de reactivar tu nodo';
    end if;

    update public.rank_audits set status = 'PASSED' where id = p_audit_id;
    update public.profiles   set node_status = 'ACTIVE' where id = v_uid;
  else
    update public.rank_audits set status = 'FAILED' where id = p_audit_id;
  end if;
end; $function$;

create or replace function public.respond_connection_request(p_connection_id uuid, p_accept boolean)
 returns text
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me  uuid := auth.uid();
  v_row public.connections%rowtype;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  select * into v_row from public.connections where id = p_connection_id;
  if v_row.id is null then raise exception 'Solicitud no existe'; end if;
  if v_row.addressee_id <> v_me then raise exception 'No autorizado'; end if;

  update public.connections
     set status = case when p_accept then 'accepted' else 'rejected' end
   where id = p_connection_id;
  return case when p_accept then 'accepted' else 'rejected' end;
end; $function$;

create or replace function public.send_connection_request(p_addressee uuid)
 returns text
 language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_me       uuid := auth.uid();
  v_existing public.connections%rowtype;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_addressee = v_me then raise exception 'No puedes conectarte contigo mismo'; end if;

  select * into v_existing from public.connections
   where (requester_id = v_me and addressee_id = p_addressee)
      or (requester_id = p_addressee and addressee_id = v_me)
   limit 1;

  if v_existing.id is not null then
    if v_existing.status = 'pending' and v_existing.addressee_id = v_me then
      update public.connections set status = 'accepted' where id = v_existing.id;
      return 'accepted';
    end if;
    if v_existing.status = 'rejected' then
      update public.connections
         set status = 'pending', requester_id = v_me, addressee_id = p_addressee
       where id = v_existing.id;
      return 'pending';
    end if;
    return v_existing.status;
  end if;

  insert into public.connections (requester_id, addressee_id, status)
  values (v_me, p_addressee, 'pending');
  return 'pending';
end; $function$;

create or replace function public.send_direct_message(p_recipient uuid, p_content text)
 returns uuid
 language plpgsql security definer set search_path to 'public'
as $function$
declare v_me uuid := auth.uid(); v_id uuid;
begin
  if v_me is null then raise exception 'No autenticado'; end if;
  if p_recipient = v_me then raise exception 'No puedes enviarte mensajes a ti mismo'; end if;
  if not public.are_connected(v_me, p_recipient) then
    raise exception 'Solo puedes enviar mensajes a tus conexiones';
  end if;
  if coalesce(btrim(p_content), '') = '' then raise exception 'Mensaje vacío'; end if;
  insert into public.direct_messages (sender_id, recipient_id, content)
  values (v_me, p_recipient, left(p_content, 4000)) returning id into v_id;
  return v_id;
end; $function$;

-- ── 5) Grants (los llama el frontend como usuario authenticated) ───────
grant execute on function public.are_connected(uuid, uuid)                 to authenticated;
grant execute on function public.connection_status(uuid)                   to authenticated;
grant execute on function public.get_direct_thread(uuid)                   to authenticated;
grant execute on function public.get_leaderboard(integer)                  to authenticated;
grant execute on function public.get_public_credential(text)               to authenticated;
grant execute on function public.mark_dm_read(uuid)                        to authenticated;
grant execute on function public.my_connections()                          to authenticated;
grant execute on function public.my_dm_conversations()                     to authenticated;
grant execute on function public.my_pending_requests()                     to authenticated;
grant execute on function public.resolve_audit(uuid, boolean)              to authenticated;
grant execute on function public.respond_connection_request(uuid, boolean) to authenticated;
grant execute on function public.send_connection_request(uuid)             to authenticated;
grant execute on function public.send_direct_message(uuid, text)           to authenticated;

grant select, insert, update on public.connections     to authenticated;
grant select, insert, update on public.direct_messages to authenticated;
grant select                 on public.rank_audits     to authenticated;
