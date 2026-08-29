-- =====================================================================
-- 0078_public_credential_skills.sql — skills_detail en la credencial pública
--
-- OBJETIVO:
--   Encender la "fusión de orbes" (Incremento 5b): exponer skills_detail
--   de la otra persona en el RPC get_public_credential, para que la sección
--   ya construida en el cliente (5a) muestre skills compartidas /
--   complementarias / a aprender.
--
-- IDEMPOTENTE:
--   DROP FUNCTION IF EXISTS + CREATE. Es necesario el DROP porque cambia la
--   firma del RETURNS TABLE (se agrega la columna skills_detail), y Postgres
--   no permite CREATE OR REPLACE cuando cambian las columnas de salida.
--
-- REVERSIBLE:
--   Para revertir, re-aplicar la definición previa de 0070 (sin skills_detail).
--   La columna skills_detail ya existe en public.profiles (jsonb NOT NULL
--   DEFAULT '[]'), así que no se crea ni se muta ningún dato. RLS intacto.
--   Se re-emiten los MISMOS GRANT (authenticated + anon) para no romper el
--   deep link público (?perfil=) que funciona sin login.
-- =====================================================================

DROP FUNCTION IF EXISTS public.get_public_credential(text);

CREATE FUNCTION public.get_public_credential(p_username text)
RETURNS TABLE(
  id uuid, username text, full_name text, avatar_url text, bio text, location text,
  node_type text, node_level text, is_verified_professional boolean,
  reputation_score numeric, execution_score numeric, quality_score numeric,
  transcendence_score numeric, foundation_score numeric, pe_points integer,
  total_contracts_completed integer, skills_detail jsonb
) LANGUAGE sql STABLE AS $$
  SELECT id, username, full_name, avatar_url, bio, location,
    node_type, node_level, is_verified_professional,
    reputation_score, execution_score, quality_score,
    transcendence_score, foundation_score, pe_points,
    total_contracts_completed, skills_detail
  FROM public.profiles
  WHERE username = p_username AND (is_ghost = false OR is_ghost IS NULL)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_credential(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_credential(text) TO anon;
