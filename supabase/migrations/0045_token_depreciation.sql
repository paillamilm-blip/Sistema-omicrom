-- =====================================================================
-- 0045_token_depreciation.sql — Depreciación suave de Tokens (Ω) inactivos
-- Alineado con DEFINICION_OMICROM_v8_BACKEND.md · sección 3.
--
-- Regla: 5% mensual sobre token_balance (NO sobre token_escrow, que es
-- dinero comprometido en contratos activos, no "no usado") para usuarios
-- inactivos por más de 90 días.
--
-- El esquema real no tenía una columna de "última actividad" (updated_at
-- se pisa con cualquier cambio administrativo, no solo actividad real del
-- usuario). Se agrega `last_activity_at` y se refresca desde los eventos
-- de actividad más comunes del sistema: contratos, bóveda, disputas.
--
-- Aplicado mensualmente (no diario, porque la tasa es mensual): día 1 de
-- cada mes a las 03:30, mismo patrón que 0026_vault_depreciation.sql.
--
-- Idempotente.
-- =====================================================================

-- ── 1) Columna de última actividad real ──────────────────────────────
alter table public.profiles
  add column if not exists last_activity_at timestamptz not null default now();

-- ── 2) touch_last_activity(): helper para refrescar la marca ────────
create or replace function public.touch_last_activity(p_user_id uuid)
returns void language sql security definer set search_path = public as $fn$
  update public.profiles set last_activity_at = now() where id = p_user_id;
$fn$;

-- ── 3) Triggers que refrescan last_activity_at en eventos reales ────
-- Bóveda: publicar o consultar contenido cuenta como actividad.
create or replace function public.fn_touch_activity_vault_query()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.touch_last_activity(new.reader_id);
  return new;
end; $fn$;

drop trigger if exists trg_touch_activity_vault_query on public.vault_queries;
create trigger trg_touch_activity_vault_query
  after insert on public.vault_queries
  for each row execute function public.fn_touch_activity_vault_query();

-- Wallet: cualquier transacción (compra, venta, retiro) cuenta como actividad.
create or replace function public.fn_touch_activity_wallet()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.touch_last_activity(new.user_id);
  return new;
end; $fn$;

drop trigger if exists trg_touch_activity_wallet on public.wallet_transactions;
create trigger trg_touch_activity_wallet
  after insert on public.wallet_transactions
  for each row execute function public.fn_touch_activity_wallet();

-- Contratos: crear o actualizar un contrato cuenta como actividad (ambas partes).
create or replace function public.fn_touch_activity_contracts()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  perform public.touch_last_activity(new.buyer_id);
  perform public.touch_last_activity(new.seller_id);
  return new;
end; $fn$;

drop trigger if exists trg_touch_activity_contracts on public.contracts;
create trigger trg_touch_activity_contracts
  after insert or update on public.contracts
  for each row execute function public.fn_touch_activity_contracts();

-- ── 4) apply_token_depreciation(): 5% mensual tras 90 días de inactividad ──
create or replace function public.apply_token_depreciation()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  -- El monto a depreciar se calcula UNA sola vez (to_deprecate) y se reutiliza
  -- tanto para el UPDATE como para el registro en wallet_transactions — evita
  -- el error de reconstruir el monto "hacia atrás" desde el saldo ya reducido
  -- (impreciso por redondeo: p.ej. saldo 110 → depreciación real 6, pero
  -- 104/0.95*0.05 redondea a 5). La CTE `applied` queda referenciada por el
  -- INSERT final, lo que garantiza en Postgres que el UPDATE se ejecute.
  with to_deprecate as (
    select id, round(token_balance * 0.05) as v_amount
    from public.profiles
    where last_activity_at < now() - interval '90 days'
      and coalesce(token_balance,0) > 0
  ),
  applied as (
    update public.profiles p
    set token_balance = greatest(p.token_balance - d.v_amount, 0)
    from to_deprecate d
    where p.id = d.id
    returning p.id, d.v_amount
  )
  insert into public.wallet_transactions (user_id, transaction_type, amount, description)
  select id, 'depreciation', -v_amount, 'Depreciación mensual por inactividad (>90 días)'
  from applied
  where v_amount > 0;
end; $fn$;

-- Programar corrida mensual (día 1, 03:30). Re-programa de forma segura.
do $do$ begin
  perform cron.unschedule('token_depreciation_monthly');
exception when others then null; end $do$;

select cron.schedule(
  'token_depreciation_monthly',
  '30 3 1 * *',
  $cron$ select public.apply_token_depreciation(); $cron$
);
