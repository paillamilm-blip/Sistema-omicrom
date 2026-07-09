/**
 * Tipos de dominio de Omicron.
 * Centralizados aqui para reutilizarse en componentes y capa de datos.
 */

export interface UserProfile {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  role: string;
  location: string;
  bio: string;
  /** Fecha ISO de ingreso a la plataforma. */
  joinedAt: string;
  /** Racha de dias activos consecutivos. */
  streak: number;
}

/** Un "Nodo" representa el nivel/rango del usuario dentro de Omicron. */
export interface NodeLevel {
  /** Numero de nodo actual (ej: 7). */
  current: number;
  /** Nombre descriptivo del nodo (ej: "Nodo Catalizador"). */
  name: string;
  /** Nombre del siguiente nodo a alcanzar. */
  nextName: string;
  /** Puntaje de experiencia acumulado. */
  experience: number;
  /** XP con el que inicia el nodo actual. */
  currentThreshold: number;
  /** XP necesario para alcanzar el siguiente nodo. */
  nextThreshold: number;
}

/** Definicion de un nodo dentro de la progresion global. */
export interface NodeDefinition {
  index: number;
  name: string;
  threshold: number;
  description: string;
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
  /** Variacion porcentual respecto al mes anterior. */
  changePercent: number;
  currency: string;
  /** Serie de barras (ultimos meses) para el mini-grafico. */
  trend: number[];
  /** Desglose por fuente de ingreso. */
  breakdown: EarningsBreakdownItem[];
}

export interface EarningsBreakdownItem {
  source: string;
  amount: number;
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
  /** Organizacion o cliente que publica. */
  company: string;
  /** Modalidad de dedicacion (ej: "20h/semana"). */
  commitment: string;
  /** Ubicacion o "Remoto". */
  location: string;
  /** Fecha ISO limite de postulacion. */
  deadline: string;
  /** Requisitos detallados (solo en vista de detalle). */
  requirements: string[];
  /** Nivel de dificultad. */
  level: "junior" | "mid" | "senior";
}

/** Entrada del ranking / leaderboard de nodos. */
export interface RankingEntry {
  position: number;
  user: Pick<UserProfile, "id" | "name" | "handle" | "avatarUrl">;
  node: number;
  nodeName: string;
  experience: number;
  /** Cambio de posicion respecto al periodo anterior. */
  delta: number;
  /** Marca al usuario actual. */
  isCurrentUser?: boolean;
}

export type ActivityKind =
  | "xp"
  | "node_up"
  | "opportunity"
  | "achievement"
  | "earning";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  title: string;
  description: string;
  /** Fecha ISO. */
  timestamp: string;
  /** XP asociado (opcional). */
  xp?: number;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  /** Nombre de icono de lucide-react. */
  icon: string;
  unlocked: boolean;
  /** Fecha ISO de desbloqueo (si aplica). */
  unlockedAt?: string;
}

/** Metricas resumidas para las stat cards del dashboard. */
export interface StatCard {
  id: string;
  label: string;
  value: string;
  /** Variacion porcentual (opcional). */
  change?: number;
  /** Nombre de icono de lucide-react. */
  icon: string;
}

export interface DashboardData {
  user: UserProfile;
  node: NodeLevel;
  skills: Skill[];
  earnings: EarningsSummary;
  opportunities: Opportunity[];
  stats: StatCard[];
  activity: ActivityItem[];
}
