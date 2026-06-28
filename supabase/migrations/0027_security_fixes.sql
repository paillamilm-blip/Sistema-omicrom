-- =====================================================================
-- 0027_security_fixes.sql — Cierre de hallazgos de auditoría (RLS)
-- 🔴 CRÍTICO: human_venture_stakes permitía INSERT directo del cliente
--    (creaba stakes sin pagar -> withdraw_stake devolvía +15% gratis).
-- Se cierra: los stakes SOLO se crean vía create_stake (SECURITY DEFINER).
-- También se limpian políticas duplicadas y se acota la lectura.
-- Idempotente.
-- =====================================================================

-- ── 1) human_venture_stakes: quitar INSERT del cliente (CRÍTICO) ─────
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='human_venture_stakes' loop
    execute format('drop policy if exists %I on public.human_venture_stakes', r.policyname);
  end loop; end $$;

alter table public.human_venture_stakes enable row level security;

create policy hvs_select_own on public.human_venture_stakes
  for select to authenticated
  using (auth.uid() = investor_id or auth.uid() = target_id);
-- ⛔ Sin INSERT/UPDATE de cliente: solo create_stake / withdraw_stake (SECURITY DEFINER).

grant select on public.human_venture_stakes to authenticated;
revoke insert, update, delete on public.human_venture_stakes from authenticated;

-- ── 2) arbitration_cases: lectura solo árbitros y partes ─────────────
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='arbitration_cases' loop
    execute format('drop policy if exists %I on public.arbitration_cases', r.policyname);
  end loop; end $$;

alter table public.arbitration_cases enable row level security;

create policy arbcase_select on public.arbitration_cases
  for select to authenticated
  using (
    auth.uid() = any(arbiters)
    or exists (select 1 from public.disputes d
               where d.id = arbitration_cases.dispute_id
                 and (auth.uid() = d.plaintiff_id or auth.uid() = d.defendant_id))
  );

grant select on public.arbitration_cases to authenticated;
revoke insert, update, delete on public.arbitration_cases from authenticated;

-- ── 3) disputes: políticas limpias (insert = demandante; lectura partes/árbitros)
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='disputes' loop
    execute format('drop policy if exists %I on public.disputes', r.policyname);
  end loop; end $$;

alter table public.disputes enable row level security;

create policy disputes_select on public.disputes
  for select to authenticated
  using (
    auth.uid() = plaintiff_id or auth.uid() = defendant_id
    or exists (select 1 from public.arbitration_cases ac
               where ac.dispute_id = disputes.id and auth.uid() = any(ac.arbiters))
  );

create policy disputes_insert on public.disputes
  for insert to authenticated
  with check (auth.uid() = plaintiff_id);

grant select, insert on public.disputes to authenticated;
revoke update, delete on public.disputes from authenticated;
