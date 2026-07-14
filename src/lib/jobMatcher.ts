// lib/jobMatcher.ts
// ═══════════════════════════════════════════════════════════════════════
// MOTOR DE MATCHING: Jobs + scoring basado en perfil del Gemelo.
// Calcula % de éxito (afinidad) entre el profesional y cada oportunidad.
// ═══════════════════════════════════════════════════════════════════════

import type { AnalyzedProfile } from './cvAnalyzer';
export { SKILL_LABELS } from './cvAnalyzer';

export interface Job {
  id: string;
  title: string;
  tag: string;
  type: 'empresa' | 'freelance' | 'mentoria';
  need: string[]; // skills requeridas
  creative: number; // 0-1 cuán creativo es el rol
  seniorMin: number; // nivel mínimo
  pay: string;
  desc: string;
}

export interface JobScore {
  job: Job;
  success: number; // % de éxito (34-98)
  match: number; // cantidad de skills que coinciden
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/**
 * Banco de trabajos (en producción vendría de Supabase).
 */
export const JOBS: Job[] = [
  {
    id: 'senior-frontend',
    title: 'Senior Frontend Developer',
    tag: 'React · TypeScript',
    type: 'empresa',
    need: ['react', 'typescript', 'frontend'],
    creative: 0.6,
    seniorMin: 4,
    pay: '3.200–4.800 Ω/mes',
    desc: 'Construye interfaces de producto a escala junto a un equipo senior. Alto match con tu stack principal.',
  },
  {
    id: 'tech-lead',
    title: 'Tech Lead / Arquitecto Frontend',
    tag: 'Liderazgo · Arquitectura',
    type: 'empresa',
    need: ['react', 'architecture', 'typescript'],
    creative: 0.5,
    seniorMin: 5,
    pay: '5.000–7.500 Ω/mes',
    desc: 'Lidera decisiones técnicas, define arquitectura y mentoriza. Requiere seniority y visión de sistema.',
  },
  {
    id: 'creative-tech',
    title: 'Creative Technologist',
    tag: 'Motion · 3D · WebGL',
    type: 'freelance',
    need: ['frontend', 'animation', '3d', 'design'],
    creative: 1.0,
    seniorMin: 3,
    pay: '120–200 Ω/hora',
    desc: 'Experiencias interactivas de altísimo impacto visual. Perfecto para un perfil de alta creatividad.',
  },
  {
    id: 'product-engineer',
    title: 'Freelance Product Engineer (0→1)',
    tag: 'MVP · Full-stack',
    type: 'freelance',
    need: ['react', 'node', 'product', 'frontend'],
    creative: 0.8,
    seniorMin: 3,
    pay: '90–160 Ω/hora',
    desc: 'Lleva productos de idea a lanzamiento con autonomía total. Ideal para creadores.',
  },
  {
    id: 'ui-engineer',
    title: 'UI Engineer · Design Systems',
    tag: 'Design Systems',
    type: 'empresa',
    need: ['frontend', 'design', 'react'],
    creative: 0.9,
    seniorMin: 3,
    pay: '3.600–5.400 Ω/mes',
    desc: 'El puente entre diseño e ingeniería: componentes, tokens y consistencia. Alta creatividad.',
  },
  {
    id: 'fullstack',
    title: 'Full-Stack Engineer',
    tag: 'React · Node',
    type: 'empresa',
    need: ['react', 'node', 'backend'],
    creative: 0.4,
    seniorMin: 2,
    pay: '3.400–5.200 Ω/mes',
    desc: 'Trabaja features completas de punta a punta, front y back.',
  },
  {
    id: 'mentor-senior',
    title: 'Mentor Senior de Frontend',
    tag: 'Enseñanza · 1:1',
    type: 'mentoria',
    need: ['react', 'teaching'],
    creative: 0.5,
    seniorMin: 4,
    pay: '70–120 Ω/sesión',
    desc: 'Convierte tu experiencia en ingreso recurrente enseñando a otros devs.',
  },
  {
    id: 'backend-eng',
    title: 'Backend Engineer',
    tag: 'Node · Python · APIs',
    type: 'empresa',
    need: ['node', 'python', 'backend', 'sql'],
    creative: 0.3,
    seniorMin: 2,
    pay: '3.400–5.000 Ω/mes',
    desc: 'Diseña servicios y APIs robustas y escalables.',
  },
  {
    id: 'trainee',
    title: 'Práctica profesional (Trainee)',
    tag: 'Primer paso real',
    type: 'empresa',
    need: ['frontend', 'javascript'],
    creative: 0.4,
    seniorMin: 1,
    pay: '800–1.400 Ω/mes',
    desc: 'Tu primera experiencia en un equipo, con acompañamiento y mentoría de seniors.',
  },
  {
    id: 'junior-frontend',
    title: 'Junior Frontend Developer',
    tag: 'React · Junior',
    type: 'empresa',
    need: ['react', 'frontend', 'javascript'],
    creative: 0.5,
    seniorMin: 1,
    pay: '1.500–2.600 Ω/mes',
    desc: 'Primer rol formal: construye interfaces reales con guía cercana.',
  },
  {
    id: 'bounty',
    title: 'Reto remunerado (Bounty)',
    tag: 'Tarea corta',
    type: 'freelance',
    need: ['frontend', 'javascript'],
    creative: 0.5,
    seniorMin: 1,
    pay: '40–90 Ω/reto',
    desc: 'Gana experiencia y tokens resolviendo retos acotados de código.',
  },
];

/**
 * Calcula el score de éxito (%) de un job para un perfil dado.
 * Toma en cuenta: skills match, seniority fit, creatividad fit, reputación.
 */
export function calculateJobScore(
  job: Job,
  profile: AnalyzedProfile,
  reputation: number
): JobScore {
  // 1. Match de skills: cuántas de las requeridas tiene el profesional
  const matchedSkills = job.need.filter((s) => profile.skills.includes(s));
  const skillRatio = job.need.length > 0 ? matchedSkills.length / job.need.length : 0;

  // 2. Fit de seniority: el profesional cumple el mínimo?
  const seniorityFit =
    profile.seniorLevel >= job.seniorMin
      ? 1
      : Math.max(0.3, profile.seniorLevel / (job.seniorMin || 1));

  // 3. Fit de creatividad: qué tan alineado está con el nivel creativo del rol
  const creativityFit = 1 - Math.abs(profile.creativity - job.creative) * 0.55;

  // 4. Bonus por reputación alta
  const repBonus = reputation / 100;

  // Score ponderado
  let score =
    skillRatio * 0.52 +
    seniorityFit * 0.24 +
    creativityFit * 0.14 +
    repBonus * 0.1;

  // Penalización si está sobre-calificado (3+ niveles arriba)
  const overqualified = profile.seniorLevel - job.seniorMin;
  if (overqualified >= 3) {
    score *= 0.45;
  }

  const success = clamp(Math.round(score * 100), 34, 98);

  return {
    job,
    success,
    match: matchedSkills.length,
  };
}

/**
 * Devuelve los N trabajos con mayor % de éxito para el perfil.
 */
export function getTopJobs(
  profile: AnalyzedProfile,
  reputation: number,
  limit = 3
): JobScore[] {
  return JOBS.map((job) => calculateJobScore(job, profile, reputation))
    .sort((a, b) => b.success - a.success)
    .slice(0, limit);
}

/**
 * Filtra trabajos por tipo.
 */
export function getJobsByType(
  type: Job['type'],
  profile: AnalyzedProfile,
  reputation: number
): JobScore[] {
  return JOBS.filter((j) => j.type === type)
    .map((job) => calculateJobScore(job, profile, reputation))
    .sort((a, b) => b.success - a.success);
}

/**
 * Skills que el profesional NO tiene (gaps de conocimiento).
 * Útil para sugerir qué aprender.
 */
export function getGapSkills(profile: AnalyzedProfile): string[] {
  const owned = profile.skills;
  const pool = [
    'typescript',
    'testing',
    'architecture',
    '3d',
    'node',
    'python',
    'design',
    'product',
    'devops',
  ];

  let gaps = pool.filter((s) => !owned.includes(s));

  // Asegurar al menos 3 gaps
  if (gaps.length < 3) {
    gaps = gaps.concat(
      ['architecture', 'testing', 'product'].filter((s) => !gaps.includes(s))
    );
  }

  return gaps.slice(0, 5);
}

/**
 * Etiqueta del tipo de trabajo.
 */
export function jobTypeLabel(type: Job['type']): string {
  if (type === 'empresa') return 'Contrato de empresa';
  if (type === 'freelance') return 'Freelance';
  if (type === 'mentoria') return 'Mentoría';
  return type;
}
