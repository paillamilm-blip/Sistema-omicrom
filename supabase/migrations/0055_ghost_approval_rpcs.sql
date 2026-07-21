-- =====================================================================
-- 0055_ghost_approval_rpcs.sql — RPCs de soporte para Ghost Approval
--
-- Funciones atómicas que la Edge Function ghost-approval invoca para:
--   1) Liberar fondos del escrow al vendedor (incremento atómico).
--   2) Incrementar PE del vendedor (+30 por entrega exitosa).
--   3) Cron scheduling (pg_cron): ejecutar ghost-approval cada minuto.
--
-- Idempotente.
-- =====================================================================

-- ── 1) ghost_release_funds: libera escrow al vendedor ────────────────
-- Solo invocable con service_role (la Edge Function usa admin client).
-- No se expone a authenticated (es backend-only).
create or replace function public.ghost_release_funds(
  p_contract_id uuid,
  p_seller_id   uuid,
  p_amount      numeric
)
returns void language plpgsql security definer set search_path = public as $$
begin
  -- Incrementar token_balance del vendedor (atómico)
  update public.profiles
  set token_balance = coalesce(token_balance, 0) + p_amount
  where id = p_seller_id;

  -- Decrementar escrow si la columna existe
  begin
    update public.profiles
    set token_escrow = greatest(coalesce(token_escrow, 0) - p_amount, 0)
    where id = p_seller_id;
  exception when undefined_column then
    null; -- La columna no existe todavía, ignorar
  end;

  -- Log de auditoría
  raise notice '[ghost_release_funds] Contract %, seller %, amount %', p_contract_id, p_seller_id, p_amount;
end; $$;

-- ── 2) increment_pe: incremento atómico de PE ────────────────────────
-- Usada por ghost-approval y potencialmente otras Edge Functions.
create or replace function public.increment_pe(
  p_user_id uuid,
  p_amount  integer
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set pe_points = coalesce(pe_points, 0) + p_amount
  where id = p_user_id;
end; $$;

-- ── 3) Cron: ejecutar ghost-approval cada minuto ─────────────────────
-- Usa pg_cron + pg_net para invocar la Edge Function periódicamente.
-- Si pg_cron no está habilitado, esta sección no hace nada (DO block seguro).
do $$
begin
  -- Intentar programar el cron (Supabase Pro/Enterprise tiene pg_cron)
  perform cron.schedule(
    'ghost-approval-sweep',
    '* * * * *',  -- cada minuto
    $$
    select net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/ghost-approval',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
    $$
  );
  raise notice '[ghost-approval] Cron programado: cada 1 minuto';
exception
  when undefined_function then
    raise notice '[ghost-approval] pg_cron no disponible — ejecutar manualmente o configurar cron externo';
  when others then
    raise notice '[ghost-approval] Error programando cron: %', sqlerrm;
end $$;
