import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// Conexión a Supabase (proyecto Ómicron).
//
// La anon key es PÚBLICA por diseño (la seguridad real la dan las
// políticas RLS de la base de datos). Se dejan como valores por
// defecto para que la app se conecte aunque el host no tenga
// configuradas las variables de entorno. Si se definen
// VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en el entorno, ESAS
// tienen prioridad (útil para apuntar a otro proyecto sin tocar el código).
// ─────────────────────────────────────────────────────────────
const DEFAULT_SUPABASE_URL = 'https://cuwuyqpxaibbqjrvamjb.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1d3V5cXB4YWliYnFqcnZhbWpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDA1OTEsImV4cCI6MjA5NzAxNjU5MX0.WCcqvhmws0iibL56pHv5C1yNv2uwFjyVL4zXBQOTic8';

const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL;
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
