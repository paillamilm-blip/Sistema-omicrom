-- 0067_social_follows_ghosts.sql
-- ═══════════════════════════════════════════════════════════════════════
-- RED SOCIAL — Follows unidireccionales + Ghost profiles para cold-start.
-- ═══════════════════════════════════════════════════════════════════════

-- ── Follows (unidireccional — seguir sin pedir permiso) ──────────────
CREATE TABLE IF NOT EXISTS public.follows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (follower_id, followed_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS follows_read ON public.follows;
CREATE POLICY follows_read ON public.follows FOR SELECT USING (true);

DROP POLICY IF EXISTS follows_own ON public.follows;
CREATE POLICY follows_own ON public.follows
  FOR ALL USING (auth.uid() = follower_id)
  WITH CHECK (auth.uid() = follower_id);

GRANT SELECT, INSERT, DELETE ON public.follows TO authenticated;

CREATE INDEX IF NOT EXISTS idx_follows_follower ON public.follows (follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_followed ON public.follows (followed_id);

-- ── RPCs para follows ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.follow_user(p_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.follows (follower_id, followed_id)
  VALUES (auth.uid(), p_target)
  ON CONFLICT (follower_id, followed_id) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unfollow_user(p_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.follows
  WHERE follower_id = auth.uid() AND followed_id = p_target;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_follower_count(p_user_id uuid)
RETURNS int LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM public.follows WHERE followed_id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION public.get_following_count(p_user_id uuid)
RETURNS int LANGUAGE sql STABLE AS $$
  SELECT count(*)::int FROM public.follows WHERE follower_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.follow_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unfollow_user(uuid) TO authenticated;

-- ── Ghost profiles (seed para cold-start social) ─────────────────────
-- Son perfiles con is_ghost=true. El frontend puede mostrarlos en
-- presencia/ranking pero nunca en contratos reales.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_ghost boolean DEFAULT false;

INSERT INTO public.profiles (id, username, full_name, node_type, node_level, reputation_score, skills, pe_points, is_ghost)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'ana.martinez', 'Ana Martínez', 'Nodo Core', 2, 62, ARRAY['React', 'TypeScript', 'UX'], 450, true),
  ('a0000000-0000-0000-0000-000000000002', 'carlos.rojas', 'Carlos Rojas', 'Nodo Core', 2, 58, ARRAY['Python', 'Data Science', 'ML'], 380, true),
  ('a0000000-0000-0000-0000-000000000003', 'valentina.silva', 'Valentina Silva', 'Nodo Operativo', 1, 45, ARRAY['Diseño UX', 'Figma', 'Branding'], 220, true),
  ('a0000000-0000-0000-0000-000000000004', 'diego.perez', 'Diego Pérez', 'Nodo Arquitecto', 3, 78, ARRAY['Node.js', 'AWS', 'Docker', 'Kubernetes'], 920, true),
  ('a0000000-0000-0000-0000-000000000005', 'camila.fuentes', 'Camila Fuentes', 'Nodo Core', 2, 55, ARRAY['Marketing Digital', 'SEO', 'Growth'], 310, true),
  ('a0000000-0000-0000-0000-000000000006', 'sebastian.lopez', 'Sebastián López', 'Nodo Operativo', 1, 42, ARRAY['Java', 'Spring Boot', 'SQL'], 180, true),
  ('a0000000-0000-0000-0000-000000000007', 'francisca.garcia', 'Francisca García', 'Nodo Core', 2, 65, ARRAY['Product Management', 'Agile', 'Liderazgo'], 510, true),
  ('a0000000-0000-0000-0000-000000000008', 'mateo.vargas', 'Mateo Vargas', 'Nodo Operativo', 1, 38, ARRAY['Flutter', 'Mobile', 'Firebase'], 150, true)
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
