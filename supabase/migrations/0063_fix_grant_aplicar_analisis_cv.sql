-- =====================================================================
-- 0063_fix_grant_aplicar_analisis_cv.sql
-- Fix: PostgREST no podía ver la función porque el rol 'authenticator'
-- no tenía EXECUTE. Sin este permiso, PostgREST ignora la función y
-- hace fallback a la tabla profiles (devuelve 400 con datos del perfil).
-- =====================================================================

GRANT EXECUTE ON FUNCTION public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) TO authenticator;

NOTIFY pgrst, 'reload schema';
