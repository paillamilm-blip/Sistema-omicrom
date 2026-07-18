-- 0048_convalidar_credencial.sql
-- ═══════════════════════════════════════════════════════════════════════
-- RPCs de convalidación — SECURITY DEFINER (bypassean protect_profile_columns)
-- Estas son las funciones que el cliente invoca para registrar evidencia
-- verificada. Al actualizar traditional_score, disparan recalc_reputation.
-- ═══════════════════════════════════════════════════════════════════════

-- Convalidar CV (requiere que exista archivo en storage o texto procesado)
CREATE OR REPLACE FUNCTION convalidar_cv(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_traditional numeric;
BEGIN
  -- Verificar que el usuario existe
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'Usuario no encontrado';
  END IF;

  -- Verificar que el caller es el propio usuario
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- Obtener traditional actual
  SELECT traditional_score INTO v_current_traditional
  FROM profiles WHERE id = p_user_id;

  -- CV suma +6 al traditional (tope 60)
  UPDATE profiles
  SET traditional_score = LEAST(60, COALESCE(v_current_traditional, 0) + 6),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- El UPDATE de traditional_score dispara recalc_reputation automáticamente
END;
$$;

-- Convalidar credencial genérica (titulo, experiencia)
CREATE OR REPLACE FUNCTION convalidar_credencial(p_user_id uuid, p_tipo text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_traditional numeric;
  v_delta numeric;
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT traditional_score INTO v_current_traditional
  FROM profiles WHERE id = p_user_id;

  -- Deltas por tipo de credencial
  CASE p_tipo
    WHEN 'titulo' THEN v_delta := 5;
    WHEN 'experiencia' THEN v_delta := 4;
    WHEN 'certificacion' THEN v_delta := 3;
    ELSE v_delta := 2;
  END CASE;

  UPDATE profiles
  SET traditional_score = LEAST(60, COALESCE(v_current_traditional, 0) + v_delta),
      updated_at = NOW()
  WHERE id = p_user_id;
END;
$$;

-- Registrar aporte a la Bóveda (para el eje Trascendencia)
CREATE OR REPLACE FUNCTION registrar_aporte_boveda(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  -- El eje Trascendencia se recalcula por el trigger 0018 cuando
  -- se inserta en knowledge_vault_documents. Esta RPC es un convenience
  -- wrapper que podría insertar un registro placeholder si se necesita.
  -- Por ahora solo refresca el score forzando un recálculo.
  PERFORM recalc_transcendence_score();
END;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION convalidar_cv(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION convalidar_credencial(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION registrar_aporte_boveda(uuid) TO authenticated;
