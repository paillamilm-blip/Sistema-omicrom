-- =====================================================================
-- 0018_transcendence.sql
-- TRASCENDENCIA = (a) servicios publicados en Market
--               + (b) documentos validados en la Bóveda
--               + (c) mentorías completadas (tabla nueva)
-- =====================================================================

-- (c) Tabla de mentorías
create table if not exists public.mentorships (
  id         uuid primary key default gen_random_uuid(),
  mentor_id  uuid not null references public.profiles(id) on delete cascade,
  mentee_id  uuid references public.profiles(id) on delete set null,
  topic      text,
  status     text not null default 'COMPLETED'
               check (status in ('ACTIVE','COMPLETED','CANCELLED')),
  created_at timestamptz not null default now()
);
alter table public.mentorships enable row level security;

drop policy if exists mentorship_select on public.mentorships;
create policy mentorship_select on public.mentorships
  for select using (auth.uid() = mentor_id or auth.uid() = mentee_id);

drop policy if exists mentorship_mentor_write on public.mentorships;
create policy mentorship_mentor_write on public.mentorships
  for all using (auth.uid() = mentor_id) with check (auth.uid() = mentor_id);

grant select, insert, update, delete on public.mentorships to authenticated;

-- Recálculo de Trascendencia
create or replace function public.recalc_transcendence_score(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_services int; v_docs int; v_mentor int; v_score numeric;
begin
  if p_user is null then return; end if;

  select count(*) into v_services from public.market_services
    where seller_id = p_user and is_active = true;
  select count(*) into v_docs from public.knowledge_vault_documents
    where author_id = p_user and is_validated = true;
  select count(*) into v_mentor from public.mentorships
    where mentor_id = p_user and status = 'COMPLETED';

  -- (a)*8 + (b)*12 + (c)*6, tope 100
  v_score := least(100, v_services * 8 + v_docs * 12 + v_mentor * 6);
  update public.profiles set transcendence_score = v_score where id = p_user;
end; $fn$;

-- Triggers en las 3 fuentes
create or replace function public.fn_market_transcendence()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin perform public.recalc_transcendence_score(coalesce(new.seller_id, old.seller_id)); return null; end; $fn$;
drop trigger if exists trg_market_transcendence on public.market_services;
create trigger trg_market_transcendence after insert or update or delete on public.market_services
  for each row execute function public.fn_market_transcendence();

create or replace function public.fn_vault_transcendence()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin perform public.recalc_transcendence_score(coalesce(new.author_id, old.author_id)); return null; end; $fn$;
drop trigger if exists trg_vault_transcendence on public.knowledge_vault_documents;
create trigger trg_vault_transcendence after insert or update or delete on public.knowledge_vault_documents
  for each row execute function public.fn_vault_transcendence();

create or replace function public.fn_mentorship_transcendence()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin perform public.recalc_transcendence_score(coalesce(new.mentor_id, old.mentor_id)); return null; end; $fn$;
drop trigger if exists trg_mentorship_transcendence on public.mentorships;
create trigger trg_mentorship_transcendence after insert or update or delete on public.mentorships
  for each row execute function public.fn_mentorship_transcendence();

-- Backfill para todos
do $do$
declare r record;
begin
  for r in (select id from public.profiles) loop
    perform public.recalc_transcendence_score(r.id);
  end loop;
end;
$do$;
