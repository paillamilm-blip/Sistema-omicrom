-- =====================================================================
-- 0034_fix_academy_courses_400.sql — Arregla el error 400 de academy_courses
--
-- Causa probable: en producción la tabla NO existe, o existe con una forma
-- antigua (sin las columnas is_published / order_index). El frontend hace:
--   .from('academy_courses').select('*').eq('is_published', true).order('order_index')
-- y PostgREST devuelve 400 si esas columnas no existen.
--
-- Este script deja la tabla con la forma correcta sin borrar datos:
--   - la crea si falta
--   - agrega columnas que falten (sin tocar las existentes)
--   - re-asegura RLS, política de lectura y permisos
--   - refresca la caché del API (PostgREST) para que el 400 desaparezca
-- Idempotente. Pensado para correr en el SQL Editor de Supabase.
-- =====================================================================

-- ── 1) Crear la tabla si no existe (forma canónica, igual a 0020) ─────
create table if not exists public.academy_courses (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid references public.skill_tree_nodes(id) on delete set null,
  title         text not null,
  description   text default '',
  cover_emoji   text default '📘',
  difficulty    int  not null default 1 check (difficulty between 1 and 5),
  passing_score int  not null default 70,
  order_index   int  not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

-- ── 2) Si la tabla ya existía con forma antigua, agregar lo que falte ─
alter table public.academy_courses add column if not exists node_id       uuid references public.skill_tree_nodes(id) on delete set null;
alter table public.academy_courses add column if not exists description   text default '';
alter table public.academy_courses add column if not exists cover_emoji   text default '📘';
alter table public.academy_courses add column if not exists difficulty    int  not null default 1;
alter table public.academy_courses add column if not exists passing_score int  not null default 70;
alter table public.academy_courses add column if not exists order_index   int  not null default 0;
alter table public.academy_courses add column if not exists is_published  boolean not null default true;
alter table public.academy_courses add column if not exists created_at    timestamptz not null default now();

-- ── 3) RLS + lectura para autenticados (re-asegurar) ─────────────────
alter table public.academy_courses enable row level security;

drop policy if exists courses_read on public.academy_courses;
create policy courses_read on public.academy_courses
  for select to authenticated using (is_published);

grant select on public.academy_courses to authenticated;

-- ── 4) Refrescar la caché del API REST (esto borra el 400 al instante) ─
notify pgrst, 'reload schema';
