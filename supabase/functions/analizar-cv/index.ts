// supabase/functions/analizar-cv/index.ts
// Motor ADN Digital — Analiza CV con Gemini. SIN responseSchema (causaba 502).
// SINERGIA: Ahora requiere autenticación JWT para evitar abuso.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';
import { authenticateUser } from '../_shared/userContext.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';
const FALLBACK_MODEL = 'gemini-2.0-flash';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const _admin = SUPABASE_URL && SERVICE_KEY ? createClient(SUPABASE_URL, SERVICE_KEY) : null;

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
      p_bucket: 'analizar-cv',
      p_identifier: clientIp(req),
      p_limit: 6,
      p_window_sec: 60,
    });
    if (error || !data) return null;
    const r = data as { allowed?: boolean; reset_at?: string };
    if (r.allowed === false) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Demasiados intentos. Espera unos segundos.', retry_at: r.reset_at ?? null }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '30' } },
      );
    }
    return null;
  } catch { return null; }
}

const SYS = 'Eres el Motor de ADN Digital de Omicron. Tu mision: CLONAR fielmente un CV real y MEDIR al profesional con el sistema de reputacion de Omicron.\n\nCONTEXTO DEL SISTEMA OMICRON:\nOmicron mide a cada persona con 4 EJES de 0-100 basados en EVIDENCIA REAL:\n- EJECUCION (exec): Capacidad de ENTREGAR. Proyectos completados, anios activos, roles de produccion, resultados medibles.\n- CALIDAD (qual): RIGOR profesional. Certificaciones, estandares cumplidos, metodologias, buenas practicas, nivel de responsabilidad.\n- TRASCENDENCIA (trans): IMPACTO mas alla de uno mismo. Liderazgo de equipos, mentoria, docencia, publicaciones, cargos de responsabilidad sobre personas.\n- FUNDAMENTO (fund): BASE teorica y formal. Titulos universitarios, diplomados, certificaciones tecnicas, especializaciones.\n\nFormula: reputacion = 20% credenciales formales + 80% promedio(4 ejes). Un titulo ayuda (20%) pero el 80% se gana DEMOSTRANDO.\n\nTU TRABAJO:\n1. CLONAR el CV: extraer TODA la informacion tal como es. Nombre real, titulo real, anios reales, cada rol, cada proyecto, cada certificacion. NO omitir nada. NO inventar nada.\n2. POSICIONAR como especialista: el campo seniorLabel debe ser el POSICIONAMIENTO REAL (ej: "Ingeniero Industrial Especialista en Operaciones y Excelencia Operacional"). Basado en su EXPERIENCIA DOMINANTE.\n3. MEDIR con los 4 ejes de Omicron basandote en EVIDENCIA CONCRETA del CV.\n\nREGLAS:\n- NO inventes NADA que no este en el texto.\n- NO subestimes: si tiene 15 anios, refleja 15 anios.\n- NO uses etiquetas genericas.\n- Los skills deben ser los que REALMENTE domina segun su trayectoria (nombre legible en espanol).\n- Los porcentajes (pct) DEBEN diferenciarse: area principal 80-96%, secundarias 50-75%, menciones menores 30-50%.\n- Los anios son la SUMA TOTAL de experiencia laboral.\n- Funciona para CUALQUIER industria (tech, operaciones, turismo, seguridad, etc.).\n\nDevuelve SOLO un JSON valido con esta estructura exacta (sin texto antes ni despues):\n{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":""}\n\nDonde:\n- name: nombre completo\n- seniorLabel: posicionamiento como especialista (1 frase especifica)\n- seniorLevel: 1=estudiante, 2=junior, 3=semi-senior, 4=senior, 5=experto/director\n- years: anios TOTALES de experiencia (entero)\n- skills: array max 12 strings con habilidades/areas principales en espanol\n- skillsDetail: array de {name, pct} con nivel de dominio 0-100\n- arch: uno de "estudiante", "junior", "mid", "senior", "lead", "pro"\n- axes: {exec, qual, trans, fund} cada uno 0-100\n- summary: 2 parrafos en espanol. P1: quien es. P2: justificacion de ejes con evidencia.';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ ok: false, error: 'Falta GEMINI_API_KEY en secrets.' }, 500);

    // Auth: requiere JWT
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const uid = await authenticateUser(req, SUPABASE_URL, ANON_KEY);
    if (!uid) return json({ ok: false, error: 'Inicia sesión para analizar tu CV.' }, 401);

    const limited = await rateLimited(req);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'El CV es muy corto o no se pudo leer.' }, 400);

    let resp: Response | null = null;
    let usedModel = MODEL;

    for (const model of [MODEL, FALLBACK_MODEL]) {
      usedModel = model;
      console.log(`[analizar-cv] Intentando con modelo: ${model}`);
      resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: SYS }] },
            contents: [{ role: 'user', parts: [{ text: 'CV COMPLETO:\n\n' + cv }] }],
            generationConfig: {
              temperature: 0.3,
              maxOutputTokens: 2000,
              responseMimeType: 'application/json',
            },
          }),
        },
      );
      if (resp.ok) {
        console.log(`[analizar-cv] Exito con modelo: ${model}`);
        break;
      }
      const errBody = await resp.text();
      console.error(`[analizar-cv] ${model} fallo (${resp.status}):`, errBody.slice(0, 500));
      if (model === MODEL && (resp.status === 404 || resp.status >= 500 || resp.status === 400)) {
        continue;
      }
      break;
    }

    if (!resp || !resp.ok) {
      return json({ ok: false, error: `IA no disponible (modelo: ${usedModel}).`, model: usedModel }, 502);
    }

    const data = await resp.json();
    const parts = data?.candidates?.[0]?.content?.parts;
    const raw = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';

    if (!raw) {
      console.error('[analizar-cv] Respuesta vacia:', JSON.stringify(data).slice(0, 500));
      return json({ ok: false, error: 'La IA no genero respuesta.' }, 502);
    }

    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch (e) {
      console.error('[analizar-cv] JSON parse failed:', raw.slice(0, 300), e);
      return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502);
    }

    console.log(`[analizar-cv] OK modelo: ${usedModel}, nombre: ${(parsed as {name?:string})?.name ?? '?'}`);
    return json({ ok: true, analysis: parsed, model: usedModel });
  } catch (e) {
    console.error('[analizar-cv] Error fatal:', String(e));
    return json({ ok: false, error: 'Error inesperado.', detail: String(e) }, 500);
  }
});
