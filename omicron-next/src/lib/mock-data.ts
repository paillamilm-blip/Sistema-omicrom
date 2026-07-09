import type {
  Achievement,
  ActivityItem,
  DashboardData,
  NodeDefinition,
  Opportunity,
  RankingEntry,
  Skill,
  UserProfile,
} from "@/types";

/**
 * Datos de ejemplo para toda la app.
 * En produccion, la capa src/lib/data reemplaza estos datos por consultas
 * a Supabase cuando hay credenciales configuradas.
 */

export const mockUser: UserProfile = {
  id: "usr_001",
  name: "Matías Paillamil",
  handle: "@matias",
  avatarUrl: "https://i.pravatar.cc/160?img=13",
  role: "Full Stack Developer",
  location: "Santiago, Chile",
  bio: "Construyo productos web con foco en experiencia de usuario y arquitectura escalable. Aprendiendo cada nodo.",
  joinedAt: "2024-02-11T00:00:00.000Z",
  streak: 23,
};

/** Progresion global de nodos (rangos) de Omicron. */
export const nodeProgression: NodeDefinition[] = [
  {
    index: 1,
    name: "Nodo Origen",
    threshold: 0,
    description: "El punto de partida.",
  },
  {
    index: 2,
    name: "Nodo Aprendiz",
    threshold: 500,
    description: "Primeros pasos con soltura.",
  },
  {
    index: 3,
    name: "Nodo Explorador",
    threshold: 1500,
    description: "Amplias tu radio de accion.",
  },
  {
    index: 4,
    name: "Nodo Constructor",
    threshold: 3000,
    description: "Entregas valor de forma consistente.",
  },
  {
    index: 5,
    name: "Nodo Conector",
    threshold: 5000,
    description: "Colaboras y multiplicas impacto.",
  },
  {
    index: 6,
    name: "Nodo Estratega",
    threshold: 7500,
    description: "Piensas en sistemas, no en tareas.",
  },
  {
    index: 7,
    name: "Nodo Catalizador",
    threshold: 10000,
    description: "Aceleras equipos y proyectos.",
  },
  {
    index: 8,
    name: "Nodo Arquitecto",
    threshold: 16000,
    description: "Disenas a gran escala.",
  },
  {
    index: 9,
    name: "Nodo Referente",
    threshold: 24000,
    description: "Marcas el estandar.",
  },
  {
    index: 10,
    name: "Nodo Omicron",
    threshold: 40000,
    description: "Maestria total.",
  },
];

export const mockSkills: Skill[] = [
  { label: "Frontend", value: 88 },
  { label: "Backend", value: 72 },
  { label: "Diseño", value: 64 },
  { label: "Producto", value: 79 },
  { label: "Datos", value: 58 },
  { label: "Liderazgo", value: 70 },
];

