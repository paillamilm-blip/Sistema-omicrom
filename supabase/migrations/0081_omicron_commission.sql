-- ══════════════════════════════════════════════════════════════════════
-- 0081_omicron_commission.sql
-- COMISIÓN ÓMICROM — ETAPA 2: EL COBRO REAL.
--
-- Hasta hoy la app MOSTRABA la comisión pero NO la cobraba: release_escrow
-- (0070) y ghost_release_funds (0055) transferían el monto COMPLETO al
-- vendedor. Esta migración hace que la red efectivamente se financie.
--
-- MODELO (decisión del fundador):
--   • Se cobra SOLO sobre lo que la persona GANA: liberación de escrow de un
--     contrato. NO se cobra en recargas, retiros ni transferencias.
--   • Lo paga QUIEN RECIBE (el vendedor), descontado de su pago. El comprador
--     paga exactamente el precio publicado: su costo NO cambia.
--   • Tasa ESCALONADA por reputación, baja al subir de nivel:
--       reputación  0-49  (Estudiante)  -> 100 bps = 1.0 %
--       reputación 50-79  (Técnico)     ->  80 bps = 0.8 %
--       reputación 80-100 (Arquitecto)  ->  50 bps = 0.5 %
--   • PIONERO: piso de 50 bps (0.5 %) de por vida, sin importar su banda.
--
-- ESPEJA EXACTAMENTE al cliente: src/features/omicron/utils/commissionQuote.ts
-- (misma tabla de bps, mismo piso Pionero, mismo redondeo FLOOR). El SERVIDOR
-- es la única fuente de verdad; el cliente solo muestra.
--
-- ⚠️ LEER ANTES DE APLICAR — DOS ADVERTENCIAS EN "ADVERTENCIAS" AL FINAL.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   supabase db push
--   (o pegar este archivo completo en el SQL Editor de Supabase)
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   -- 1) La tabla de tasas responde lo esperado:
--   select public.omicron_commission_bps( 10, false) as estudiante_debe_ser_100,
--          public.omicron_commission_bps( 60, false) as tecnico_debe_ser_80,
--          public.omicron_commission_bps( 90, false) as arquitecto_debe_ser_50,
--          public.omicron_commission_bps( 10, true ) as pionero_debe_ser_50;
--
--   -- 2) El libro de ingresos existe y está vacío al inicio:
--   select count(*) from public.omicron_platform_revenue;
--
--   -- 3) Tus ingresos acumulados (esta es LA consulta del negocio):
--   select count(*)            as contratos_cobrados,
--          sum(gross_amount)   as volumen_transado,
--          sum(commission)     as tu_ingreso,
--          round(avg(bps)/100.0, 2) as tasa_promedio_pct
--   from public.omicron_platform_revenue;
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   -- Vuelve al comportamiento anterior (transferir el monto COMPLETO).
--   -- El libro de ingresos se CONSERVA a propósito: es tu registro contable
--   -- histórico y borrarlo perdería datos reales. Bórralo solo a mano si
--   -- estás seguro:  drop table public.omicron_platform_revenue;
--   \i supabase/migrations/0070_missing_rpcs_connections_dms.sql
--   \i supabase/migrations/0055_ghost_approval_rpcs.sql
--   drop function if exists public.omicron_commission_bps(numeric, boolean);
--   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. LIBRO DE INGRESOS DE LA PLATAFORMA
-- ══════════════════════════════════════════════════════════════════════
-- Por qué una TABLA y no un "perfil plataforma": profiles está pensada para
-- personas (RLS por auth.uid(), triggers de reputación, ejes, PE). Meter un
-- perfil ficticio ahí lo ensuciaría y podría aparecer en rankings, búsquedas
-- o matchmaking. Un libro contable propio es más limpio y más auditable.
--
-- El UNIQUE en contract_id es la GARANTÍA DURA contra el doble cobro: un
-- contrato puede generar comisión UNA sola vez en la historia de la base,
-- incluso si una función se llama dos veces por un reintento de red.
create table if not exists public.omicron_platform_revenue (
  id            uuid primary key default gen_random_uuid(),
  contract_id   uuid not null unique,
  seller_id     uuid,
  source        text not null check (source in ('escrow_release', 'ghost_release')),
  gross_amount  numeric not null,          -- lo que pagó el comprador
  commission    numeric not null,          -- lo que gana Ómicrom
  net_amount    numeric not null,          -- lo que recibió el vendedor
  bps           integer not null,          -- tasa aplicada (100 | 80 | 50)
  was_pioneer   boolean not null default false,
  created_at    timestamptz not null default now()
);

