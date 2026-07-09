-- =====================================================================
-- Omicron · Esquema inicial
-- =====================================================================
-- Crea las tablas de dominio, habilita Row Level Security (RLS) y define
-- las políticas de acceso. Compatible con Supabase (Postgres).
-- =====================================================================

-- Tipos enumerados -----------------------------------------------------
create type opportunity_type as enum ('proyecto', 'mentoria', 'curso');
create type opportunity_level as enum ('junior', 'mid', 'senior');
create type activity_kind as enum (
  'xp', 'node_up', 'opportunity', 'achievement', 'earning'
);

-- Perfiles -------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  handle      text not null unique,
  avatar_url  text not null default '',
  role        text not null default '',
  location    text not null default '',
  bio         text not null default '',
  joined_at   timestamptz not null default now(),
  streak      integer not null default 0,
  experience  integer not null default 0,
  node        integer not null default 1,
  created_at  timestamptz not null default now()
);

comment on table public.profiles is 'Perfil público de cada usuario de Omicron.';

-- Habilidades ----------------------------------------------------------
create table public.skills (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  label       text not null,
  value       integer not null check (value between 0 and 100),
  unique (profile_id, label)
);

-- Oportunidades --------------------------------------------------------
create table public.opportunities (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  description   text not null,
  type          opportunity_type not null,
  reward_xp     integer not null default 0,
  reward        numeric,
  match         integer not null default 0 check (match between 0 and 100),
  tags          text[] not null default '{}',
  company       text not null,
  commitment    text not null,
  location      text not null,
  deadline      timestamptz not null,
  requirements  text[] not null default '{}',
  level         opportunity_level not null,
  created_at    timestamptz not null default now()
);

-- Actividad ------------------------------------------------------------
create table public.activity (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  kind        activity_kind not null,
  title       text not null,
  description text not null,
  xp          integer,
  created_at  timestamptz not null default now()
);

-- Insignias ------------------------------------------------------------
create table public.achievements (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid not null references public.profiles (id) on delete cascade,
  key          text not null,
  title        text not null,
  description  text not null,
  icon         text not null default 'Sparkles',
  unlocked     boolean not null default false,
  unlocked_at  timestamptz,
  unique (profile_id, key)
);

-- Ganancias ------------------------------------------------------------
create table public.earnings (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  source      text not null,
  amount      numeric not null default 0,
  currency    text not null default 'USD',
  period      date not null,
  created_at  timestamptz not null default now()
);

create index earnings_profile_period_idx
  on public.earnings (profile_id, period);
create index activity_profile_created_idx
  on public.activity (profile_id, created_at desc);
create index profiles_experience_idx
  on public.profiles (experience desc);

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles      enable row level security;
alter table public.skills        enable row level security;
alter table public.opportunities enable row level security;
alter table public.activity      enable row level security;
alter table public.achievements  enable row level security;
alter table public.earnings      enable row level security;

-- Perfiles: lectura pública (para el ranking), escritura solo del dueño.
create policy "Perfiles visibles para todos"
  on public.profiles for select using (true);
create policy "El usuario edita su propio perfil"
  on public.profiles for update using (auth.uid() = id);
create policy "El usuario crea su propio perfil"
  on public.profiles for insert with check (auth.uid() = id);

-- Habilidades: lectura pública, escritura del dueño.
create policy "Habilidades visibles para todos"
  on public.skills for select using (true);
create policy "El usuario gestiona sus habilidades"
  on public.skills for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- Oportunidades: lectura para usuarios autenticados.
create policy "Oportunidades visibles para autenticados"
  on public.opportunities for select
  using (auth.role() = 'authenticated');

-- Actividad / Insignias / Ganancias: solo el dueño.
create policy "El usuario ve su actividad"
  on public.activity for select using (auth.uid() = profile_id);
create policy "El usuario gestiona su actividad"
  on public.activity for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "El usuario ve sus insignias"
  on public.achievements for select using (auth.uid() = profile_id);
create policy "El usuario gestiona sus insignias"
  on public.achievements for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

create policy "El usuario ve sus ganancias"
  on public.earnings for select using (auth.uid() = profile_id);
create policy "El usuario gestiona sus ganancias"
  on public.earnings for all
  using (auth.uid() = profile_id)
  with check (auth.uid() = profile_id);

-- =====================================================================
-- Trigger: crear perfil automáticamente al registrarse un usuario
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, handle)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    '@' || split_part(new.email, '@', 1)
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
