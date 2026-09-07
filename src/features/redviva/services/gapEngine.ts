// features/redviva/services/gapEngine.ts
// EL MOTOR DE BRECHAS — qué te falta, de verdad, para un empleo que existe.
//
// POR QUÉ EXISTE ESTE ARCHIVO:
// `matcher.ts` tiene getGapSkills(), que filtra un POOL FIJO de 9 strings
// ('typescript', 'testing', 'architecture', '3d', 'node', 'python', 'design',
// 'product', 'devops'). O sea: a un ingeniero industrial le informa que le falta
// "3d" y "devops". Además su array JOBS son 11 empleos hardcodeados de ejemplo.
// Eso no es entregar una oportunidad: es entregar una mentira precargada.
//
// Este motor calcula la brecha REAL: required_skills de los empleos publicados
// (tabla job_postings) menos las habilidades del perfil. Nada hardcodeado, nada
// inventado: si no hay empleos publicados, devuelve vacío y la app lo dice.
//
// 100 % puro: sin React, sin Supabase, sin acceso a red. Testeable de una.

// ══════════════════════════════════════════════════════════════════════
// TIPOS — fieles al esquema REAL de job_postings
// ══════════════════════════════════════════════════════════════════════
// OJO: src/types/jobs.ts declara `required_skills: Array<{node_id, min_level}>`,
// que nunca fue la forma real en la base (es jsonb de strings) y le faltan
// salary_range / company_name / external_url. Acá se modela lo que la base tiene
// de verdad, tolerando las tres formas en que puede llegar el jsonb.
export interface RealJob {
  id: string;
  title: string;
  /** jsonb en la base: puede llegar como array, como string JSON, o null. */
  required_skills?: string[] | string | null;
  /** Empleos internos (tokens). */
  budget_usd?: number | null;
  /** Empleos sincronizados de fuentes externas (texto libre). */
  salary_range?: string | null;
  company_name?: string | null;
  status?: string | null;
  external_url?: string | null;
  is_remote?: boolean | null;
  location?: string | null;
}

export interface JobGap {
  job: RealJob;
  /** Habilidades que el empleo pide (como las escribió quien publicó). */
  required: string[];
  /** Las que el usuario ya tiene (nombre del empleo, no del perfil). */
  have: string[];
  /** Las que le faltan. Esto es lo que nunca existió antes. */
  missing: string[];
  /** 0-100. Cuántas de las pedidas ya tiene. */
  matchPct: number;
  /** Texto de pago tal como se muestra (nunca reformateado). */
  payLabel: string | null;
  /** Valor numérico SOLO para ordenar. 0 si no se pudo determinar. */
  payValue: number;
}

export interface Jugada {
  /** La habilidad a probar, escrita como la pide el empleo. */
  skill: string;
  /** Empleos donde esta habilidad es lo ÚNICO que falta. */
  unlocks: JobGap[];
  /** Empleos donde aparece como faltante (aunque falten otras). */
  mentions: number;
  /** El empleo de mayor pago entre los que desbloquea (o menciona). */
  bestJob: JobGap;
  /** true si con solo probar esta habilidad ya queda un empleo completo. */
  isOneStep: boolean;
}

// ══════════════════════════════════════════════════════════════════════
// NORMALIZACIÓN
// ══════════════════════════════════════════════════════════════════════
/**
 * Normaliza un nombre de habilidad para comparar: minúsculas, sin acentos, sin
 * espacios de sobra. "Automatización" y "automatizacion" son la misma cosa.
 * No se toca el texto original: eso se conserva para mostrar.
 */
