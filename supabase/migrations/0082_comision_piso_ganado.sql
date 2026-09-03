-- ══════════════════════════════════════════════════════════════════════
-- 0082_comision_piso_ganado.sql
-- CORRIGE 0081: el 0.5 % permanente SE GANA, no se regala.
--
-- QUÉ ESTABA MAL: 0081 usaba `is_pioneer` como piso de 0.5 %. Pero en
-- 0000_base_schema.sql esa columna es `not null default true`, así que TODOS
-- los usuarios son Pioneros y TODOS habrían pagado 0.5 %. Las tasas de 1 % y
-- 0.8 % nunca se habrían aplicado y el ingreso del fundador habría sido la
-- MITAD del modelo. No era la intención.
--
-- REGLA CORRECTA (palabras del fundador): el 0.5 % permanente es para "una
-- persona que ya subió todos los niveles, lleva tiempo y participa
-- activamente". Es un PREMIO POR TRAYECTORIA, no un regalo de bienvenida.
--
-- Se traduce en TRES requisitos, uno por cada cosa que pidió:
--   1. "subió todos los niveles" -> reputation_score >= 80 (Arquitecto)
--   2. "lleva tiempo"            -> antigüedad >= 90 días
--   3. "participa activamente"   -> >= 5 contratos completados
--
-- Y "PERMANENTE" significa permanente de verdad: el día que cumple los tres,
-- se GRABA la fecha en profiles.commission_floor_locked_at y desde entonces
-- paga 0.5 % PARA SIEMPRE, incluso si más adelante su reputación baja por una
-- penalización. Ganado es ganado.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   supabase db push
--   Es idempotente y se puede aplicar HAYA O NO corrido 0081.
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   -- 1) Las tasas base (ya sin Pionero):
--   select public.omicron_commission_bps(10) as estudiante_100,
--          public.omicron_commission_bps(60) as tecnico_80,
--          public.omicron_commission_bps(90) as arquitecto_50;
--
--   -- 2) Quién está cerca de ganarse el 0.5 % permanente:
--   select username, reputation_score, total_contracts_completed,
--          date_trunc('day', member_since) as miembro_desde,
--          commission_floor_locked_at      as gano_el_050
--   from public.profiles
--   order by reputation_score desc nulls last
--   limit 20;
--
--   -- 3) Cuántos lo tienen ganado (debería ser 0 o muy pocos al inicio):
--   select count(*) from public.profiles where commission_floor_locked_at is not null;
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   -- Vuelve al comportamiento de 0081 (piso por is_pioneer):
--   \i supabase/migrations/0081_omicron_commission.sql
--   -- Las columnas nuevas se pueden dejar (son inertes) o quitar:
--   -- alter table public.profiles drop column if exists commission_floor_locked_at;
--   -- alter table public.profiles drop column if exists member_since;
--   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. COLUMNAS NUEVAS
-- ══════════════════════════════════════════════════════════════════════

-- ANTIGÜEDAD: profiles NO tenía ninguna fecha de alta (solo updated_at, que
-- cambia con cada edición y por lo tanto no sirve para medir trayectoria).
-- Sin esta columna, "lleva tiempo" era imposible de medir.
alter table public.profiles
  add column if not exists member_since timestamptz;

-- Backfill: la verdad histórica está en auth.users.created_at. Para filas sin
-- usuario correspondiente se usa updated_at como aproximación conservadora.
update public.profiles p
set member_since = coalesce(u.created_at, p.updated_at, now())
from auth.users u
where u.id = p.id and p.member_since is null;

update public.profiles
set member_since = coalesce(updated_at, now())
where member_since is null;

alter table public.profiles
  alter column member_since set default now();

comment on column public.profiles.member_since is
  'Fecha de alta real (backfill desde auth.users.created_at). Mide la antigüedad para el piso de comisión ganado.';

-- EL PREMIO GRABADO: null = todavía no lo ganó. Con fecha = lo ganó ese día y
-- ya no lo pierde nunca.
alter table public.profiles
  add column if not exists commission_floor_locked_at timestamptz;

comment on column public.profiles.commission_floor_locked_at is
  'Día en que la persona ganó el 0.5 % permanente (nivel máximo + antigüedad + participación). Una vez puesto, no se borra: ganado es ganado.';


-- ══════════════════════════════════════════════════════════════════════
-- 2. TASA BASE — ya SIN el parámetro de Pionero
-- ══════════════════════════════════════════════════════════════════════
-- Se elimina la versión de 0081 que recibía `is_pioneer`: dejarla viva sería
-- tener DOS verdades sobre la misma tasa, y la vieja regalaba 0.5 % a todos.
drop function if exists public.omicron_commission_bps(numeric, boolean);

