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
  // Lista de orígenes permitidos exactos
  const allowed = [
    PRODUCTION_ORIGIN,
    SITE_URL,
    'http://localhost:5173',   // Vite dev
    'http://localhost:3000',   // Fallback dev
  ].filter(Boolean);

  if (!requestOrigin) return PRODUCTION_ORIGIN;

  // Si el request viene de un origen permitido exacto, reflejarlo
  if (allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Permitir preview deployments de Vercel (*.vercel.app)
  // Patrón: https://<project>-<hash>-<team>.vercel.app
  if (/^https:\/\/[a-z0-9-]+-[a-z0-9]+-[a-z0-9-]+(\.vercel\.app)$/.test(requestOrigin)) {
    return requestOrigin;
  }

  // Permitir cualquier subdominio de sistema-omicrom en Vercel
  if (requestOrigin.endsWith('.vercel.app') && requestOrigin.includes('sistema-omicrom')) {
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
