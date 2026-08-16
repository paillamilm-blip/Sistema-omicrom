-- =====================================================================
-- 0073_register_exam_success.sql — Sprint B: Exámenes alimentan tu Gemelo
--
-- Cuando un usuario aprueba un examen (simulador-universal o examen-ia),
-- la RPC register_exam_success incrementa los ejes del Gemelo Digital.
--
-- Scoring:
--   - quality_score += 2-5 (según score del examen: 70-100 → 2-5)
--   - execution_score += 1-3 (si es un examen práctico/caso)
--   - PE += variable (ya se maneja por la Edge Function)
--
-- SECURITY DEFINER: sortea protect_profile_columns (como aplicar_analisis_cv).
-- Solo el propio usuario puede invocarla (auth.uid()).
-- Idempotente.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.register_exam_success(
  p_skill     text,
  p_score     integer,      -- 0-100: score del examen
  p_kind      text DEFAULT 'mixed'  -- 'theory', 'practical', 'mixed'
)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $fn$
DECLARE
  v_uid uuid := auth.uid();
  v_quality_delta  numeric;
  v_execution_delta numeric;
  v_foundation_delta numeric;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('ok', false, 'error', 'sin sesión');
  END IF;

  -- Solo procesar si aprobó (score >= 70)
  IF p_score < 70 THEN
    RETURN json_build_object('ok', false, 'error', 'score insuficiente para subir ejes');
  END IF;

  -- Calcular deltas según score (70-100 → escala proporcional)
  -- Quality sube siempre al aprobar (validar conocimiento = calidad)
  v_quality_delta := LEAST(5, GREATEST(2, ROUND((p_score - 70) * 0.1 + 2)));

  -- Execution sube si es práctico o mixto (demostrar capacidad de hacer)
  v_execution_delta := CASE
    WHEN p_kind IN ('practical', 'mixed') THEN LEAST(3, GREATEST(1, ROUND((p_score - 70) * 0.07 + 1)))
    ELSE 0
  END;

  -- Foundation sube ligeramente si es teórico (base formal)
  v_foundation_delta := CASE
    WHEN p_kind IN ('theory', 'mixed') THEN LEAST(2, GREATEST(1, ROUND((p_score - 70) * 0.05 + 1)))
    ELSE 0
  END;

  -- Actualizar ejes (ADITIVO con cap de 100)
  UPDATE public.profiles SET
    quality_score       = LEAST(100, COALESCE(quality_score, 0) + v_quality_delta),
    execution_score     = LEAST(100, COALESCE(execution_score, 0) + v_execution_delta),
    foundation_score    = LEAST(100, COALESCE(foundation_score, 0) + v_foundation_delta),
    reputation_updated_at = now()
  WHERE id = v_uid;
  -- → El trigger recalc_reputation recalcula experience_score y reputation_score

  -- Registrar en historial
  BEGIN
    INSERT INTO public.reputation_history(user_id, reason)
    VALUES (v_uid, 'Examen aprobado: ' || COALESCE(p_skill, 'general') || ' (score: ' || p_score || ', kind: ' || p_kind || ')');
  EXCEPTION WHEN others THEN NULL;
  END;

  RETURN json_build_object(
    'ok', true,
    'quality_delta', v_quality_delta,
    'execution_delta', v_execution_delta,
    'foundation_delta', v_foundation_delta,
    'skill', p_skill,
    'score', p_score
  );
END;
$fn$;

-- Grants
REVOKE ALL ON FUNCTION public.register_exam_success(text, integer, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.register_exam_success(text, integer, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
