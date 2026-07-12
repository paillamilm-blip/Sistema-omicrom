-- =====================================================================
-- 0047_realtime_publication.sql — Habilita Supabase Realtime (replication)
-- para las tablas que alimentan las funciones EN VIVO de la app:
--
--   · profiles      → ranking en vivo (reputation_score) + progresión que
--                     ve toda la red cuando alguien mejora su nodo.
--   · job_postings  → "NUEVA OFERTA EN LA RED" (push al publicarse una oferta).
--   · job_matches   → "EL TRABAJO TE BUSCA" (match personalizado por usuario).
--
-- Presencia (nodos en línea), actividad y DM NO dependen de esto (usan
-- Presence/Broadcast). Esta migración solo enciende los eventos
-- `postgres_changes` que el frontend ya escucha (degradación elegante si no
-- estaban habilitados).
--
-- Idempotente: solo agrega la tabla a la publicación si aún no está.
-- =====================================================================

-- Cada tabla en su propio bloque con manejo de error: si la tabla no existe
-- (schema-drift), se salta en vez de abortar toda la migración.
do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='profiles')
  then alter publication supabase_realtime add table public.profiles; end if;
exception when others then null; end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='job_postings')
  then alter publication supabase_realtime add table public.job_postings; end if;
exception when others then null; end $$;

do $$ begin
  if not exists (select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='job_matches')
  then alter publication supabase_realtime add table public.job_matches; end if;
exception when others then null; end $$;

notify pgrst, 'reload schema';
