// supabase/functions/carta-ia/index.ts — Carta de Competencias de Ómicrom.
// SINERGIA: Usa el módulo userContext.ts para obtener el perfil completo
// (skills, CV, competencias validadas) y genera una carta respaldada por
// TODA la evidencia del sistema de aprendizaje continuo.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';
import { authenticateUser, getUserContext, formatContextForPrompt } from '../_shared/userContext.ts';

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
    if (!GEMINI_API_KEY) return json({ error: 'La Carta IA no está configurada (falta GEMINI_API_KEY).' }, 500);

    const uid = await authenticateUser(req, SUPABASE_URL, ANON_KEY);
    if (!uid) return json({ error: 'Inicia sesión para generar tu carta.' }, 401);

    const rl = await checkRateLimit(admin, 'carta-ia', clientIp(req), 10, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    // SINERGIA: contexto completo del usuario
    const ctx = await getUserContext(admin, uid);
    if (!ctx) return json({ error: 'No pude leer tu perfil.' }, 404);

    // Actas detalladas para la carta
    const { data: actas } = await admin
      .from('actas_evidencia')
      .select('puntaje_global, veredicto, ejecucion, calidad, trascendencia, fundamento, created_at, nodo:skill_tree_nodes(title)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    const validadas = (actas ?? []).filter((a: any) => a.veredicto === 'APROBADO');

    const evidencia = validadas.length === 0
      ? '(El usuario aún no tiene competencias validadas por examen.)'
      : validadas.map((a: any) =>
          `- ${a.nodo?.title ?? 'Competencia'}: ${a.puntaje_global}% (ej=${a.ejecucion}, cal=${a.calidad}, tr=${a.trascendencia}, fun=${a.fundamento})`,
        ).join('\n');

    const profileText = formatContextForPrompt(ctx, {
      includeCompetencias: false,
      includeCV: true,
      includeLastExam: false,
      includeAxes: true,
    });

    const sys =
      'Eres redactor profesional de Omicrom, parte de un sistema de APRENDIZAJE CONTINUO. ' +
      'Escribes una "Carta de Competencias" breve y creíble para que una EMPRESA evalúe a un candidato. ' +
      'Regla de oro: básate SOLO en la evidencia (Gemelo + actas + skills declaradas + CV). ' +
      'INTEGRA las skills declaradas y el CV con las competencias validadas para dar una visión 360°. ' +
      'NO inventes experiencia ni títulos. Si hay poca evidencia validada pero el CV muestra trayectoria, ' +
      'menciona ambos (lo validado vs lo declarado). Español profesional, cálido y directo. ' +
      'Sin markdown, sin viñetas: 2 párrafos cortos (máx ~180 palabras en total).';
    const user =
      `${profileText}\n` +
      `COMPETENCIAS VALIDADAS POR EXAMEN IA (${validadas.length}):\n${evidencia}\n\n` +
      'Redacta la Carta de Competencias.';

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: sys }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    const data = await resp.json();
    if (!resp.ok) return json({ error: 'Gemini respondió con error.', detail: data?.error?.message ?? null }, 502);
    const parts = data?.candidates?.[0]?.content?.parts;
    const carta = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';

    return json({
      carta: carta || 'No pude generar la carta. Reintenta.',
      validadas: validadas.length,
      reputacion: ctx.reputationScore,
    });
  } catch (e) {
    return json({ error: 'Error inesperado en la Carta IA.', detail: String(e) }, 500);
  }
});
