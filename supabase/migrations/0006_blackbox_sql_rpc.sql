-- =====================================================================
-- 0006_blackbox_sql_rpc.sql
-- Caja Negra 100% en SQL (sin Edge Functions): cifrado AES (pgcrypto) +
-- cadena hash + quórum de árbitros, vía RPCs SECURITY DEFINER.
-- La clave maestra vive en Supabase Vault (nunca llega al cliente).
-- Idempotente: seguro de correr varias veces.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists supabase_vault;

-- 1) Columnas de cifrado + cadena en messages -------------------------
alter table public.messages add column if not exists ciphertext text;
alter table public.messages add column if not exists prev_hash  text;
alter table public.messages add column if not exists msg_hash   text;

create unique index if not exists ux_messages_chain
  on public.messages (network_id, prev_hash)
  where ciphertext is not null;

-- 2) Votos de apertura de la Caja Negra -------------------------------
create table if not exists public.blackbox_votes (
  id         uuid primary key default gen_random_uuid(),
  network_id uuid not null,
  dispute_id uuid,
  arbiter_id uuid not null,
  created_at timestamptz not null default now(),
  unique (network_id, arbiter_id)
);
alter table public.blackbox_votes enable row level security;
drop policy if exists "blackbox_votes_read_own" on public.blackbox_votes;
create policy "blackbox_votes_read_own" on public.blackbox_votes
  for select using (auth.uid() = arbiter_id);

-- 3) Crear la clave maestra en Vault (solo si no existe) --------------
do $$
begin
  if not exists (select 1 from vault.secrets where name = 'blackbox_key') then
    perform vault.create_secret(encode(extensions.gen_random_bytes(32), 'base64'), 'blackbox_key', 'Clave maestra Caja Negra');
  end if;
end $$;

-- Helper interno: clave derivada por sala (HMAC del network_id) -------
create or replace function public.bb_room_key(p_network_id uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare v_master text;
begin
  select decrypted_secret into v_master from vault.decrypted_secrets where name = 'blackbox_key' limit 1;
  if v_master is null then raise exception 'Falta el secreto blackbox_key en Vault'; end if;
  return encode(hmac(p_network_id::text, v_master, 'sha256'), 'hex');
end; $$;
revoke all on function public.bb_room_key(uuid) from public, anon, authenticated;

-- 4) Enviar mensaje cifrado ------------------------------------------
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

