// supabase/functions/tutor/index.ts — Tutor IA de Ómicrom.
// Responde dudas del estudiante sobre la lección que está leyendo en la Academia.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

interface Turn { role: 'user' | 'model'; text: string }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) {
      return json({ error: 'El Tutor IA no está configurado (falta GEMINI_API_KEY).' }, 500);
    }
    const rl = await checkRateLimit(_admin, 'tutor', clientIp(req), 20, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const question: string = (body?.question ?? '').toString().trim();
    const lessonTitle: string = (body?.lessonTitle ?? '').toString();
    const lessonContent: string = (body?.lessonContent ?? '').toString();
    const history: Turn[] = Array.isArray(body?.history) ? body.history : [];

    if (!question) {
      return json({ error: 'Escribe una pregunta para el Tutor.' }, 400);
    }

    const sys =
      'Eres el "Tutor IA" de Ómicrom, un tutor cercano y paciente para estudiantes y técnicos de ingeniería. ' +
      'El estudiante está leyendo una lección y te hará dudas sobre ella. ' +
      'Apóyate SIEMPRE en el contenido de la lección que te paso abajo; si la pregunta se sale del tema, ' +
      'respóndela igual de forma breve pero invita a volver a la lección. ' +
      'Explica simple, en español neutro-chileno, con ejemplos concretos y, cuando ayude, pasos numerados. ' +
      'Sé breve (máx ~160 palabras). No inventes datos; si no sabes, dilo con honestidad.\n\n' +
      `LECCIÓN: "${lessonTitle}"\n` +
      `CONTENIDO DE LA LECCIÓN:\n${lessonContent}`;

    // Historial previo del chat (limitado a los últimos 10 turnos) + pregunta nueva.
    const contents = [
      ...history
        .filter(t => t && (t.role === 'user' || t.role === 'model') && typeof t.text === 'string')
        .slice(-10)
        .map(t => ({ role: t.role, parts: [{ text: t.text }] })),
      { role: 'user' as const, parts: [{ text: question }] },
    ];

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 700 },
        }),
      },
    );

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    }
    const parts = data?.candidates?.[0]?.content?.parts;
    const answer = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    return json({ answer: answer || 'No pude generar una respuesta. Intenta reformular tu duda.' });
  } catch (e) {
    return json({ error: 'Error inesperado en el Tutor IA.', detail: String(e) }, 500);
  }
});
