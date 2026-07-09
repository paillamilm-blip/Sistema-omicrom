import type { DashboardData } from "@/types";

/**
 * Datos de ejemplo para el Dashboard.
 * En producción, reemplazar por una llamada a la API / Supabase.
 */
export const dashboardData: DashboardData = {
  user: {
    id: "usr_001",
    name: "Matías Paillamil",
    handle: "@matias",
    avatarUrl: "https://i.pravatar.cc/160?img=13",
  },
  node: {
    current: 7,
    name: "Nodo Catalizador",
    nextName: "Nodo Arquitecto",
    experience: 12840,
    currentThreshold: 10000,
    nextThreshold: 16000,
  },
  skills: [
    { label: "Frontend", value: 88 },
    { label: "Backend", value: 72 },
    { label: "Diseño", value: 64 },
    { label: "Producto", value: 79 },
    { label: "Datos", value: 58 },
    { label: "Liderazgo", value: 70 },
  ],
  earnings: {
    amount: 4820,
    changePercent: 18.4,
    currency: "USD",
    trend: [1200, 1850, 1600, 2400, 2100, 3200, 4820],
  },
  opportunities: [
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
    },
  ],
};