comment on table public.omicron_platform_revenue is
  'Libro contable de la Comisión Ómicrom. Una fila por contrato cobrado. El UNIQUE(contract_id) impide el doble cobro.';

create index if not exists idx_platform_revenue_created
  on public.omicron_platform_revenue (created_at desc);

-- RLS activa SIN políticas: ningún usuario autenticado puede leer ni escribir
-- este libro. Solo el service_role (dashboard de Supabase, Edge Functions) y
-- las funciones SECURITY DEFINER de abajo. Son tus números, no son públicos.
alter table public.omicron_platform_revenue enable row level security;


-- ══════════════════════════════════════════════════════════════════════
-- 2. LA TABLA DE TASAS (única fuente de verdad del servidor)
-- ══════════════════════════════════════════════════════════════════════
-- IMMUTABLE: misma entrada -> misma salida siempre. Permite que Postgres la
-- use en índices/expresiones y la vuelve trivial de testear.
create or replace function public.omicron_commission_bps(
  p_reputation numeric,
  p_is_pioneer boolean default false
)
returns integer
language plpgsql
immutable
set search_path = public
as $fn$
declare
  v_rep numeric := coalesce(p_reputation, 0);
  v_bps integer;
begin
  -- Mismos cortes que levelBandFor() en el cliente: 0 / 50 / 80.
  if v_rep >= 80 then
    v_bps := 50;    -- Arquitecto
  elsif v_rep >= 50 then
    v_bps := 80;    -- Técnico
  else
    v_bps := 100;   -- Estudiante
  end if;

  -- Beneficio Pionero: PISO de 0.5 %, no un descuento fijo. Con least() el
  -- Pionero siempre se queda con la tasa más conveniente para él, incluso si
  -- en el futuro alguna banda bajara de 0.5 %.
  if coalesce(p_is_pioneer, false) then
    v_bps := least(v_bps, 50);
  end if;

  return v_bps;
end;
$fn$;

comment on function public.omicron_commission_bps(numeric, boolean) is
  'Comisión Ómicrom en puntos básicos (100=1%). Espeja commissionQuote.ts del cliente.';

grant execute on function public.omicron_commission_bps(numeric, boolean) to authenticated;
grant execute on function public.omicron_commission_bps(numeric, boolean) to anon;


