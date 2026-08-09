-- 0066_retention_system.sql
-- ═══════════════════════════════════════════════════════════════════════
-- SISTEMA DE RETENCIÓN — Push subscriptions + actividad diaria.
-- Soporta: Web Push, streak tracking server-side, daily challenges.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Push Subscriptions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth        text NOT NULL,
  last_active timestamptz NOT NULL DEFAULT now(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_sub_own ON public.push_subscriptions;
CREATE POLICY push_sub_own ON public.push_subscriptions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;

-- ── Índice para buscar inactivos ─────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_push_sub_last_active
  ON public.push_subscriptions (last_active);

-- ── Daily Activity (para streak server-side) ─────────────────────────
CREATE TABLE IF NOT EXISTS public.daily_activity (
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  challenge_completed boolean DEFAULT false,
  pe_earned   int DEFAULT 0,
  PRIMARY KEY (user_id, activity_date)
);

ALTER TABLE public.daily_activity ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS daily_own ON public.daily_activity;
CREATE POLICY daily_own ON public.daily_activity
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.daily_activity TO authenticated;

-- ── Función: registrar actividad diaria (upsert) ─────────────────────
CREATE OR REPLACE FUNCTION public.register_daily_activity(
  p_challenge boolean DEFAULT false,
  p_pe int DEFAULT 0
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.daily_activity (user_id, activity_date, challenge_completed, pe_earned)
  VALUES (auth.uid(), CURRENT_DATE, p_challenge, p_pe)
  ON CONFLICT (user_id, activity_date)
  DO UPDATE SET
    challenge_completed = COALESCE(daily_activity.challenge_completed, false) OR p_challenge,
    pe_earned = daily_activity.pe_earned + p_pe;

  -- Actualizar last_active en push_subscriptions
  UPDATE public.push_subscriptions
  SET last_active = now()
  WHERE user_id = auth.uid();
END;
$$;

GRANT EXECUTE ON FUNCTION public.register_daily_activity(boolean, int) TO authenticated;

-- ── Función: calcular streak server-side ─────────────────────────────
CREATE OR REPLACE FUNCTION public.get_user_streak(p_user_id uuid)
RETURNS int LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_streak int := 0;
  v_date date := CURRENT_DATE;
  v_found boolean;
BEGIN
  -- Si hoy no hay actividad, empezar desde ayer
  SELECT EXISTS(SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND activity_date = v_date)
  INTO v_found;

  IF NOT v_found THEN
    v_date := v_date - 1;
    SELECT EXISTS(SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND activity_date = v_date)
    INTO v_found;
    IF NOT v_found THEN RETURN 0; END IF;
  END IF;

  -- Contar días consecutivos hacia atrás
  LOOP
    SELECT EXISTS(SELECT 1 FROM daily_activity WHERE user_id = p_user_id AND activity_date = v_date)
    INTO v_found;
    EXIT WHEN NOT v_found;
    v_streak := v_streak + 1;
    v_date := v_date - 1;
  END LOOP;

  RETURN v_streak;
END;
$$;

-- ── Función: obtener usuarios inactivos para push ────────────────────
CREATE OR REPLACE FUNCTION public.get_inactive_push_users(p_hours int DEFAULT 24)
RETURNS TABLE(user_id uuid, endpoint text, p256dh text, auth text, hours_inactive numeric) 
LANGUAGE sql STABLE AS $$
  SELECT 
    ps.user_id, ps.endpoint, ps.p256dh, ps.auth,
    EXTRACT(EPOCH FROM (now() - ps.last_active)) / 3600 as hours_inactive
  FROM public.push_subscriptions ps
  WHERE ps.last_active < now() - (p_hours || ' hours')::interval
  ORDER BY ps.last_active ASC;
$$;

NOTIFY pgrst, 'reload schema';
