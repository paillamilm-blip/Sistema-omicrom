// supabase/functions/carta-ia/index.ts — Carta de Competencias de Ómicrom.
// La IA lee el Gemelo Digital + las Actas de Evidencia del usuario y redacta
// un resumen profesional VERIFICABLE (respaldado por evidencia, no auto-declarado)
// pensado para que una empresa lo lea de un vistazo.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { checkRateLimit, tooManyRequests, clientIp } from '../_shared/rateLimit.ts';

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
  const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
  const { data } = await userClient.auth.getUser();
  return data?.user?.id ?? null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ error: 'La Carta IA no esta configurada (falta GEMINI_API_KEY).' }, 500);

    const authHeader = req.headers.get('Authorization') ?? '';
    const uid = await getUserId(authHeader);
    if (!uid) return json({ error: 'Inicia sesion para generar tu carta.' }, 401);

    const rl = await checkRateLimit(admin, 'carta-ia', clientIp(req), 10, 60);
    if (!rl.allowed) return tooManyRequests(rl.reset_at);

    const { data: prof } = await admin
      .from('profiles')
      .select('full_name, username, node_type, node_level, reputation_score, execution_score, quality_score, transcendence_score, foundation_score, pe_points')
      .eq('id', uid).maybeSingle();
    if (!prof) return json({ error: 'No pude leer tu perfil.' }, 404);

    const { data: actas } = await admin
      .from('actas_evidencia')
      .select('puntaje_global, veredicto, ejecucion, calidad, trascendencia, fundamento, created_at, nodo:skill_tree_nodes(title)')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(20);

    const validadas = (actas ?? []).filter((a: any) => a.veredicto === 'APROBADO');

    const evidencia = validadas.length === 0
      ? '(El usuario aun no tiene competencias validadas por examen.)'
      : validadas.map((a: any) =>
          `- ${a.nodo?.title ?? 'Competencia'}: ${a.puntaje_global}% (ejecucion ${a.ejecucion}, calidad ${a.calidad}, trascendencia ${a.trascendencia}, fundamento ${a.fundamento})`,
        ).join('\n');

    const sys =
      'Eres redactor profesional de Omicrom. Escribes una "Carta de Competencias" breve y creible ' +
      'para que una EMPRESA evalue a un candidato. Regla de oro: basate SOLO en la evidencia que te paso ' +
      '(Gemelo Digital + actas validadas por IA). NO inventes experiencia ni titulos. Si hay poca evidencia, ' +
      'dilo con honestidad y enfocate en el potencial demostrado. Espanol profesional, calido y directo. ' +
      'Sin markdown, sin vinetas: 2 parrafos cortos (max ~160 palabras en total).';
    const user =
      `NOMBRE: ${prof.full_name || prof.username || 'Nodo'}\n` +
      `NIVEL: ${prof.node_type} ${prof.node_level}\n` +
      `GEMELO DIGITAL (0-100): ejecucion ${Math.round(prof.execution_score ?? 0)}, calidad ${Math.round(prof.quality_score ?? 0)}, ` +
      `trascendencia ${Math.round(prof.transcendence_score ?? 0)}, fundamento ${Math.round(prof.foundation_score ?? 0)}. ` +
      `Reputacion ${Math.round(prof.reputation_score ?? 0)}/100. PE ${prof.pe_points ?? 0}.\n` +
      `COMPETENCIAS VALIDADAS POR IA (${validadas.length}):\n${evidencia}\n\n` +
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
    if (!resp.ok) return json({ error: 'Gemini respondio con error.', detail: data?.error?.message ?? null }, 502);
    const parts = data?.candidates?.[0]?.content?.parts;
    const carta = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';

    return json({
      carta: carta || 'No pude generar la carta. Reintenta.',
      validadas: validadas.length,
      reputacion: Math.round(prof.reputation_score ?? 0),
    });
  } catch (e) {
    return json({ error: 'Error inesperado en la Carta IA.', detail: String(e) }, 500);
  }
});
