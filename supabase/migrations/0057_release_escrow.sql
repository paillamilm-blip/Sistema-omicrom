-- =====================================================================
-- 0057_release_escrow.sql — Liberación de escrow (aprobación del comprador)
--
-- Contexto (auditoría del flujo de contratos):
--   • El frontend (ChatTab.tsx, botón APROBAR) llama supabase.rpc('release_escrow', …)
--     pero la función NO estaba versionada en ninguna migración. Esta migración
--     la define de forma canónica y reproducible.
--   • Modelo de escrow canónico (igual que resolve_dispute en 0021/0029/0042):
--       el escrow se retiene en el COMPRADOR (profiles.token_escrow del buyer).
--       Al liberar: buyer.token_escrow − amount  y  seller.token_balance + amount.
--   • Bug corregido: ghost_release_funds() (0055) descontaba el escrow del
--     VENDEDOR en vez del COMPRADOR. Aquí se redefine correctamente.
--
-- Idempotente.
-- =====================================================================

-- ── 1) release_escrow(): el comprador aprueba y libera los fondos ────
create or replace function public.release_escrow(p_contract_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare c record;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id then
    raise exception 'Solo el comprador puede aprobar y liberar los fondos';
  end if;
  if c.status not in ('DELIVERED','CORRECTION_REQUESTED') then
    raise exception 'Solo se puede liberar una entrega en curso';
  end if;

  -- Mover escrow: comprador (token_escrow) → vendedor (token_balance)
  update public.profiles
    set token_escrow = greatest(coalesce(token_escrow, 0) - c.amount, 0)
  where id = c.buyer_id;
  update public.profiles
    set token_balance = coalesce(token_balance, 0) + c.amount
  where id = c.seller_id;

  -- Marcar RELEASED (dispara trg_contract_released → racha/rehabilitación)
  update public.contracts
    set status = 'RELEASED', completed_at = now(), updated_at = now()
  where id = p_contract_id and status in ('DELIVERED','CORRECTION_REQUESTED');

  -- Registro en billetera
  insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
  values (c.seller_id, 'escrow_release', c.amount, 'Entrega aprobada: ' || c.title, c.id);

  -- +30 PE por entrega exitosa (paridad con Ghost Approval)
  perform public.increment_pe(c.seller_id, 30);

  -- Notificar al vendedor
  insert into public.notifications (user_id, type, title, message, related_id)
  values (c.seller_id, 'CONTRACT_COMPLETED', 'Pago liberado',
          'El comprador aprobó "' || c.title || '". +' || c.amount || ' Ω', c.id);
end; $fn$;
grant execute on function public.release_escrow(uuid) to authenticated;

-- ── 2) ghost_release_funds(): corrección del lado del escrow ─────────
-- Misma firma que 0055 (la Edge Function ghost-approval no cambia su llamada),
-- pero ahora descuenta el escrow del COMPRADOR (quien lo retiene), no del vendedor.
create or replace function public.ghost_release_funds(
  p_contract_id uuid,
  p_seller_id   uuid,
  p_amount      numeric
)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_buyer uuid;
begin
  -- Incrementar token_balance del vendedor (atómico)
  update public.profiles
    set token_balance = coalesce(token_balance, 0) + p_amount
  where id = p_seller_id;

  -- Descontar el escrow del COMPRADOR del contrato (quien lo retiene)
  select buyer_id into v_buyer from public.contracts where id = p_contract_id;
  if v_buyer is not null then
    update public.profiles
      set token_escrow = greatest(coalesce(token_escrow, 0) - p_amount, 0)
    where id = v_buyer;
  end if;

  raise notice '[ghost_release_funds] Contract %, buyer %, seller %, amount %', p_contract_id, v_buyer, p_seller_id, p_amount;
end; $fn$;

-- ── 3) ghost_release_contract(): liberación ATÓMICA para el cron ─────
-- La usa la Edge Function ghost-approval (service_role). Hace TODO en una
-- sola transacción para evitar estados parciales (contrato RELEASED sin
-- pago, o pago doble): mueve el escrow, marca RELEASED + completed_at,
-- registra la transacción y suma PE. Idempotente vía el guard status.
-- Devuelve true si liberó, false si el contrato ya no estaba DELIVERED.
create or replace function public.ghost_release_contract(p_contract_id uuid)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare c record;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then return false; end if;
  if c.status <> 'DELIVERED' then return false; end if;  -- idempotencia / race guard

  -- Escrow: comprador (token_escrow) → vendedor (token_balance)
  update public.profiles
    set token_escrow = greatest(coalesce(token_escrow, 0) - c.amount, 0)
  where id = c.buyer_id;
  update public.profiles
    set token_balance = coalesce(token_balance, 0) + c.amount
  where id = c.seller_id;

  -- Estado RELEASED (dispara trg_contract_released exactamente una vez)
  update public.contracts
    set status = 'RELEASED', completed_at = now(), updated_at = now()
  where id = p_contract_id and status = 'DELIVERED';

  insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
  values (c.seller_id, 'escrow_release', c.amount,
          'Ghost Approval: "' || c.title || '" liberado automáticamente', c.id);

  perform public.increment_pe(c.seller_id, 30);
  return true;
end; $fn$;
