-- =====================================================================
-- 0023_jobs.sql — Empleos: job_postings + matchmaking 80/20 + terna express
-- + trigger automático al publicar + aplicar. Idempotente.
-- =====================================================================

-- ── 1) Tabla de ofertas (la que espera el frontend) ─────────────────
create table if not exists public.job_postings (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid not null references public.profiles(id) on delete cascade,
  title               text not null,
  description         text default '',
  category            text default 'dev',
  tags                text[] default '{}',
  required_node_level int  not null default 1,   -- 1=Operativo, 2=Core, 3=Arquitecto
  budget_usd          numeric not null default 0,
  time_limit_hours    int  not null default 48,
  status              text not null default 'OPEN' check (status in ('OPEN','MATCHED','CLOSED')),
  created_at          timestamptz not null default now(),
  published_at        timestamptz not null default now()
);
create index if not exists idx_jobpost_status on public.job_postings(status);

-- unicidad de postulación (un usuario aplica una vez por oferta)
create unique index if not exists uq_job_application on public.job_applications(job_id, applicant_id);

-- ── 2) Matchmaking 80/20 + Terna Express ─────────────────────────────
-- Nivel del nodo a partir del node_type (evita el lío de node_level TEXT/int)
create or replace function public.fn_node_level(p_node_type text)
returns int language sql immutable as $fn$
  select case p_node_type
    when 'Nodo Operativo' then 1
    when 'Nodo Core' then 2
    when 'Nodo Arquitecto' then 3
    when 'Nodo Fundador' then 3
    else 1 end;
$fn$;

create or replace function public.run_matchmaking(p_job_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_job record;
begin
  select * into v_job from public.job_postings where id = p_job_id;
  if v_job is null then return; end if;

  delete from public.job_matches where job_id = p_job_id;

  -- 80% reputación demostrada + 20% ajuste de nivel del nodo · top 3 (terna)
  insert into public.job_matches (job_id, user_id, match_score, rank, match_reason)
  select v_job.id, sub.id, sub.score,
         row_number() over (order by sub.score desc),
         'Reputación ' || round(sub.reputation_score) || ' · ' || sub.node_type
  from (
    select p.id, p.reputation_score, p.node_type,
           round( 0.8 * coalesce(p.reputation_score,0)
                + 0.2 * least(public.fn_node_level(p.node_type) / 3.0 * 100, 100), 2) as score
    from public.profiles p
    where p.id <> v_job.company_id
      and public.fn_node_level(p.node_type) >= v_job.required_node_level
      and coalesce(p.can_receive_contracts, true) = true
    order by score desc
    limit 3
  ) sub;
end; $fn$;

-- ── 3) Trigger: al publicar una oferta, generar la terna automáticamente
create or replace function public.fn_job_matchmaking()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.run_matchmaking(new.id);
  return null;
end; $fn$;

drop trigger if exists trg_job_matchmaking on public.job_postings;
create trigger trg_job_matchmaking
  after insert on public.job_postings
  for each row execute function public.fn_job_matchmaking();

-- ── 4) Aplicar a una oferta ──────────────────────────────────────────
create or replace function public.apply_to_job(p_job_id uuid, p_cover_note text default null)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.job_applications (job_id, applicant_id, cover_note, status)
  values (p_job_id, auth.uid(), p_cover_note, 'pending')
  on conflict (job_id, applicant_id) do nothing;
end; $fn$;

grant execute on function public.apply_to_job(uuid, text) to authenticated;

-- ── 5) RLS / permisos ────────────────────────────────────────────────
alter table public.job_postings    enable row level security;
alter table public.job_matches     enable row level security;
alter table public.job_applications enable row level security;

drop policy if exists jp_select on public.job_postings;
create policy jp_select on public.job_postings for select to authenticated using (true);
drop policy if exists jp_insert on public.job_postings;
create policy jp_insert on public.job_postings for insert to authenticated with check (auth.uid() = company_id);
drop policy if exists jp_update_own on public.job_postings;
create policy jp_update_own on public.job_postings for update to authenticated using (auth.uid() = company_id);

drop policy if exists jm_select on public.job_matches;
create policy jm_select on public.job_matches for select to authenticated using (
  auth.uid() = user_id
  or exists (select 1 from public.job_postings j where j.id = job_matches.job_id and j.company_id = auth.uid())
);

drop policy if exists ja_select on public.job_applications;
create policy ja_select on public.job_applications for select to authenticated using (
  auth.uid() = applicant_id
  or exists (select 1 from public.job_postings j where j.id = job_applications.job_id and j.company_id = auth.uid())
);

grant select, insert, update on public.job_postings to authenticated;
grant select on public.job_matches to authenticated;
grant select on public.job_applications to authenticated;
