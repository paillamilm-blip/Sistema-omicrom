-- ══════════════════════════════════════════════════════════════════════
-- 10000_fondo_conocimiento.sql
-- EL FONDO DE CONOCIMIENTO — la economía se financia a sí misma.
--
-- EL PROBLEMA REAL: 1 token = 1 peso chileno. Un usuario nuevo entra con 0
-- tokens y la única forma de conseguirlos es pagar con tarjeta. O sea: choca
-- con un muro de pago ANTES de haber visto valor. Pero regalar tokens es
-- regalar dinero real, así que un "bono de bienvenida" es una deuda directa
-- contra el bolsillo del fundador y no escala.
--
-- LA SOLUCIÓN: que las recompensas salgan de un fondo alimentado por la
-- COMISIÓN YA COBRADA. Una parte de cada comisión (30 % por defecto) no es
-- ganancia: se reinvierte en el Fondo. Y del Fondo se pagan recompensas a
-- quien DEMUESTRA conocimiento (aprobar un examen).
--
-- POR QUÉ ES IMPOSIBLE PERDER PLATA CON ESTO:
--   Una recompensa NUNCA puede exceder el saldo del Fondo, y el Fondo solo
--   crece con comisión REALMENTE cobrada. Matemáticamente, la plataforma solo
--   puede repartir dinero que ya ganó. Si el Fondo está en 0, la recompensa es
--   0 y se dice honestamente. Cero deuda, cero sorpresas.
--
-- EL VOLANTE (por qué es un motor de crecimiento, no un gasto):
--   más transacciones -> más comisión -> Fondo más grande -> más recompensa
--   por aprender -> usuarios más capaces -> más transacciones.
--   El conocimiento se vuelve, literalmente, la forma de ganar dinero en la
--   red. Es "monetizar con el conocimiento" hecho mecanismo.
--
-- ARRANQUE EN FRÍO: el Fondo empieza en 0 (honesto: todavía no hay comisión).
-- Si el fundador quiere sembrarlo como inversión de marketing acotada, existe
-- omicron_fund_seed(monto) — una decisión explícita con un número, nunca un
-- default escondido.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   supabase db push        (versión > 9999: ya no requiere --include-all)
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   select public.omicron_fund_balance() as saldo_del_fondo;   -- 0 al inicio
--
--   -- Sembrar el Fondo con una inversión acotada (OPCIONAL, decisión tuya):
--   select public.omicron_fund_seed(50000);   -- 50.000 CLP de presupuesto
--
--   -- Movimientos del Fondo (entra comisión, sale recompensa):
--   select direction, amount, source, created_at
--   from public.omicron_knowledge_fund order by created_at desc limit 20;
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   \i supabase/migrations/0082_comision_piso_ganado.sql   -- comisión sin Fondo
--   \i supabase/migrations/0073_register_exam_success.sql  -- examen sin recompensa
--   -- El libro del Fondo se CONSERVA (es registro contable real):
--   -- drop table public.omicron_knowledge_fund;
--   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. EL LIBRO DEL FONDO
-- ══════════════════════════════════════════════════════════════════════
-- Un libro de movimientos (no un saldo mutable) para que TODO sea auditable:
-- de qué contrato entró cada peso y a quién salió cada recompensa.
create table if not exists public.omicron_knowledge_fund (
  id         uuid primary key default gen_random_uuid(),
  direction  text not null check (direction in ('in', 'out')),
  amount     numeric not null check (amount > 0),
  source     text not null,              -- 'commission' | 'seed' | 'exam_reward'
  user_id    uuid,                       -- a quién se le pagó (en los 'out')
  ref        uuid,                       -- contrato de origen (en los 'in')
  note       text,
  created_at timestamptz not null default now()
);

comment on table public.omicron_knowledge_fund is
  'Fondo de Conocimiento: entra un % de la comisión cobrada, sale como recompensa por conocimiento demostrado. Una recompensa nunca puede exceder el saldo.';

create index if not exists idx_fund_created on public.omicron_knowledge_fund (created_at desc);
create index if not exists idx_fund_user    on public.omicron_knowledge_fund (user_id, created_at desc);

-- RLS activa SIN políticas: nadie lee el libro con una sesión de usuario.
-- Solo service_role y las funciones SECURITY DEFINER de abajo.
alter table public.omicron_knowledge_fund enable row level security;


