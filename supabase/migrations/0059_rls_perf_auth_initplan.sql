-- 0059 · Rendimiento: envolver auth.uid()/role()/jwt() en subconsulta para que
-- se evalúen UNA vez por consulta (no por fila). Reconstruye cada política
-- preservando comando, roles y condiciones.
do $$
declare
  r record; v_qual text; v_check text; v_using text; v_checkc text; v_roles text;
begin
  for r in
    select schemaname, tablename, policyname, cmd, roles, qual, with_check
    from pg_policies
    where schemaname='public'
      and ((qual is not null and qual ~ 'auth\.(uid|role|jwt)\(\)' and qual !~ '\(\s*select auth\.')
        or (with_check is not null and with_check ~ 'auth\.(uid|role|jwt)\(\)' and with_check !~ '\(\s*select auth\.'))
  loop
    v_qual := r.qual; v_check := r.with_check;
    if v_qual is not null then
      v_qual := regexp_replace(v_qual, 'auth\.uid\(\)',  '(select auth.uid())',  'g');
      v_qual := regexp_replace(v_qual, 'auth\.role\(\)', '(select auth.role())', 'g');
      v_qual := regexp_replace(v_qual, 'auth\.jwt\(\)',  '(select auth.jwt())',  'g');
    end if;
    if v_check is not null then
      v_check := regexp_replace(v_check, 'auth\.uid\(\)',  '(select auth.uid())',  'g');
      v_check := regexp_replace(v_check, 'auth\.role\(\)', '(select auth.role())', 'g');
      v_check := regexp_replace(v_check, 'auth\.jwt\(\)',  '(select auth.jwt())',  'g');
    end if;
    v_roles := array_to_string(r.roles, ', ');
    v_using := case when v_qual is not null then ' USING (' || v_qual || ')' else '' end;
    v_checkc := case when v_check is not null then ' WITH CHECK (' || v_check || ')' else '' end;
    execute format('DROP POLICY %I ON public.%I;', r.policyname, r.tablename);
    execute format('CREATE POLICY %I ON public.%I FOR %s TO %s%s%s;',
      r.policyname, r.tablename, r.cmd, v_roles, v_using, v_checkc);
  end loop;
end $$;
