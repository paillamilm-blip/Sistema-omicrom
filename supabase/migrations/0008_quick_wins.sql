-- =====================================================================
-- 0008_quick_wins.sql — Hallazgos rápidos (aditivo, idempotente)
--  - Índices en consultas calientes
--  - replica identity full en profiles (arregla realtime parcial)
--  - username único garantizado (evita choque en el registro)
-- =====================================================================

-- 1) Índices ----------------------------------------------------------
create index if not exists ix_messages_network_created on public.messages(network_id, created_at);
create index if not exists ix_blackbox_votes_dispute    on public.blackbox_votes(dispute_id);
create index if not exists ix_skill_attempts_user_test  on public.skill_test_attempts(user_id, test_id);
create index if not exists ix_contracts_buyer           on public.contracts(buyer_id);
create index if not exists ix_contracts_seller          on public.contracts(seller_id);

-- 2) Realtime: payload.new con fila completa --------------------------
alter table public.profiles replica identity full;

-- 3) Username único (evita violación de UNIQUE al registrarse) --------
create or replace function public.ensure_unique_username()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.username is null or btrim(new.username) = '' then
    new.username := 'nodo_' || substr(new.id::text, 1, 8);
  end if;
  while exists (select 1 from public.profiles where username = new.username and id <> new.id) loop
    new.username := new.username || floor(random() * 10000)::int;
  end loop;
  return new;
end; $$;

drop trigger if exists trg_ensure_unique_username on public.profiles;
create trigger trg_ensure_unique_username
  before insert on public.profiles
  for each row execute function public.ensure_unique_username();
