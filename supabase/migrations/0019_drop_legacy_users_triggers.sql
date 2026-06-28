-- =====================================================================
-- 0019_drop_legacy_users_triggers.sql
-- Elimina triggers OBSOLETOS (de cualquier tabla) cuyas funciones
-- referencian la tabla inexistente "users" (la real es "profiles").
-- Causaban error 42P01 ("relation users does not exist") -> HTTP 404
-- al crear/actualizar contratos.
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
      and p.prosrc ~* '(update|insert into|from|join)\s+(public\.)?users\b'
      and p.prosrc !~* 'auth\.users'
  loop
    execute format('drop trigger if exists %I on %s', r.tgname, r.tbl);
    raise notice 'Trigger obsoleto eliminado: % (tabla %)', r.tgname, r.tbl;
  end loop;
end $$;

notify pgrst, 'reload schema';
