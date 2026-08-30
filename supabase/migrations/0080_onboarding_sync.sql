-- =====================================================================
-- 0080_onboarding_sync.sql — hogar en la nube para la estimación del onboarding
--
-- OBJETIVO:
--   El onboarding produce profesión + etiqueta de seniority + resumen + años
--   + skills + 4 ejes. De estos, años/skills/resumen/ejes ya tienen columnas
--   aditivas y una RPC aditiva (aplicar_analisis_cv, 0077) que los protege con
--   semántica GREATEST/MERGE. Pero la profesión, la etiqueta de seniority y una
--   marca de "onboarding ya completado" NO tenían columna en la nube, por lo que
--   migrateGuestProfile las descartaba. Se agregan tres columnas anulables a
--   public.profiles para que el perfil del onboarding viaje entre dispositivos
--   (celu <-> web) y para que un dispositivo nuevo detecte que el onboarding ya
--   fue hecho.
--
--   profession/senior_label son cadenas SOLO de presentación que el flujo de CV
--   no gestiona, así que reciben columnas dedicadas (sin riesgo de pisar
--   ejes/skills). onboarding_completed_at hace doble función como marca de
--   "onboarding ya completado" para la detección en un dispositivo nuevo.
--   NO se agregan columnas para años/skills/resumen/ejes: esos ya existen y DEBEN
--   seguir fluyendo por la RPC aditiva aplicar_analisis_cv (0077) para que la
--   semántica GREATEST/MERGE proteja los datos más ricos del CV.
--
-- IDEMPOTENTE:
--   ADD COLUMN IF NOT EXISTS. Re-aplicar la migración no vuelve a crear las
--   columnas ni altera datos existentes. Las columnas son anulables, sin valor
--   por defecto, para no tocar los perfiles ya creados.
--
-- REVERSIBLE:
--   Para revertir:
--     ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_profession;
--     ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_senior_label;
--     ALTER TABLE public.profiles DROP COLUMN IF EXISTS onboarding_completed_at;
--
-- RLS:
--   No requiere cambios de políticas. La regla de fila existente que permite
--   a cada persona actualizar SU propio perfil (id = auth.uid()) ya cubre las
--   nuevas columnas (mismo patrón que 0079).
--
-- CONTENIDO:
--   onboarding_profession    — profesión estimada en el onboarding (texto de presentación).
--   onboarding_senior_label  — etiqueta de seniority estimada (texto de presentación).
--   onboarding_completed_at  — momento en que se completó el onboarding; también
--                              sirve como marca de "onboarding ya hecho".
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_profession text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_senior_label text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz;

-- Recargar el esquema de PostgREST para que exponga las nuevas columnas de
-- inmediato en la API REST. Sin esto, la API puede seguir sirviendo el
-- esquema cacheado sin las columnas de onboarding hasta un reload/reinicio
-- manual. Mismo patrón que el resto de migraciones.
NOTIFY pgrst, 'reload schema';
