-- =====================================================================
-- 0026_vault_depreciation.sql — Depreciación H-07 con suelo de amortización
-- El costo de consulta de los documentos de la Bóveda decae con el tiempo
-- (obsolescencia), PERO:
--   • Periodo de gracia: 30 días sin depreciar (protege al creador nuevo)
--   • Suelo de amortización: nunca baja del 30% del costo inicial
-- Corre 1 vez al día vía pg_cron.
-- =====================================================================

create or replace function public.apply_vault_depreciation()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.knowledge_vault_documents
  set current_token_cost = greatest(
        round(coalesce(initial_token_cost, current_token_cost) * 0.30),  -- SUELO 30%
        round(current_token_cost * 0.97)                                 -- decae ~3% por día
      )
  where created_at < now() - interval '30 days'                          -- gracia 30 días
    and current_token_cost > round(coalesce(initial_token_cost, current_token_cost) * 0.30);
end; $fn$;

-- Programar corrida diaria (03:00). Re-programa de forma segura.
do $do$ begin
  perform cron.unschedule('vault_depreciation_daily');
exception when others then null; end $do$;

select cron.schedule(
  'vault_depreciation_daily',
  '0 3 * * *',
  $cron$ select public.apply_vault_depreciation(); $cron$
);
