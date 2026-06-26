// config/nodes.ts
// ─────────────────────────────────────────────────────────────
// FUENTE ÚNICA DE VERDAD para la taxonomía de Nodos del Sistema Ómicron.
// Antes esta info estaba duplicada (y divergente) en WalletTab, PerfilTab,
// MarketTab y EditProfileModal. Centralizarla evita inconsistencias.
// ─────────────────────────────────────────────────────────────

import type { NodeType, NodeLevel } from '../types';

export interface NodeTier {
  type: NodeType;
  /** Umbral mínimo de PE para alcanzar el tier (por experiencia). */
  minPE: number;
  /** Umbral máximo de PE (null = sin tope, tier superior). */
  maxPE: number | null;
  /** Comisión de red aplicada a este tier (%). */
  commission: number;
  /** Clase Tailwind de color de texto. */
  colorClass: string;
  /** Clase Tailwind de borde. */
  borderClass: string;
}

/**
 * Tiers ganados por experiencia (PE).
 * Nota: 'Nodo Fundador' NO es un tier por PE — es un estatus asignado
 * (miembros fundadores / Pioneer), por eso vive fuera de esta escalera.
 */
export const NODE_TIERS: NodeTier[] = [
  { type: 'Nodo Operativo',  minPE: 0,    maxPE: 499,  commission: 15, colorClass: 'text-slate-400',      borderClass: 'border-slate-700' },
  { type: 'Nodo Core',       minPE: 500,  maxPE: 1999, commission: 10, colorClass: 'text-omicron-cyan',   borderClass: 'border-omicron-cyan/50' },
  { type: 'Nodo Arquitecto', minPE: 2000, maxPE: null, commission: 5,  colorClass: 'text-omicron-accent', borderClass: 'border-omicron-accent/50' },
];

/** Estatus especial (no se gana por PE). */
export const FOUNDER_TIER: Omit<NodeTier, 'minPE' | 'maxPE'> = {
  type: 'Nodo Fundador',
  commission: 10, // beneficio Pioneer vitalicio
  colorClass: 'text-omicron-gold',
  borderClass: 'border-omicron-gold/50',
};

/** Todos los tipos de nodo válidos (para selectores). */
export const NODE_TYPES: NodeType[] = [
  'Nodo Operativo',
  'Nodo Core',
  'Nodo Arquitecto',
  'Nodo Fundador',
];

/** Devuelve el tier correspondiente a una cantidad de PE. */
export function getNodeByPE(pe: number): NodeTier {
  if (pe >= 2000) return NODE_TIERS[2];
  if (pe >= 500) return NODE_TIERS[1];
  return NODE_TIERS[0];
}

/** Busca la metadata de un tipo de nodo (incluye Fundador). */
export function getNodeMeta(type: NodeType): NodeTier | Omit<NodeTier, 'minPE' | 'maxPE'> {
  return NODE_TIERS.find(t => t.type === type) ?? FOUNDER_TIER;
}

/** Formatea el nivel numérico para display: 1 -> "N1". */
export function formatNodeLevel(level: NodeLevel | number | null | undefined): string {
  return `N${level ?? 1}`;
}

/** Niveles disponibles (para selectores). */
export const NODE_LEVELS: NodeLevel[] = [1, 2, 3];
