// src/features/omicron/utils/nodeUnlock.ts
// ═══════════════════════════════════════════════════════════════════════
// Helper PURO de BLOQUEADO / DESBLOQUEADO de los nodos hub del orbe
// ("Matar el Escritorio" Inc 4).
//
// La red neuronal del orbe se ARMA con lo que la persona ya desbloqueó: los
// nodos desbloqueados se leen brillantes/conectados y los bloqueados se ven
// tenues/lejanos con una PISTA en cero jerga de cómo abrirlos ("Vender ideas
// se abre al llegar a Técnico").
//
// El desbloqueo se decide SOLO leyendo la reputación real de la persona
// (reputation_score 0..100, propiedad del servidor). Este cliente NUNCA
// escribe reputación ni PE: solo LEE. Los nombres de nivel (Estudiante /
// Técnico / Arquitecto) son una capa de PRESENTACIÓN del cliente, humana y
// sin jerga; no existen en el servidor y no reemplazan a los tiers por PE de
// guidance.ts (Operativo / Core / Arquitecto), que quedan intactos.
//
// Este módulo NO importa React, framer-motion, Supabase ni nada que toque
// window / matchMedia, así puede probarse con Vitest sin mocks (mismo criterio
// que homeStatus.ts). Opera solo sobre ids de nodo (string) y números, por lo
// que no necesita importar tipos del dominio.
// ═══════════════════════════════════════════════════════════════════════

// ── Bandas de nivel por reputación (escala completa 0..100) ──────────
// Estudiante 0-49 · Técnico 50-79 · Arquitecto 80-100. Nombres HUMANOS,
// self-explicativos, decididos por el fundador ("que se entienda").
export type LevelBand = 'Estudiante' | 'Técnico' | 'Arquitecto';

/** Umbral de reputación mínima (inclusivo) en el que empieza cada banda. */
export const LEVEL_THRESHOLDS: Record<LevelBand, number> = {
  Estudiante: 0,
  Técnico: 50,
  Arquitecto: 80,
};

/**
 * Devuelve la banda de nivel HUMANA para una reputación 0..100.
 * Determinista y sin efectos secundarios. Fuera de rango se normaliza a los
 * extremos (una reputación negativa cae en Estudiante; >100 en Arquitecto).
 */
export function levelBandFor(reputation: number): LevelBand {
  const rep = Number.isFinite(reputation) ? reputation : 0;
  if (rep >= LEVEL_THRESHOLDS.Arquitecto) return 'Arquitecto';
  if (rep >= LEVEL_THRESHOLDS.Técnico) return 'Técnico';
  return 'Estudiante';
}

// ── Mapa de compuertas por nodo hub ──────────────────────────────────
// CONSERVADOR a propósito: los nodos núcleo / de arranque quedan ABIERTOS
// desde Estudiante para que una persona recién llegada NUNCA quede varada
// (puede usar el corazón de la app de inmediato). Solo los nodos de mayor
// valor se abren más adelante. Ante la duda, un nodo se deja desbloqueado.
//
// Clave = id del nodo hub en OrbShell.HUB_NODES (no el TabId).
// Un id ausente de este mapa se considera DESBLOQUEADO (nunca varamos al
// usuario por un nodo nuevo que no gateamos explícitamente).
const NODE_GATE: Record<string, LevelBand> = {
  // Estudiante (0-49) — corazón de la app, siempre disponible:
  inicio: 'Estudiante', // Mi Gemelo (perfil)
  academia: 'Estudiante', // Academia
  habilidades: 'Estudiante', // Habilidades (maxskill)
  empleos: 'Estudiante', // Empleos
  mensajes: 'Estudiante', // Red Social (chat)
  billetera: 'Estudiante', // Billetera (wallet)
  // Técnico (50-79) — vender/monetizar y aportar conocimiento:
  mercado: 'Técnico', // Mercado / Servicios (vender ideas)
  boveda: 'Técnico', // Bóveda (aportes de conocimiento)
  // Arquitecto (80-100) — gobernar la red:
  gobernanza: 'Arquitecto', // Gobernanza
};

// ── Etiqueta humana de "qué se abre" por nodo (cero jerga) ────────────
// Frase corta y concreta de QUÉ es el nodo, en tuteo neutro LatAm.
const NODE_UNLOCK_NAME: Record<string, string> = {
  mercado: 'Vender tus ideas y servicios',
  boveda: 'Aportar a la Bóveda de conocimiento',
  gobernanza: 'Participar en la Gobernanza de la red',
};

/** Reputación mínima (escala completa) en que empieza una banda. */
function repFor(band: LevelBand): number {
  return LEVEL_THRESHOLDS[band];
}

/**
 * Pista de desbloqueo en CERO JERGA, con la escala completa N/100 y el nombre
 * humano del nivel. Ejemplo:
 *   "Vender tus ideas y servicios se abre al llegar a Técnico (reputación 50/100)."
 * Explica QUÉ hacer (subir reputación al nivel) y QUÉ GANA (la acción concreta).
 */
export function unlockHint(nodeId: string, band: LevelBand): string {
  const what = NODE_UNLOCK_NAME[nodeId];
  const rep = repFor(band);
  const subject = what ?? 'Este nodo';
  return `${subject} se abre al llegar a ${band} (reputación ${rep}/100).`;
}

// ── Resultado del gate por nodo ───────────────────────────────────────
export interface NodeUnlockState {
  /** true si la persona ya alcanzó la banda requerida por el nodo. */
  unlocked: boolean;
  /** Banda humana requerida por el nodo (Estudiante / Técnico / Arquitecto). */
  requiredBand: LevelBand;
  /** Pista cero-jerga de cómo abrirlo (null cuando ya está desbloqueado). */
  hint: string | null;
}

/**
 * Dado el id de un nodo hub y la reputación real de la persona (0..100),
 * devuelve si está desbloqueado y, si no, una pista cero-jerga de cómo abrirlo.
 *
 * ADITIVO por diseño: subir reputación solo abre MÁS nodos; nunca cierra lo
 * que ya estaba abierto. Determinista y sin efectos secundarios (unit-testable).
 * SOLO LEE reputación; jamás la escribe.
 *
 * @param nodeId  id del nodo hub (OrbShell.HUB_NODES[].id).
 * @param reputation  reputación real de la persona, escala completa 0..100.
 */
export function nodeUnlock(nodeId: string, reputation: number): NodeUnlockState {
  const requiredBand = NODE_GATE[nodeId] ?? 'Estudiante';
  const rep = Number.isFinite(reputation) ? reputation : 0;
  const unlocked = rep >= LEVEL_THRESHOLDS[requiredBand];
  return {
    unlocked,
    requiredBand,
    hint: unlocked ? null : unlockHint(nodeId, requiredBand),
  };
}
