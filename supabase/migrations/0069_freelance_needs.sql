-- 0069_freelance_needs.sql
-- ═══════════════════════════════════════════════════════════════════════
-- NECESIDADES FREELANCE — Cualquier persona publica lo que necesita,
-- cualquier otro puede postular a resolverlo.
-- Alumno, docente, ingeniero, pyme, experto técnico — todos participan.
-- ═══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.freelance_needs (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  publisher_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text NOT NULL DEFAULT '',
  category        text NOT NULL DEFAULT 'otro',
  budget_min      numeric DEFAULT 0,
  budget_max      numeric DEFAULT 0,
  currency        text DEFAULT 'CLP',
  deadline_days   int DEFAULT 7,
  required_skills text[] DEFAULT '{}',
  location        text,
  is_remote       boolean DEFAULT true,
  urgency         text DEFAULT 'normal' CHECK (urgency IN ('baja', 'normal', 'urgente')),
  status          text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')),
  applicants_count int DEFAULT 0,
  selected_id     uuid REFERENCES public.profiles(id),
  published_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_freelance_needs_status ON public.freelance_needs (status);
CREATE INDEX IF NOT EXISTS idx_freelance_needs_category ON public.freelance_needs (category);
CREATE INDEX IF NOT EXISTS idx_freelance_needs_publisher ON public.freelance_needs (publisher_id);
CREATE INDEX IF NOT EXISTS idx_freelance_needs_published ON public.freelance_needs (published_at DESC);

-- RLS
ALTER TABLE public.freelance_needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fn_read ON public.freelance_needs;
CREATE POLICY fn_read ON public.freelance_needs FOR SELECT USING (true);

DROP POLICY IF EXISTS fn_insert ON public.freelance_needs;
CREATE POLICY fn_insert ON public.freelance_needs FOR INSERT
  WITH CHECK (auth.uid() = publisher_id);

DROP POLICY IF EXISTS fn_update_own ON public.freelance_needs;
CREATE POLICY fn_update_own ON public.freelance_needs FOR UPDATE
  USING (auth.uid() = publisher_id);

GRANT SELECT, INSERT, UPDATE ON public.freelance_needs TO authenticated;

-- ═══ Postulaciones a necesidades ═══
CREATE TABLE IF NOT EXISTS public.freelance_applications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  need_id     uuid NOT NULL REFERENCES public.freelance_needs(id) ON DELETE CASCADE,
  applicant_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message     text DEFAULT '',
  proposed_budget numeric,
  proposed_days int,
  status      text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (need_id, applicant_id)
);

CREATE INDEX IF NOT EXISTS idx_fa_need ON public.freelance_applications (need_id);
CREATE INDEX IF NOT EXISTS idx_fa_applicant ON public.freelance_applications (applicant_id);

ALTER TABLE public.freelance_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fa_read ON public.freelance_applications;
CREATE POLICY fa_read ON public.freelance_applications FOR SELECT
  USING (
    auth.uid() = applicant_id
    OR EXISTS (SELECT 1 FROM public.freelance_needs fn WHERE fn.id = need_id AND fn.publisher_id = auth.uid())
  );

DROP POLICY IF EXISTS fa_insert ON public.freelance_applications;
CREATE POLICY fa_insert ON public.freelance_applications FOR INSERT
  WITH CHECK (auth.uid() = applicant_id);

DROP POLICY IF EXISTS fa_update ON public.freelance_applications;
CREATE POLICY fa_update ON public.freelance_applications FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.freelance_needs fn WHERE fn.id = need_id AND fn.publisher_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON public.freelance_applications TO authenticated;

-- ═══ RPC: postular a una necesidad ═══
CREATE OR REPLACE FUNCTION public.apply_to_need(
  p_need_id uuid,
  p_message text DEFAULT '',
  p_budget numeric DEFAULT NULL,
  p_days int DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.freelance_applications (need_id, applicant_id, message, proposed_budget, proposed_days)
  VALUES (p_need_id, auth.uid(), p_message, p_budget, p_days)
  ON CONFLICT (need_id, applicant_id) DO NOTHING;

  -- Actualizar contador
  UPDATE public.freelance_needs
  SET applicants_count = (SELECT count(*) FROM public.freelance_applications WHERE need_id = p_need_id)
  WHERE id = p_need_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_to_need(uuid, text, numeric, int) TO authenticated;

-- ═══ RPC: aceptar postulante ═══
CREATE OR REPLACE FUNCTION public.accept_applicant(
  p_need_id uuid,
  p_applicant_id uuid
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Solo el publicador puede aceptar
  IF NOT EXISTS (SELECT 1 FROM freelance_needs WHERE id = p_need_id AND publisher_id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  UPDATE public.freelance_applications SET status = 'accepted' WHERE need_id = p_need_id AND applicant_id = p_applicant_id;
  UPDATE public.freelance_applications SET status = 'rejected' WHERE need_id = p_need_id AND applicant_id != p_applicant_id AND status = 'pending';
  UPDATE public.freelance_needs SET status = 'IN_PROGRESS', selected_id = p_applicant_id WHERE id = p_need_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_applicant(uuid, uuid) TO authenticated;

-- ═══ Contenido semilla ═══
INSERT INTO public.freelance_needs (id, publisher_id, title, description, category, budget_min, budget_max, deadline_days, required_skills, is_remote, urgency)
VALUES
  ('b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Página web para mi emprendimiento', 'Necesito una landing page profesional para mi tienda de ropa online. Responsive, rápida, con carrito básico.', 'desarrollo', 200000, 500000, 14, ARRAY['HTML', 'CSS', 'React', 'Responsive'], true, 'normal'),
  ('b0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'Diseño de logo y branding', 'Logo + paleta de colores + tipografía para estudio de arquitectura. Estilo minimalista y profesional.', 'diseño', 80000, 150000, 7, ARRAY['Diseño', 'Branding', 'Illustrator'], true, 'normal'),
  ('b0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000005', 'Community Manager medio tiempo', 'Gestión de Instagram y TikTok para cafetería artesanal. 3 posts/semana + stories + responder mensajes.', 'marketing', 250000, 350000, 30, ARRAY['Marketing', 'Social Media', 'Diseño'], false, 'urgente'),
  ('b0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000007', 'Clases de Python para mi equipo', 'Necesito un profesor que dé 4 clases (2h cada una) de Python básico a mi equipo de 5 personas. Online.', 'educación', 150000, 250000, 21, ARRAY['Python', 'Docencia', 'Programación'], true, 'baja'),
  ('b0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004', 'Automatización de reportes Excel', 'Tengo 5 reportes que hago manual cada semana. Necesito macros o Python que los automatice.', 'datos', 100000, 200000, 10, ARRAY['Excel', 'Python', 'Automatización'], true, 'urgente')
ON CONFLICT (id) DO NOTHING;

NOTIFY pgrst, 'reload schema';
