// src/lib/oraculo.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Oráculo — motor de intención (voz/texto → acción)
// Interpreta lo que el usuario dice y lo traduce a: navegar a un hub,
// responder un dato simple, o consultar al Coach IA (Edge Function `coach`,
// respaldada por Gemini). Puro TypeScript, sin dependencias nuevas.
// ═══════════════════════════════════════════════════════════════════════
import { supabase } from './supabase';
import type { TabId } from '../types';

export type OraculoIntent =
  | { kind: 'navigate'; tab: TabId; label: string }
  | { kind: 'coach' }
  | { kind: 'convalidate'; item: 'cv' | 'title' | 'year' | 'vault' }
  | { kind: 'fact'; topic: 'reputacion' | 'tokens' | 'pe' | 'ayuda' }
  | { kind: 'unknown' };

const NAV: { keys: string[]; tab: TabId; label: string }[] = [
  { keys: ['inicio', 'gemelo', 'perfil', 'principal', 'home'], tab: 'perfil', label: 'Inicio' },
  { keys: ['habilidad', 'skill', 'competenc', 'maxskill', 'destreza'], tab: 'maxskill', label: 'Habilidades' },
  { keys: ['academia', 'aprend', 'curso', 'estudi', 'arbol', 'árbol'], tab: 'academia', label: 'Academia' },
  { keys: ['servicio', 'mercado', 'market'], tab: 'market', label: 'Servicios' },
  { keys: ['empleo', 'trabajo', 'oferta', 'vacante'], tab: 'empleos', label: 'Empleos' },
  { keys: ['mensaje', 'chat', 'conversac'], tab: 'chat', label: 'Mensajes' },
  { keys: ['billetera', 'wallet', 'token', 'saldo', 'dinero', 'ganancia', 'plata'], tab: 'wallet', label: 'Billetera' },
  { keys: ['gobern', 'voto', 'arbitr', 'propuesta', 'camara', 'cámara'], tab: 'gobernanza', label: 'Gobernanza' },
  { keys: ['boveda', 'bóveda', 'vault', 'conocimiento', 'oraculo', 'oráculo'], tab: 'vault', label: 'Bóveda' },
];

const COACH_TRIGGERS = [
  'consejo', 'coach', 'recomienda', 'recomiénda', 'qué estudio', 'que estudio',
  'cómo mejoro', 'como mejoro', 'mi brecha', 'diagnóstico', 'diagnostico',
  'qué hago', 'que hago', 'oriénta', 'orienta', 'aconseja', 'guíame', 'guiame',
];

/** Interpreta una frase en lenguaje natural (español). */
export function interpret(raw: string): OraculoIntent {
  const q = (raw || '').toLowerCase().trim();
  if (!q) return { kind: 'unknown' };

  // Convalidar datos por voz (requiere un verbo de aporte + un objeto).
  if (/(convalida|valida|sube|aporta|suma|agrega|añade|anade|carga|registra)/.test(q)) {
    if (/(cv|curr[íi]culum)/.test(q)) return { kind: 'convalidate', item: 'cv' };
    if (/(t[íi]tulo|certificaci|grado|diploma)/.test(q)) return { kind: 'convalidate', item: 'title' };
    if (/(a[ñn]o|experiencia|trayectoria)/.test(q)) return { kind: 'convalidate', item: 'year' };
    if (/(b[óo]veda|conocimiento|mentor[íi]?a?|aporte)/.test(q)) return { kind: 'convalidate', item: 'vault' };
  }

  if (COACH_TRIGGERS.some((k) => q.includes(k))) return { kind: 'coach' };

  if (/(reputaci|confianz|qué tan bueno|que tan bueno)/.test(q)) return { kind: 'fact', topic: 'reputacion' };
  if (/(cuánt|cuant).*(token|saldo|plata|dinero)/.test(q)) return { kind: 'fact', topic: 'tokens' };
  if (/(punto|pe\b|experiencia)/.test(q)) return { kind: 'fact', topic: 'pe' };
  if (/(ayuda|qué puedo|que puedo|comando|quién eres|quien eres|hola)/.test(q)) return { kind: 'fact', topic: 'ayuda' };

  const nav = NAV.find((n) => n.keys.some((k) => q.includes(k)));
  if (nav) return { kind: 'navigate', tab: nav.tab, label: nav.label };

  return { kind: 'unknown' };
}

