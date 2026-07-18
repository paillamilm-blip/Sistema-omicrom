-- 0050_reputacion_canonica.sql
-- ═══════════════════════════════════════════════════════════════════════
-- FORMULA MAESTRA DE REPUTACION (trigger consolidador)
--
-- Se dispara CADA VEZ que cambia un eje o traditional_score en profiles.
-- Recalcula:
--   experience_score = promedio(4 ejes)
--   reputation_score = 0.20*traditional + 0.80*experience + momentum(PE)
--   node_level = según umbrales
--
-- Ver DEFINICION_REPUTACION_OMICROM.md §1.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION recalc_reputation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_experience numeric;
  v_momentum numeric;
  v_reputation numeric;
  v_node_level integer;
  v_node_type text;
BEGIN
  -- Experience = promedio de los 4 ejes (columna DERIVADA)
  v_experience := (
    COALESCE(NEW.execution_score, 0) +
    COALESCE(NEW.quality_score, 0) +
    COALESCE(NEW.transcendence_score, 0) +
    COALESCE(NEW.foundation_score, 0)
  ) / 4.0;

  -- Momentum por PE: min(15, sqrt(pe_points) / 4)
  v_momentum := LEAST(15, SQRT(GREATEST(COALESCE(NEW.pe_points, 0), 0)) / 4.0);

  -- Reputación = base(20/80) + momentum
  v_reputation := LEAST(100, GREATEST(0,
    0.20 * COALESCE(NEW.traditional_score, 0) +
    0.80 * v_experience +
    v_momentum
  ));

  -- Determinar nivel del nodo
  IF v_reputation >= 80 THEN
    v_node_level := 3;
    v_node_type := 'Nodo Arquitecto';
  ELSIF v_reputation >= 50 THEN
    v_node_level := 2;
    v_node_type := 'Nodo Core';
  ELSE
    v_node_level := 1;
    v_node_type := 'Nodo Operativo';
  END IF;

  -- Actualizar campos derivados
  NEW.experience_score := ROUND(v_experience, 2);
  NEW.reputation_score := ROUND(v_reputation, 2);
  NEW.node_level := v_node_level;
  NEW.node_type := v_node_type;
  NEW.reputation_updated_at := NOW();

  RETURN NEW;
END;
$$;

-- BEFORE UPDATE: intercepta el row antes de que se escriba
DROP TRIGGER IF EXISTS trg_recalc_reputation ON profiles;
CREATE TRIGGER trg_recalc_reputation
  BEFORE UPDATE OF
    execution_score,
    quality_score,
    transcendence_score,
    foundation_score,
    traditional_score,
    pe_points
  ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION recalc_reputation();
