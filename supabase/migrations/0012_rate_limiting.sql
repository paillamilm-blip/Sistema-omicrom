-- =====================================================================
-- 0012_rate_limiting.sql — Anti-spam / anti-abuso (idempotente)
-- Infra de rate limiting + aplicación en chat y disputas.
-- =====================================================================

-- 1) Registro de eventos -----------------------------------------------
create table if not exists public.rate_limit_events (
  id         bigserial primary key,
  user_id    uuid not null,
  action     text not null,
  created_at timestamptz not null default now()
);
create index if not exists ix_rate_limit_lookup
  on public.rate_limit_events (user_id, action, created_at);

alter table public.rate_limit_events enable row level security;
-- Sin políticas: solo el servidor (definer/service_role) la toca.

-- 2) Función central de rate limit -------------------------------------
create or replace function public.enforce_rate_limit(
  p_action text,
  p_max    int,
  p_window interval
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_uid uuid := auth.uid(); v_count int;
begin
  if v_uid is null then return; end if; -- llamadas del sistema (sin usuario) no se limitan

  select count(*) into v_count
  from public.rate_limit_events
  where user_id = v_uid and action = p_action
    and created_at > now() - p_window;

  if v_count >= p_max then
    raise exception 'Límite alcanzado para "%": máx % por %. Intenta más tarde.',
      p_action, p_max, p_window using errcode = 'P0001';
  end if;

  insert into public.rate_limit_events (user_id, action) values (v_uid, p_action);
end; $$;

-- 3) Aplicar al CHAT: 30 mensajes por minuto ---------------------------
create or replace function public.send_secure_message(p_network_id uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_uid uuid := auth.uid();
  v_buyer uuid; v_seller uuid; v_receiver uuid;
  v_key text; v_cipher text; v_prev text; v_hash text; v_id uuid;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  if p_content is null or length(btrim(p_content)) = 0 then raise exception 'Mensaje vacío'; end if;
  if length(p_content) > 8000 then raise exception 'Mensaje demasiado largo'; end if;

  perform public.enforce_rate_limit('chat_send', 30, interval '1 minute');

  select buyer_id, seller_id into v_buyer, v_seller from public.contracts where id = p_network_id;
  if v_buyer is null then raise exception 'Sala (contrato) no encontrada'; end if;
  if v_uid <> v_buyer and v_uid <> v_seller then raise exception 'No autorizado en esta sala'; end if;
  v_receiver := case when v_uid = v_buyer then v_seller else v_buyer end;

  v_key := public.bb_room_key(p_network_id);
  v_cipher := encode(pgp_sym_encrypt(btrim(p_content), v_key), 'base64');

  select msg_hash into v_prev from public.messages
    where network_id = p_network_id and ciphertext is not null
    order by created_at desc limit 1;
  v_prev := coalesce(v_prev, '0');
  v_hash := encode(digest(v_prev || v_cipher, 'sha256'), 'hex');

  insert into public.messages (sender_id, receiver_id, network_id, content, ciphertext, prev_hash, msg_hash, is_read)
  values (v_uid, v_receiver, p_network_id, '[cifrado]', v_cipher, v_prev, v_hash, false)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id);
end; $$;
grant execute on function public.send_secure_message(uuid, text) to authenticated;

-- 4) Aplicar a DISPUTAS: 5 por hora ------------------------------------
create or replace function public.fn_rate_limit_disputes()
returns trigger
language plpgsql
as $$
begin
  perform public.enforce_rate_limit('open_dispute', 5, interval '1 hour');
  return new;
end; $$;

drop trigger if exists trg_rate_limit_disputes on public.disputes;
create trigger trg_rate_limit_disputes
  before insert on public.disputes
  for each row execute function public.fn_rate_limit_disputes();

-- 5) Limpieza opcional: purga eventos viejos (>24h) --------------------
-- Programa esto en pg_cron si quieres mantener la tabla chica:
--   select cron.schedule('purge-rate-limits','*/30 * * * *',
--     $$ delete from public.rate_limit_events where created_at < now() - interval '24 hours' $$);