-- ══════════════════════════════════════════════════════════════════════
-- 3. RELEASE_ESCROW — el comprador aprueba y se libera el pago
-- ══════════════════════════════════════════════════════════════════════
-- Reemplaza la versión de 0070. Se conservan TODAS las validaciones y TODOS
-- los efectos anteriores (chequeo de comprador, estados válidos, descuento de
-- escrow, flip a RELEASED, contador de contratos, transacción de billetera).
-- Lo ÚNICO que cambia: el vendedor recibe el NETO y la comisión queda
-- registrada en el libro de ingresos.
create or replace function public.release_escrow(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c             record;
  v_rep         numeric;
  v_pioneer     boolean;
  v_bps         integer;
  v_commission  numeric;
  v_net         numeric;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id then raise exception 'Solo el comprador puede aprobar'; end if;
  if c.status not in ('DELIVERED', 'LOCKED') then raise exception 'El contrato no está en estado de aprobación'; end if;

  -- ── Comisión Ómicrom ──────────────────────────────────────────────
  -- Se lee la reputación REAL del vendedor en este instante (no una copia
  -- vieja): su nivel de hoy determina su tasa de hoy.
  select coalesce(reputation_score, 0), coalesce(is_pioneer, false)
    into v_rep, v_pioneer
    from public.profiles where id = c.seller_id;

  v_bps        := public.omicron_commission_bps(v_rep, v_pioneer);
  -- FLOOR: la fracción queda para el VENDEDOR, nunca para la plataforma.
  -- Garantiza commission <= amount y que net nunca sea negativo.
  v_commission := floor(c.amount * v_bps / 10000.0);
  v_net        := c.amount - v_commission;

  -- El vendedor recibe el NETO.
  update public.profiles
  set token_balance = coalesce(token_balance, 0) + v_net
  where id = c.seller_id;

  -- Del escrow del comprador sale el monto COMPLETO: él pagó el precio
  -- publicado y su costo no cambió por la comisión.
  update public.profiles
  set token_escrow = greatest(0, coalesce(token_escrow, 0) - c.amount)
  where id = c.buyer_id;

  update public.contracts
  set status = 'RELEASED', completed_at = now(), updated_at = now()
  where id = p_contract_id;

  update public.profiles
  set total_contracts_completed = coalesce(total_contracts_completed, 0) + 1
  where id = c.seller_id;

  -- Movimiento del vendedor: el NETO que realmente entró.
  insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id, description)
  values (c.seller_id, v_net, 'escrow_release', p_contract_id, 'Pago liberado por ' || c.title);

  -- La comisión se registra SOLO si existe. Con montos muy chicos el floor la
  -- deja en 0 y entonces no se inserta una fila de "comisión 0" que solo
  -- ensuciaría el historial del usuario. No hay comisión mínima.
  if v_commission > 0 then
    insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id, description)
    values (
      c.seller_id,
      -v_commission,   -- negativo: es un DESCUENTO sobre lo que recibió
      'commission',
      p_contract_id,
      'Comisión Ómicrom ' || round(v_bps / 100.0, 2) || ' %'
    );

    -- Libro de ingresos. ON CONFLICT: si por un reintento esta función corre
    -- dos veces para el mismo contrato, la comisión NO se duplica.
    insert into public.omicron_platform_revenue
      (contract_id, seller_id, source, gross_amount, commission, net_amount, bps, was_pioneer)
    values
      (p_contract_id, c.seller_id, 'escrow_release', c.amount, v_commission, v_net, v_bps, v_pioneer)
    on conflict (contract_id) do nothing;
  end if;
end;
$fn$;

