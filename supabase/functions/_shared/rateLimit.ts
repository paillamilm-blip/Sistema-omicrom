// supabase/functions/_shared/rateLimit.ts
// Limitador de tasa compartido para las Edge Functions.
// Usa la función SQL public.check_rate_limit (ventana fija, atómica).
//
// Diseño FAIL-OPEN: si el limitador falla o aún no está desplegado, NO se
// bloquea al usuario (se prioriza la disponibilidad). Cuando la migración
// 0031 esté aplicada, el límite entra en vigor automáticamente.

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface RateLimitResult {
  allowed: boolean;
  count?: number;
  limit?: number;
  reset_at?: string;
}

/**
 * @param admin       cliente con service_role
 * @param bucket      nombre del endpoint, ej. "run-code"
 * @param identifier  user_id o IP del solicitante
 * @param limit       máximo de solicitudes por ventana
 * @param windowSec   tamaño de la ventana en segundos
 */
export async function checkRateLimit(
  admin: SupabaseClient,
  bucket: string,
  identifier: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  try {
    const { data, error } = await admin.rpc("check_rate_limit", {
      p_bucket: bucket,
      p_identifier: identifier || "anon",
      p_limit: limit,
      p_window_sec: windowSec,
    });
    if (error || !data) return { allowed: true }; // fail-open
    return data as RateLimitResult;
  } catch {
    return { allowed: true }; // fail-open
  }
}

/** Respuesta 429 estándar (con CORS abierto). */
export function tooManyRequests(reset?: string): Response {
  return new Response(
    JSON.stringify({
      error: "Demasiadas solicitudes en poco tiempo. Espera unos segundos e intenta de nuevo.",
      retry_at: reset ?? null,
    }),
    {
      status: 429,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/json",
        "Retry-After": "10",
      },
    },
  );
}

/** Extrae una IP aproximada del request (para endpoints sin autenticación). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("cf-connecting-ip") ?? req.headers.get("x-real-ip") ?? "unknown";
}