-- ══════════════════════════════════════════════════════════════════════
-- 2. SALDO DEL FONDO
-- ══════════════════════════════════════════════════════════════════════
-- STABLE: no escribe. Se expone a authenticated porque mostrarle al usuario
-- cuánta plata hay disponible para premiarlo es parte de la transparencia
-- (si está en 0, se lo decimos en vez de prometerle algo que no existe).
create or replace function public.omicron_fund_balance()
returns numeric
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(sum(case when direction = 'in' then amount else -amount end), 0)
  from public.omicron_knowledge_fund;
$fn$;

grant execute on function public.omicron_fund_balance() to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 3. SEMBRAR EL FONDO (solo el fundador, decisión explícita)
-- ══════════════════════════════════════════════════════════════════════
-- NO se otorga a authenticated: solo desde el SQL Editor o service_role.
-- Es una inversión de marketing con un número que vos elegís, no un regalo
-- automático escondido en un default.
create or replace function public.omicron_fund_seed(p_amount numeric, p_note text default 'Inversión inicial del fundador')
returns numeric
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if coalesce(p_amount, 0) <= 0 then
    raise exception 'El monto a sembrar debe ser mayor que 0';
  end if;

  insert into public.omicron_knowledge_fund (direction, amount, source, note)
  values ('in', floor(p_amount), 'seed', p_note);

  return public.omicron_fund_balance();
end;
$fn$;

revoke all on function public.omicron_fund_seed(numeric, text) from public, anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 4. RECOMPENSA POR CONOCIMIENTO DEMOSTRADO
-- ══════════════════════════════════════════════════════════════════════
-- Se paga al APROBAR un examen. Reglas anti-abuso (es dinero real):
--   • UNA sola recompensa por (usuario, habilidad) en toda la historia:
--     no se puede repetir el mismo examen para ordeñar el Fondo.
--   • Tope diario por usuario.
--   • El monto sube con el score (aprobar raspando paga menos que dominar).
--   • JAMÁS excede el saldo del Fondo. Si el Fondo está en 0, paga 0.
create or replace function public.omicron_grant_exam_reward(
  p_user_id uuid,
  p_skill   text,
  p_score   integer
)
returns numeric
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  -- ── PARÁMETROS (cambiar acá si el fundador ajusta la generosidad) ──
  k_base       constant numeric := 300;   -- tokens por aprobar (score 70)
  k_max        constant numeric := 500;   -- tope por examen (score 100)
  k_daily_cap  constant numeric := 1000;  -- tope por usuario por día
  v_saldo      numeric;
  v_ya_pagado  boolean;
  v_hoy        numeric;
  v_premio     numeric;
begin
  if p_user_id is null or coalesce(p_score, 0) < 70 then
    return 0;
  end if;

  -- ¿Ya cobró por esta habilidad alguna vez?
  select exists(
    select 1 from public.omicron_knowledge_fund
    where direction = 'out' and user_id = p_user_id
      and source = 'exam_reward' and note = 'skill:' || lower(coalesce(p_skill, 'general'))
  ) into v_ya_pagado;

  if v_ya_pagado then
    return 0;
  end if;

  v_saldo := public.omicron_fund_balance();
  if v_saldo <= 0 then
    return 0;   -- Fondo vacío: se paga 0 y se dice honestamente.
  end if;

  -- Cuánto ya cobró hoy (tope diario).
  select coalesce(sum(amount), 0) into v_hoy
  from public.omicron_knowledge_fund
  where direction = 'out' and user_id = p_user_id
    and source = 'exam_reward'
    and created_at >= date_trunc('day', now());

  if v_hoy >= k_daily_cap then
    return 0;
  end if;

  -- Monto proporcional al dominio: score 70 -> base, score 100 -> máximo.
  v_premio := k_base + (k_max - k_base) * (least(100, p_score) - 70) / 30.0;
  v_premio := floor(v_premio);

  -- Se recorta por el tope diario y por el saldo real del Fondo. Este es el
  -- candado que hace imposible repartir plata que no existe.
  v_premio := least(v_premio, k_daily_cap - v_hoy, v_saldo);

  if v_premio <= 0 then
    return 0;
  end if;

  -- Sale del Fondo…
  insert into public.omicron_knowledge_fund (direction, amount, source, user_id, note)
  values ('out', v_premio, 'exam_reward', p_user_id, 'skill:' || lower(coalesce(p_skill, 'general')));

  -- …y entra al bolsillo del usuario.
  update public.profiles
  set token_balance = coalesce(token_balance, 0) + v_premio
  where id = p_user_id;

  insert into public.wallet_transactions (user_id, amount, transaction_type, description)
  values (
    p_user_id, v_premio, 'deposit',
    'Fondo de Conocimiento: aprobaste ' || coalesce(p_skill, 'un examen')
  );

  return v_premio;
