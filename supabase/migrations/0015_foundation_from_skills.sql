-- 0015_foundation_from_skills.sql
-- ═══════════════════════════════════════════════════════════════════════
-- EJE FUNDAMENTO: Se recalcula cuando un usuario valida/domina un nodo
-- del árbol de habilidades. Formula: % ponderado por dificultad.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION recalc_foundation_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_total_weight numeric := 0;
  v_earned_weight numeric := 0;
  v_new_foundation numeric;
BEGIN
  v_user_id := COALESCE(NEW.user_id, OLD.user_id);

  -- Calcular peso total disponible (todos los nodos del árbol)
  SELECT COALESCE(SUM(difficulty_level), 1)
  INTO v_total_weight
  FROM skill_tree_nodes;

  -- Calcular peso ganado (nodos VALIDATED o MASTERED por el usuario)
  SELECT COALESCE(SUM(stn.difficulty_level), 0)
  INTO v_earned_weight
  FROM user_skill_progress usp
  JOIN skill_tree_nodes stn ON stn.id = usp.node_id
  WHERE usp.user_id = v_user_id
    AND usp.status IN ('VALIDATED', 'MASTERED');

  -- Foundation = porcentaje ponderado, escala 0-100
  v_new_foundation := LEAST(100, ROUND((v_earned_weight / GREATEST(v_total_weight, 1)) * 100));

  UPDATE profiles
  SET foundation_score = v_new_foundation,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN NEW;
END;
$$;

-- Trigger: se dispara al cambiar status en user_skill_progress
DROP TRIGGER IF EXISTS trg_recalc_foundation ON user_skill_progress;
CREATE TRIGGER trg_recalc_foundation
  AFTER INSERT OR UPDATE OF status ON user_skill_progress
  FOR EACH ROW
  EXECUTE FUNCTION recalc_foundation_score();