grant execute on function public.release_escrow(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 4. GHOST_RELEASE_FUNDS — liberación automática (Edge Function)
-- ══════════════════════════════════════════════════════════════════════
-- Reemplaza la versión de 0055. Backend-only (service_role), NO se expone a
-- authenticated. Cambios: aplica la misma comisión, y gana una GUARDA DE
-- IDEMPOTENCIA que antes no tenía (ver ADVERTENCIA 2 al final).
create or replace function public.ghost_release_funds(
  p_contract_id uuid,
  p_seller_id   uuid,
  p_amount      numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_rep         numeric;
  v_pioneer     boolean;
  v_bps         integer;
  v_commission  numeric;
  v_net         numeric;
  v_already     boolean;
begin
  -- GUARDA DE IDEMPOTENCIA: si este contrato ya se cobró, no se paga de nuevo.
  -- Antes esta función no tenía ninguna guarda: dos llamadas (un reintento de
  -- la Edge Function) pagaban DOS VECES al vendedor.
  select exists(
    select 1 from public.omicron_platform_revenue where contract_id = p_contract_id
  ) into v_already;

  if v_already then
    raise notice '[ghost_release_funds] Contrato % ya fue liberado; no se paga de nuevo.', p_contract_id;
    return;
  end if;

  select coalesce(reputation_score, 0), coalesce(is_pioneer, false)
    into v_rep, v_pioneer
    from public.profiles where id = p_seller_id;

  v_bps        := public.omicron_commission_bps(v_rep, v_pioneer);
  v_commission := floor(coalesce(p_amount, 0) * v_bps / 10000.0);
  v_net        := coalesce(p_amount, 0) - v_commission;

  -- El vendedor recibe el NETO (atómico).
  update public.profiles
  set token_balance = coalesce(token_balance, 0) + v_net
  where id = p_seller_id;

  -- Se conserva EXACTAMENTE el comportamiento de escrow de 0055, incluido su
  -- manejo de columna inexistente. Ver ADVERTENCIA 1: este descuento apunta al
  -- vendedor, no al comprador. No se cambia acá a propósito.
  begin
    update public.profiles
    set token_escrow = greatest(coalesce(token_escrow, 0) - coalesce(p_amount, 0), 0)
    where id = p_seller_id;
  exception when undefined_column then
    null;
  end;

  if v_commission > 0 then
    insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id, description)
    values (
      p_seller_id, -v_commission, 'commission', p_contract_id,
      'Comisión Ómicrom ' || round(v_bps / 100.0, 2) || ' %'
    );
  end if;

  -- Se registra SIEMPRE (incluso con comisión 0) porque esta fila es también
  -- la marca de "este contrato ya se liberó" que usa la guarda de arriba.
  insert into public.omicron_platform_revenue
    (contract_id, seller_id, source, gross_amount, commission, net_amount, bps, was_pioneer)
  values
    (p_contract_id, p_seller_id, 'ghost_release', coalesce(p_amount, 0), v_commission, v_net, v_bps, v_pioneer)
  on conflict (contract_id) do nothing;

  raise notice '[ghost_release_funds] Contrato %, vendedor %, bruto %, comisión %, neto %',
    p_contract_id, p_seller_id, p_amount, v_commission, v_net;
end;
$fn$;

-- Backend-only: NO se otorga a authenticated (igual que en 0055).
revoke all on function public.ghost_release_funds(uuid, uuid, numeric) from public;


-- ══════════════════════════════════════════════════════════════════════
-- 5. RECARGAR EL ESQUEMA DE LA API
-- ══════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════
-- ADVERTENCIAS (leer antes de aplicar)
-- ══════════════════════════════════════════════════════════════════════
--
-- ADVERTENCIA 1 — BUG PREEXISTENTE QUE NO TOQUÉ (decisión consciente):
--   ghost_release_funds descuenta el escrow del VENDEDOR (p_seller_id), pero
--   el escrow lo retiene el COMPRADOR. La versión de 0055 ya lo hacía así.
--   NO lo cambié porque corregirlo mueve saldos reales y merece tu decisión
--   explícita, no un arreglo silencioso escondido en otra migración.
--   El arreglo, si lo querés, es apuntar ese UPDATE al comprador del contrato:
--     update public.profiles
--     set token_escrow = greatest(coalesce(token_escrow,0) - p_amount, 0)
--     where id = (select buyer_id from public.contracts where id = p_contract_id);
--
-- ADVERTENCIA 2 — ghost_release_funds NO cambia el estado del contrato:
--   igual que en 0055, no hace flip a 'RELEASED' (lo hace su Edge Function).
--   Por eso la guarda de idempotencia se apoya en el libro de ingresos y no en
--   contracts.status. Efecto secundario BUENO: desde ahora un reintento no
--   puede pagar dos veces.
--
-- ADVERTENCIA 3 — TODOS TUS USUARIOS SON PIONEROS HOY:
--   en 0000_base_schema.sql, profiles.is_pioneer es `not null default true`.
--   Con el piso Pionero de 0.5 %, eso significa que HOY TODO EL MUNDO paga
--   0.5 % y las tasas de 1 % y 0.8 % nunca se aplicarían. Tu ingreso sería la
--   MITAD del máximo del modelo.
--   Es coherente con la "Etapa Fundacional" que muestra la pantalla de login,
--   pero es una decisión de negocio, no un detalle técnico. Si querés cerrar
--   la ventana de Pioneros en algún momento:
--     alter table public.profiles alter column is_pioneer set default false;
--     -- (los Pioneros ya existentes conservan su beneficio: no se toca su fila)
-- ══════════════════════════════════════════════════════════════════════
