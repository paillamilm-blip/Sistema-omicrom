// supabase/functions/_shared/blackbox.ts
// Utilidades de la "Caja Negra": cifrado de sobre AES-256-GCM + cadena de hash.
//
// Modelo (Nivel A):
//  - Cada sala (network_id = contrato) tiene su propia clave DEK aleatoria.
//  - La DEK se guarda CIFRADA bajo la clave maestra del servidor (BLACKBOX_MASTER_KEY),
//    que vive solo como secreto de la Edge Function (nunca llega al cliente).
//  - Los mensajes se cifran con la DEK de la sala.
//  - Cada mensaje encadena un hash SHA-256(prev_hash + ciphertext) => libro inmutable.

import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- base64 <-> bytes ----------
export function b64encode(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}
export function b64decode(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ---------- clientes ----------
export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function getUserId(authHeader: string): Promise<string | null> {
  const c = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data, error } = await c.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

// ---------- claves ----------
async function importMasterKey(): Promise<CryptoKey> {
  const raw = b64decode(Deno.env.get("BLACKBOX_MASTER_KEY")!);
  if (raw.length !== 32) {
    throw new Error("BLACKBOX_MASTER_KEY debe ser 32 bytes en base64.");
  }
  return await crypto.subtle.importKey("raw", raw, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// Devuelve la DEK (bytes crudos) de la sala, creándola si no existe.
export async function getRoomDekRaw(
  admin: SupabaseClient,
  networkId: string,
): Promise<Uint8Array> {
  const master = await importMasterKey();

  const { data } = await admin
    .from("chat_room_keys")
    .select("dek_encrypted, dek_iv")
    .eq("network_id", networkId)
    .maybeSingle();

  if (data) {
    const iv = b64decode(data.dek_iv);
    const wrapped = b64decode(data.dek_encrypted);
    const raw = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, master, wrapped);
    return new Uint8Array(raw);
  }

  // No existe: crear DEK nueva
  const rawDek = crypto.getRandomValues(new Uint8Array(32));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const wrapped = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, master, rawDek),
  );

  const { error } = await admin.from("chat_room_keys").insert({
    network_id: networkId,
    dek_encrypted: b64encode(wrapped),
    dek_iv: b64encode(iv),
  });

  // Si otra petición la creó en paralelo, releer
  if (error) {
    const { data: again } = await admin
      .from("chat_room_keys")
      .select("dek_encrypted, dek_iv")
      .eq("network_id", networkId)
      .single();
    const iv2 = b64decode(again!.dek_iv);
    const wrapped2 = b64decode(again!.dek_encrypted);
    const raw2 = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv2 }, master, wrapped2);
    return new Uint8Array(raw2);
  }

  return rawDek;
}

export async function dekToKey(rawDek: Uint8Array): Promise<CryptoKey> {
  return await crypto.subtle.importKey("raw", rawDek, "AES-GCM", false, [
    "encrypt",
    "decrypt",
  ]);
}

// ---------- cifrado de mensajes ----------
export async function encryptMessage(
  dek: CryptoKey,
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      dek,
      new TextEncoder().encode(plaintext),
    ),
  );
  return { ciphertext: b64encode(ct), iv: b64encode(iv) };
}

export async function decryptMessage(
  dek: CryptoKey,
  ciphertextB64: string,
  ivB64: string,
): Promise<string> {
  const pt = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: b64decode(ivB64) },
    dek,
    b64decode(ciphertextB64),
  );
  return new TextDecoder().decode(pt);
}

// ---------- cadena de integridad ----------
export async function sha256hex(s: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ---------- control de acceso ----------
// Devuelve {buyer_id, seller_id} del contrato (sala) o null si no existe.
export async function getRoomParticipants(
  admin: SupabaseClient,
  networkId: string,
): Promise<{ buyer_id: string; seller_id: string } | null> {
  const { data } = await admin
    .from("contracts")
    .select("buyer_id, seller_id")
    .eq("id", networkId)
    .maybeSingle();
  return data ?? null;
}