export const mockOpportunities: Opportunity[] = [
  {
    id: "opp_01",
    title: "Rediseño de panel analítico",
    description:
      "Startup fintech busca refactorizar su dashboard con Next.js y visualizaciones en tiempo real.",
    type: "proyecto",
    rewardXp: 1500,
    reward: 2200,
    match: 94,
    tags: ["Next.js", "TypeScript", "Charts"],
    company: "Fluxo Finance",
    commitment: "20h/semana",
    location: "Remoto",
    deadline: "2026-08-15T00:00:00.000Z",
    level: "senior",
    requirements: [
      "Experiencia sólida con Next.js (App Router) y TypeScript.",
      "Manejo de librerías de visualización (Recharts, D3 o similar).",
      "Buenas prácticas de accesibilidad y rendimiento.",
    ],
  },
  {
    id: "opp_02",
    title: "Mentoría: Arquitectura de microservicios",
    description:
      "Acompaña a un equipo junior en el diseño de una arquitectura escalable orientada a eventos.",
    type: "mentoria",
    rewardXp: 900,
    reward: 600,
    match: 87,
    tags: ["Arquitectura", "Node.js", "Mentoring"],
    company: "Nébula Labs",
    commitment: "4h/semana",
    location: "Remoto",
    deadline: "2026-07-30T00:00:00.000Z",
    level: "senior",
    requirements: [
      "Experiencia liderando diseño de sistemas distribuidos.",
      "Comunicación clara y empatía para mentorear.",
      "Conocimiento de colas de mensajes y patrones event-driven.",
    ],
  },
  {
    id: "opp_03",
    title: "Curso: Diseño de sistemas a escala",
    description:
      "Completa el track avanzado y desbloquea el siguiente nodo con un proyecto final evaluado.",
    type: "curso",
    rewardXp: 1200,
    match: 81,
    tags: ["System Design", "Caching", "Colas"],
    company: "Omicron Academy",
    commitment: "Autoguiado",
    location: "Online",
    deadline: "2026-09-01T00:00:00.000Z",
    level: "mid",
    requirements: [
      "Bases de backend y bases de datos.",
      "Disposición para un proyecto final evaluado.",
    ],
  },
  {
    id: "opp_04",
    title: "Feature de colaboración en tiempo real",
    description:
      "Implementa edición colaborativa con CRDTs para una herramienta de documentación.",
    type: "proyecto",
    rewardXp: 1800,
    reward: 3100,
    match: 76,
    tags: ["WebSockets", "CRDT", "React"],
    company: "Docly",
    commitment: "30h/semana",
    location: "Híbrido · Santiago",
    deadline: "2026-08-05T00:00:00.000Z",
    level: "senior",
    requirements: [
      "Experiencia con sincronización en tiempo real.",
      "Familiaridad con CRDTs o OT.",
    ],
  },
  {
    id: "opp_05",
    title: "Mentoría: Primeros pasos en TypeScript",
    description:
      "Guía a nuevos desarrolladores en el paso de JavaScript a TypeScript con buenas prácticas.",
    type: "mentoria",
    rewardXp: 700,
    reward: 400,
    match: 90,
    tags: ["TypeScript", "Mentoring", "Fundamentos"],
    company: "Codemos",
    commitment: "3h/semana",
    location: "Remoto",
    deadline: "2026-07-20T00:00:00.000Z",
    level: "mid",
    requirements: ["Dominio de TypeScript.", "Paciencia y didáctica."],
  },
  {
    id: "opp_06",
    title: "Curso: Testing moderno en React",
    description:
      "Aprende testing con Vitest, Testing Library y estrategias de cobertura efectiva.",
    type: "curso",
    rewardXp: 1000,
    match: 84,
    tags: ["Testing", "Vitest", "React"],
    company: "Omicron Academy",
    commitment: "Autoguiado",
    location: "Online",
    deadline: "2026-09-15T00:00:00.000Z",
    level: "junior",
    requirements: ["Conocimientos básicos de React."],
  },
];

export const mockActivity: ActivityItem[] = [
  {
    id: "act_01",
    kind: "xp",
    title: "Ganaste 320 XP",
    description: "Completaste la tarea 'Refactor de autenticación'.",
    timestamp: "2026-07-08T18:20:00.000Z",
    xp: 320,
  },
  {
    id: "act_02",
    kind: "achievement",
    title: "Insignia desbloqueada",
    description: "‘Racha de 3 semanas’ por tu constancia.",
    timestamp: "2026-07-08T09:05:00.000Z",
  },
  {
    id: "act_03",
    kind: "opportunity",
    title: "Postulación aceptada",
    description: "Fuiste seleccionado para 'Rediseño de panel analítico'.",
    timestamp: "2026-07-07T15:40:00.000Z",
  },
  {
    id: "act_04",
    kind: "earning",
    title: "Pago recibido",
    description: "USD 1.200 por el proyecto 'Landing Nébula'.",
    timestamp: "2026-07-06T12:00:00.000Z",
  },
  {
    id: "act_05",
    kind: "node_up",
    title: "¡Subiste al Nodo 7!",
    description: "Alcanzaste el Nodo Catalizador.",
    timestamp: "2026-07-01T20:15:00.000Z",
  },
];

export const mockAchievements: Achievement[] = [
  {
    id: "ach_01",
    title: "Primer proyecto",
    description: "Completaste tu primer proyecto en Omicron.",
    icon: "Rocket",
    unlocked: true,
    unlockedAt: "2024-03-02T00:00:00.000Z",
  },
  {
    id: "ach_02",
    title: "Racha de 3 semanas",
    description: "21 días activos consecutivos.",
    icon: "Flame",
    unlocked: true,
    unlockedAt: "2026-07-08T00:00:00.000Z",
  },
  {
    id: "ach_03",
    title: "Mentor",
    description: "Guiaste a otro miembro de la comunidad.",
    icon: "Users",
    unlocked: true,
    unlockedAt: "2025-11-19T00:00:00.000Z",
  },
  {
    id: "ach_04",
    title: "10.000 XP",
    description: "Superaste la barrera de los 10k de experiencia.",
    icon: "Zap",
    unlocked: true,
    unlockedAt: "2026-07-01T00:00:00.000Z",
  },
  {
    id: "ach_05",
    title: "Arquitecto",
    description: "Alcanza el Nodo 8 para desbloquear.",
    icon: "Building2",
    unlocked: false,
  },
  {
    id: "ach_06",
    title: "Top 10 del ranking",
    description: "Entra al top 10 global.",
    icon: "Trophy",
    unlocked: false,
  },
];

