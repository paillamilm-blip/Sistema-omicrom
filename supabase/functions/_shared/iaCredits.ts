// supabase/functions/_shared/iaCredits.ts
// ═══════════════════════════════════════════════════════════════════════
// SISTEMA DE CRÉDITOS IA — módulo compartido para todas las Edge Functions.
//
// Antes de llamar a Gemini, cada función invoca checkAndConsumeCredit().
// Si no hay créditos disponibles, retorna un Response amigable sin gastar
// tokens de la API. Si hay créditos, consume 1 y permite continuar.
//
// Usa la RPC check_and_consume_credit() que es atómica (sin race conditions).
// ═══════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export interface CreditCheckResult {
  allowed: boolean;
  used?: number;
  limit?: number;
  remaining?: number;
  is_premium?: boolean;
  message?: string;
  resets_at?: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Verifica y consume 1 crédito IA del usuario.
 * Si no hay créditos, retorna un Response listo para enviar al cliente.
 * Si hay créditos, retorna null (la función puede continuar).
 *
 * @param adminClient - Cliente con service_role (para ejecutar la RPC)
 * @param userAuthHeader - Header Authorization del request del usuario
 * @param functionName - Nombre de la función (para tracking)
 * @returns Response si debe bloquearse, null si puede continuar
 */
export async function checkAndConsumeCredit(
  adminClient: SupabaseClient,
  userAuthHeader: string,
  functionName: string
): Promise<Response | null> {
  try {
    // Llamar la RPC con el contexto del usuario (auth.uid() se resuelve internamente)
    const { data, error } = await adminClient.rpc('check_and_consume_credit', {
      p_function_name: functionName,
    });

    if (error) {
      // Si la RPC falla (tabla no existe, etc.), PERMITIR (fail-open)
      // para no bloquear la app si las migraciones no están aplicadas
      console.warn('[iaCredits] RPC error (fail-open):', error.message);
      return null;
    }

    const result = data as CreditCheckResult;

    if (!result || result.allowed) {
      return null; // Tiene créditos, continuar
    }

    // Sin créditos — retornar respuesta amigable
    return new Response(
      JSON.stringify({
        error: 'Créditos IA agotados',
        message: result.message || 'Has alcanzado tu límite diario de interacciones con IA.',
        credits: {
          used: result.used,
          limit: result.limit,
          remaining: 0,
          is_premium: result.is_premium,
          resets_at: result.resets_at,
        },
        upgrade_hint: result.is_premium
          ? 'Tu límite Premium se renueva mañana a las 00:00 UTC.'
          : 'Mejora a Ómicron Premium para obtener 50 interacciones diarias.',
      }),
      {
        status: 429,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    // Error inesperado — fail-open (no bloquear)
    console.warn('[iaCredits] Unexpected error (fail-open):', err);
    return null;
  }
}

/**
 * Consulta créditos restantes sin consumir (para mostrar en UI).
 */
export async function getCreditsStatus(
  adminClient: SupabaseClient
): Promise<CreditCheckResult> {
  try {
    const { data, error } = await adminClient.rpc('get_ia_credits');
    if (error || !data) return { allowed: true, remaining: 10, limit: 10, used: 0 };
    return data as CreditCheckResult;
  } catch {
    return { allowed: true, remaining: 10, limit: 10, used: 0 };
  }
}
