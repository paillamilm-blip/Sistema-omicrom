-- ═══════════════════════════════════════════════════════════
-- 0004_jobs_chat.sql · Empleos, Chat directo y estado de usuario (Fase 2)
-- ═══════════════════════════════════════════════════════════

-- ── JOB POSTINGS ────────────────────────────────────────────
create table if not exists public.job_postings (
  id                  uuid primary key default gen_random_uuid(),
  company_id          uuid references public.profiles(id) on delete set null,
  title               text not null,
  description         text not null default '',
  required_skills     jsonb not null default '[]'::jsonb,
  required_node_level integer not null default 1 check (required_node_level between 1 and 3),
  budget_usd          numeric not null default 0,
  time_limit_hours    integer not null default 24,
  status              text not null default 'OPEN'
                        check (status in ('OPEN','IN_PROGRESS','COMPLETED','CANCELLED')),
  created_at          timestamptz not null default now(),
  published_at        timestamptz not null default now()
);

create table if not exists public.job_matches (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null references public.job_postings(id) on delete cascade,
  user_id      uuid not null references public.profiles(id) on delete cascade,
  match_score  numeric not null default 0,
  rank         integer not null default 0,
  match_reason text not null default '',
  sent_at      timestamptz not null default now(),
  unique (job_id, user_id)
);

alter table public.job_postings enable row level security;
alter table public.job_matches  enable row level security;

drop policy if exists "jobs_read" on public.job_postings;
create policy "jobs_read" on public.job_postings for select using (true);

drop policy if exists "matches_read" on public.job_matches;
create policy "matches_read" on public.job_matches for select using (true);


-- ── MESSAGES (chat directo) ─────────────────────────────────
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid references public.profiles(id) on delete cascade,
  network_id  uuid,
  content     text not null,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists messages_sender_idx   on public.messages (sender_id);
create index if not exists messages_receiver_idx on public.messages (receiver_id);

alter table public.messages enable row level security;

drop policy if exists "messages_participants_read" on public.messages;
create policy "messages_participants_read" on public.messages
  for select using (auth.uid() = sender_id or auth.uid() = receiver_id or receiver_id is null);

drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages
  for insert with check (auth.uid() = sender_id);

-- ── USER STATUS (modo pausa / disponibilidad) ───────────────
create table if not exists public.user_status (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  is_paused    boolean not null default false,
  availability text not null default 'available'
                 check (availability in ('available','paused','busy')),
  updated_at   timestamptz not null default now()
);

alter table public.user_status enable row level security;

drop policy if exists "status_read" on public.user_status;
create policy "status_read" on public.user_status for select using (true);

drop policy if exists "status_own_write" on public.user_status;
create policy "status_own_write" on public.user_status
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
