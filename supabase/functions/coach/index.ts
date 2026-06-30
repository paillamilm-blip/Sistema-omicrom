// supabase/functions/coach/index.ts — Coach IA de Ómicrom.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) {
      return json({ error: 'El Coach IA no está configurado (falta GEMINI_API_KEY).' }, 500);
    }
    const rl = await checkRateLimit(_admin, 'coach', clientIp(req), 8, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const authHeader = req.headers.get('Authorization') ?? '';
    const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });

    const { data: ctx, error } = await userClient.rpc('get_coach_context');
    if (error || !ctx) {
      return json({ error: 'No pude leer tu perfil. Inicia sesion.', detail: error?.message ?? null }, 401);
    }

    const sys =
      'Eres el "Coach IA" de Ómicrom, mentor de carrera para estudiantes y técnicos de ingeniería. ' +
      'Te paso el perfil del usuario en JSON: su Gemelo Digital (4 ejes: ejecución, calidad, trascendencia, fundamento, 0-100), ' +
      'sus credenciales verificadas, sus habilidades validadas y pendientes, y los cursos disponibles. ' +
      'Tu tarea: (1) DIAGNÓSTICO breve de fortalezas; (2) TU BRECHA principal (el eje más débil y por qué); ' +
      '(3) RECOMENDACIÓN concreta: elige UN curso de "cursos_disponibles" que ataque esa brecha y di por qué; ' +
      '(4) un mensaje motivador de 1 línea. Responde en español neutro-chileno, con esos 4 títulos en MAYÚSCULA, ' +
      'breve (máx ~180 palabras). Si no hay cursos disponibles, sugiere validar un nodo pendiente en el Árbol.';

    const userMsg = 'PERFIL DEL USUARIO (JSON): ' + JSON.stringify(ctx);

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
        }),
      },
    );

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    }
    const parts = data?.candidates?.[0]?.content?.parts;
    const advice = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    return json({ advice: advice || 'No pude generar tu diagnóstico. Intenta de nuevo.', context: ctx });
  } catch (e) {
    return json({ error: 'Error inesperado en el Coach IA.', detail: String(e) }, 500);
  }
});
