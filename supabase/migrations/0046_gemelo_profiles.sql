-- =====================================================================
-- 0046_gemelo_profiles.sql — Perfil del Gemelo (fuente de verdad del
-- ecosistema Ómicron: CV, títulos, años, aportes → PE, reputación y ejes).
--
-- El cliente (src/lib/gemeloProfile.ts) recalcula PE/rep/ejes de forma
-- determinista a partir de los datos convalidados y sincroniza aquí.
-- Cada usuario solo puede leer/escribir SU propia fila (RLS).
-- Idempotente.
-- =====================================================================

create table if not exists public.gemelo_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  cv         boolean     not null default false,
  titles     integer     not null default 0,
  years      integer     not null default 0,
  vault      integer     not null default 0,
  pe         integer     not null default 120,
  rep        integer     not null default 34,
  axes       jsonb       not null default '{"execution":40,"quality":30,"transcendence":18,"foundation":25}'::jsonb,
  updated_at timestamptz not null default now()
);

comment on table public.gemelo_profiles is 'Datos convalidados del Gemelo por usuario; PE/rep/ejes se recalculan en cliente.';

-- Mantener updated_at
create or replace function public.gemelo_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end; $$;

drop trigger if exists trg_gemelo_touch on public.gemelo_profiles;
create trigger trg_gemelo_touch
  before update on public.gemelo_profiles
  for each row execute function public.gemelo_touch_updated_at();

-- ── RLS: cada quien es dueño de su fila ──────────────────────────────
alter table public.gemelo_profiles enable row level security;

drop policy if exists "gemelo_select_own" on public.gemelo_profiles;
create policy "gemelo_select_own" on public.gemelo_profiles
  for select using (auth.uid() = user_id);

drop policy if exists "gemelo_insert_own" on public.gemelo_profiles;
create policy "gemelo_insert_own" on public.gemelo_profiles
  for insert with check (auth.uid() = user_id);

drop policy if exists "gemelo_update_own" on public.gemelo_profiles;
create policy "gemelo_update_own" on public.gemelo_profiles
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "gemelo_delete_own" on public.gemelo_profiles;
create policy "gemelo_delete_own" on public.gemelo_profiles
  for delete using (auth.uid() = user_id);

notify pgrst, 'reload schema';
