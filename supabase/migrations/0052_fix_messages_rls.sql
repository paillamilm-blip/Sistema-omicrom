-- =====================================================================
-- 0052_fix_messages_rls.sql — Cierra fuga de privacidad en messages (auditoría 🟠 msg-rls)
--
-- PROBLEMA: la policy `messages_participants_read` (0004) tenía
--     ... or receiver_id is null
-- lo que dejaba que CUALQUIER usuario autenticado leyera todos los mensajes
-- con receiver_id NULL. El `drop policy "messages_select"` de 9999 NO lo
-- arreglaba (esa policy tiene otro nombre).
--
-- MODELO: un mensaje es (a) un DM (receiver_id = el otro) o (b) un mensaje de
-- sala, donde network_id = id del CONTRATO (ver src/lib/secureChat.ts). No hay
-- tabla de miembros: las salas son contratos de 2 partes.
--
-- FIX: leer solo si eres remitente, receptor, o participante del contrato
-- (buyer/seller) al que pertenece la sala. Sin fuga por receiver_id NULL.
--
-- Idempotente.
-- =====================================================================

drop policy if exists "messages_participants_read" on public.messages;
create policy "messages_participants_read" on public.messages
  for select using (
    auth.uid() = sender_id
    or auth.uid() = receiver_id
    or (
      network_id is not null
      and exists (
        select 1 from public.contracts c
        where c.id = public.messages.network_id
          and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
      )
    )
  );

notify pgrst, 'reload schema';
