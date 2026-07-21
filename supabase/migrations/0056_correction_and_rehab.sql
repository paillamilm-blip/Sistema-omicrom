-- =====================================================================
-- 0056_correction_and_rehab.sql
-- Flujo de entrega v2: Ghost Approval escalonado por monto + "Pedir
-- Corrección" (estado intermedio antes de la disputa) + rehabilitación
-- de reputación por racha de entregas exitosas.
--
-- Decisiones de diseño (confirmadas con el producto):
--   • Ghost Approval escalonado por monto del contrato:
--       < 100 Ω        → 1 hora
--       100–500 Ω      → 24 horas
--       > 500 Ω        → 48 horas
--   • El comprador puede PEDIR CORRECCIÓN (máx. 1 ronda) en vez de
--     disputar de inmediato. Al pedir corrección el reloj de Ghost
--     Approval se CONGELA (estado CORRECTION_REQUESTED). El vendedor
--     tiene 24 h para re-entregar; al re-entregar arranca un nuevo
--     Ghost Approval del mismo tramo.
--   • Tras 1 corrección, el comprador solo puede APROBAR u OBJETAR.
--   • Rehabilitación: 5 entregas RELEASED consecutivas limpian la marca
--     (penalización) más antigua del vendedor. La racha se rompe SOLO
--     cuando se registra una penalización (p.ej. disputa perdida).
--     Convive con el decaimiento por tiempo de 0042 (dos vías de recuperación).
--
-- Idempotente. Seguro de correr varias veces.
-- =====================================================================

-- ── 1) Columnas nuevas en contracts ──────────────────────────────────
alter table public.contracts
  add column if not exists ghost_approval_deadline timestamptz,
  add column if not exists correction_count        integer not null default 0,
  add column if not exists correction_requested_at timestamptz,
  add column if not exists correction_deadline      timestamptz,
  add column if not exists correction_reason        text;

-- ── 2) Columna de racha de éxito en profiles ─────────────────────────
alter table public.profiles
  add column if not exists success_streak integer not null default 0;

-- ── 3) State machine: agregar CORRECTION_REQUESTED ───────────────────
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in (
    'PENDING','LOCKED','DELIVERED','CORRECTION_REQUESTED',
    'RELEASED','DISPUTED','REFUNDED'
  ));

-- ── 4) Helper: ventana de Ghost Approval según el monto ──────────────
-- Fuente única de verdad del escalonamiento (usada por declare_delivery
-- y replicada en la Edge Function ghost-approval para el barrido).
create or replace function public.ghost_approval_interval(p_amount numeric)
returns interval language sql immutable as $$
  select case
    when coalesce(p_amount, 0) < 100  then interval '1 hour'
    when coalesce(p_amount, 0) <= 500 then interval '24 hours'
    else interval '48 hours'
  end;
$$;

-- ── 5) declare_delivery(): fija deadline escalonado + soporta re-entrega
-- Ahora acepta también CORRECTION_REQUESTED (re-entrega tras corrección).
-- Al declarar/re-declarar entrega, fija ghost_approval_deadline según el
-- monto y limpia el estado de corrección pendiente.
create or replace function public.declare_delivery(p_contract_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.seller_id then raise exception 'Solo el vendedor puede declarar la entrega'; end if;
  if c.status not in ('LOCKED','PENDING','CORRECTION_REQUESTED') then
    raise exception 'El contrato no está en curso';
  end if;

  update public.contracts
    set status                  = 'DELIVERED',
        delivery_declared_at    = now(),
        ghost_approval_deadline = now() + public.ghost_approval_interval(c.amount),
        delivery_note           = coalesce(p_note, delivery_note),
        correction_requested_at = null,
        correction_deadline     = null,
        correction_reason       = null,
        updated_at              = now()
  where id = p_contract_id;

  -- Notificar al comprador (re-entrega tras corrección)
  if c.status = 'CORRECTION_REQUESTED' then
    insert into public.notifications (user_id, type, title, message, related_id)
    values (c.buyer_id, 'CONTRACT_UPDATE', 'Corrección entregada',
            'El vendedor re-entregó "' || c.title || '". Revisa la solución nuevamente.',
            p_contract_id);
  end if;
end; $$;
grant execute on function public.declare_delivery(uuid, text) to authenticated;

-- ── 5b) object_delivery(): permitir disputar también tras una corrección
-- Redefinición: acepta objetar sobre DELIVERED o CORRECTION_REQUESTED.
-- (Mismo cuerpo que 9999_audit_consolidado.sql, ampliando el guard de estado.)
create or replace function public.object_delivery(p_contract_id uuid, p_reason text default 'Objeción durante Ghost Approval')
returns uuid language plpgsql security definer set search_path = public as $$
declare c record; v_other uuid; v_dispute uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id and auth.uid() <> c.seller_id then raise exception 'No autorizado'; end if;
  if c.status not in ('DELIVERED','CORRECTION_REQUESTED') then
    raise exception 'Solo se puede objetar una entrega en curso';
  end if;
  v_other := case when auth.uid() = c.buyer_id then c.seller_id else c.buyer_id end;
  insert into public.disputes (contract_id, plaintiff_id, defendant_id, reason, status)
  values (p_contract_id, auth.uid(), v_other,
          coalesce(nullif(btrim(p_reason),''),'Objeción durante Ghost Approval'),'OPENED')
  returning id into v_dispute;
  update public.contracts set status='DISPUTED', updated_at=now()
  where id = p_contract_id and status in ('DELIVERED','CORRECTION_REQUESTED');
  return v_dispute;
