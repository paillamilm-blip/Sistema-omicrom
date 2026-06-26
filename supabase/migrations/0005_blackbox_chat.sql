-- =====================================================================
-- 0005_blackbox_chat.sql  —  Caja Negra (cifrado de sobre + cadena hash)
-- Aditivo e idempotente. Seguro de correr sobre tu base existente.
-- =====================================================================

create extension if not exists pgcrypto;

-- 1) Columnas de cifrado + cadena de integridad en messages -----------
alter table public.messages add column if not exists ciphertext text;
alter table public.messages add column if not exists iv         text;
alter table public.messages add column if not exists prev_hash  text;
alter table public.messages add column if not exists msg_hash   text;

-- Evita "forks" de la cadena en la misma sala (integridad ante carreras):
-- dos mensajes no pueden apuntar al mismo prev_hash.
create unique index if not exists ux_messages_chain
  on public.messages (network_id, prev_hash)
  where ciphertext is not null;

-- 2) Claves de sala (DEK cifrada bajo la clave maestra del servidor) ---
create table if not exists public.chat_room_keys (
  network_id    uuid primary key,
  dek_encrypted text not null,
  dek_iv        text not null,
  created_at    timestamptz not null default now()
);
-- RLS activado SIN políticas => ningún cliente puede leer las DEK.
-- Solo el service_role (Edge Functions) las accede.
alter table public.chat_room_keys enable row level security;

-- 3) Votos de apertura de la Caja Negra (quórum de árbitros) -----------
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

-- 4) Verificador público de integridad de la cadena -------------------
-- Recalcula SHA256(prev_hash || ciphertext) por toda la sala.
-- Devuelve true si NADIE alteró/borró un mensaje.
create or replace function public.verify_chat_chain(p_network_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  r    record;
  prev text := '0';
  calc text;
begin
  for r in
    select ciphertext, msg_hash
    from public.messages
    where network_id = p_network_id and ciphertext is not null
    order by created_at asc, id asc
  loop
    calc := encode(digest(prev || coalesce(r.ciphertext, ''), 'sha256'), 'hex');
    if r.msg_hash is distinct from calc then
      return false;
    end if;
    prev := r.msg_hash;
  end loop;
  return true;
end;
$$;

grant execute on function public.verify_chat_chain(uuid) to authenticated;