export function normalizeSkill(raw: string): string {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // quita diacríticos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿Estas dos habilidades son la misma? Igualdad exacta normalizada, o inclusión
 * parcial cuando el término es lo bastante largo para no producir falsos
 * positivos ("react" ⊃ "react native", pero "r" no matchea con todo).
 *
 * Espeja el criterio del servidor (run_matchmaking usa LIKE parcial en
 * 0072_job_matching_pipeline.sql) para que cliente y servidor no se contradigan.
 */
export function skillMatches(a: string, b: string): boolean {
  const x = normalizeSkill(a);
  const y = normalizeSkill(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const MIN = 4; // umbral anti-falso-positivo
  if (x.length >= MIN && y.includes(x)) return true;
  if (y.length >= MIN && x.includes(y)) return true;
  return false;
}

/**
 * Lee required_skills tolerando las 3 formas en que el jsonb puede llegar:
 * array real, string JSON (supabase-js a veces lo entrega así), o lista
 * separada por comas. Nunca lanza: si no se puede leer, devuelve [].
 */
export function parseRequiredSkills(job: Pick<RealJob, 'required_skills'>): string[] {
  const raw = job?.required_skills;
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((s) => String(s).trim()).filter(Boolean);
  }

  if (typeof raw === 'string') {
    const text = raw.trim();
    if (!text) return [];
    try {
      const parsed: unknown = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((s) => String(s).trim()).filter(Boolean);
      }
    } catch {
      // No era JSON: puede ser "excel, sap, autocad"
    }
    return text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  return [];
}

// ══════════════════════════════════════════════════════════════════════
// PAGO
// ══════════════════════════════════════════════════════════════════════
/**
 * Qué mostrar como pago. Prioriza salary_range (texto real de la fuente) y cae a
 * budget_usd, igual que hace EmpleosTab.tsx:316-319 — para que la Red Viva y la
 * pantalla de Empleos nunca muestren cifras distintas para el mismo empleo.
 * Devuelve null si el empleo no informa pago: no se inventa un rango.
 */
export function payLabelOf(job: RealJob): string | null {
  const range = job.salary_range?.trim();
  if (range) return range;
  if (typeof job.budget_usd === 'number' && job.budget_usd > 0) {
    return `${job.budget_usd.toLocaleString('es-CL')} tokens`;
  }
  return null;
}

/**
 * Valor numérico del pago, SOLO para ordenar oportunidades. Extrae el número más
 * grande del texto tolerando separadores ("3.200–4.800 Ω/mes" → 4800;
 * "$1.250.000" → 1250000). Nunca se muestra: lo que se muestra es payLabelOf().
 */
export function payValueOf(job: RealJob): number {
  const range = job.salary_range?.trim();
  if (range) {
    // Captura números con separadores de miles/decimales y se queda con el mayor.
    const found = range.match(/\d[\d.,]*/g);
    if (found?.length) {
      const values = found.map((token) => {
        // Quita separadores de miles (. o ,) conservando el orden de magnitud.
        const digits = token.replace(/[.,]/g, '');
        const n = Number(digits);
        return Number.isFinite(n) ? n : 0;
      });
      const max = Math.max(...values);
      if (max > 0) return max;
    }
  }
  if (typeof job.budget_usd === 'number' && job.budget_usd > 0) return job.budget_usd;
  return 0;
}

// ══════════════════════════════════════════════════════════════════════
// ANÁLISIS DE UN EMPLEO
// ══════════════════════════════════════════════════════════════════════
/**
 * Cruza un empleo real contra las habilidades del usuario y devuelve la brecha
 * con NOMBRES (lo que hoy no existe en ninguna parte del código).
 *
 * @param ownedSkills habilidades del usuario (declaradas y/o probadas)
 */
export function analyzeJob(job: RealJob, ownedSkills: string[]): JobGap {
  const required = parseRequiredSkills(job);
  const owned = (ownedSkills ?? []).filter(Boolean);

  const have: string[] = [];
  const missing: string[] = [];

  for (const req of required) {
    if (owned.some((mine) => skillMatches(mine, req))) have.push(req);
    else missing.push(req);
  }

  return {
    job,
    required,
    have,
    missing,
    matchPct: required.length === 0 ? 0 : Math.round((have.length / required.length) * 100),
    payLabel: payLabelOf(job),
    payValue: payValueOf(job),
  };
}

/**
 * Ordena las oportunidades por cercanía real: primero las que están a menos
 * habilidades de distancia; a igual distancia, la que paga más.
 *
 * Descarta los empleos que no declaran habilidades (no se puede medir una brecha
 * contra un empleo que no dice qué pide) y los que no están abiertos.
 */
export function rankOpportunities(
  jobs: RealJob[],
  ownedSkills: string[],
  options?: { limit?: number; maxMissing?: number },
): JobGap[] {
  const limit = options?.limit ?? 12;
  const maxMissing = options?.maxMissing ?? Number.POSITIVE_INFINITY;

  return (jobs ?? [])
    .filter((j) => !j.status || String(j.status).toUpperCase() === 'OPEN')
    .map((j) => analyzeJob(j, ownedSkills))
    .filter((g) => g.required.length > 0 && g.missing.length <= maxMissing)
    .sort((a, b) => {
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
      if (b.payValue !== a.payValue) return b.payValue - a.payValue;
      return b.matchPct - a.matchPct;
    })
    .slice(0, limit);
}

// ══════════════════════════════════════════════════════════════════════
// LA JUGADA — el corazón del producto
// ══════════════════════════════════════════════════════════════════════
/**
 * De todo lo que te falta, ¿cuál es LA habilidad que más conviene probar ahora?
 *
 * Criterio, en orden:
 *   1. Las que dejan un empleo COMPLETO (es lo único que falta). Poder decir
 *      "te falta solo esto para este empleo" es la frase más valiosa del sistema.
 *   2. Entre esas, la que desbloquea el empleo que paga más.
 *   3. Si ninguna deja un empleo completo, la que aparece pedida en más empleos.
 *
 * Devuelve null cuando no hay nada honesto que decir (sin empleos publicados, sin
 * habilidades pedidas, o el usuario ya cumple todo). La UI NUNCA debe rellenar
 * ese null con una sugerencia inventada.
 */
export function bestMove(jobs: RealJob[], ownedSkills: string[]): Jugada | null {
  const gaps = rankOpportunities(jobs, ownedSkills, { limit: Number.POSITIVE_INFINITY });
  if (gaps.length === 0) return null;

  // Agrupa por habilidad faltante (normalizada), conservando el nombre original.
  const bySkill = new Map<
    string,
    { label: string; unlocks: JobGap[]; mentions: JobGap[] }
  >();

  for (const gap of gaps) {
    if (gap.missing.length === 0) continue;
    for (const miss of gap.missing) {
      const key = normalizeSkill(miss);
      if (!key) continue;
      const entry = bySkill.get(key) ?? { label: miss, unlocks: [], mentions: [] };
      entry.mentions.push(gap);
      if (gap.missing.length === 1) entry.unlocks.push(gap);
      bySkill.set(key, entry);
    }
  }

  if (bySkill.size === 0) return null;

  const best = [...bySkill.values()]
    .map((entry) => {
      const pool = entry.unlocks.length > 0 ? entry.unlocks : entry.mentions;
      const bestJob = pool.reduce((top, g) => (g.payValue > top.payValue ? g : top), pool[0]);
      return {
        skill: entry.label,
        unlocks: entry.unlocks,
        mentions: entry.mentions.length,
        bestJob,
        isOneStep: entry.unlocks.length > 0,
      } satisfies Jugada;
    })
    .sort((a, b) => {
      if (a.isOneStep !== b.isOneStep) return a.isOneStep ? -1 : 1;
      if (b.unlocks.length !== a.unlocks.length) return b.unlocks.length - a.unlocks.length;
      if (b.bestJob.payValue !== a.bestJob.payValue) return b.bestJob.payValue - a.bestJob.payValue;
      return b.mentions - a.mentions;
    });

  return best[0] ?? null;
}

/**
 * Todas las habilidades que el mercado te está pidiendo y no tenés, ordenadas por
 * demanda real (en cuántos empleos aparece). Reemplaza a getGapSkills().
 */
export function marketGaps(
  jobs: RealJob[],
  ownedSkills: string[],
  limit = 8,
): { skill: string; jobs: number; oneStepJobs: number }[] {
  const gaps = rankOpportunities(jobs, ownedSkills, { limit: Number.POSITIVE_INFINITY });
  const counter = new Map<string, { label: string; jobs: number; oneStepJobs: number }>();

  for (const gap of gaps) {
    for (const miss of gap.missing) {
      const key = normalizeSkill(miss);
      if (!key) continue;
      const entry = counter.get(key) ?? { label: miss, jobs: 0, oneStepJobs: 0 };
      entry.jobs += 1;
      if (gap.missing.length === 1) entry.oneStepJobs += 1;
      counter.set(key, entry);
    }
  }

  return [...counter.values()]
    .sort((a, b) => b.oneStepJobs - a.oneStepJobs || b.jobs - a.jobs)
    .slice(0, limit)
    .map((e) => ({ skill: e.label, jobs: e.jobs, oneStepJobs: e.oneStepJobs }));
}
