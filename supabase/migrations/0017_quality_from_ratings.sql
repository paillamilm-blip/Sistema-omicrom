-- 0017_quality_from_ratings.sql
-- ═══════════════════════════════════════════════════════════════════════
-- EJE CALIDAD: Se recalcula cuando un comprador califica a un vendedor.
-- Formula: (promedio_estrellas / 5) × 100. Sin datos = 50 (neutral).
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION recalc_quality_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_avg_rating numeric;
  v_new_quality numeric;
BEGIN
  -- Obtener el seller del contrato calificado
  SELECT c.seller_id INTO v_seller_id
  FROM contracts c
  WHERE c.id = NEW.contract_id;

  IF v_seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Promedio de todas las calificaciones recibidas como vendedor
  SELECT COALESCE(AVG(cr.rating), 2.5)
  INTO v_avg_rating
  FROM contract_ratings cr
  JOIN contracts c ON c.id = cr.contract_id
  WHERE c.seller_id = v_seller_id;

  -- Quality = (avg / 5) × 100
  v_new_quality := ROUND((v_avg_rating / 5.0) * 100);

  UPDATE profiles
  SET quality_score = v_new_quality,
      updated_at = NOW()
  WHERE id = v_seller_id;

  RETURN NEW;
END;
$$;

-- Trigger: se dispara al insertar una calificación
DROP TRIGGER IF EXISTS trg_recalc_quality ON contract_ratings;
CREATE TRIGGER trg_recalc_quality
  AFTER INSERT ON contract_ratings
  FOR EACH ROW
  EXECUTE FUNCTION recalc_quality_score();
