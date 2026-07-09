/**
 * Utilidades de configuracion de Supabase.
 *
 * La app esta disenada para funcionar SIN backend: si las variables de entorno
 * no estan definidas, la capa de datos (src/lib/data) recurre a datos mock.
 * Esto permite desarrollar y ver la UI sin credenciales.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

/** Indica si hay credenciales de Supabase configuradas. */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}
