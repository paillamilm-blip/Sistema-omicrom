-- =====================================================================
-- 0071_security_sprint1.sql — Sprint 1 de Seguridad
--
-- 1. PROTECT_CONTRACT_COLUMNS: trigger que impide al cliente manipular
--    columnas sensibles de contratos (amount, delivery_declared_at, etc.)
-- 2. FIX connections UPDATE policy: solo addressee puede cambiar status
-- 3. VALIDAR DMs: send_direct_message verifica conexión + límite tamaño
--
-- Idempotente. Seguro de correr múltiples veces.
-- =====================================================================

-- ══════════════════════════════════════════════════════════════════════
-- 1. PROTECCIÓN DE COLUMNAS SENSIBLES EN CONTRACTS
-- ══════════════════════════════════════════════════════════════════════
-- Mismo patrón que protect_profile_columns: si el caller es un usuario
-- autenticado (no server), revierte columnas sensibles al valor anterior.
-- Solo funciones SECURITY DEFINER del servidor pueden modificarlas.

CREATE OR REPLACE FUNCTION public.protect_contract_columns()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  -- Server roles (triggers, Edge Functions con service_role) pueden todo
  IF current_user IN ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') THEN
    RETURN NEW;
  END IF;

  -- El cliente NO puede modificar estas columnas:
  NEW.amount             := OLD.amount;
  NEW.amount_tokens      := OLD.amount_tokens;
  NEW.escrow_amount      := OLD.escrow_amount;
  NEW.delivery_declared_at := OLD.delivery_declared_at;
  NEW.completed_at       := OLD.completed_at;
  NEW.ghost_approval_deadline := OLD.ghost_approval_deadline;
  NEW.arbiter_1          := OLD.arbiter_1;
  NEW.arbiter_2          := OLD.arbiter_2;
  NEW.arbiter_3          := OLD.arbiter_3;
  NEW.buyer_id           := OLD.buyer_id;
  NEW.seller_id          := OLD.seller_id;
  NEW.created_at         := OLD.created_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_contract ON public.contracts;
CREATE TRIGGER trg_protect_contract
  BEFORE UPDATE ON public.contracts
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_contract_columns();

-- ══════════════════════════════════════════════════════════════════════
-- 2. FIX: connections UPDATE policy — solo addressee puede cambiar status
-- ══════════════════════════════════════════════════════════════════════
-- Antes: tanto requester como addressee podían UPDATE (auto-aceptar).
-- Ahora: solo addressee puede UPDATE (el que recibe la solicitud decide).
-- El requester puede DELETE (retirar solicitud) pero no cambiar status.

DROP POLICY IF EXISTS conn_update ON public.connections;
CREATE POLICY conn_update ON public.connections FOR UPDATE
  USING (auth.uid() = addressee_id);

-- Agregar policy para que requester pueda retirar (DELETE) su solicitud
DROP POLICY IF EXISTS conn_delete ON public.connections;
CREATE POLICY conn_delete ON public.connections FOR DELETE
  USING (auth.uid() = requester_id AND status = 'pending');

GRANT DELETE ON public.connections TO authenticated;

-- ══════════════════════════════════════════════════════════════════════
-- 3. VALIDAR DMs: conexión requerida + límite de tamaño
-- ══════════════════════════════════════════════════════════════════════
-- Reemplaza la función original que no validaba nada.

CREATE OR REPLACE FUNCTION public.send_direct_message(p_recipient uuid, p_content text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_connected boolean;
BEGIN
  -- Validación: no puede enviarse a sí mismo
  IF v_uid = p_recipient THEN
    RAISE EXCEPTION 'No puedes enviarte mensajes a ti mismo';
  END IF;

  -- Validación: contenido no vacío y limitado a 5000 chars
  IF p_content IS NULL OR btrim(p_content) = '' THEN
    RAISE EXCEPTION 'El mensaje no puede estar vacío';
  END IF;
  IF length(p_content) > 5000 THEN
    RAISE EXCEPTION 'El mensaje excede el límite de 5000 caracteres';
  END IF;

  -- Validación: debe existir conexión aceptada entre ambos
  SELECT EXISTS (
    SELECT 1 FROM public.connections
    WHERE status = 'accepted'
      AND (
        (requester_id = v_uid AND addressee_id = p_recipient) OR
        (requester_id = p_recipient AND addressee_id = v_uid)
      )
  ) INTO v_connected;

  IF NOT v_connected THEN
    RAISE EXCEPTION 'Debes tener una conexión aceptada para enviar mensajes';
  END IF;

  -- Insertar mensaje
  INSERT INTO public.direct_messages (sender_id, recipient_id, content)
  VALUES (v_uid, p_recipient, left(p_content, 5000));
END;
$$;

-- Grants (re-aplicar por si acaso)
GRANT EXECUTE ON FUNCTION public.send_direct_message(uuid, text) TO authenticated;
REVOKE ALL ON FUNCTION public.send_direct_message(uuid, text) FROM anon, public;

-- ══════════════════════════════════════════════════════════════════════
-- FIN
-- ══════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
