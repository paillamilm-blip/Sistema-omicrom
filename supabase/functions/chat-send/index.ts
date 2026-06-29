// supabase/functions/chat-send/index.ts
// Envía un mensaje CIFRADO a la Caja Negra de una sala (network_id = contrato).
//
// Deploy:  supabase functions deploy chat-send

import {
  adminClient,
  corsHeaders,
  dekToKey,
  encryptMessage,
  getRoomDekRaw,
  getRoomParticipants,
  getUserId,
  json,
  sha256hex,
} from "../_shared/blackbox.ts";
import { checkRateLimit, tooManyRequests } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { network_id, content } = await req.json();
    if (!network_id || typeof content !== "string" || !content.trim()) {
      return json({ error: "Se requieren 'network_id' y 'content'." }, 400);
    }
    if (content.length > 8000) {
      return json({ error: "Mensaje demasiado largo." }, 413);
    }

    const userId = await getUserId(req.headers.get("Authorization") ?? "");
    if (!userId) return json({ error: "No autenticado." }, 401);

    const admin = adminClient();

    // Anti-spam: 30 mensajes por minuto por usuario.
    const rl = await checkRateLimit(admin, "chat-send", userId, 30, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    // Control de acceso: solo participantes del contrato
    const parts = await getRoomParticipants(admin, network_id);
    if (!parts) return json({ error: "Sala (contrato) no encontrada." }, 404);
    if (userId !== parts.buyer_id && userId !== parts.seller_id) {
      return json({ error: "No autorizado en esta sala." }, 403);
    }
    const receiverId = userId === parts.buyer_id ? parts.seller_id : parts.buyer_id;

    // Cifrar con la DEK de la sala
    const dek = await dekToKey(await getRoomDekRaw(admin, network_id));
    const { ciphertext, iv } = await encryptMessage(dek, content.trim());

    // Encadenar el hash al mensaje anterior de la sala
    const { data: last } = await admin
      .from("messages")
      .select("msg_hash")
      .eq("network_id", network_id)
      .not("ciphertext", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const prevHash = last?.msg_hash ?? "0";
    const msgHash = await sha256hex(prevHash + ciphertext);

    const { data: inserted, error } = await admin
      .from("messages")
      .insert({
        sender_id: userId,
        receiver_id: receiverId,
        network_id,
        content: "[cifrado]", // placeholder visible; el real va cifrado
        ciphertext,
        iv,
        prev_hash: prevHash,
        msg_hash: msgHash,
        is_read: false,
      })
      .select("id, created_at")
      .single();

    // Conflicto de cadena (carrera): pedir reintento
    if (error) {
      if (error.code === "23505") {
        return json({ error: "conflicto_de_cadena", retry: true }, 409);
      }
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, id: inserted.id, created_at: inserted.created_at });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
