// supabase/functions/analizar-cv/index.ts
// Analiza el CV COMPLETO con Gemini y devuelve un perfil real y personalizado.
// Salida JSON estructurada (responseSchema) para que siempre sea parseable.
// Pondera TODO lo que aparezca en el CV; el resultado es específico de cada CV.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODEL = 'gemini-2.5-flash';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SYS =
  'Eres un evaluador experto de talento de ingenieria/tecnica para Omicrom. ' +
  'Te paso el TEXTO COMPLETO de un CV. Debes PONDERAR ABSOLUTAMENTE TODO lo que aparezca: experiencia, ' +
  'roles, anios, proyectos, tecnologias, logros medibles, liderazgo, mentoria, educacion, certificaciones, ' +
  'publicaciones, open source, idiomas. El analisis debe ser REAL y ESPECIFICO de ESTE CV (no generico). ' +
  'Devuelve SOLO JSON con: name (nombre de la persona si aparece, si no ""), seniorLabel (ej. "Ingeniera Senior"), ' +
  'seniorLevel (1=estudiante,2=junior,3=semi-senior,4=senior,5=lead/experto), years (anios de experiencia, numero), ' +
  'skills (las habilidades/tecnologias mas relevantes que REALMENTE aparecen, legibles, maximo 12), ' +
  'arch (uno de: estudiante, junior, mid, senior, lead, pro), ' +
  'axes con 4 valores 0-100 justificados por el CV: ' +
  'exec=Ejecucion (capacidad de entregar: proyectos completados, stack dominado, resultados), ' +
  'qual=Calidad (rigor tecnico: buenas practicas, testing, arquitectura, seniority tecnico), ' +
  'trans=Trascendencia (impacto y liderazgo: mentoria, comunidad, open source, publicaciones, escala del impacto), ' +
  'fund=Fundamento (base teorica: educacion formal, certificaciones, profundidad conceptual). ' +
  'Si el CV es debil o vacio en un eje, pon un valor BAJO real (no inventes). ' +
  'summary: 1-2 frases en espanol neutro-chileno explicando por que esos niveles, citando algo concreto del CV.';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    name: { type: 'STRING' },
    seniorLabel: { type: 'STRING' },
    seniorLevel: { type: 'INTEGER' },
    years: { type: 'NUMBER' },
    skills: { type: 'ARRAY', items: { type: 'STRING' } },
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
  required: ['name', 'seniorLabel', 'seniorLevel', 'years', 'skills', 'arch', 'axes', 'summary'],
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    if (!GEMINI_API_KEY) return json({ ok: false, error: 'Falta GEMINI_API_KEY.' }, 500);
    const body = await req.json().catch(() => ({}));
    const cv = (body?.text ?? '').toString().slice(0, 16000).trim();
    if (cv.length < 20) return json({ ok: false, error: 'El CV es muy corto o no se pudo leer.' }, 400);

    const resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS }] },
          contents: [{ role: 'user', parts: [{ text: 'CV COMPLETO:\n\n' + cv }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 1200,
            responseMimeType: 'application/json',
            responseSchema: SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
    const data = await resp.json();
    if (!resp.ok) return json({ ok: false, error: 'Gemini error', detail: data?.error?.message ?? null }, 502);
    const parts = data?.candidates?.[0]?.content?.parts;
    const raw = Array.isArray(parts) ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim() : '';
    let parsed: unknown;
    try { parsed = JSON.parse(raw); } catch { return json({ ok: false, error: 'No pude interpretar el analisis.' }, 502); }
    return json({ ok: true, analysis: parsed });
  } catch (e) {
    return json({ ok: false, error: 'Error inesperado analizando el CV.', detail: String(e) }, 500);
  }
});
