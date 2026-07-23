-- 0057 · Endurecimiento de funciones.
-- (C1) Fijar search_path en funciones marcadas por el linter.
alter function public.fn_credentials_score() set search_path = public, pg_temp;
alter function public.fn_node_level(p_node_type text) set search_path = public, pg_temp;
alter function public.fn_rate_limit_disputes() set search_path = public, pg_temp;
alter function public.gemelo_touch_updated_at() set search_path = public, pg_temp;
alter function public.protect_profile_columns() set search_path = public, pg_temp;
alter function public.recalc_reputation() set search_path = public, pg_temp;
alter function public.set_updated_at() set search_path = public, pg_temp;

-- (C2) Funciones de SISTEMA/PAGOS: solo backend (service_role) o triggers.
do $$
declare f text;
begin
  for f in select unnest(array[
    'credit_tokens_from_payment(uuid, integer, text)',
    'apply_penalty(uuid, uuid, text, text, text)',
    'ghost_release_funds(uuid, uuid, numeric)',
    'apply_token_depreciation()',
    'apply_vault_depreciation()',
    'apply_pmc_recovery()',
    'run_matchmaking(uuid)',
    'register_content_lineage(uuid, uuid, double precision)',
    'fn_assign_arbiters()'
  ]) loop
    execute format('revoke execute on function public.%s from public, anon, authenticated;', f);
    execute format('grant execute on function public.%s to service_role;', f);
  end loop;
end $$;

-- (C3) Gobernanza/credenciales: quitar anon (siguen para usuarios logueados).
do $$
declare f text;
begin
  for f in select unnest(array[
    'resolve_dispute(uuid, text)',
    'resolve_appeal(uuid, text)',
    'review_credential(uuid, boolean, text)'
  ]) loop
    execute format('revoke execute on function public.%s from public, anon;', f);
    execute format('grant execute on function public.%s to authenticated;', f);
  end loop;
end $$;