export const mockRanking: RankingEntry[] = [
  {
    position: 1,
    user: {
      id: "u_a",
      name: "Valentina Rojas",
      handle: "@vale",
      avatarUrl: "https://i.pravatar.cc/80?img=47",
    },
    node: 9,
    nodeName: "Nodo Referente",
    experience: 28450,
    delta: 0,
  },
  {
    position: 2,
    user: {
      id: "u_b",
      name: "Diego Fuentes",
      handle: "@dfuentes",
      avatarUrl: "https://i.pravatar.cc/80?img=12",
    },
    node: 9,
    nodeName: "Nodo Referente",
    experience: 25120,
    delta: 1,
  },
  {
    position: 3,
    user: {
      id: "u_c",
      name: "Camila Soto",
      handle: "@camisoto",
      avatarUrl: "https://i.pravatar.cc/80?img=32",
    },
    node: 8,
    nodeName: "Nodo Arquitecto",
    experience: 21980,
    delta: -1,
  },
  {
    position: 4,
    user: {
      id: "u_d",
      name: "Ignacio Bravo",
      handle: "@nachob",
      avatarUrl: "https://i.pravatar.cc/80?img=15",
    },
    node: 8,
    nodeName: "Nodo Arquitecto",
    experience: 18740,
    delta: 2,
  },
  {
    position: 5,
    user: {
      id: "usr_001",
      name: "Matías Paillamil",
      handle: "@matias",
      avatarUrl: "https://i.pravatar.cc/160?img=13",
    },
    node: 7,
    nodeName: "Nodo Catalizador",
    experience: 12840,
    delta: 3,
    isCurrentUser: true,
  },
  {
    position: 6,
    user: {
      id: "u_f",
      name: "Fernanda Lagos",
      handle: "@ferl",
      avatarUrl: "https://i.pravatar.cc/80?img=45",
    },
    node: 7,
    nodeName: "Nodo Catalizador",
    experience: 11200,
    delta: -2,
  },
  {
    position: 7,
    user: {
      id: "u_g",
      name: "Tomás Herrera",
      handle: "@therrera",
      avatarUrl: "https://i.pravatar.cc/80?img=8",
    },
    node: 6,
    nodeName: "Nodo Estratega",
    experience: 9320,
    delta: 0,
  },
  {
    position: 8,
    user: {
      id: "u_h",
      name: "Josefa Núñez",
      handle: "@josefa",
      avatarUrl: "https://i.pravatar.cc/80?img=41",
    },
    node: 6,
    nodeName: "Nodo Estratega",
    experience: 8010,
    delta: 1,
  },
];

/**
 * Construye el objeto de datos del dashboard a partir de las piezas mock.
 */
export function buildMockDashboard(): DashboardData {
  return {
    user: mockUser,
    node: {
      current: 7,
      name: "Nodo Catalizador",
      nextName: "Nodo Arquitecto",
      experience: 12840,
      currentThreshold: 10000,
      nextThreshold: 16000,
    },
    skills: mockSkills,
    earnings: {
      amount: 4820,
      changePercent: 18.4,
      currency: "USD",
      trend: [1200, 1850, 1600, 2400, 2100, 3200, 4820],
      breakdown: [
        { source: "Proyectos", amount: 3100 },
        { source: "Mentorías", amount: 1120 },
        { source: "Bonos", amount: 600 },
      ],
    },
    opportunities: mockOpportunities.slice(0, 3),
    stats: [
      {
        id: "s1",
        label: "XP este mes",
        value: "3.480",
        change: 24.5,
        icon: "Zap",
      },
      {
        id: "s2",
        label: "Proyectos activos",
        value: "3",
        change: 0,
        icon: "Briefcase",
      },
      { id: "s3", label: "Racha", value: "23 días", change: 15, icon: "Flame" },
      { id: "s4", label: "Ranking", value: "#5", change: 3, icon: "Trophy" },
    ],
    activity: mockActivity,
  };
}
