-- =====================================================================
-- 0075_ai_context_shared.sql — Contexto compartido entre funciones IA
--
-- Permite que todas las Edge Functions accedan al contexto reciente del
-- usuario (última conversación, skills débiles, exámenes recientes).
-- omicronBrain escribe; examen-ia, vault-oracle, etc. leen.
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.user_ai_context (
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  context_key  text NOT NULL,  -- 'last_conversation', 'weak_skills', 'recent_exams', 'ai_profile'
  context_value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, context_key)
);

CREATE INDEX IF NOT EXISTS idx_ai_context_user ON public.user_ai_context (user_id);

ALTER TABLE public.user_ai_context ENABLE ROW LEVEL SECURITY;

-- Solo el propio usuario puede leer/escribir su contexto
DROP POLICY IF EXISTS aic_own ON public.user_ai_context;
CREATE POLICY aic_own ON public.user_ai_context
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_ai_context TO authenticated;

-- RPC para upsert rápido (una sola llamada)
CREATE OR REPLACE FUNCTION public.upsert_ai_context(
  p_key text,
  p_value jsonb
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_ai_context (user_id, context_key, context_value, updated_at)
  VALUES (auth.uid(), p_key, p_value, now())
  ON CONFLICT (user_id, context_key)
  DO UPDATE SET context_value = p_value, updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_ai_context(text, jsonb) TO authenticated;

NOTIFY pgrst, 'reload schema';
