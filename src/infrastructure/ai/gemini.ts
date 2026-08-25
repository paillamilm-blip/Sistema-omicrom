// src/lib/geminiClient.ts
// Llama a un LLM via proxy-ai Edge Function (server-side, key protegida).
// Modelo: elegido server-side (multi-model fallback).

// Usa aiClient centralizado (proxy-ai Edge Function server-side)
import { callAI } from '@/infrastructure/ai/client';

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

export async function analyzeCVWithGemini(cvText: string): Promise<{ ok: boolean; analysis?: GeminiAnalysis; error?: string; errorCode?: string }> {
  const text = cvText.slice(0, 15000);

  try {
    const raw = await callAI([
      { role: 'system', content: SYS },
      { role: 'user', content: 'CV COMPLETO:\n\n' + text },
    ], { maxTokens: 2000, temperature: 0.3, jsonMode: true, timeout: 25000 });

    if (!raw) {
      return { ok: false, error: 'IA no disponible. Intenta de nuevo en unos minutos.', errorCode: 'empty_response' };
    }

    // Extraer JSON del contenido (puede venir con texto antes/después)
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { ok: false, error: 'La IA respondió pero no pude interpretar el resultado.', errorCode: 'parse_error' };
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validar con Zod: si la IA devolvió campos incorrectos, rechazar
    const { validateGeminiResponse } = await import('./schemas/cvAnalysis');
    const validation = validateGeminiResponse(parsed);
    if (!validation.success) {
      console.warn('[geminiClient] Zod validation failed:', validation.error);
      return { ok: false, error: 'La IA devolvió datos incompletos. Intentá de nuevo.', errorCode: 'validation_error' };
    }

    return { ok: true, analysis: validation.data as GeminiAnalysis };
  } catch (e: unknown) {
    // Import AIError type for typed error handling
    const { AIError } = await import('./client');
    if (e instanceof AIError) {
      console.warn(`[geminiClient] AIError [${e.code}]:`, e.message);
      switch (e.code) {
        case 'timeout':
          return { ok: false, error: 'La IA tardó demasiado. Los servidores pueden estar ocupados.', errorCode: 'timeout' };
        case 'credits':
          return { ok: false, error: e.message || 'Créditos IA agotados. Esperá a mañana o mejorá tu plan.', errorCode: 'credits' };
        case 'server':
          return { ok: false, error: e.message || 'Servicio de IA con problemas. Reintentá en unos minutos.', errorCode: 'server' };
        case 'network':
          return { ok: false, error: 'Error al comunicarse con el servidor de IA. Verificá tu conexión.', errorCode: 'network' };
        default:
          return { ok: false, error: e.message || 'Error desconocido de IA.', errorCode: e.code };
      }
    }
    console.warn('[geminiClient] Error:', e);
    return { ok: false, error: 'No se pudo conectar con la IA. Intentá de nuevo.', errorCode: 'unknown' };
  }
}
