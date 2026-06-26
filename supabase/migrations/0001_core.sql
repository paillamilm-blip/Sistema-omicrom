-- ═══════════════════════════════════════════════════════════
-- 0001_core.sql · Sistema Ómicron
-- Perfiles (Gemelo Digital), historial de reputación, notificaciones.
-- ═══════════════════════════════════════════════════════════

-- ── PROFILES ────────────────────────────────────────────────
create table if not exists public.profiles (
  id                        uuid primary key references auth.users(id) on delete cascade,
  email                     text,
  username                  text unique not null,
  full_name                 text not null default '',
  avatar_url                text,
  bio                       text,
  location                  text,
  skills                    text[],

  -- Tokens / Wallet
  token_balance             numeric not null default 0,
  token_escrow              numeric not null default 0,

  -- Experiencia
  pe_points                 integer not null default 0,

  -- Reputación (0-100)
  reputation_score          numeric not null default 50,
  reputation_updated_at     timestamptz not null default now(),

  -- Gemelo Digital (4 ejes)
  execution_score           numeric not null default 50,
  quality_score             numeric not null default 50,
  transcendence_score       numeric not null default 50,
  foundation_score          numeric not null default 50,

  -- Ponderación 80/20
  traditional_score         numeric not null default 0,
  experience_score          numeric not null default 0,

  -- Sistema de nodos
  node_level                integer not null default 1 check (node_level between 1 and 3),
  node_status               text not null default 'ACTIVE' check (node_status in ('ACTIVE','SUSPENDED','DEGRADED')),
  node_type                 text not null default 'Nodo Operativo'
                              check (node_type in ('Nodo Operativo','Nodo Core','Nodo Arquitecto','Nodo Fundador')),
  is_pioneer                boolean not null default false,
  last_audit_date           timestamptz,

  -- Flags
  is_verified_professional  boolean not null default false,
  can_receive_contracts     boolean not null default true,

  -- Contadores
  total_contracts_completed integer not null default 0,
  total_earnings            numeric not null default 0,

  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);


-- Trigger: crear perfil automáticamente al registrarse un usuario
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, username, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Trigger: mantener updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS de profiles
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_all" on public.profiles;
create policy "profiles_select_all" on public.profiles
  for select using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);


-- ── REPUTATION HISTORY ──────────────────────────────────────
create table if not exists public.reputation_history (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null references public.profiles(id) on delete cascade,
  old_reputation          numeric not null,
  new_reputation          numeric not null,
  old_execution_score     numeric not null,
  new_execution_score     numeric not null,
  old_quality_score       numeric not null,
  new_quality_score       numeric not null,
  old_transcendence_score numeric not null,
  new_transcendence_score numeric not null,
  old_foundation_score    numeric not null,
  new_foundation_score    numeric not null,
  reason                  text not null,
  trigger_event_id        uuid,
  created_at              timestamptz not null default now()
);

alter table public.reputation_history enable row level security;

drop policy if exists "rep_history_select_own" on public.reputation_history;
create policy "rep_history_select_own" on public.reputation_history
  for select using (auth.uid() = user_id);

drop policy if exists "rep_history_insert_own" on public.reputation_history;
create policy "rep_history_insert_own" on public.reputation_history
  for insert with check (auth.uid() = user_id);

-- ── NOTIFICATIONS ───────────────────────────────────────────
create table if not exists public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  type        text not null,
  title       text not null,
  message     text not null,
  related_id  uuid,
  is_read     boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_unread_idx
  on public.notifications (user_id) where is_read = false;

alter table public.notifications enable row level security;

drop policy if exists "notif_select_own" on public.notifications;
create policy "notif_select_own" on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists "notif_update_own" on public.notifications;
create policy "notif_update_own" on public.notifications
  for update using (auth.uid() = user_id);
