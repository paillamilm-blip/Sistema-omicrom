import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import type { Database } from "./database.types";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./env";

/**
 * Cliente de Supabase para el servidor (Server Components, Route Handlers).
 * Devuelve `null` si no hay credenciales configuradas, de modo que la capa
 * de datos pueda recurrir a datos mock.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = cookies();

  return createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // `setAll` puede fallar en Server Components (solo lectura de cookies).
          // Es seguro ignorarlo si el refresco de sesion se maneja en middleware.
        }
      },
    },
  });
}
