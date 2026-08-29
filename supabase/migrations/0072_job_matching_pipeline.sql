-- =====================================================================
-- 0072_job_matching_pipeline.sql — Sprint A: "El trabajo te busca"
--
-- 1. Mejorar run_matchmaking: incluir SKILLS match + reputation + nivel
-- 2. Fix: company_id NULL (empleos externos de sync-jobs) no rompe el trigger
-- 3. Crear pg_cron schedule para sync-jobs (cada 6h) + notify-matches (post-sync)
-- 4. Expandir job_matches: agregar match_skills para transparencia
--
-- Idempotente.
-- =====================================================================

-- ══════════════════════════════════════════════════════════════════════
-- 1. COLUMNA DE SKILLS MATCHEADAS EN job_matches (para mostrar en UI)
-- ══════════════════════════════════════════════════════════════════════
ALTER TABLE public.job_matches
  ADD COLUMN IF NOT EXISTS matched_skills text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS job_title text DEFAULT '';

-- ══════════════════════════════════════════════════════════════════════
-- 2. MEJORAR run_matchmaking — Skills + Reputación + Nivel
-- ══════════════════════════════════════════════════════════════════════
-- Nuevo scoring:
--   50% skills overlap (cuántas del job tiene el usuario)
--   30% reputación (0-100 normalizada)
--   20% nivel del nodo
-- Ahora maneja company_id NULL (empleos externos).
-- Genera hasta TOP 10 matches (no solo 3) para mayor alcance.

CREATE OR REPLACE FUNCTION public.run_matchmaking(p_job_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_job record;
  v_job_skills text[];
BEGIN
  SELECT * INTO v_job FROM public.job_postings WHERE id = p_job_id;
  IF v_job IS NULL THEN RETURN; END IF;

  -- Parsear required_skills (puede ser JSON string o text[])
  BEGIN
    IF v_job.required_skills IS NOT NULL THEN
      -- Intentar parsear como JSON array
      SELECT array_agg(lower(trim(s)))
      FROM jsonb_array_elements_text(v_job.required_skills::jsonb) AS s
      INTO v_job_skills;
    END IF;
  EXCEPTION WHEN others THEN
    v_job_skills := '{}';
  END;

  IF v_job_skills IS NULL THEN v_job_skills := '{}'; END IF;

  -- Eliminar matches anteriores de este job
  DELETE FROM public.job_matches WHERE job_id = p_job_id;

  -- Scoring:
  --   50% = skills overlap ratio (matched_count / total_required)
  --   30% = reputation_score / 100
  --   20% = node_level / 3
  INSERT INTO public.job_matches (job_id, user_id, match_score, rank, match_reason, matched_skills, job_title)
  SELECT
    v_job.id,
    sub.id,
    sub.score,
    ROW_NUMBER() OVER (ORDER BY sub.score DESC),
    sub.reason,
    sub.overlap_skills,
    v_job.title
  FROM (
    SELECT
      p.id,
      p.reputation_score,
      p.node_type,
      p.skills,
      -- Skills que coinciden
      ARRAY(
        SELECT s FROM unnest(p.skills) AS s
        WHERE lower(s) = ANY(v_job_skills)
           OR EXISTS (SELECT 1 FROM unnest(v_job_skills) AS js WHERE js LIKE '%' || lower(s) || '%' OR lower(s) LIKE '%' || js || '%')
      ) AS overlap_skills,
      -- Score compuesto
      ROUND(
        -- 50% skills match
        CASE WHEN array_length(v_job_skills, 1) > 0 THEN
          0.5 * (
            (SELECT count(*) FROM unnest(p.skills) AS s
             WHERE lower(s) = ANY(v_job_skills)
                OR EXISTS (SELECT 1 FROM unnest(v_job_skills) AS js WHERE js LIKE '%' || lower(s) || '%' OR lower(s) LIKE '%' || js || '%')
            )::numeric / array_length(v_job_skills, 1)
          ) * 100
        ELSE 25 END -- Si no hay skills requeridas, dar 25 base
        -- 30% reputation
        + 0.3 * COALESCE(p.reputation_score, 0)
        -- 20% node level
        + 0.2 * LEAST(public.fn_node_level(p.node_type) / 3.0 * 100, 100)
      , 1) AS score,
      -- Razón legible
      'Skills: ' || COALESCE(array_length(
        ARRAY(SELECT s FROM unnest(p.skills) AS s WHERE lower(s) = ANY(v_job_skills)
              OR EXISTS (SELECT 1 FROM unnest(v_job_skills) AS js WHERE js LIKE '%' || lower(s) || '%' OR lower(s) LIKE '%' || js || '%'))
      , 1), 0)::text || '/' || COALESCE(array_length(v_job_skills, 1), 0)::text
      || ' · Rep ' || ROUND(COALESCE(p.reputation_score, 0))::text AS reason
    FROM public.profiles p
    WHERE
      -- No matchear con el publicador (si existe)
      (v_job.company_id IS NULL OR p.id <> v_job.company_id)
      -- Solo perfiles con al menos 1 skill
      AND p.skills IS NOT NULL
      AND array_length(p.skills, 1) > 0
      -- No ghosts
      AND COALESCE(p.is_ghost, false) = false
    ORDER BY score DESC
    LIMIT 10
  ) sub
  WHERE sub.score >= 25; -- Mínimo 25% de match para ser incluido
END;
$fn$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. PG_CRON SCHEDULES (sync-jobs cada 6h, notify-matches 5min después)
-- ══════════════════════════════════════════════════════════════════════
-- Nota: pg_cron debe estar habilitado en Supabase (Settings > Extensions).
-- Si no está habilitado, estas sentencias fallan silenciosamente.

DO $do$
BEGIN
  -- Verificar si pg_cron está disponible
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Sync jobs cada 6 horas (00:00, 06:00, 12:00, 18:00 UTC)
    -- unschedule solo si ya existe (evita error "could not find job" en primer run)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'sync-jobs-6h') THEN
      PERFORM cron.unschedule('sync-jobs-6h');
    END IF;
    PERFORM cron.schedule(
      'sync-jobs-6h',
      '0 */6 * * *',
      $$
      SELECT
        net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/sync-jobs',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $$
    );

    -- Notify matches 5 min después del sync (en los :05 de cada 6h)
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'notify-matches-6h') THEN
      PERFORM cron.unschedule('notify-matches-6h');
    END IF;
    PERFORM cron.schedule(
      'notify-matches-6h',
      '5 */6 * * *',
      $$
      SELECT
        net.http_post(
          url := current_setting('app.settings.supabase_url') || '/functions/v1/notify-matches',
          headers := jsonb_build_object(
            'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
            'Content-Type', 'application/json'
          ),
          body := '{}'::jsonb
        );
      $$
    );

    RAISE NOTICE 'pg_cron: sync-jobs y notify-matches programados cada 6h';
  ELSE
    RAISE NOTICE 'pg_cron no está habilitado. Habilítalo en Supabase Dashboard > Extensions.';
  END IF;
EXCEPTION WHEN others THEN
  RAISE NOTICE 'pg_cron scheduling failed (non-fatal): %', SQLERRM;
END;
$do$;

-- ══════════════════════════════════════════════════════════════════════
-- 4. ACTUALIZAR TRIGGER para que sync-jobs (empleos externos) genere matches
-- ══════════════════════════════════════════════════════════════════════
-- El trigger trg_job_matchmaking ya existe en 0023. Lo dejamos — funciona
-- porque run_matchmaking ahora maneja company_id = NULL correctamente.

-- ══════════════════════════════════════════════════════════════════════
-- FIN
-- ══════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
