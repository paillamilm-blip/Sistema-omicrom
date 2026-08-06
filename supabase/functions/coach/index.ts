// supabase/functions/coach/index.ts — Coach IA de Ómicrom.
// SINERGIA: Conoce al usuario COMPLETO (ejes, skills, CV, competencias validadas,
// último examen, cursos disponibles) y genera diagnóstico + recomendación precisa.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { authenticateUser, getUserContext, formatContextForPrompt } from '../_shared/userContext.ts';

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

    // Auth ANTES de rate limit (para no consumir slots con requests anónimos)
    const uid = await authenticateUser(req, SUPABASE_URL, ANON_KEY);
    if (!uid) return json({ error: 'Inicia sesión para usar el Coach IA.' }, 401);

    const rl = await checkRateLimit(_admin, 'coach', clientIp(req), 8, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    // SINERGIA: contexto completo del usuario (server-side, no del body)
    const ctx = await getUserContext(_admin, uid);
    if (!ctx) {
      return json({ error: 'Completa tu perfil para usar el Coach IA.' }, 404);
    }

    // Cursos disponibles (para recomendar)
    const { data: cursos } = await _admin
      .from('academy_courses')
      .select('id, title, description, difficulty')
      .eq('is_published', true)
      .order('order_index')
      .limit(15);

    const cursosTexto = (cursos ?? []).map((c: any) =>
      `- "${c.title}" (dificultad ${c.difficulty}/5): ${c.description?.slice(0, 80) ?? ''}`
    ).join('\n');

    const profileText = formatContextForPrompt(ctx, {
      includeCompetencias: true,
      includeCV: true,
      includeLastExam: true,
      includeAxes: true,
    });

    const sys =
      'Eres el "Coach IA" de Ómicrom, mentor de carrera para un sistema de APRENDIZAJE CONTINUO EN TIEMPO REAL. ' +
      'Te paso el perfil COMPLETO del usuario: su Gemelo Digital (4 ejes 0-100), sus skills declaradas, ' +
      'su resumen de CV, sus competencias VALIDADAS por examen, y su último examen rendido. ' +
      'También te paso los cursos disponibles de la Academia. ' +
      'Tu tarea: (1) DIAGNÓSTICO breve de fortalezas (basado en ejes, skills Y competencias validadas); ' +
      '(2) TU BRECHA principal (el eje más débil + qué skills/competencias le faltan para subir de nivel); ' +
      '(3) RECOMENDACIÓN concreta: elige UN curso que ataque esa brecha Y explica cómo conecta con su ' +
      'trayectoria real (CV + competencias ya validadas); ' +
      '(4) SIGUIENTE PASO: qué examen del Árbol rendir para consolidar. ' +
      'Responde en español neutro-chileno, con esos 4 títulos en MAYÚSCULA, ' +
      'breve (máx ~200 palabras). Si no hay cursos disponibles, sugiere validar un nodo pendiente.';

    const userMsg =
      `${profileText}\n\n` +
      `CURSOS DISPONIBLES:\n${cursosTexto || '(ninguno publicado aún)'}`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: userMsg }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );

    const data = await resp.json();
    if (!resp.ok) {
      return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    }
    const parts = data?.candidates?.[0]?.content?.parts;
    const advice = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    return json({ advice: advice || 'No pude generar tu diagnóstico. Intenta de nuevo.' });
  } catch (e) {
    return json({ error: 'Error inesperado en el Coach IA.', detail: String(e) }, 500);
  }
});