export interface CoachResult {
  advice?: string;
  error?: string;
}

export interface TutorResult {
  answer?: string;
  error?: string;
}

export interface CoachContext {
  skills?: string[];
  cv_summary?: string;
  execution?: number;
  quality?: number;
  transcendence?: number;
  foundation?: number;
  reputation?: number;
  pe?: number;
}

// ── Cliente OpenRouter directo (sin depender de Edge Functions) ────────
const OR_KEY = import.meta.env.VITE_OPENROUTER_KEY || '';
const OR_MODEL = 'google/gemma-4-31b-it:free';
const OR_FALLBACK = 'google/gemma-4-26b-a4b-it:free';
const OR_URL = 'https://openrouter.ai/api/v1/chat/completions';

async function callOpenRouter(messages: { role: string; content: string }[]): Promise<string> {
  if (!OR_KEY) throw new Error('Falta VITE_OPENROUTER_KEY');
  for (const model of [OR_MODEL, OR_FALLBACK]) {
    try {
      const resp = await fetch(OR_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OR_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://sistema-omicrom.vercel.app',
          'X-Title': 'Sistema Omicron',
        },
        body: JSON.stringify({ model, messages, max_tokens: 1024, temperature: 0.7 }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const text = data?.choices?.[0]?.message?.content ?? '';
      if (text) return text.trim();
    } catch { continue; }
  }
  throw new Error('OpenRouter no respondió');
}

/**
 * Pregunta libre a la IA — llama DIRECTO a OpenRouter desde el browser.
 * Ómicron la usa como cerebro conversacional general.
 */
export async function askTutor(question: string, ctx?: CoachContext): Promise<TutorResult> {
  try {
    const skillCtx = (ctx?.skills ?? []).length ? `\nSkills del usuario: ${ctx!.skills!.join(', ')}.` : '';
    const cvCtx = ctx?.cv_summary ? `\nResumen CV: ${ctx.cv_summary}` : '';
    const sys = 'Eres el Tutor IA de Ómicrom, cercano y paciente. Respondes dudas en español neutro-chileno, breve (máx 160 palabras). Si no sabes, dilo.' + skillCtx + cvCtx;
    const answer = await callOpenRouter([
      { role: 'system', content: sys },
      { role: 'user', content: question },
    ]);
    return { answer };
  } catch {
    return { error: 'No pude consultar la IA. Verifica tu conexión.' };
  }
}

/**
 * Consulta al Coach IA — llama DIRECTO a OpenRouter desde el browser.
 */
export async function askCoach(ctx?: CoachContext): Promise<CoachResult> {
  try {
    const profile = JSON.stringify({
      skills: ctx?.skills ?? [],
      cv_summary: ctx?.cv_summary ?? '',
      execution: ctx?.execution ?? 0,
      quality: ctx?.quality ?? 0,
      transcendence: ctx?.transcendence ?? 0,
      foundation: ctx?.foundation ?? 0,
      reputation: ctx?.reputation ?? 0,
      pe: ctx?.pe ?? 0,
    });
    const sys = 'Eres el Coach IA de Ómicrom, mentor de carrera. Te paso el perfil del usuario (Gemelo Digital con 4 ejes 0-100). ' +
      'Tu tarea: (1) DIAGNÓSTICO breve de fortalezas; (2) BRECHA principal (eje más débil); ' +
      '(3) RECOMENDACIÓN concreta; (4) mensaje motivador. Español neutro-chileno, máx 180 palabras.';
    const advice = await callOpenRouter([
      { role: 'system', content: sys },
      { role: 'user', content: 'PERFIL: ' + profile },
    ]);
    return { advice };
  } catch {
    return { error: 'No pude consultar la IA. Verifica tu conexión.' };
  }
}
