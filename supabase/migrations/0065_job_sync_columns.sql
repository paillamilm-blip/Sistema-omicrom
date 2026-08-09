-- 0065_job_sync_columns.sql
-- Agrega columnas para empleos sincronizados desde APIs externas.
-- source + external_id = deduplicación. external_url = link para postular.
-- salary_range y remote son metadata extra. company_name para cuando no hay FK.
-- Idempotente: usa IF NOT EXISTS / ON CONFLICT.

-- ── Nuevas columnas ──────────────────────────────────────────────────
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS source        text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS external_id   text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS external_url  text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS salary_range  text;
ALTER TABLE public.job_postings ADD COLUMN IF NOT EXISTS company_name  text;

-- ── Hacer company_id nullable (empleos externos no tienen perfil) ────
ALTER TABLE public.job_postings ALTER COLUMN company_id DROP NOT NULL;

-- ── Índice único para deduplicación ─────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_source_ext
  ON public.job_postings (source, external_id)
  WHERE source IS NOT NULL AND external_id IS NOT NULL;

-- ── Índice para búsqueda por fuente ─────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_job_postings_source ON public.job_postings (source);

-- ── RLS: empleos externos son visibles para todos ───────────────────
-- La política "jobs_read" existente ya permite SELECT para todos.

NOTIFY pgrst, 'reload schema';
