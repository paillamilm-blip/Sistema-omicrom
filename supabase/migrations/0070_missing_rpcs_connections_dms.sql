-- 0070_missing_rpcs_connections_dms.sql
-- ═══════════════════════════════════════════════════════════════════════
-- RPCS FALTANTES — Conexiones, DMs, Leaderboard, Release Escrow.
-- Estas funciones las usa el frontend pero nunca se guardaron como migración.
-- Ahora están versionadas para que todo esté reproducible.
-- ═══════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════
-- 1. TABLA CONNECTIONS (bidireccional: solicitud + aceptación)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.connections (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status      text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);

CREATE INDEX IF NOT EXISTS idx_connections_requester ON public.connections (requester_id);
CREATE INDEX IF NOT EXISTS idx_connections_addressee ON public.connections (addressee_id);
CREATE INDEX IF NOT EXISTS idx_connections_status ON public.connections (status);

ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS conn_read ON public.connections;
CREATE POLICY conn_read ON public.connections FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

DROP POLICY IF EXISTS conn_insert ON public.connections;
CREATE POLICY conn_insert ON public.connections FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

DROP POLICY IF EXISTS conn_update ON public.connections;
CREATE POLICY conn_update ON public.connections FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

GRANT SELECT, INSERT, UPDATE ON public.connections TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 2. TABLA DIRECT_MESSAGES (chat 1:1 entre conexiones)
-- ══════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.direct_messages (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content      text NOT NULL,
  is_read      boolean DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dm_sender ON public.direct_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_dm_recipient ON public.direct_messages (recipient_id);
CREATE INDEX IF NOT EXISTS idx_dm_created ON public.direct_messages (created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS dm_read ON public.direct_messages;
CREATE POLICY dm_read ON public.direct_messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

DROP POLICY IF EXISTS dm_insert ON public.direct_messages;
CREATE POLICY dm_insert ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS dm_update ON public.direct_messages;
CREATE POLICY dm_update ON public.direct_messages FOR UPDATE
  USING (auth.uid() = recipient_id);

GRANT SELECT, INSERT, UPDATE ON public.direct_messages TO authenticated;

-- Realtime para DMs
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
    WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='direct_messages')
  THEN ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages; END IF;
EXCEPTION WHEN others THEN NULL; END $$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. RPCs DE CONEXIONES
-- ══════════════════════════════════════════════════════════════════════

-- Enviar solicitud de conexión
CREATE OR REPLACE FUNCTION public.send_connection_request(p_addressee uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() = p_addressee THEN RAISE EXCEPTION 'No puedes conectar contigo mismo'; END IF;
  INSERT INTO public.connections (requester_id, addressee_id, status)
  VALUES (auth.uid(), p_addressee, 'pending')
  ON CONFLICT (requester_id, addressee_id) DO NOTHING;
END;
$$;

-- Responder solicitud
CREATE OR REPLACE FUNCTION public.respond_connection_request(p_connection_id uuid, p_accept boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.connections
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'rejected' END,
      updated_at = now()
  WHERE id = p_connection_id AND addressee_id = auth.uid() AND status = 'pending';
END;
$$;

-- Estado de conexión con otro usuario
CREATE OR REPLACE FUNCTION public.connection_status(p_other uuid)
RETURNS TABLE(connection_id uuid, status text, direction text) LANGUAGE sql STABLE AS $$
  SELECT id, status,
    CASE WHEN requester_id = auth.uid() THEN 'sent' ELSE 'received' END as direction
  FROM public.connections
  WHERE (requester_id = auth.uid() AND addressee_id = p_other)
     OR (requester_id = p_other AND addressee_id = auth.uid())
  LIMIT 1;
$$;

-- Mis conexiones aceptadas
CREATE OR REPLACE FUNCTION public.my_connections()
RETURNS TABLE(connection_id uuid, user_id uuid, username text, full_name text, avatar_url text, node_type text, reputation_score numeric)
LANGUAGE sql STABLE AS $$
  SELECT c.id, p.id, p.username, p.full_name, p.avatar_url, p.node_type, p.reputation_score
  FROM public.connections c
  JOIN public.profiles p ON p.id = CASE WHEN c.requester_id = auth.uid() THEN c.addressee_id ELSE c.requester_id END
  WHERE (c.requester_id = auth.uid() OR c.addressee_id = auth.uid())
    AND c.status = 'accepted';
$$;

-- Solicitudes pendientes (que me enviaron)
CREATE OR REPLACE FUNCTION public.my_pending_requests()
RETURNS TABLE(connection_id uuid, user_id uuid, username text, full_name text, avatar_url text, node_type text, reputation_score numeric)
LANGUAGE sql STABLE AS $$
  SELECT c.id, p.id, p.username, p.full_name, p.avatar_url, p.node_type, p.reputation_score
  FROM public.connections c
  JOIN public.profiles p ON p.id = c.requester_id
  WHERE c.addressee_id = auth.uid() AND c.status = 'pending';
$$;

GRANT EXECUTE ON FUNCTION public.send_connection_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_connection_request(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.connection_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_pending_requests() TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 4. RPCs DE MENSAJES DIRECTOS
-- ══════════════════════════════════════════════════════════════════════

-- Enviar DM
CREATE OR REPLACE FUNCTION public.send_direct_message(p_recipient uuid, p_content text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.direct_messages (sender_id, recipient_id, content)
  VALUES (auth.uid(), p_recipient, p_content);
END;
$$;

-- Obtener hilo con un usuario
CREATE OR REPLACE FUNCTION public.get_direct_thread(p_other uuid)
RETURNS TABLE(id uuid, sender_id uuid, recipient_id uuid, content text, created_at timestamptz)
LANGUAGE sql STABLE AS $$
  SELECT id, sender_id, recipient_id, content, created_at
  FROM public.direct_messages
  WHERE (sender_id = auth.uid() AND recipient_id = p_other)
     OR (sender_id = p_other AND recipient_id = auth.uid())
  ORDER BY created_at ASC;
$$;

-- Marcar DMs como leídos
CREATE OR REPLACE FUNCTION public.mark_dm_read(p_other uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.direct_messages
  SET is_read = true
  WHERE sender_id = p_other AND recipient_id = auth.uid() AND is_read = false;
END;
$$;

-- Mis conversaciones (último mensaje de cada hilo)
CREATE OR REPLACE FUNCTION public.my_dm_conversations()
RETURNS TABLE(other_id uuid, other_username text, other_avatar text, last_message text, last_at timestamptz, unread_count bigint)
LANGUAGE sql STABLE AS $$
  WITH threads AS (
    SELECT
      CASE WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END as other_id,
      content as last_message,
      created_at as last_at,
      CASE WHEN recipient_id = auth.uid() AND is_read = false THEN 1 ELSE 0 END as unread,
      ROW_NUMBER() OVER (
        PARTITION BY CASE WHEN sender_id = auth.uid() THEN recipient_id ELSE sender_id END
        ORDER BY created_at DESC
      ) as rn
    FROM public.direct_messages
    WHERE sender_id = auth.uid() OR recipient_id = auth.uid()
  )
  SELECT
    t.other_id,
    p.username as other_username,
    p.avatar_url as other_avatar,
    t.last_message,
    t.last_at,
    (SELECT count(*) FROM public.direct_messages WHERE sender_id = t.other_id AND recipient_id = auth.uid() AND is_read = false) as unread_count
  FROM threads t
  JOIN public.profiles p ON p.id = t.other_id
  WHERE t.rn = 1
  ORDER BY t.last_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_direct_thread(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_dm_read(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_dm_conversations() TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 5. CREDENCIAL PÚBLICA
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_public_credential(p_username text)
RETURNS TABLE(
  id uuid, username text, full_name text, avatar_url text, bio text, location text,
  node_type text, node_level text, is_verified_professional boolean,
  reputation_score numeric, execution_score numeric, quality_score numeric,
  transcendence_score numeric, foundation_score numeric, pe_points integer,
  total_contracts_completed integer
) LANGUAGE sql STABLE AS $$
  SELECT id, username, full_name, avatar_url, bio, location,
    node_type, node_level, is_verified_professional,
    reputation_score, execution_score, quality_score,
    transcendence_score, foundation_score, pe_points,
    total_contracts_completed
  FROM public.profiles
  WHERE username = p_username AND (is_ghost = false OR is_ghost IS NULL)
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_public_credential(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_credential(text) TO anon;

-- ══════════════════════════════════════════════════════════════════════
-- 6. LEADERBOARD
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_limit int DEFAULT 10)
RETURNS TABLE(user_id uuid, username text, full_name text, avatar_url text, reputation_score numeric)
LANGUAGE sql STABLE AS $$
  SELECT id, username, full_name, avatar_url, reputation_score
  FROM public.profiles
  WHERE (is_ghost = false OR is_ghost IS NULL)
    AND reputation_score > 0
  ORDER BY reputation_score DESC
  LIMIT p_limit;
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard(int) TO anon;

-- ══════════════════════════════════════════════════════════════════════
-- 7. RELEASE ESCROW (aprobar entrega y liberar fondos)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.release_escrow(p_contract_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.contracts WHERE id = p_contract_id FOR UPDATE;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Contrato no encontrado'; END IF;
  IF auth.uid() <> c.buyer_id THEN RAISE EXCEPTION 'Solo el comprador puede aprobar'; END IF;
  IF c.status NOT IN ('DELIVERED', 'LOCKED') THEN RAISE EXCEPTION 'El contrato no está en estado de aprobación'; END IF;

  -- Liberar fondos al vendedor
  UPDATE public.profiles
  SET token_balance = token_balance + c.amount
  WHERE id = c.seller_id;

  -- Descontar del escrow del comprador
  UPDATE public.profiles
  SET token_escrow = GREATEST(0, token_escrow - c.amount)
  WHERE id = c.buyer_id;

  -- Marcar contrato como liberado
  UPDATE public.contracts
  SET status = 'RELEASED', completed_at = now(), updated_at = now()
  WHERE id = p_contract_id;

  -- Incrementar contratos completados del vendedor
  UPDATE public.profiles
  SET total_contracts_completed = total_contracts_completed + 1
  WHERE id = c.seller_id;

  -- Registrar transacción
  INSERT INTO public.wallet_transactions (user_id, amount, transaction_type, reference_id, description)
  VALUES (c.seller_id, c.amount, 'escrow_release', p_contract_id, 'Pago liberado por ' || c.title);
END;
$$;

GRANT EXECUTE ON FUNCTION public.release_escrow(uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 8. RATE CONTRACT (calificar contrato completado)
-- ══════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.rate_contract(p_contract_id uuid, p_stars int, p_comment text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE c record;
BEGIN
  SELECT * INTO c FROM public.contracts WHERE id = p_contract_id;
  IF c.id IS NULL THEN RAISE EXCEPTION 'Contrato no encontrado'; END IF;
  IF auth.uid() <> c.buyer_id THEN RAISE EXCEPTION 'Solo el comprador puede calificar'; END IF;
  IF c.status <> 'RELEASED' THEN RAISE EXCEPTION 'Solo se puede calificar un contrato completado'; END IF;

  UPDATE public.contracts
  SET rating = p_stars, buyer_note = COALESCE(p_comment, buyer_note), updated_at = now()
  WHERE id = p_contract_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.rate_contract(uuid, int, text) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 9. FIX: Policy SELECT en messages (eliminada por 9999_audit)
-- ══════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS messages_read_own ON public.messages;
CREATE POLICY messages_read_own ON public.messages FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id OR receiver_id IS NULL);

-- ══════════════════════════════════════════════════════════════════════
-- 10. Agregar columna 'rating' a contracts si no existe
-- ══════════════════════════════════════════════════════════════════════

ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS rating int;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS delivery_note text;

NOTIFY pgrst, 'reload schema';
