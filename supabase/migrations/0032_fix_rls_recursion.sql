-- ════════════════════════════════════════════════════════════════════════
-- 0032_fix_rls_recursion.sql
-- 🔴 FIX: recursión infinita de RLS (Postgres 42P17 -> HTTP 500) entre
-- `disputes` y `arbitration_cases`.
--
-- Causa: la política de `disputes` consultaba `arbitration_cases` y la de
-- `arbitration_cases` consultaba `disputes` => se evaluaban mutuamente sin fin.
--
-- Solución: los chequeos cruzados se mueven a funciones SECURITY DEFINER
-- (corren como owner y NO disparan el RLS de la otra tabla), rompiendo el ciclo.
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════════

-- ── Helpers SECURITY DEFINER (saltan RLS -> sin recursión) ──
create or replace function public.is_arbiter_of(p_dispute_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.arbitration_cases ac
    where ac.dispute_id = p_dispute_id
      and auth.uid() = any (ac.arbiters)
  );
$fn$;

create or replace function public.is_party_of(p_dispute_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $fn$
  select exists (
    select 1 from public.disputes d
    where d.id = p_dispute_id
      and auth.uid() in (d.plaintiff_id, d.defendant_id)
  );
$fn$;

grant execute on function public.is_arbiter_of(uuid)  to authenticated;
grant execute on function public.is_party_of(uuid)    to authenticated;

-- ── disputes: partes (directo) o árbitro (vía helper, sin recursión) ──
drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes
  for select to authenticated
  using (
    auth.uid() = plaintiff_id
    or auth.uid() = defendant_id
    or public.is_arbiter_of(id)
  );

-- ── arbitration_cases: árbitro (directo) o parte (vía helper, sin recursión) ──
drop policy if exists arbcase_select on public.arbitration_cases;
create policy arbcase_select on public.arbitration_cases
  for select to authenticated
  using (
    auth.uid() = any (arbiters)
    or public.is_party_of(dispute_id)
  );