-- 5) Leer y descifrar mensajes (solo participantes) + integridad ------
create or replace function public.get_secure_messages(p_network_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_uid uuid := auth.uid();
  v_buyer uuid; v_seller uuid; v_key text;
  r record; v_prev text := '0'; v_calc text; v_ok boolean := true; v_text text;
  v_arr jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  select buyer_id, seller_id into v_buyer, v_seller from public.contracts where id = p_network_id;
  if v_buyer is null then raise exception 'Sala (contrato) no encontrada'; end if;
  if v_uid <> v_buyer and v_uid <> v_seller then raise exception 'No autorizado en esta sala'; end if;

  v_key := public.bb_room_key(p_network_id);

  for r in
    select m.id, m.sender_id, m.receiver_id, m.network_id, m.content, m.ciphertext,
           m.msg_hash, m.is_read, m.created_at, p.username
    from public.messages m
    left join public.profiles p on p.id = m.sender_id
    where m.network_id = p_network_id
    order by m.created_at asc
  loop
    if r.ciphertext is not null then
      v_calc := encode(digest(v_prev || r.ciphertext, 'sha256'), 'hex');
      if v_calc is distinct from r.msg_hash then v_ok := false; end if;
      v_prev := r.msg_hash;
      begin
        v_text := pgp_sym_decrypt(decode(r.ciphertext, 'base64'), v_key);
      exception when others then
        v_text := '[ilegible]'; v_ok := false;
      end;
    else
      v_text := r.content;
    end if;

    v_arr := v_arr || jsonb_build_object(
      'id', r.id, 'sender_id', r.sender_id, 'receiver_id', r.receiver_id,
      'network_id', r.network_id, 'content', v_text, 'is_read', r.is_read,
      'created_at', r.created_at,
      'sender', jsonb_build_object('id', r.sender_id, 'username', r.username)
    );
  end loop;

  return jsonb_build_object('messages', v_arr, 'integrity_ok', v_ok);
end; $$;

-- 6) Abrir Caja Negra por quórum de árbitros (2-de-3) -----------------
create or replace function public.open_blackbox(p_dispute_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_uid uuid := auth.uid();
  v_network uuid; v_arbiters uuid[]; v_threshold int; v_votes int; v_key text;
  r record; v_prev text := '0'; v_calc text; v_ok boolean := true; v_text text;
  v_arr jsonb := '[]'::jsonb;
begin
  if v_uid is null then raise exception 'No autenticado'; end if;

  select contract_id into v_network from public.disputes where id = p_dispute_id;
  if v_network is null then raise exception 'Disputa no encontrada'; end if;

  select arbiters into v_arbiters from public.arbitration_cases
    where dispute_id = p_dispute_id order by created_at desc limit 1;
  if v_arbiters is null or array_length(v_arbiters, 1) is null then
    raise exception 'Aún no hay árbitros asignados';
  end if;
  if not (v_uid = any (v_arbiters)) then
    raise exception 'Solo los árbitros asignados pueden abrir la Caja Negra';
  end if;

  v_threshold := floor(array_length(v_arbiters, 1) / 2.0) + 1;

  insert into public.blackbox_votes (network_id, dispute_id, arbiter_id)
  values (v_network, p_dispute_id, v_uid)
  on conflict (network_id, arbiter_id) do nothing;

  select count(distinct arbiter_id) into v_votes
    from public.blackbox_votes
    where dispute_id = p_dispute_id and arbiter_id = any (v_arbiters);

  if v_votes < v_threshold then
    return jsonb_build_object('unlocked', false, 'votes', v_votes, 'threshold', v_threshold);
  end if;

  v_key := public.bb_room_key(v_network);

  for r in
    select m.id, m.sender_id, m.content, m.ciphertext, m.msg_hash, m.created_at, p.username
    from public.messages m
    left join public.profiles p on p.id = m.sender_id
    where m.network_id = v_network
    order by m.created_at asc
  loop
    if r.ciphertext is not null then
      v_calc := encode(digest(v_prev || r.ciphertext, 'sha256'), 'hex');
      if v_calc is distinct from r.msg_hash then v_ok := false; end if;
      v_prev := r.msg_hash;
      begin
        v_text := pgp_sym_decrypt(decode(r.ciphertext, 'base64'), v_key);
      exception when others then
        v_text := '[ilegible]'; v_ok := false;
      end;
    else
      v_text := r.content;
    end if;

    v_arr := v_arr || jsonb_build_object(
      'id', r.id, 'sender_id', r.sender_id,
      'sender', jsonb_build_object('id', r.sender_id, 'username', r.username),
      'content', v_text, 'created_at', r.created_at
    );
  end loop;

  return jsonb_build_object('unlocked', true, 'votes', v_votes, 'threshold', v_threshold,
    'integrity_ok', v_ok, 'transcript', v_arr);
end; $$;

-- 7) Verificador de integridad de la cadena ---------------------------
create or replace function public.verify_chat_chain(p_network_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare r record; prev text := '0'; calc text;
begin
  for r in
    select ciphertext, msg_hash from public.messages
    where network_id = p_network_id and ciphertext is not null
    order by created_at asc, id asc
  loop
    calc := encode(digest(prev || coalesce(r.ciphertext, ''), 'sha256'), 'hex');
    if r.msg_hash is distinct from calc then return false; end if;
    prev := r.msg_hash;
  end loop;
  return true;
end; $$;

-- 8) Permisos: solo usuarios autenticados pueden llamar los RPCs ------
grant execute on function public.send_secure_message(uuid, text) to authenticated;
grant execute on function public.get_secure_messages(uuid)       to authenticated;
grant execute on function public.open_blackbox(uuid)             to authenticated;
grant execute on function public.verify_chat_chain(uuid)         to authenticated;
