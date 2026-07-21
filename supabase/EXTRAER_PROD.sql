-- =====================================================================
-- EXTRAER_PROD.sql — Captura de objetos que viven SOLO en la BD real
-- (funciones RPC + tablas no versionadas). Fallback del SQL Editor si no
-- puedes usar pg_dump (ver EXTRAER_PROD.md, Opción 1, que es mejor).
--
-- Corre CADA consulta por separado (A, B, C, D, E) y comparte el resultado.
-- Para B (funciones), usa Export → CSV para evitar truncado en la UI.
-- Solo lee el catálogo; NO modifica nada.
-- =====================================================================


-- ── A) Inventario de tablas reales en public (para detectar faltantes) ──
select c.relname                         as tabla,
       c.relrowsecurity                  as rls_activo,
       pg_total_relation_size(c.oid)     as bytes
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
where c.relkind = 'r'
order by c.relname;


-- ── B) Definiciones COMPLETAS de las funciones faltantes ───────────────
-- (Incluye posibles overloads. Si alguna no aparece, dímelo.)
select p.proname                         as funcion,
       pg_get_functiondef(p.oid)         as ddl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where p.proname in (
  'connection_status','get_direct_thread','get_leaderboard','get_public_credential',
  'mark_dm_read','my_connections','my_dm_conversations','my_pending_requests',
  'resolve_audit','respond_connection_request','send_direct_message'
)
order by p.proname, p.oid;


-- ── B2) Funciones "ocultas" de las que dependan las anteriores ─────────
-- Cualquier función en public que mencione tablas sociales/DM/auditoría.
-- Ayuda a capturar helpers internos que el frontend no llama directo.
select p.proname                         as funcion,
       pg_get_functiondef(p.oid)         as ddl
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace and n.nspname = 'public'
where pg_get_functiondef(p.oid) ~* '(connection|direct_message|\bdm\b|leaderboard|rank_audit)'
order by p.proname, p.oid;


-- ── C) Políticas RLS de todas las tablas de public ─────────────────────
select schemaname, tablename, policyname, cmd, roles,
       qual        as using_expr,
       with_check  as check_expr
from pg_policies
where schemaname = 'public'
order by tablename, policyname;


-- ── D) DDL reconstruido de tablas (columnas + not null + default + PK) ──
-- Aproximado (sin FKs/índices, que salen en E). Autoritativo: pg_dump.
select
  'create table if not exists public.' || c.relname || ' (' || chr(10) ||
  string_agg(
    '  ' || quote_ident(a.attname) || ' ' || pg_catalog.format_type(a.atttypid, a.atttypmod)
      || case when a.attnotnull then ' not null' else '' end
      || coalesce(' default ' || pg_get_expr(ad.adbin, ad.adrelid), ''),
    ',' || chr(10) order by a.attnum
  )
  || coalesce(',' || chr(10) || '  primary key (' || pk.cols || ')', '')
  || chr(10) || ');'                     as ddl
from pg_class c
join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
join pg_attribute a on a.attrelid = c.oid and a.attnum > 0 and not a.attisdropped
left join pg_attrdef ad on ad.adrelid = c.oid and ad.adnum = a.attnum
left join lateral (
  select string_agg(quote_ident(att.attname), ', ' order by k.ord) as cols
  from pg_constraint con
  cross join lateral unnest(con.conkey) with ordinality as k(attnum, ord)
  join pg_attribute att on att.attrelid = con.conrelid and att.attnum = k.attnum
  where con.conrelid = c.oid and con.contype = 'p'
) pk on true
where c.relkind = 'r'
group by c.relname, pk.cols
order by c.relname;


-- ── E) Índices y llaves foráneas de public ─────────────────────────────
select 'INDEX' as tipo, indexdef as ddl from pg_indexes where schemaname = 'public'
union all
select 'FK' as tipo,
       'alter table public.' || conrelid::regclass::text ||
       ' add constraint ' || conname || ' ' || pg_get_constraintdef(oid) || ';' as ddl
from pg_constraint
where connamespace = 'public'::regnamespace and contype = 'f'
order by 1, 2;
