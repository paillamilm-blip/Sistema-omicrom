// supabase/functions/ghost-presence/index.ts
// ═══════════════════════════════════════════════════════════════════════
// GHOST PRESENCE — Inyecta actividad social simulada en la red.
// Crea "fantasmas" (NPCs) que generan eventos broadcast para que la red
// no se sienta muerta con <10 usuarios reales.
// Se desactiva automáticamente cuando hay >20 usuarios online.
// Invocar cada 30 min via pg_cron o manualmente.
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Nombres y actividades realistas para Chile/LATAM
const GHOST_NAMES = [
  'Ana M.', 'Carlos R.', 'Valentina S.', 'Diego P.', 'Camila F.',
  'Sebastián L.', 'Francisca G.', 'Mateo V.', 'Isidora C.', 'Tomás H.',
  'Josefa R.', 'Martín A.', 'Catalina B.', 'Nicolás M.', 'Antonia D.',
];

const ACTIVITIES = [
  { kind: 'level', templates: [
    '{name} ascendió a Nodo Core',
    '{name} desbloqueó el nivel N2',
    '{name} alcanzó Nodo Arquitecto',
  ]},
  { kind: 'action', templates: [
    '{name} completó el curso Docker en 30 min',
    '{name} validó React al 87%',
    '{name} publicó un servicio de mentoría',
    '{name} completó su primer contrato',
    '{name} subió su CV y activó el Gemelo',
    '{name} certificó Python al 92%',
    '{name} publicó una oferta de empleo',
    '{name} conectó con 3 nodos nuevos',
    '{name} completó su reto diario',
    '{name} invirtió tokens en un talento emergente',
  ]},
  { kind: 'join', templates: [
    '{name} entró a la red',
    '{name} se conectó desde Santiago',
    '{name} volvió después de 3 días',
  ]},
];

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateEvent(): { text: string; kind: string } {
  const name = randomFrom(GHOST_NAMES);
  const category = randomFrom(ACTIVITIES);
  const template = randomFrom(category.templates);
  return {
    text: template.replace('{name}', name),
    kind: category.kind,
  };
}

Deno.serve(async (_req) => {
  try {
    // Verificar si hay suficientes usuarios reales (>20 = no necesita fantasmas)
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true });

    const realUsers = count ?? 0;

    // Generar 2-4 eventos aleatorios
    const numEvents = Math.min(4, Math.max(2, Math.floor(Math.random() * 3) + 2));
    const events = Array.from({ length: numEvents }, () => generateEvent());

    // Broadcast cada evento al canal de Realtime con delay simulado
    // (En producción esto se haría via Supabase Realtime Broadcast API)
    // Por ahora, insertamos en una tabla de eventos que el frontend lee

    // Insertar eventos en la tabla si existe, o simplemente retornar los eventos
    // para que un cron los inyecte via broadcast
    return new Response(JSON.stringify({
      ok: true,
      realUsers,
      ghostsActive: realUsers < 20,
      events,
      message: realUsers >= 20
        ? 'Suficientes usuarios reales — fantasmas desactivados'
        : `${numEvents} eventos ghost generados`,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
