-- 0065_job_source_column.sql
-- Agrega columna 'source' a job_postings para distinguir ofertas manuales de APIs.

ALTER TABLE public.job_postings
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS external_id text,
  ADD COLUMN IF NOT EXISTS external_url text,
  ADD COLUMN IF NOT EXISTS remote boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS salary_range text;

-- Índice para evitar duplicados de APIs externas
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_postings_external_id
  ON public.job_postings (source, external_id)
  WHERE external_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
