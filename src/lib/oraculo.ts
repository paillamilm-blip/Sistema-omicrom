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

/**
 * Pregunta libre a la IA (Edge Function `tutor`, respaldada por Gemini).
 * Ómicron la usa como cerebro conversacional general. Degrada con gracia.
 */
export async function askTutor(question: string): Promise<TutorResult> {
  try {
    const { data, error } = await supabase.functions.invoke('tutor', { body: { question } });
    if (error) {
      return { error: 'No pude consultar al Tutor IA. ¿Está desplegada la función "tutor" y hay sesión activa?' };
    }
    if (data && (data as { error?: string }).error) {
      return { error: (data as { error: string }).error };
    }
    const answer = (data as { answer?: string })?.answer;
    return { answer: answer || 'No obtuve respuesta. Reformulá tu pregunta.' };
  } catch {
    return { error: 'Error inesperado al consultar al Tutor IA.' };
  }
}

/**
 * Consulta al Coach IA (Edge Function `coach`, respaldada por Gemini).
 * Degrada con gracia si la función no está desplegada o falla.
 */
export async function askCoach(): Promise<CoachResult> {
  try {
    const { data, error } = await supabase.functions.invoke('coach', { body: {} });
    if (error) {
      return { error: 'No pude consultar al Coach IA. ¿Está desplegada la función "coach" y hay sesión activa?' };
    }
    if (data && (data as { error?: string }).error) {
      return { error: (data as { error: string }).error };
    }
    const advice = (data as { advice?: string })?.advice;
    return { advice: advice || 'El Coach no devolvió respuesta. Inténtalo de nuevo.' };
  } catch {
    return { error: 'Error inesperado al consultar al Coach IA.' };
  }
}
