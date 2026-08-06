// src/lib/geminiClient.ts
// Llama a un LLM via OpenRouter (gratis, sin tarjeta).
// Modelo: google/gemma-4-31b-it:free (256K contexto, multilingüe).
// Fallback: google/gemma-4-26b-a4b-it:free

const API_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
const MODEL = 'google/gemma-4-31b-it:free';
const FALLBACK = 'google/gemma-4-26b-a4b-it:free';
const URL = 'https://openrouter.ai/api/v1/chat/completions';

const SYS = [
  'Eres el Motor de ADN Digital de Omicron.',
  'Tu mision: CLONAR fielmente un CV real y MEDIR al profesional.',
  '',
  'SISTEMA OMICRON - 4 EJES (0-100):',
  '- EJECUCION (exec): Capacidad de entregar. Proyectos, anios, resultados.',
  '- CALIDAD (qual): Rigor. Certificaciones, estandares, metodologias.',
  '- TRASCENDENCIA (trans): Impacto. Liderazgo, mentoria, docencia.',
  '- FUNDAMENTO (fund): Base formal. Titulos, diplomados, certificaciones.',
  '',
  'Formula: reputacion = 20% credenciales + 80% promedio(4 ejes).',
  '',
  'INSTRUCCIONES:',
  '1. Extraer TODA la info del CV. NO inventar. NO omitir.',
  '2. seniorLabel = posicionamiento REAL como especialista.',
  '3. Medir los 4 ejes con evidencia concreta del CV.',
  '4. Skills con pct diferenciados: principal 80-96%, secundario 50-75%, menor 30-50%.',
  '5. Years = suma TOTAL de experiencia laboral.',
  '6. Funciona para CUALQUIER industria.',
  '',
  'Responde SOLO JSON valido con estos campos (sin texto extra):',
  '{"name":"","seniorLabel":"","seniorLevel":0,"years":0,"skills":[],"skillsDetail":[{"name":"","pct":0}],"arch":"","axes":{"exec":0,"qual":0,"trans":0,"fund":0},"summary":""}',
  '',
  'Donde:',
  '- name: nombre completo',
  '- seniorLabel: posicionamiento como especialista (1 frase especifica)',
  '- seniorLevel: 1=estudiante, 2=junior, 3=semi-senior, 4=senior, 5=experto/director',
  '- years: anios TOTALES de experiencia (entero)',
  '- skills: array max 12 strings con habilidades/areas principales en espanol',
  '- skillsDetail: array de {name, pct} con nivel de dominio 0-100',
  '- arch: uno de estudiante, junior, mid, senior, lead, pro',
  '- axes: {exec, qual, trans, fund} cada uno 0-100',
  '- summary: 2 parrafos en espanol. P1: quien es. P2: justificacion de ejes.',
].join('\n');

export interface GeminiAnalysis {
  name?: string;
  seniorLabel?: string;
  seniorLevel?: number;
  years?: number;
  skills?: string[];
  skillsDetail?: { name: string; pct: number }[];
  arch?: string;
  axes?: { exec: number; qual: number; trans: number; fund: number };
  summary?: string;
}

async function callModel(model: string, cvText: string): Promise<Response> {
  return fetch(URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
      'X-Title': 'Sistema Omicron',
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: SYS },
        { role: 'user', content: 'CV COMPLETO:\n\n' + cvText },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    }),
  });
}

export async function analyzeCVWithGemini(cvText: string): Promise<{ ok: boolean; analysis?: GeminiAnalysis; error?: string }> {
  if (!API_KEY) {
    return { ok: false, error: 'Falta VITE_OPENROUTER_KEY. Registrate gratis en openrouter.ai' };
  }

  const text = cvText.slice(0, 15000);

  for (const model of [MODEL, FALLBACK]) {
    try {
      const resp = await callModel(model, text);

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[openrouter] ${model} falló (${resp.status}):`, err.slice(0, 200));
        continue;
      }

      const data = await resp.json();
      const content = data?.choices?.[0]?.message?.content ?? '';

      if (!content) continue;

      // Extraer JSON del contenido (puede venir con texto antes/después)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) continue;

      const parsed = JSON.parse(jsonMatch[0]) as GeminiAnalysis;
      console.log('[openrouter] OK:', model, parsed.name ?? '?');
      return { ok: true, analysis: parsed };
    } catch (e) {
      console.warn(`[openrouter] ${model} error:`, e);
      continue;
    }
  }

  return { ok: false, error: 'No se pudo conectar con la IA. Intentá de nuevo.' };
}