end; $$;
grant execute on function public.object_delivery(uuid, text) to authenticated;

-- ── 6) request_correction(): comprador pide corrección (máx. 1 ronda) ─
-- Congela el Ghost Approval pasando el contrato a CORRECTION_REQUESTED.
-- El vendedor tiene 24 h (correction_deadline) para re-entregar.
create or replace function public.request_correction(p_contract_id uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id then raise exception 'Solo el comprador puede pedir una corrección'; end if;
  if c.status <> 'DELIVERED' then raise exception 'Solo se puede pedir corrección sobre una entrega en curso'; end if;
  if coalesce(c.correction_count, 0) >= 1 then
    raise exception 'Ya usaste tu ronda de corrección. Ahora solo puedes aprobar u objetar.';
  end if;

  update public.contracts
    set status                  = 'CORRECTION_REQUESTED',
        correction_count        = coalesce(correction_count, 0) + 1,
        correction_requested_at = now(),
        correction_deadline     = now() + interval '24 hours',
        correction_reason       = coalesce(nullif(btrim(p_reason), ''), 'Sin detalle'),
        ghost_approval_deadline = null,   -- congela el reloj
        updated_at              = now()
  where id = p_contract_id and status = 'DELIVERED';

  insert into public.notifications (user_id, type, title, message, related_id)
  values (c.seller_id, 'CONTRACT_UPDATE', 'Corrección solicitada',
          'El comprador pidió una corrección en "' || c.title ||
          '". Tienes 24 h para re-entregar. Motivo: ' ||
          coalesce(nullif(btrim(p_reason), ''), 'sin detalle'),
          p_contract_id);
end; $$;
grant execute on function public.request_correction(uuid, text) to authenticated;

-- ── 7) Rehabilitación: limpiar la marca más antigua del vendedor ─────
-- Restaura el impacto de reputación de la penalización más antigua aún
-- vigente y la marca como recuperada. Devuelve true si limpió una marca.
create or replace function public.rehabilitate_oldest_mark(p_user_id uuid)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  v_pen record; v_old_rep numeric; v_new_rep numeric;
begin
  select * into v_pen
  from public.penalties
  where user_id = p_user_id
    and recovered_at is null
    and current_pmc_points > 0
  order by created_at asc
  limit 1
  for update;

  if v_pen.id is null then
    return false;  -- no hay marcas activas que limpiar
  end if;

  -- Restaura el impacto de reputación (reputation_impact es negativo)
  select coalesce(reputation_score, 50) into v_old_rep from public.profiles where id = p_user_id;
  v_new_rep := greatest(least(v_old_rep + abs(v_pen.reputation_impact), 100), 0);

  update public.profiles set reputation_score = v_new_rep where id = p_user_id;

  update public.penalties
    set current_pmc_points = 0,
        recovered_at       = now(),
        reason             = coalesce(reason, '') || ' [rehabilitada por racha de entregas]'
  where id = v_pen.id;

  insert into public.reputation_history (user_id, old_reputation, new_reputation, reason)
  values (p_user_id, v_old_rep, v_new_rep,
          'Rehabilitación por racha: marca ' || v_pen.penalty_type || ' limpiada');

  return true;
end; $fn$;

-- ── 8) Trigger: racha de entregas exitosas (RELEASED) ────────────────
-- Al pasar un contrato a RELEASED, +1 a la racha del vendedor. Al llegar
-- a 5, limpia la marca más antigua y reinicia la racha.
create or replace function public.on_contract_released()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_streak integer;
begin
  if new.status = 'RELEASED' and coalesce(old.status, '') <> 'RELEASED' then
    update public.profiles
      set success_streak = coalesce(success_streak, 0) + 1
      where id = new.seller_id
      returning success_streak into v_streak;

    if coalesce(v_streak, 0) >= 5 then
      perform public.rehabilitate_oldest_mark(new.seller_id);
      update public.profiles set success_streak = 0 where id = new.seller_id;
    end if;
  end if;
  return new;
end; $fn$;

drop trigger if exists trg_contract_released on public.contracts;
create trigger trg_contract_released
  after update of status on public.contracts
  for each row execute function public.on_contract_released();

-- ── 9) Trigger: una penalización rompe la racha ──────────────────────
create or replace function public.on_penalty_break_streak()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  update public.profiles set success_streak = 0 where id = new.user_id;
  return new;
end; $fn$;

drop trigger if exists trg_penalty_break_streak on public.penalties;
create trigger trg_penalty_break_streak
  after insert on public.penalties
  for each row execute function public.on_penalty_break_streak();

-- ── 10) Backfill: fijar deadline a contratos DELIVERED sin deadline ──
update public.contracts
set ghost_approval_deadline = coalesce(delivery_declared_at, now())
                              + public.ghost_approval_interval(amount)
where status = 'DELIVERED' and ghost_approval_deadline is null;
