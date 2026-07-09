/**
 * Tipos de dominio del Dashboard de Omicron.
 * Centralizados aquí para reutilizarse en componentes y capa de datos.
 */

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
}

/** Un "Nodo" representa el nivel/rango del usuario dentro de Omicron. */
export interface NodeLevel {
  /** Número de nodo actual (ej: 7). */
  current: number;
  /** Nombre descriptivo del nodo (ej: "Nodo Catalizador"). */
  name: string;
  /** Nombre del siguiente nodo a alcanzar. */
  nextName: string;
  /** Puntaje de experiencia acumulado. */
  experience: number;
  /** XP con el que inició el nodo actual. */
  currentThreshold: number;
  /** XP necesario para alcanzar el siguiente nodo. */
  nextThreshold: number;
}

/** Una habilidad medida en el mapa circular (radar). */
export interface Skill {
  label: string;
  /** Valor entre 0 y 100. */
  value: number;
}

export interface EarningsSummary {
  /** Ganancias del mes en curso. */
  amount: number;
  /** Variación porcentual respecto al mes anterior. */
  changePercent: number;
  currency: string;
  /** Serie de barras (últimos meses) para el mini-gráfico. */
  trend: number[];
}

export type OpportunityType = "proyecto" | "mentoria" | "curso";

export interface Opportunity {
  id: string;
  title: string;
  description: string;
  type: OpportunityType;
  /** Recompensa estimada en XP. */
  rewardXp: number;
  /** Pago estimado (opcional). */
  reward?: number;
  /** Compatibilidad con el perfil, 0-100. */
  match: number;
  tags: string[];
}

export interface DashboardData {
  user: UserProfile;
  node: NodeLevel;
  skills: Skill[];
  earnings: EarningsSummary;
  opportunities: Opportunity[];
}
