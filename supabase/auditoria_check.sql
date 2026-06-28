-- =====================================================================
-- auditoria_check.sql — Diagnóstico de seguridad (solo lectura)
-- Corre cada bloque en el SQL Editor y revisa los resultados.
-- =====================================================================

-- 1) RLS por tabla + nº de políticas
--    🔴 rls_activo=false  → tabla ABIERTA (cualquiera con grant ve/edita)
--    🔴 rls_activo=true y politicas=0 → tabla BLOQUEADA (nadie accede)
select c.relname as tabla,
       c.relrowsecurity as rls_activo,
       (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=c.relname) as politicas
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname='public' and c.relkind='r'
order by c.relrowsecurity asc, politicas asc, c.relname;

-- 2) Funciones SECURITY DEFINER (revisar que validen auth.uid() o rol)
select p.proname as funcion
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname='public' and p.prosecdef = true
order by p.proname;

-- 3) Documentos de la Bóveda SIN embedding (no entran a búsqueda/anti-plagio)
select count(*) as docs_sin_embedding
from public.knowledge_vault_documents
where embedding is null;

-- 4) Tablas economicas: ¿el cliente puede escribir directo? (deben ir por RPC/triggers)
select tablename, cmd, roles
from pg_policies
where schemaname='public'
  and tablename in ('wallet_transactions','human_venture_stakes','arbitration_cases','disputes')
order by tablename, cmd;
