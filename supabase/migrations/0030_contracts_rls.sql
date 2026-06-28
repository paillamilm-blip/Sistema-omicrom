-- =====================================================================
-- 0030_contracts_rls.sql — Hallazgo M1: versionar el RLS de contracts
-- Estas políticas ya estaban en la BD (se corrieron a mano). Aquí quedan
-- guardadas en una migración para no perderlas si se recrea la base.
-- Idempotente.
-- =====================================================================

alter table public.contracts enable row level security;

-- Ver: solo las partes del contrato
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- Crear: solo el comprador (el escrow se bloquea por trigger)
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts
  for insert to authenticated
  with check (auth.uid() = buyer_id);

-- Actualizar: partes del contrato.
-- NOTA: los cambios de estado/calificación reales van por RPCs SECURITY DEFINER
-- (declare_delivery, release_escrow, object_delivery, rate_contract).
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts
  for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

grant select, insert, update on public.contracts to authenticated;

notify pgrst, 'reload schema';
