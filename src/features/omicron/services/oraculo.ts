// src/lib/oraculo.ts
// ═══════════════════════════════════════════════════════════════════════
// ÓMICROM · Oráculo — motor de intención (voz/texto → acción)
// Interpreta lo que el usuario dice y lo traduce a: navegar a un hub,
// responder un dato simple, o consultar al Coach IA (Edge Function `coach`,
// respaldada por Gemini). Puro TypeScript, sin dependencias nuevas.
// ═══════════════════════════════════════════════════════════════════════
import type { TabId } from '@/types';

export type OraculoIntent =
  | { kind: 'navigate'; tab: TabId; label: string }
  | { kind: 'coach' }
  | { kind: 'convalidate'; item: 'cv' | 'title' | 'year' | 'vault' }
  | { kind: 'fact'; topic: 'reputacion' | 'tokens' | 'pe' | 'ayuda' }
  | { kind: 'unknown' };

// Intenciones NATURALES: órdenes en lenguaje del fundador que deben aterrizar
// en el módulo REAL correcto (verificado contra el código, sin inventar
// pantallas). Se evalúan ANTES de NAV para que ganen sobre palabras genéricas
// (p. ej. "trabajo freelance / por proyecto" → market, no al empleos genérico
// de la palabra suelta "trabajo", porque es OFRECER tu servicio, no buscar
// vacante; "buscar empleo" sin freelance sigue cayendo en empleos vía NAV).
//   · jugar/reto/partida  → maxskill  (MaxSkillTab hospeda los retos:
//                                       DailyChallengeCard / SimulatorChallenge).
//   · vender/monetizar/servicio/freelance/proyecto → market
//                                       (MarketTab = Servicios: vender ideas,
//                                        servicios y trabajo freelance/por proyecto).
//   · ranking/posición/clasificación   → chat
//                                       (RedSocialTab tiene la sección "Ranking"
//                                        con el leaderboard de reputación).
const NAV_NATURAL: { keys: string[]; tab: TabId; label: string }[] = [
  { keys: ['jugar', 'juego', 'juega', 'reto', 'desaf', 'partida', 'simulad'], tab: 'maxskill', label: 'Habilidades' },
  { keys: ['ranking', 'posici', 'posición', 'clasificaci', 'tabla', 'leaderboard', 'top 10', 'top diez'], tab: 'chat', label: 'Mensajes' },
  { keys: ['vender', 'vende', 'monetiz', 'freelance', 'free lance', 'por proyecto', 'ofrecer un servicio', 'ofrecer servicio', 'ofrecer mi servicio'], tab: 'market', label: 'Servicios' },
];

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
  if (/(ayuda|qué puedo|que puedo|comando|quién eres|quien eres)/.test(q)) return { kind: 'fact', topic: 'ayuda' };

  // Órdenes naturales primero (específicas): "quiero jugar", "vender una idea",
  // "buscar freelance", "ver mi ranking". Ganan sobre las palabras genéricas.
  const natural = NAV_NATURAL.find((n) => n.keys.some((k) => q.includes(k)));
  if (natural) return { kind: 'navigate', tab: natural.tab, label: natural.label };

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

