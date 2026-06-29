// supabase/functions/blackbox-open/index.ts
// Apertura de la Caja Negra por QUÓRUM de árbitros (2-de-3).
//
// Flujo:
//  - Solo un árbitro ASIGNADO a la disputa puede votar "abrir".
//  - Cada voto se registra (idempotente) en blackbox_votes.
//  - Cuando se alcanza el umbral (mayoría: 2 de 3), recién ahí la función
//    descifra la transcripción del chat de ese contrato y la devuelve,
//    junto con el sello de integridad de la cadena.
//
// Deploy:  supabase functions deploy blackbox-open

import {
  adminClient,
  corsHeaders,
  decryptMessage,
  dekToKey,
  getRoomDekRaw,
  getUserId,
  json,
  sha256hex,
} from "../_shared/blackbox.ts";
import { checkRateLimit, tooManyRequests } from "../_shared/rateLimit.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { dispute_id } = await req.json();
    if (!dispute_id) return json({ error: "Se requiere 'dispute_id'." }, 400);

    const userId = await getUserId(req.headers.get("Authorization") ?? "");
    if (!userId) return json({ error: "No autenticado." }, 401);

    const admin = adminClient();

    // Anti-spam: 15 solicitudes por minuto por usuario.
    const rl = await checkRateLimit(admin, "blackbox-open", userId, 15, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    // 1) Disputa -> contrato (network_id de la sala)
    const { data: dispute } = await admin
      .from("disputes")
      .select("id, contract_id, status")
      .eq("id", dispute_id)
      .maybeSingle();
    if (!dispute) return json({ error: "Disputa no encontrada." }, 404);
    const networkId = dispute.contract_id;

    // 2) Árbitros asignados (último caso de arbitraje de la disputa)
    const { data: cases } = await admin
      .from("arbitration_cases")
      .select("arbiters")
      .eq("dispute_id", dispute_id)
      .order("created_at", { ascending: false })
      .limit(1);

    const arbiters: string[] = (cases?.[0]?.arbiters as string[]) ?? [];
    if (!arbiters.length) {
      return json({ error: "Aún no hay árbitros asignados a esta disputa." }, 409);
    }
    if (!arbiters.includes(userId)) {
      return json({ error: "Solo los árbitros asignados pueden abrir la Caja Negra." }, 403);
    }

    // Umbral: mayoría simple (2 de 3)
    const threshold = Math.floor(arbiters.length / 2) + 1;

    // 3) Registrar el voto del árbitro (idempotente)
    await admin.from("blackbox_votes").upsert(
      { network_id: networkId, dispute_id, arbiter_id: userId },
      { onConflict: "network_id,arbiter_id", ignoreDuplicates: true },
    );

    // 4) Contar votos válidos (solo de árbitros asignados)
    const { data: votes } = await admin
      .from("blackbox_votes")
      .select("arbiter_id")
      .eq("dispute_id", dispute_id);

    const voteCount = new Set(
      (votes ?? [])
        .map((v: { arbiter_id: string }) => v.arbiter_id)
        .filter((id: string) => arbiters.includes(id)),
    ).size;

    // 5) ¿Quórum alcanzado?
    if (voteCount < threshold) {
      return json({
        unlocked: false,
        votes: voteCount,
        threshold,
        message: `Esperando quórum (${voteCount}/${threshold})`,
      });
    }

    // 6) Quórum OK -> descifrar transcripción + verificar cadena
    const { data: rows } = await admin
      .from("messages")
      .select(
        "id, sender_id, network_id, content, ciphertext, iv, msg_hash, created_at, sender:profiles!messages_sender_id_fkey(id, username)",
      )
      .eq("network_id", networkId)
      .order("created_at", { ascending: true })
      .limit(500);

    const dek = await dekToKey(await getRoomDekRaw(admin, networkId));
    let prev = "0";
    let integrityOk = true;
    const transcript = [];

    for (const r of rows ?? []) {
      let text = r.content as string;
      if (r.ciphertext) {
        const calc = await sha256hex(prev + r.ciphertext);
        if (calc !== r.msg_hash) integrityOk = false;
        prev = r.msg_hash;
        try {
          text = await decryptMessage(dek, r.ciphertext, r.iv);
        } catch {
          text = "[ilegible]";
          integrityOk = false;
        }
      }
      transcript.push({
        id: r.id,
        sender_id: r.sender_id,
        sender: r.sender,
        content: text,
        created_at: r.created_at,
      });
    }

    return json({
      unlocked: true,
      votes: voteCount,
      threshold,
      integrity_ok: integrityOk,
      transcript,
    });
  } catch (e) {
    return json({ error: String((e as Error)?.message ?? e) }, 500);
  }
});
