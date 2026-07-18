-- 0016_execution_from_contracts.sql
-- ═══════════════════════════════════════════════════════════════════════
-- EJE EJECUCION: Se recalcula cuando un contrato pasa a estado RELEASED.
-- Formula: min(100, nº_contratos_completados × 12)
-- ~9 contratos = 100 (tope).
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION recalc_execution_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_seller_id uuid;
  v_completed_count integer;
  v_new_execution numeric;
BEGIN
  -- Solo actuar cuando el contrato pasa a RELEASED
  IF NEW.status <> 'RELEASED' THEN
    RETURN NEW;
  END IF;

  -- El vendedor (payee/seller) es quien gana ejecución
  v_seller_id := NEW.seller_id;
  IF v_seller_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Contar contratos completados como vendedor
  SELECT COUNT(*)
  INTO v_completed_count
  FROM contracts
  WHERE seller_id = v_seller_id
    AND status = 'RELEASED';

  -- Execution = min(100, contratos × 12)
  v_new_execution := LEAST(100, v_completed_count * 12);

  UPDATE profiles
  SET execution_score = v_new_execution,
      total_contracts_completed = v_completed_count,
      updated_at = NOW()
  WHERE id = v_seller_id;

  RETURN NEW;
END;
$$;

-- Trigger: se dispara al actualizar status de un contrato
DROP TRIGGER IF EXISTS trg_recalc_execution ON contracts;
CREATE TRIGGER trg_recalc_execution
  AFTER UPDATE OF status ON contracts
  FOR EACH ROW
  WHEN (NEW.status = 'RELEASED')
  EXECUTE FUNCTION recalc_execution_score();