create or replace function public.omicron_commission_bps(p_reputation numeric)
returns integer
language plpgsql
immutable
set search_path = public
as $fn$
declare
  v_rep numeric := coalesce(p_reputation, 0);
begin
  -- Mismos cortes que levelBandFor() en el cliente: 0 / 50 / 80.
  if v_rep >= 80 then
    return 50;    -- Arquitecto  0.5 %
  elsif v_rep >= 50 then
    return 80;    -- Técnico     0.8 %
  else
    return 100;   -- Estudiante  1.0 %
  end if;
end;
$fn$;

comment on function public.omicron_commission_bps(numeric) is
  'Comisión Ómicrom base en puntos básicos (100=1%) según reputación. Espeja commissionQuote.ts.';

grant execute on function public.omicron_commission_bps(numeric) to authenticated;
grant execute on function public.omicron_commission_bps(numeric) to anon;


-- ══════════════════════════════════════════════════════════════════════
-- 3. ¿SE GANÓ EL 0.5 % PERMANENTE?
-- ══════════════════════════════════════════════════════════════════════
-- VOLATILE a propósito: además de responder, GRABA el premio la primera vez
-- que se cumplen los tres requisitos. Así el "permanente" es un hecho
-- almacenado y no un cálculo que podría dar distinto mañana.
--
-- Los tres umbrales están acá y en un solo lugar, para que cambiarlos sea
-- editar tres números:
create or replace function public.omicron_floor_earned(p_user_id uuid)
returns boolean
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  -- ── UMBRALES (cambiar acá si el fundador ajusta la regla) ──
  k_min_reputation constant numeric  := 80;   -- "subió todos los niveles"
  k_min_days       constant integer  := 90;   -- "lleva tiempo"
  k_min_contracts  constant integer  := 5;    -- "participa activamente"
  p                record;
begin
  select reputation_score, total_contracts_completed, member_since,
         commission_floor_locked_at
    into p
    from public.profiles
   where id = p_user_id;

  if p is null then
    return false;
  end if;

  -- Ya lo tenía ganado: permanente significa permanente.
  if p.commission_floor_locked_at is not null then
    return true;
  end if;

  if coalesce(p.reputation_score, 0) >= k_min_reputation
     and coalesce(p.total_contracts_completed, 0) >= k_min_contracts
     and coalesce(p.member_since, now()) <= now() - (k_min_days || ' days')::interval
  then
    -- Se lo ganó recién: se graba y no se vuelve a evaluar nunca más.
    update public.profiles
    set commission_floor_locked_at = now()
    where id = p_user_id and commission_floor_locked_at is null;
    return true;
  end if;

  return false;
end;
$fn$;

comment on function public.omicron_floor_earned(uuid) is
  'true si la persona ganó el 0.5 % permanente (nivel máximo + 90 días + 5 contratos). Graba el premio la primera vez.';


-- ══════════════════════════════════════════════════════════════════════
-- 4. TASA EFECTIVA DE UNA PERSONA (la que se cobra de verdad)
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.omicron_commission_bps_for(p_user_id uuid)
returns integer
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_rep numeric;
  v_bps integer;
begin
  select coalesce(reputation_score, 0) into v_rep
    from public.profiles where id = p_user_id;

  v_bps := public.omicron_commission_bps(coalesce(v_rep, 0));

  -- El premio es un PISO: si ya lo ganó, nunca paga más de 0.5 %.
  if public.omicron_floor_earned(p_user_id) then
    v_bps := least(v_bps, 50);
  end if;

  return v_bps;
end;
$fn$;

