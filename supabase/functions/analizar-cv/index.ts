// supabase/functions/analizar-cv/index.ts
// Motor ADN Digital de Omicron. SIN responseSchema (causaba 502).
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const FALLBACK = 'gemini-2.0-flash';
const SB_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SB_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const _admin = SB_URL && SB_KEY ? createClient(SB_URL, SB_KEY) : null;

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown';
}

async function rateLimited(req: Request): Promise<Response | null> {
  if (!_admin) return null;
  try {
    const { data, error } = await _admin.rpc('check_rate_limit', {
      p_bucket: 'analizar-cv', p_identifier: clientIp(req), p_limit: 6, p_window_sec: 60,
    });
    if (error || !data) return null;
    const r = data as { allowed?: boolean; reset_at?: string };
    if (r.allowed === false) {
      return json({ ok: false, error: 'Demasiados intentos. Espera unos segundos.' }, 429);
    }
    return null;
  } catch { return null; }
}

const SYS = [
  'Eres el Motor de ADN Digital de Omicron.',
  'Tu mision: CLONAR fielmente un CV real y MEDIR al profesional con el sistema de Omicron.',
  '',
  'SISTEMA OMICRON - 4 EJES (0-100):',
  '- EJECUCION (exec): Capacidad de entregar. Proyectos completados, anios activos, resultados.',
  '- CALIDAD (qual): Rigor. Certificaciones, estandares, metodologias, responsabilidad.',
  '- TRASCENDENCIA (trans): Impacto. Liderazgo, mentoria, docencia, publicaciones.',
  '- FUNDAMENTO (fund): Base formal. Titulos, diplomados, certificaciones tecnicas.',
  '',
  'Formula: reputacion = 20% credenciales + 80% promedio(4 ejes).',
  '',
  'INSTRUCCIONES:',
  '1. Extraer TODA la info del CV tal como es. NO inventar. NO omitir.',
  '2. seniorLabel = posicionamiento REAL como especialista (no generico).',
  '3. Medir los 4 ejes con evidencia concreta del CV.',
  '4. Skills con porcentajes diferenciados: principal 80-96%, secundario 50-75%, menor 30-50%.',
  '5. Years = suma TOTAL de experiencia laboral.',
  '6. Funciona para CUALQUIER industria.',
  '',
  'Responde SOLO JSON con: name, seniorLabel, seniorLevel (1-5), years, skills (array max 12),',
  'skillsDetail (array {name,pct}), arch (estudiante/junior/mid/senior/lead/pro),',
  'axes ({exec,qual,trans,fund} 0-100), summary (2 parrafos en espanol).',
].join('\n');

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ ok: false, error: 'Falta GEMINI_API_KEY.' }, 500);
    const limited = await rateLimited(req);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'CV muy corto.' }, 400);

    let resp: Response | null = null;
    let used = MODEL;

    for (const m of [MODEL, FALLBACK]) {
      used = m;
      console.log('[analizar-cv] modelo:', m);
      resp = await fetch(
        'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent?key=' + GEMINI_API_KEY,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYS }] },
            contents: [{ role: 'user', parts: [{ text: 'CV COMPLETO:\n\n' + cv }] }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 2000, responseMimeType: 'application/json' },
          }),
        },
      );
      if (resp.ok) break;
      const err = await resp.text();
      console.error('[analizar-cv]', m, resp.status, err.slice(0, 300));
      if (m === MODEL) continue;
      break;
    }

    if (!resp || !resp.ok) return json({ ok: false, error: 'IA no disponible.', model: used }, 502);

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const raw = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    if (!raw) return json({ ok: false, error: 'IA sin respuesta.' }, 502);

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return json({ ok: false, error: 'JSON invalido de IA.' }, 502); }

    console.log('[analizar-cv] OK:', used, (parsed as { name?: string })?.name ?? '?');
    return json({ ok: true, analysis: parsed, model: used });
  } catch (e) {
    console.error('[analizar-cv] fatal:', e);
    return json({ ok: false, error: 'Error inesperado.', detail: String(e) }, 500);
  }
});
