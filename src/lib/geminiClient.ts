// src/lib/geminiClient.ts
// Llama a Gemini DIRECTO desde el browser (sin Edge Function).
// Las keys AQ. de Google AI Studio funcionan como Bearer token.
// 100% gratis — tier gratuito de Gemini.

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const MODEL = 'gemini-2.5-flash';
const FALLBACK = 'gemini-2.0-flash';

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
  'Responde SOLO JSON con estos campos:',
  'name (string), seniorLabel (string), seniorLevel (1-5), years (int),',
  'skills (array max 12 strings), skillsDetail (array {name,pct}),',
  'arch (estudiante/junior/mid/senior/lead/pro),',
  'axes ({exec,qual,trans,fund} cada uno 0-100),',
  'summary (2 parrafos en espanol: P1 quien es, P2 justificacion ejes).',
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

async function callGemini(model: string, cvText: string): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYS }] },
      contents: [{ role: 'user', parts: [{ text: 'CV COMPLETO:\n\n' + cvText }] }],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 2000,
        responseMimeType: 'application/json',
      },
    }),
  });
}

export async function analyzeCVWithGemini(cvText: string): Promise<{ ok: boolean; analysis?: GeminiAnalysis; error?: string }> {
  if (!API_KEY) {
    return { ok: false, error: 'Falta VITE_GEMINI_API_KEY.' };
  }

  const text = cvText.slice(0, 15000);

  // Intentar modelo principal, fallback si falla
  for (const model of [MODEL, FALLBACK]) {
    try {
      const resp = await callGemini(model, text);

      if (!resp.ok) {
        const err = await resp.text();
        console.warn(`[gemini] ${model} falló (${resp.status}):`, err.slice(0, 200));
        continue; // probar fallback
      }

      const data = await resp.json();
      const parts = data?.candidates?.[0]?.content?.parts;
      const raw = Array.isArray(parts)
        ? parts.map((p: { text?: string }) => p.text ?? '').join('').trim()
        : '';

      if (!raw) continue;

      const parsed = JSON.parse(raw) as GeminiAnalysis;
      console.log('[gemini] OK:', model, parsed.name ?? '?');
      return { ok: true, analysis: parsed };
    } catch (e) {
      console.warn(`[gemini] ${model} error:`, e);
      continue;
    }
  }

  return { ok: false, error: 'No se pudo conectar con Gemini.' };
}
