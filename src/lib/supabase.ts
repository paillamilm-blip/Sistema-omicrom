import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

// Degradación elegante: sin las variables, `createClient(undefined, undefined)`
// lanzaba en tiempo de carga → PANTALLA EN BLANCO en toda la app. Ahora se avisa
// claramente y se usa un cliente placeholder (la app renderiza; el auth falla
// de forma controlada). En producción (Vercel) las variables están configuradas.
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    '[Ómicron] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Crea un .env.local (ver .env.example) para conectar con Supabase.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://placeholder.supabase.co',
  supabaseAnonKey ?? 'placeholder-anon-key',
);
