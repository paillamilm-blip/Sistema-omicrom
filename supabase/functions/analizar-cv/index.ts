// supabase/functions/analizar-cv/index.ts
// Analiza el CV COMPLETO con Gemini y devuelve un perfil real y personalizado.
// Salida JSON estructurada (responseSchema) para que siempre sea parseable.
//
// ENDURECIMIENTO (producción): límite de tasa por IP (fail-open) para evitar
// abuso del endpoint de IA sin bloquear el onboarding legítimo. Si el
// limitador falla o no está desplegado, se permite la solicitud.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

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

/** IP aproximada del solicitante (para rate-limit sin identidad estable). */
function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? 'unknown';
}

/**
 * Límite de tasa fail-open: usa la RPC public.check_rate_limit (ventana fija,
 * atómica). Si no hay cliente admin o la RPC falla, permite (no bloquea).
 * Límite: 6 análisis de CV por IP cada 60s (suficiente para reintentos, corta abuso).
 */
async function rateLimited(req: Request): Promise<Response | null> {
  if (!_admin) return null; // fail-open: sin service role, no bloqueamos
  try {
    const { data, error } = await _admin.rpc('check_rate_limit', {
      p_bucket: 'analizar-cv',
      p_identifier: clientIp(req),
      p_limit: 6,
      p_window_sec: 60,
    });
    if (error || !data) return null; // fail-open
    const r = data as { allowed?: boolean; reset_at?: string };
    if (r.allowed === false) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'Demasiados análisis de CV en poco tiempo. Espera unos segundos e intenta de nuevo.',
          retry_at: r.reset_at ?? null,
        }),
        { status: 429, headers: { ...CORS, 'Content-Type': 'application/json', 'Retry-After': '30' } },
      );
    }
    return null;
  } catch {
    return null; // fail-open
  }
}

const SYS = `Eres el Motor de ADN Digital de Ómicron. Tu misión: CLONAR fielmente un CV real y MEDIR al profesional con el sistema de reputación de Ómicron.

═══ CONTEXTO DEL SISTEMA ÓMICRON ═══

Ómicron mide a cada persona con 4 EJES de 0-100, donde TODO se basa en EVIDENCIA REAL:
• EJECUCIÓN (exec): Capacidad de ENTREGAR. Proyectos completados, años activos, roles de producción, resultados medibles, stack dominado en proyectos reales.
• CALIDAD (qual): RIGOR profesional. Certificaciones, estándares cumplidos, metodologías, buenas prácticas, nivel de responsabilidad, auditorías, controles de calidad.
• TRASCENDENCIA (trans): IMPACTO más allá de uno mismo. Liderazgo de equipos, mentoría, docencia, publicaciones, conferencias, formación de otros, cargos de responsabilidad sobre personas.
• FUNDAMENTO (fund): BASE teórica y formal. Títulos universitarios, diplomados, certificaciones técnicas, especializaciones, educación formal, cursos acreditados.

Fórmula: reputación = 20% credenciales formales + 80% promedio(4 ejes).
Un título ayuda (20%) pero el 80% se gana DEMOSTRANDO.

═══ TU TRABAJO ═══

Recibes el texto COMPLETO de un CV. Debes:

1. CLONAR el CV: extraer TODA la información tal como es. Nombre real, título real, años reales, cada rol, cada proyecto, cada certificación. NO omitir nada. NO inventar nada.

2. POSICIONAR como especialista: el campo seniorLabel debe ser el POSICIONAMIENTO REAL de esta persona (ej: "Ingeniero en Prevención de Riesgos con 12 años en minería", "Desarrollador Full Stack Senior", "Director de Operaciones Hoteleras"). Basado en su EXPERIENCIA DOMINANTE, no un genérico.

3. MEDIR con los 4 ejes de Ómicron: calcular exec/qual/trans/fund basándote en EVIDENCIA CONCRETA del CV. Si tiene 15 años y ha dirigido equipos → exec y trans altos. Si tiene magíster y certificaciones → fund alto. Si no tiene experiencia de liderazgo → trans bajo. SER HONESTO.

═══ REGLAS ABSOLUTAS ═══

- NO inventes NADA que no esté en el texto.
- NO subestimes: si tiene 20 años de experiencia, refleja 20 años.
- NO uses etiquetas genéricas: nada de "Profesional Senior" o "Tech Lead" si no lo es.
- Los skills deben ser los que REALMENTE domina según su trayectoria (nombre legible en español).
- Los porcentajes (pct) DEBEN diferenciarse: su área principal 80-96%, áreas secundarias 50-75%, menciones menores 30-50%.
- Los años son la SUMA TOTAL de experiencia laboral (todos los roles sumados).
- Si el CV no es de tecnología (es de operaciones, turismo, seguridad, etc.), evalúa IGUAL con los 4 ejes adaptados a su industria.

═══ FORMATO DE SALIDA (JSON) ═══

Devuelve SOLO JSON válido con estos campos:
- name: nombre completo de la persona
- seniorLabel: su posicionamiento como especialista (1 frase descriptiva y específica)
- seniorLevel: 1=estudiante, 2=junior, 3=semi-senior, 4=senior, 5=experto/director
- years: años TOTALES de experiencia profesional (entero)
- skills: array de strings con sus habilidades/áreas principales (máx 12, español legible)
- skillsDetail: array de {name, pct} con nivel de dominio real 0-100 por cada skill
- arch: uno de "estudiante", "junior", "mid", "senior", "lead", "pro"
- axes: {exec, qual, trans, fund} — cada uno 0-100, JUSTIFICADO por evidencia del CV
- summary: EXACTAMENTE 2 párrafos en español profesional. Párrafo 1: quién es (título + años + especialidad + algo concreto del CV). Párrafo 2: justificación de cada eje citando evidencia distinta del CV para cada uno.`;


const SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    seniorLabel: { type: 'STRING' },
    seniorLevel: { type: 'INTEGER' },
    years: { type: 'NUMBER' },
    skills: { type: 'ARRAY', items: { type: 'STRING' } },
    skillsDetail: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: { name: { type: 'STRING' }, pct: { type: 'INTEGER' } },
        required: ['name', 'pct'],
      },
    },
    arch: { type: 'STRING' },
    axes: {
      type: 'OBJECT',
      properties: {
        exec: { type: 'NUMBER' }, qual: { type: 'NUMBER' },
        trans: { type: 'NUMBER' }, fund: { type: 'NUMBER' },
      },
      required: ['exec', 'qual', 'trans', 'fund'],
    },
    summary: { type: 'STRING' },
  },
  required: ['name', 'seniorLabel', 'seniorLevel', 'years', 'skills', 'skillsDetail', 'arch', 'axes', 'summary'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ ok: false, error: 'Falta GEMINI_API_KEY.' }, 500);

    // Límite de tasa por IP (fail-open) antes de gastar tokens de Gemini.
    const limited = await rateLimited(req);
    if (limited) return limited;

    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'El CV es muy corto o no se pudo leer.' }, 400);

    // Intentar con modelo principal, fallback si falla
    let resp: Response | null = null;
    let usedModel = MODEL;

    for (const model of [MODEL, FALLBACK_MODEL]) {
      usedModel = model;
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
              maxOutputTokens: 1500,
              responseMimeType: 'application/json',
              responseSchema: SCHEMA,
            },
          }),
        },
      );
      if (resp.ok) break;
      if (model === MODEL && (resp.status === 404 || resp.status >= 500)) {
        console.warn(`[analizar-cv] ${model} falló (${resp.status}), intentando ${FALLBACK_MODEL}...`);
        continue;
      }
      break;
    }

    if (!resp) return json({ ok: false, error: 'No se pudo conectar con la IA.' }, 502);

    const data = await resp.json();
    if (!resp.ok) {
      console.error(`[analizar-cv] Gemini error (${usedModel}):`, JSON.stringify(data?.error ?? data));
      return json({
        ok: false,
        error: 'Error al analizar con IA. Verifica que GEMINI_API_KEY esté configurada.',
        detail: data?.error?.message ?? `HTTP ${resp.status}`,
        model: usedModel,
      }, 502);
    }
    const parts = data?.candidates?.[0]?.content?.parts;
    const raw = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502); }
    return json({ ok: true, analysis: parsed });
  } catch (e) {
    return json({ ok: false, error: 'Error inesperado analizando el CV.', detail: String(e) }, 500);
  }
});
