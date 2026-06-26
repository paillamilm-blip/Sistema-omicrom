// supabase/functions/chat-history/index.ts
// Devuelve los mensajes DESCIFRADOS de una sala, solo para sus participantes,
// más un flag de integridad de la cadena (tamper-evidence).
//
// Deploy:  supabase functions deploy chat-history

import {
  adminClient,
  corsHeaders,
  decryptMessage,
  dekToKey,
  getRoomDekRaw,
  getRoomParticipants,
  getUserId,
  json,
  sha256hex,
} from "../_shared/blackbox.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { network_id } = await req.json();
    if (!network_id) return json({ error: "Se requiere 'network_id'." }, 400);

    const userId = await getUserId(req.headers.get("Authorization") ?? "");
    if (!userId) return json({ error: "No autenticado." }, 401);

    const admin = adminClient();

    const parts = await getRoomParticipants(admin, network_id);
    if (!parts) return json({ error: "Sala (contrato) no encontrada." }, 404);
    if (userId !== parts.buyer_id && userId !== parts.seller_id) {
      return json({ error: "No autorizado en esta sala." }, 403);
    }

    const { data: rows, error } = await admin
      .from("messages")
      .select(
        "id, sender_id, receiver_id, network_id, content, ciphertext, iv, prev_hash, msg_hash, is_read, created_at, sender:profiles!messages_sender_id_fkey(id, username)",
      )
      .eq("network_id", network_id)
      .order("created_at", { ascending: true })
      .limit(200);

    if (error) return json({ error: error.message }, 500);

    const dek = await dekToKey(await getRoomDekRaw(admin, network_id));

    let prev = "0";
    let integrityOk = true;
    const messages = [];

    for (const r of rows ?? []) {
      let text = r.content as string;
      if (r.ciphertext) {
        // verificar cadena
        const calc = await sha256hex(prev + r.ciphertext);
        if (calc !== r.msg_hash) integrityOk = false;
        prev = r.msg_hash;
        try {
          text = await decryptMessage(dek, r.ciphertext, r.iv);
        } catch {
          text = "[mensaje ilegible]";
          integrityOk = false;
        }
      }
      messages.push({
        id: r.id,
        sender_id: r.sender_id,
        receiver_id: r.receiver_id,
        network_id: r.network_id,
        content: text,
        is_read: r.is_read,
        created_at: r.created_at,
        sender: r.sender,
      });
    }

    return json({ messages, integrity_ok: integrityOk });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