grant execute on function public.omicron_commission_bps_for(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 5. RELEASE_ESCROW — usa la tasa EFECTIVA (ya no is_pioneer)
-- ══════════════════════════════════════════════════════════════════════
-- Se conservan TODAS las validaciones y efectos de 0070/0081. Lo único que
-- cambia respecto de 0081: de dónde sale la tasa.
create or replace function public.release_escrow(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c             record;
  v_bps         integer;
  v_commission  numeric;
  v_net         numeric;
  v_earned      boolean;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id then raise exception 'Solo el comprador puede aprobar'; end if;
  if c.status not in ('DELIVERED', 'LOCKED') then raise exception 'El contrato no está en estado de aprobación'; end if;

  v_earned     := public.omicron_floor_earned(c.seller_id);
  v_bps        := public.omicron_commission_bps_for(c.seller_id);
  -- FLOOR: la fracción queda para el VENDEDOR, nunca para la plataforma.
  v_commission := floor(c.amount * v_bps / 10000.0);
  v_net        := c.amount - v_commission;

  update public.profiles
  set token_balance = coalesce(token_balance, 0) + v_net
  where id = c.seller_id;

  -- Del escrow del comprador sale el monto COMPLETO: pagó el precio publicado.
  update public.profiles
  set token_escrow = greatest(0, coalesce(token_escrow, 0) - c.amount)
  where id = c.buyer_id;

  update public.contracts
  set status = 'RELEASED', completed_at = now(), updated_at = now()
  where id = p_contract_id;

  update public.profiles
  set total_contracts_completed = coalesce(total_contracts_completed, 0) + 1
  where id = c.seller_id;

  insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id, description)
  values (c.seller_id, v_net, 'escrow_release', p_contract_id, 'Pago liberado por ' || c.title);

  if v_commission > 0 then
    insert into public.wallet_transactions (user_id, amount, transaction_type, reference_id, description)
    values (
      c.seller_id, -v_commission, 'commission', p_contract_id,
      'Comisión Ómicrom ' || round(v_bps / 100.0, 2) || ' %'
    );

    insert into public.omicron_platform_revenue
      (contract_id, seller_id, source, gross_amount, commission, net_amount, bps, was_pioneer)
    values
      (p_contract_id, c.seller_id, 'escrow_release', c.amount, v_commission, v_net, v_bps, v_earned)
    on conflict (contract_id) do nothing;
  end if;
end;
$fn$;

grant execute on function public.release_escrow(uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 6. GHOST_RELEASE_FUNDS — misma corrección
-- ══════════════════════════════════════════════════════════════════════
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
  v_bps         integer;
  v_commission  numeric;
  v_net         numeric;
  v_earned      boolean;
  v_already     boolean;
begin
  -- Guarda de idempotencia (introducida en 0081): un reintento no paga dos veces.
  select exists(
    select 1 from public.omicron_platform_revenue where contract_id = p_contract_id
  ) into v_already;

  if v_already then
    raise notice '[ghost_release_funds] Contrato % ya fue liberado; no se paga de nuevo.', p_contract_id;
    return;
  end if;

  v_earned     := public.omicron_floor_earned(p_seller_id);
  v_bps        := public.omicron_commission_bps_for(p_seller_id);
  v_commission := floor(coalesce(p_amount, 0) * v_bps / 10000.0);
  v_net        := coalesce(p_amount, 0) - v_commission;

  update public.profiles
  set token_balance = coalesce(token_balance, 0) + v_net
  where id = p_seller_id;

  -- Se conserva el comportamiento de escrow de 0055/0081 tal cual.
  -- Ver ADVERTENCIA 1 al final: apunta al vendedor, no al comprador.
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

  insert into public.omicron_platform_revenue
    (contract_id, seller_id, source, gross_amount, commission, net_amount, bps, was_pioneer)
  values
    (p_contract_id, p_seller_id, 'ghost_release', coalesce(p_amount, 0), v_commission, v_net, v_bps, v_earned)
  on conflict (contract_id) do nothing;

  raise notice '[ghost_release_funds] Contrato %, vendedor %, bruto %, comisión %, neto %',
    p_contract_id, p_seller_id, p_amount, v_commission, v_net;
end;
$fn$;

revoke all on function public.ghost_release_funds(uuid, uuid, numeric) from public;


-- ══════════════════════════════════════════════════════════════════════
-- 7. RECARGAR EL ESQUEMA DE LA API
-- ══════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════
-- ADVERTENCIAS
-- ══════════════════════════════════════════════════════════════════════
--
-- ADVERTENCIA 1 — BUG PREEXISTENTE QUE SIGO SIN TOCAR:
--   ghost_release_funds descuenta el escrow del VENDEDOR, pero el escrow lo
--   retiene el COMPRADOR (viene así desde 0055). Corregirlo mueve saldos
--   reales, así que espera tu OK explícito. El arreglo es:
--     update public.profiles
--     set token_escrow = greatest(coalesce(token_escrow,0) - p_amount, 0)
--     where id = (select buyer_id from public.contracts where id = p_contract_id);
--
-- ADVERTENCIA 2 — `is_pioneer` YA NO AFECTA LA COMISIÓN:
--   la columna sigue existiendo y sirve para lo que quieras (insignia, cupos,
--   beneficios futuros), pero ya NO da 0.5 %. Si querés que el Pionero tenga
--   algún beneficio económico, hay que definirlo aparte: hoy la tendrían TODOS
--   los usuarios existentes, así que cualquier descuento ligado a esa columna
--   se aplica a toda la base.
--
-- ADVERTENCIA 3 — LA COLUMNA `was_pioneer` DEL LIBRO CAMBIÓ DE SIGNIFICADO:
--   ahora guarda "tenía el 0.5 % ganado", que es lo que de verdad importa para
--   auditar el cobro. Se mantiene el nombre para no romper 0081 si ya lo
--   aplicaste. Renombrarla es opcional y seguro:
--     alter table public.omicron_platform_revenue rename column was_pioneer to had_earned_floor;
-- ══════════════════════════════════════════════════════════════════════
