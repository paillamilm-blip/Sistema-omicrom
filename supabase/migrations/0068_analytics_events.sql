-- 0068_analytics_events.sql
-- ═══════════════════════════════════════════════════════════════════════
-- ANALYTICS — Eventos para métricas de inversionistas.
-- Trackea: activación, retención, engagement, conversión.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.analytics_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  event_name  text NOT NULL,
  properties  jsonb DEFAULT '{}',
  session_id  text,
  device_info jsonb DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Índices para queries de métricas
CREATE INDEX IF NOT EXISTS idx_analytics_event_name ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_user ON public.analytics_events (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_session ON public.analytics_events (session_id);

-- RLS: cualquiera puede insertar su propio evento, solo admin puede leer todo
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS analytics_insert ON public.analytics_events;
CREATE POLICY analytics_insert ON public.analytics_events
  FOR INSERT WITH CHECK (true); -- Cualquiera puede insertar (incluso anon para guest mode)

DROP POLICY IF EXISTS analytics_read_own ON public.analytics_events;
CREATE POLICY analytics_read_own ON public.analytics_events
  FOR SELECT USING (auth.uid() = user_id OR auth.role() = 'service_role');

GRANT INSERT ON public.analytics_events TO anon;
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.analytics_events TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════
-- VISTAS PARA MÉTRICAS RÁPIDAS (inversionistas)
-- ═══════════════════════════════════════════════════════════════════════

-- Vista: DAU (Daily Active Users)
CREATE OR REPLACE VIEW public.v_daily_active_users AS
SELECT
  activity_date,
  count(DISTINCT user_id) as dau
FROM public.daily_activity
GROUP BY activity_date
ORDER BY activity_date DESC;

-- Vista: Funnel de activación
CREATE OR REPLACE VIEW public.v_activation_funnel AS
SELECT
  'total_signups' as step,
  count(*) as users
FROM public.profiles WHERE is_ghost = false
UNION ALL
SELECT
  'onboarding_completed',
  count(*)
FROM public.profiles WHERE is_ghost = false AND skills IS NOT NULL AND array_length(skills, 1) > 0
UNION ALL
SELECT
  'first_job_view',
  count(DISTINCT user_id)
FROM public.analytics_events WHERE event_name = 'job_viewed'
UNION ALL
SELECT
  'first_application',
  count(DISTINCT user_id)
FROM public.analytics_events WHERE event_name = 'job_applied'
UNION ALL
SELECT
  'first_connection',
  count(DISTINCT user_id)
FROM public.analytics_events WHERE event_name = 'connection_sent';

-- Función: retention cohort (D1, D7, D30)
CREATE OR REPLACE FUNCTION public.get_retention_cohort(p_days int DEFAULT 7)
RETURNS TABLE(cohort_date date, total_users bigint, returned_users bigint, retention_pct numeric)
LANGUAGE sql STABLE AS $$
  WITH cohorts AS (
    -- profiles no tiene columna created_at en el esquema base; derivamos la
    -- fecha de cohorte como la PRIMERA actividad registrada de cada usuario.
    SELECT
      min(da.activity_date) as cohort_date,
      da.user_id as user_id
    FROM public.daily_activity da
    JOIN public.profiles p ON p.id = da.user_id
    WHERE p.is_ghost = false
    GROUP BY da.user_id
  ),
  returned AS (
    SELECT DISTINCT
      c.cohort_date,
      c.user_id
    FROM cohorts c
    JOIN public.daily_activity da ON da.user_id = c.user_id
    WHERE da.activity_date >= c.cohort_date + p_days
  )
  SELECT
    c.cohort_date,
    count(DISTINCT c.user_id) as total_users,
    count(DISTINCT r.user_id) as returned_users,
    CASE WHEN count(DISTINCT c.user_id) > 0
      THEN round(count(DISTINCT r.user_id)::numeric / count(DISTINCT c.user_id) * 100, 1)
      ELSE 0
    END as retention_pct
  FROM cohorts c
  LEFT JOIN returned r ON r.cohort_date = c.cohort_date AND r.user_id = c.user_id
  GROUP BY c.cohort_date
  ORDER BY c.cohort_date DESC
  LIMIT 30;
$$;

NOTIFY pgrst, 'reload schema';
