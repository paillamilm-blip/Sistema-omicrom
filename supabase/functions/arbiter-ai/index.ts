// supabase/functions/arbiter-ai/index.ts — Relator IA del Tribunal (Ómicrom).
// SINERGIA: Conoce la expertise de los árbitros asignados para calibrar el
// análisis según su nivel de comprensión del dominio de la disputa.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { authenticateUser, getUserContext } from '../_shared/userContext.ts';

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

interface Turn { autor?: string; texto?: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'El Relator IA no está configurado (falta GEMINI_API_KEY).' }, 500);

    const uid = await authenticateUser(req, SUPABASE_URL, ANON_KEY);
    if (!uid) return json({ error: 'Inicia sesión para usar el Relator IA.' }, 401);

    const rl = await checkRateLimit(admin, 'arbiter-ai', clientIp(req), 10, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const reason: string = (body?.reason ?? '').toString().trim();
    const transcript: Turn[] = Array.isArray(body?.transcript) ? body.transcript.slice(0, 60) : [];

    // SINERGIA: obtener expertise del árbitro para adaptar el análisis
    const arbiterCtx = await getUserContext(admin, uid);
    const arbiterInfo = arbiterCtx
      ? `\nÁRBITRO: ${arbiterCtx.nodeType} N${arbiterCtx.nodeLevel}, ` +
        `skills: ${arbiterCtx.skills.slice(0, 6).join(', ') || 'generales'}, ` +
        `competencias validadas: ${arbiterCtx.competenciasValidadas.slice(0, 5).join(', ') || 'ninguna'}. ` +
        `Adapta el análisis al nivel de expertise de este árbitro.`
      : '';

    const conversacion = transcript.length
      ? transcript.map(t => `@${t.autor || 'nodo'}: ${t.texto || ''}`).join('\n')
      : '(No hay mensajes en el canal.)';

    const sys =
      'Eres el Relator IA del Tribunal de Pares de Omicrom, parte de un sistema de APRENDIZAJE CONTINUO. ' +
      'Asistes a árbitros humanos que YA tienen acceso legítimo a la evidencia. ' +
      'Tu rol es NEUTRAL: NO decides el veredicto ni dices quién gana. ' +
      'ADAPTA la profundidad técnica del análisis según la expertise del árbitro que lo lee. ' +
      'Entrega un análisis objetivo con estas secciones (texto plano, sin markdown):\n' +
      'HECHOS: 2-3 puntos objetivos de lo ocurrido.\n' +
      'POSTURA DEMANDANTE: qué reclama y en qué se apoya.\n' +
      'POSTURA DEMANDADO: qué responde o qué falta de su lado.\n' +
      'A CONSIDERAR: 2-3 preguntas clave que los árbitros deberían evaluar.\n' +
      'Sé justo, no inventes datos que no estén en la evidencia. Español neutro.';
    const user = `MOTIVO: ${reason || '(no especificado)'}${arbiterInfo}\n\nEVIDENCIA:\n${conversacion}\n\nAnálisis:`;

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
