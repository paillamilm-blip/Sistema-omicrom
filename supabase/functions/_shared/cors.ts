// supabase/functions/_shared/cors.ts
// ═══════════════════════════════════════════════════════════════════════
// CORS centralizado — una sola fuente de verdad para los headers CORS.
//
// En desarrollo local (Supabase CLI), permite localhost.
// En producción, solo permite el dominio real de la app.
// ═══════════════════════════════════════════════════════════════════════

const PRODUCTION_ORIGIN = 'https://sistema-omicrom.vercel.app';

// En local, Supabase CLI no setea PUBLIC_SITE_URL.
// Si está seteado y es un dominio conocido, usarlo.
const SITE_URL = Deno.env.get('PUBLIC_SITE_URL') || '';

function getAllowedOrigin(requestOrigin?: string | null): string {
  // Lista de orígenes permitidos
  const allowed = [
    PRODUCTION_ORIGIN,
    SITE_URL,
    'http://localhost:5173',   // Vite dev
    'http://localhost:3000',   // Fallback dev
  ].filter(Boolean);

  // Si el request viene de un origen permitido, reflejarlo (para cookies/auth)
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Default: producción
  return PRODUCTION_ORIGIN;
}

/**
 * Retorna headers CORS para un request dado.
 * Usa el origin del request para decidir qué reflejar.
 */
export function corsHeaders(req?: Request): Record<string, string> {
  const origin = req?.headers?.get('origin') ?? null;
  return {
    'Access-Control-Allow-Origin': getAllowedOrigin(origin),
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };
}

/** Respuesta preflight estándar */
export function handlePreflight(req: Request): Response {
  return new Response('ok', { headers: corsHeaders(req) });
}