end;
$fn$;

revoke all on function public.omicron_grant_exam_reward(uuid, text, integer) from public, anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 5. EL EXAMEN AHORA TAMBIÉN PAGA
-- ══════════════════════════════════════════════════════════════════════
-- CREATE OR REPLACE de register_exam_success (0073) conservando EXACTAMENTE
-- su comportamiento y sus claves de retorno (el cliente sigue funcionando sin
-- cambios). Solo se AGREGAN dos claves nuevas: reward_tokens y reward_reason.
create or replace function public.register_exam_success(
  p_skill text,
  p_score integer,
  p_kind  text default 'mixed'
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_quality_delta    numeric;
  v_execution_delta  numeric;
  v_foundation_delta numeric;
  v_reward           numeric := 0;
  v_reason           text;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  if p_score < 70 then
    return json_build_object('ok', false, 'error', 'score insuficiente para subir ejes');
  end if;

  -- ── Ejes: idéntico a 0073 (no se toca la fórmula) ──
  v_quality_delta := least(5, greatest(2, round((p_score - 70) * 0.1 + 2)));

  v_execution_delta := case
    when p_kind in ('practical', 'mixed') then least(3, greatest(1, round((p_score - 70) * 0.07 + 1)))
    else 0
  end;

  v_foundation_delta := case
    when p_kind in ('theory', 'mixed') then least(2, greatest(1, round((p_score - 70) * 0.05 + 1)))
    else 0
  end;

  update public.profiles set
    quality_score         = least(100, coalesce(quality_score, 0) + v_quality_delta),
    execution_score       = least(100, coalesce(execution_score, 0) + v_execution_delta),
    foundation_score      = least(100, coalesce(foundation_score, 0) + v_foundation_delta),
    reputation_updated_at = now()
  where id = v_uid;

  begin
    insert into public.reputation_history(user_id, reason)
    values (v_uid, 'Examen aprobado: ' || coalesce(p_skill, 'general') || ' (score: ' || p_score || ', kind: ' || p_kind || ')');
  exception when others then null;
  end;

  -- ── NUEVO: recompensa del Fondo de Conocimiento ──
  -- Envuelto para que un problema en el Fondo NUNCA impida que el examen
  -- suba los ejes. El conocimiento se registra siempre; el premio es un extra.
  begin
    v_reward := public.omicron_grant_exam_reward(v_uid, p_skill, p_score);
  exception when others then
    v_reward := 0;
  end;

  -- Motivo en lenguaje claro, para que la app pueda decir la verdad.
  if v_reward > 0 then
    v_reason := 'Ganaste ' || v_reward || ' tokens del Fondo de Conocimiento.';
  elsif public.omicron_fund_balance() <= 0 then
    v_reason := 'El Fondo de Conocimiento está en 0 por ahora. Tus ejes igual subieron.';
  else
    v_reason := 'Ya habías cobrado la recompensa de esta habilidad (o alcanzaste el tope diario).';
  end if;

  return json_build_object(
    'ok', true,
    'quality_delta', v_quality_delta,
    'execution_delta', v_execution_delta,
    'foundation_delta', v_foundation_delta,
    'skill', p_skill,
    'score', p_score,
    'reward_tokens', v_reward,
    'reward_reason', v_reason
  );
end;
$fn$;

revoke all on function public.register_exam_success(text, integer, text) from public, anon;
grant execute on function public.register_exam_success(text, integer, text) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 6. LA COMISIÓN ALIMENTA EL FONDO
-- ══════════════════════════════════════════════════════════════════════
-- 30 % de cada comisión cobrada se reinvierte en el Fondo. El otro 70 % es
-- ganancia del fundador. Se implementa como un movimiento 'in' del libro,
-- así omicron_platform_revenue sigue registrando la comisión BRUTA (no se
-- pierde información contable) y el Fondo queda auditable por separado.
create or replace function public.omicron_fund_contribute(p_contract_id uuid, p_commission numeric)
returns numeric
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  k_share_bps constant integer := 3000;   -- 30 % de la comisión
  v_aporte    numeric;
begin
  v_aporte := floor(coalesce(p_commission, 0) * k_share_bps / 10000.0);
  if v_aporte <= 0 then
    return 0;
  end if;

  -- Un contrato aporta UNA sola vez (espeja el UNIQUE del libro de ingresos).
  if exists(
    select 1 from public.omicron_knowledge_fund
    where direction = 'in' and source = 'commission' and ref = p_contract_id
  ) then
    return 0;
  end if;

  insert into public.omicron_knowledge_fund (direction, amount, source, ref, note)
  values ('in', v_aporte, 'commission', p_contract_id, '30 % de la comisión reinvertido en conocimiento');

  return v_aporte;
end;
$fn$;

revoke all on function public.omicron_fund_contribute(uuid, numeric) from public, anon, authenticated;


-- ── release_escrow: idéntico a 0082 + aporte al Fondo ─────────────────
create or replace function public.release_escrow(p_contract_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  c            record;
  v_bps        integer;
  v_commission numeric;
  v_net        numeric;
  v_earned     boolean;
begin
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id then raise exception 'Solo el comprador puede aprobar'; end if;
  if c.status not in ('DELIVERED', 'LOCKED') then raise exception 'El contrato no está en estado de aprobación'; end if;

  v_earned     := public.omicron_floor_earned(c.seller_id);
  v_bps        := public.omicron_commission_bps_for(c.seller_id);
  v_commission := floor(c.amount * v_bps / 10000.0);
  v_net        := c.amount - v_commission;

  update public.profiles
  set token_balance = coalesce(token_balance, 0) + v_net
  where id = c.seller_id;

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

    -- NUEVO: parte de la comisión vuelve a la red como Fondo de Conocimiento.
    perform public.omicron_fund_contribute(p_contract_id, v_commission);
  end if;
end;
$fn$;

grant execute on function public.release_escrow(uuid) to authenticated;


-- ── ghost_release_funds: idéntico a 0082 + aporte al Fondo ────────────
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
  v_bps        integer;
  v_commission numeric;
  v_net        numeric;
  v_earned     boolean;
  v_already    boolean;
begin
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

  -- Se conserva el comportamiento de 0055/0081/0082 tal cual (ver ADVERTENCIA 1).
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

  if v_commission > 0 then
    perform public.omicron_fund_contribute(p_contract_id, v_commission);
  end if;
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
-- ADVERTENCIA 1 — sigue vigente el bug preexistente de 0055: ghost_release_funds
--   descuenta el escrow del VENDEDOR y no del COMPRADOR. No lo toco sin tu OK
--   explícito porque mueve saldos reales. El arreglo:
--     update public.profiles
--     set token_escrow = greatest(coalesce(token_escrow,0) - p_amount, 0)
--     where id = (select buyer_id from public.contracts where id = p_contract_id);
--
-- ADVERTENCIA 2 — TU GANANCIA BAJA DE 100 % A 70 % DE LA COMISIÓN.
--   Es a propósito: el 30 % se reinvierte en que tus usuarios sean más capaces
--   y transaccionen más. Si querés otro reparto, es UN número:
--   k_share_bps en omicron_fund_contribute (3000 = 30 %).
--   Tu ganancia limpia se consulta así:
--     select sum(commission)                                   as comision_bruta,
--            (select coalesce(sum(amount),0) from public.omicron_knowledge_fund
--              where direction='in' and source='commission')   as reinvertido,
--            sum(commission) -
--            (select coalesce(sum(amount),0) from public.omicron_knowledge_fund
--              where direction='in' and source='commission')    as tu_ganancia_limpia
--     from public.omicron_platform_revenue;
--
-- ADVERTENCIA 3 — EL FONDO ARRANCA EN 0, así que hoy los exámenes pagan 0 y la
--   app lo dice con honestidad ("El Fondo está en 0 por ahora"). Para que el
--   volante arranque necesitás sembrarlo con una inversión acotada:
--     select public.omicron_fund_seed(50000);   -- 50.000 CLP
--   Con eso, ~100 personas cobran su primer premio de conocimiento y esa plata
--   vuelve a circular dentro de la red (no sale de Ómicrom).
-- ══════════════════════════════════════════════════════════════════════
