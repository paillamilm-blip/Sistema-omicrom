-- 0007_protect_profile_columns.sql
-- ═══════════════════════════════════════════════════════════════════════
-- BLINDAJE ANTI-ESCRITURA DEL CLIENTE
--
-- Los campos de reputación y ejes son calculados SOLO por triggers
-- server-side. Si un cliente (via RLS policy) intenta escribirlos
-- directamente, este trigger los REVIERTE al valor anterior.
--
-- Excepción: las funciones SECURITY DEFINER (RPCs) sí pueden escribir
-- porque ejecutan como el owner de la función, no como el usuario.
-- ═══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_profile_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Si la sesión actual NO es un superuser/service_role,
  -- revertir los campos protegidos al valor anterior.
  IF current_setting('role', true) NOT IN ('service_role', 'supabase_admin', 'postgres') THEN
    NEW.reputation_score := OLD.reputation_score;
    NEW.execution_score := OLD.execution_score;
    NEW.quality_score := OLD.quality_score;
    NEW.transcendence_score := OLD.transcendence_score;
    NEW.foundation_score := OLD.foundation_score;
    NEW.traditional_score := OLD.traditional_score;
    NEW.experience_score := OLD.experience_score;
    NEW.pe_points := OLD.pe_points;
    NEW.node_level := OLD.node_level;
    NEW.node_type := OLD.node_type;
  END IF;

  RETURN NEW;
END;
$$;

-- BEFORE UPDATE con prioridad alta (ejecuta ANTES que recalc_reputation)
DROP TRIGGER IF EXISTS trg_protect_profile_columns ON profiles;
CREATE TRIGGER trg_protect_profile_columns
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION protect_profile_columns();

-- Asegurar que este trigger ejecute ANTES que recalc_reputation
-- (PostgreSQL ejecuta triggers del mismo timing en orden alfabético del nombre)
-- "trg_protect..." < "trg_recalc..." → OK, ejecuta primero.
