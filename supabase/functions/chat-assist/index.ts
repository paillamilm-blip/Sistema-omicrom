// supabase/functions/chat-assist/index.ts — Redactor IA de Acuerdos (Ómicrom).
// SINERGIA: Conoce el seniority, skills y competencias validadas del usuario
// para adaptar tono y terminología técnica al nivel correcto.
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'El Redactor IA no está configurado (falta GEMINI_API_KEY).' }, 500);

    const uid = await authenticateUser(req, SUPABASE_URL, ANON_KEY);
    if (!uid) return json({ error: 'Inicia sesión para usar el Redactor IA.' }, 401);

    const rl = await checkRateLimit(admin, 'chat-assist', clientIp(req), 20, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const body = await req.json().catch(() => ({}));
    const draft: string = (body?.draft ?? '').toString().trim();
    if (!draft) return json({ error: 'Escribe un borrador para mejorar.' }, 400);
    if (draft.length > 1200) return json({ error: 'El borrador es muy largo.' }, 400);

    // SINERGIA: obtener contexto real del usuario (no del body)
    const ctx = await getUserContext(admin, uid);

    // Construir contexto de seniority dinámico
    const seniorityCtx = ctx
      ? `El usuario es ${ctx.nodeType} N${ctx.nodeLevel} con reputación ${ctx.reputationScore}/100. ` +
        (ctx.skills.length ? `Sus skills son: ${ctx.skills.slice(0, 8).join(', ')}. ` : '') +
        (ctx.competenciasValidadas.length ? `Competencias validadas: ${ctx.competenciasValidadas.slice(0, 5).join(', ')}. ` : '')
      : '';

    const sys =
      'Eres el Redactor de Acuerdos de Omicrom, parte de un sistema de APRENDIZAJE CONTINUO. ' +
      'Reescribes el borrador de un usuario para un chat de trabajo entre quien contrata y quien ejecuta. ' +
      seniorityCtx +
      'Objetivo: dejarlo CLARO, PROFESIONAL y CORDIAL, orientado a definir ' +
      'bien el acuerdo (qué se hará, entregable, plazo o condiciones si el borrador los sugiere). ' +
      'ADAPTA la terminología técnica al nivel real del usuario (si es N3 Arquitecto, usa lenguaje senior; ' +
      'si es N1 Operativo, simplifica). ' +
      'Mantén la MISMA intención y los datos del borrador; NO inventes compromisos que no están. ' +
      'Español neutro-chileno, breve (1 a 4 frases). Devuelve SOLO el mensaje reescrito, sin comillas ni explicaciones.';
    const user = `BORRADOR DEL USUARIO:\n${draft}\n\nReescríbelo.`;

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.6, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    const parts = data?.candidates?.[0]?.content?.parts;
    const texto = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    return json({ texto: texto || draft });
  } catch (e) {
    return json({ error: 'Error inesperado en el Redactor IA.', detail: String(e) }, 500);
  }
});
