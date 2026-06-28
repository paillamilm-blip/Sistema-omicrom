-- =====================================================================
-- 0019_drop_legacy_users_triggers.sql
-- Elimina triggers OBSOLETOS cuyas funciones referencian la tabla
-- inexistente "users" (la real es "profiles"). Causaban error 42P01
-- ("relation users does not exist") -> HTTP 404 al crear/actualizar contratos.
--
-- NOTA: se eliminan por NOMBRE DE FUNCIÓN (no por regex), porque en
-- PostgreSQL "\b" en una regex significa BACKSPACE, no "límite de palabra",
-- y por eso un filtro regex sobre prosrc no los detectaba.
--
-- Conserva los triggers correctos (lock_escrow_on_contract usa profiles).
-- Idempotente.
-- =====================================================================
do $$
declare r record;
begin
  for r in
    select t.tgrelid::regclass as tbl, t.tgname
    from pg_trigger t
    join pg_proc p on p.oid = t.tgfoid
    where not t.tgisinternal
      and p.proname in (
        'trg_escrow_on_contract_create',
        'fn_trg_pe_on_contract_complete',
        'fn_pe_penalty_on_dispute',
        'trg_refund_on_dispute',
        'fn_release_escrow_on_complete',
        'trg_release_payment_on_complete'
      )
  loop
    execute format('drop trigger if exists %I on %s', r.tgname, r.tbl);
    raise notice 'Trigger obsoleto eliminado: % (tabla %)', r.tgname, r.tbl;
  end loop;
end $$;

notify pgrst, 'reload schema';
