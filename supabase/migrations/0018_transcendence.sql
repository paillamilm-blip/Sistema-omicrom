-- 0018_transcendence.sql
-- ═══════════════════════════════════════════════════════════════════════
-- EJE TRASCENDENCIA: Aporte al ecosistema.
-- Formula: min(100, servicios×8 + docs_boveda×12 + mentorias×6)
-- Se dispara al publicar servicios, documentos o completar mentorías.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION recalc_transcendence_score()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_services integer := 0;
  v_docs integer := 0;
  v_mentorships integer := 0;
  v_new_transcendence numeric;
BEGIN
  v_user_id := COALESCE(NEW.author_id, NEW.seller_id, NEW.mentor_id);
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Contar servicios publicados activos
  SELECT COUNT(*) INTO v_services
  FROM market_services
  WHERE seller_id = v_user_id AND is_active = true;

  -- Contar documentos validados en la Bóveda
  SELECT COUNT(*) INTO v_docs
  FROM knowledge_vault_documents
  WHERE author_id = v_user_id AND status = 'VALIDATED';

  -- Contar mentorías completadas (si existe la tabla)
  BEGIN
    SELECT COUNT(*) INTO v_mentorships
    FROM mentorship_sessions
    WHERE mentor_id = v_user_id AND status = 'COMPLETED';
  EXCEPTION WHEN undefined_table THEN
    v_mentorships := 0;
  END;

  -- Transcendence = min(100, servicios×8 + docs×12 + mentorias×6)
  v_new_transcendence := LEAST(100, v_services * 8 + v_docs * 12 + v_mentorships * 6);

  UPDATE profiles
  SET transcendence_score = v_new_transcendence,
      updated_at = NOW()
  WHERE id = v_user_id;

  RETURN NEW;
END;
$$;

-- Triggers en market_services
DROP TRIGGER IF EXISTS trg_recalc_transcendence_market ON market_services;
CREATE TRIGGER trg_recalc_transcendence_market
  AFTER INSERT OR UPDATE OF is_active ON market_services
  FOR EACH ROW
  EXECUTE FUNCTION recalc_transcendence_score();

-- Triggers en knowledge_vault_documents
DROP TRIGGER IF EXISTS trg_recalc_transcendence_vault ON knowledge_vault_documents;
CREATE TRIGGER trg_recalc_transcendence_vault
  AFTER INSERT OR UPDATE OF status ON knowledge_vault_documents
  FOR EACH ROW
  EXECUTE FUNCTION recalc_transcendence_score();
