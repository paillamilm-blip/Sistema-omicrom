// supabase/functions/arbiter-ai/index.ts — Relator IA del Tribunal (Ómicrom).
// Ayuda a los árbitros: dado el motivo de la disputa y la evidencia YA
// desbloqueada por quórum, entrega un análisis NEUTRAL (hechos + posición de
// cada parte + puntos a considerar). NO emite veredicto: deciden los humanos.
// Privacidad: solo se invoca cuando la Caja Negra ya fue abierta por quórum.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { checkAndConsumeCredit } from '../_shared/iaCredits.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

async function getUserId(authHeader: string): Promise<string | null> {
  if (!authHeader) return null;
  const c = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}

interface Turn { autor?: string; texto?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'El Relator IA no está configurado (falta GEMINI_API_KEY).' }, 500);
    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesión para usar el Relator IA.' }, 401);

    const rl = await checkRateLimit(admin, 'arbiter-ai', clientIp(req), 10, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const reason: string = (body?.reason ?? '').toString().trim();
    const transcript: Turn[] = Array.isArray(body?.transcript) ? body.transcript.slice(0, 60) : [];

    const conversacion = transcript.length
      ? transcript.map(t => `@${t.autor || 'nodo'}: ${t.texto || ''}`).join('\n')
      : '(No hay mensajes en el canal.)';

    const sys =
      'Eres el Relator IA del Tribunal de Pares de Omicrom. Asistes a arbitros humanos que YA tienen acceso ' +
      'legitimo a la evidencia. Tu rol es NEUTRAL: NO decides el veredicto ni dices quien gana. ' +
      'Entrega un analisis objetivo y breve con estas secciones (texto plano, sin markdown):\n' +
      'HECHOS: 2-3 puntos objetivos de lo ocurrido.\n' +
      'POSTURA DEMANDANTE: que reclama y en que se apoya.\n' +
      'POSTURA DEMANDADO: que responde o que falta de su lado.\n' +
      'A CONSIDERAR: 2-3 preguntas o puntos clave que los arbitros deberian evaluar.\n' +
      'Se justo, no inventes datos que no esten en la evidencia. Espanol neutro.';
    const user = `MOTIVO DE LA DISPUTA: ${reason || '(no especificado)'}\n\nEVIDENCIA (chat de la Caja Negra):\n${conversacion}\n\nEntrega tu analisis neutral.`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.4, maxOutputTokens: 1200, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    const parts = data?.candidates?.[0]?.content?.parts;
    const analisis = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    return json({ analisis: analisis || 'No pude generar el análisis. Reintenta.' });
  } catch (e) {
    return json({ error: 'Error inesperado en el Relator IA.', detail: String(e) }, 500);
  }
});
