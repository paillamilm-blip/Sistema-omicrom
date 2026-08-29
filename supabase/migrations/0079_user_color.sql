-- =====================================================================
-- 0079_user_color.sql — color del Gemelo sincronizado entre dispositivos
--
-- OBJETIVO:
--   El color elegido por la persona en el onboarding (ColorPicker) vivía
--   solo en localStorage['omicron_user_color'], por lo que era distinto en
--   el teléfono y en la web. Se agrega una columna para persistir el color
--   en el perfil y sincronizarlo entre dispositivos.
--
-- IDEMPOTENTE:
--   ADD COLUMN IF NOT EXISTS. Re-aplicar la migración no vuelve a crear la
--   columna ni altera datos existentes. La columna es anulable (text), sin
--   valor por defecto, para no tocar los perfiles ya creados.
--
-- REVERSIBLE:
--   Para revertir: ALTER TABLE public.profiles DROP COLUMN IF EXISTS user_color;
--
-- RLS:
--   No requiere cambios de políticas. La regla de fila existente que permite
--   a cada persona actualizar SU propio perfil (id = auth.uid()) ya cubre la
--   nueva columna (mismo patrón verificado en migrateGuestProfile).
--
-- CONTENIDO:
--   Guarda el ID del color ('ice' | 'pink' | 'gold' | 'lime'), validado en el
--   cliente contra COLOR_OPTIONS antes de escribir.
-- =====================================================================

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_color text;

-- Recargar el esquema de PostgREST para que exponga la nueva columna de
-- inmediato en la API REST. Sin esto, la API puede seguir sirviendo el
-- esquema cacheado sin user_color hasta un reload/reinicio manual. Mismo
-- patrón que el resto de migraciones.
NOTIFY pgrst, 'reload schema';
