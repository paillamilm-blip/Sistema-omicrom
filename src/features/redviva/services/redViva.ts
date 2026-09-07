// features/redviva/services/redViva.ts
// EL MODELO DE LA RED VIVA — el CV convertido en tablero de recompensas.
//
// LA TESIS: cada cosa que tu CV afirma sin probar es un nodo HUECO. Cada nodo
// hueco tiene una recompensa real esperando a que la pruebes. Esta pantalla es el
// mapa de esa plata.
//
// LA GEOMETRÍA TIENE SIGNIFICADO (no es decoración). Cuatro anillos:
//   • CENTRO      → vos (tu reputación).
//   • NÚCLEO      → lo que PROBASTE. Nodos sólidos, cerca del centro.
//   • FRONTERA    → lo que DECLARASTE y nadie comprobó. Nodos huecos.
//   • AUSENTES    → lo que el mercado PAGA y no tenés. Nodos fantasma, afuera.
//   • MÁS ALLÁ    → oportunidades reales, unidas por línea punteada a la
//                   habilidad que hay que conseguir para alcanzarlas.
// Crecer = ver un nodo viajar hacia adentro: ausente → hueco → sólido. Eso es
// "la red que crece" con un significado verificable detrás de cada píxel.
//
// POR QUÉ EL ORBE ANTERIOR NO SE ENTENDÍA (y qué se corrige acá):
//   1. Sus puntos brillantes eran vértices de un icosaedro de Three.js: ninguno
//      era una habilidad. Acá cada nodo ES un dato con nombre.
//   2. Sus etiquetas flotaban en posiciones Fibonacci DISTINTAS de los puntos
//      dibujados. Acá etiqueta y nodo comparten una sola coordenada.
//   3. Sus posiciones se recalculaban con la cantidad de nodos, así que el mapa
//      se reordenaba al crecer el perfil. Acá el orden es DETERMINISTA por
//      nombre: una habilidad nueva se inserta sin mover a las demás de anillo.
//
// 100 % puro: sin React, sin Supabase, sin acceso a red.

import {
  bestMove,
  marketGaps,
  normalizeSkill,
  rankOpportunities,
  type Jugada,
  type RealJob,
} from './gapEngine';

// ══════════════════════════════════════════════════════════════════════
// TIPOS
// ══════════════════════════════════════════════════════════════════════

/**
 * Los estados de un nodo. Ver .tasks/red-viva-plan.md §2.
 *   'solido'   → probado (existe prueba registrada). Es TUYO y está demostrado.
 *   'latiendo' → lo estás probando ahora mismo.
 *   'hueco'    → lo declaraste en el CV y nadie lo comprobó. Es TUYO sin respaldo.
 *   'ausente'  → NO es tuyo: el mercado lo pide y no lo tenés. Es la pieza que
 *                falta para alcanzar una oportunidad concreta.
 */
export type EstadoNodo = 'hueco' | 'latiendo' | 'solido' | 'ausente';

/** Fila de public.omicron_skill_proofs (migración 10001). */
export interface SkillProof {
  skill_key: string;
  skill_label: string;
  /** null = probada sin score registrado (prueba histórica). NO se inventa. */
  best_score: number | null;
  proofs_count?: number;
  tokens_earned?: number;
  last_proven_at?: string | null;
}

/** Habilidad declarada, tal como vive en profiles.skills_detail. */
export interface SkillDeclarada {
  name: string;
  pct: number;
}

export interface NodoRed {
  /** Clave normalizada, estable. Sirve de key de React y de identidad. */
  id: string;
  /** Cómo se muestra (respeta cómo lo escribió el CV o el empleo). */
  label: string;
  estado: EstadoNodo;
  /** Lo que AFIRMA el CV (0-100). null si la habilidad no vino del CV. */
  declaredPct: number | null;
  /** Score real de la prueba (0-100). null = probada sin score registrado. */
  provenScore: number | null;
  /** Tokens que esta habilidad ya te pagó del Fondo. */
  tokensEarned: number;
  /** En cuántos empleos abiertos la piden. 0 = el mercado no la pide hoy. */
  demand: number;
  /** Empleos donde esta habilidad es lo ÚNICO que falta. */
  unlocks: number;
  /** Posición en el círculo unitario (-1..1). Determinista. */
  x: number;
  y: number;
  /** Radio relativo (0..1) — proporcional a la afirmación, la prueba o la demanda. */
  r: number;
  /** 0 = núcleo (probado), 1 = frontera (declarado), 2 = ausente (lo pide el mercado). */
  anillo: 0 | 1 | 2;
}

export interface NodoOportunidad {
  id: string;
  label: string;
  payLabel: string | null;
  /** Habilidades que faltan para alcanzarla. */
  missing: string[];
  /** 0-100 */
  matchPct: number;
  x: number;
  y: number;
}

export interface AristaRed {
  from: string;
  to: string;
  /** 'radio' = del centro al nodo. 'mercado' = habilidades pedidas juntas.
   *  'puente' = de una habilidad hueca a la oportunidad que desbloquea. */
  tipo: 'radio' | 'mercado' | 'puente';
  /** Punteada = todavía no es real (el puente aún no se cruzó). */
  punteada: boolean;
}

export interface RedVivaModel {
  nodos: NodoRed[];
  oportunidades: NodoOportunidad[];
  aristas: AristaRed[];
  totales: {
    /** Habilidades TUYAS (declaradas ∪ probadas). No incluye las ausentes. */
    declaradas: number;
    probadas: number;
    /** 0-100. El 20/80 hecho número: cuánto de lo que afirmás está probado. */
    pctProbado: number;
    tokensGanados: number;
    /** Piezas que el mercado pide y no tenés (nodos fantasma en pantalla). */
    ausentes: number;
  };
  /** La única jugada recomendada. null = no hay nada honesto que sugerir. */
  jugada: Jugada | null;
  /** Habilidades que el mercado pide y no tenés (reemplaza getGapSkills). */
  brechas: { skill: string; jobs: number; oneStepJobs: number }[];
  /** true = no hay ni una habilidad: la pantalla debe invitar a subir el CV. */
  vacia: boolean;
}

export interface BuildRedVivaInput {
  /** profiles.skills_detail */
  skillsDetail?: SkillDeclarada[] | null;
  /** profiles.skills — respaldo cuando no hay skills_detail */
  skills?: string[] | null;
  /** Filas de omicron_skill_proofs. [] si el RPC no está aplicado todavía. */
  proofs?: SkillProof[] | null;
  /** Empleos abiertos reales (job_postings). */
  jobs?: RealJob[] | null;
  /** Habilidades con una prueba EN CURSO ahora mismo (estado latiendo). */
  enCurso?: string[] | null;
}

// ══════════════════════════════════════════════════════════════════════
// LAYOUT DETERMINISTA
// ══════════════════════════════════════════════════════════════════════
/**
 * Hash estable de un string → 0..1. Se usa para desordenar el ángulo de forma
 * REPRODUCIBLE: la misma habilidad cae siempre en el mismo lugar, en cualquier
 * dispositivo y después de cualquier recarga.
 *
 * Es un FNV-1a de 32 bits: barato, sin dependencias y con buena dispersión.
 */
export function hash01(text: string): number {
  let h = 0x811c9dc5;
  const s = normalizeSkill(text);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  // >>> 0 para volver a un entero sin signo antes de normalizar
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Reparte N elementos en un anillo. El ángulo base es uniforme (para que nunca
 * se apiñen) y el hash solo aporta un jitter acotado, así que:
 *   • no hay superposición aunque haya muchos nodos,
 *   • agregar un nodo NO reordena los demás de forma caótica.
 */
function ringPosition(
  index: number,
  total: number,
  radius: number,
  seed: string,
): { x: number; y: number } {
  const step = total > 0 ? (Math.PI * 2) / total : 0;
  const jitter = (hash01(seed) - 0.5) * step * 0.42;
  // -Math.PI/2 arranca arriba (12 en punto), que se lee mejor.
  const angle = -Math.PI / 2 + index * step + jitter;
  const rr = radius * (0.94 + hash01(seed + '·r') * 0.12);
  return { x: Math.cos(angle) * rr, y: Math.sin(angle) * rr };
}

// ══════════════════════════════════════════════════════════════════════
// CONSTRUCCIÓN DEL MODELO
// ══════════════════════════════════════════════════════════════════════

const RADIO_NUCLEO = 0.36;
const RADIO_FRONTERA = 0.66;
const RADIO_AUSENTE = 0.92;
const RADIO_OPORTUNIDAD = 1.34;

/** Cuántas piezas faltantes se dibujan. Más que esto es ruido, no información. */
const MAX_AUSENTES = 6;

/**
 * Construye la red completa desde datos reales.
 *
 * REGLA DE INTEGRIDAD (no negociable, heredada de la Credencial): un nodo se
 * pinta SÓLIDO únicamente si existe una prueba registrada. Un pct alto del CV
 * sin prueba se dibuja como un HUECO GRANDE — que es exactamente la verdad:
 * "afirmás mucho y todavía no lo demostraste". Nunca se deduce "probado" de un
 * porcentaje.
 */
export function buildRedViva(input: BuildRedVivaInput): RedVivaModel {
  const jobs = input.jobs ?? [];

  // ── 1. Universo de habilidades: declaradas (CV) ∪ probadas ────────────
  const declaradas = new Map<string, SkillDeclarada>();

  for (const s of input.skillsDetail ?? []) {
    const key = normalizeSkill(s?.name ?? '');
    if (!key) continue;
    const pct = Number(s?.pct);
    declaradas.set(key, {
      name: String(s.name).trim(),
      pct: Number.isFinite(pct) ? Math.max(0, Math.min(100, pct)) : 0,
    });
  }

  // Respaldo: si no hay skills_detail, se usa skills[] SIN inventar un pct.
  if (declaradas.size === 0) {
    for (const raw of input.skills ?? []) {
      const key = normalizeSkill(raw ?? '');
      if (!key) continue;
      declaradas.set(key, { name: String(raw).trim(), pct: 0 });
    }
  }

  const pruebas = new Map<string, SkillProof>();
  for (const p of input.proofs ?? []) {
    const key = normalizeSkill(p?.skill_key || p?.skill_label || '');
    if (!key) continue;
    pruebas.set(key, p);
  }

  const enCurso = new Set(
    (input.enCurso ?? []).map((s) => normalizeSkill(s)).filter(Boolean),
  );

  // ── 2. Demanda real del mercado, por habilidad ────────────────────────
  const ownedLabels = [
    ...[...declaradas.values()].map((d) => d.name),
    ...[...pruebas.values()].map((p) => p.skill_label),
  ];

  const gapsRanked = rankOpportunities(jobs, ownedLabels, {
    limit: Number.POSITIVE_INFINITY,
  });

  const demanda = new Map<string, number>();
  for (const gap of gapsRanked) {
    for (const req of gap.required) {
      const key = normalizeSkill(req);
      if (key) demanda.set(key, (demanda.get(key) ?? 0) + 1);
    }
  }

  const unlocksPorSkill = new Map<string, number>();
  for (const gap of gapsRanked) {
    if (gap.missing.length !== 1) continue;
    const key = normalizeSkill(gap.missing[0]);
    if (key) unlocksPorSkill.set(key, (unlocksPorSkill.get(key) ?? 0) + 1);
  }

  // ── 3. Oportunidades cercanas (se calculan antes de los nodos porque las
  //       piezas que faltan para alcanzarlas TAMBIÉN son nodos) ─────────────
  const cercanas = gapsRanked.filter((g) => g.missing.length > 0).slice(0, 3);

  const oportunidades: NodoOportunidad[] = cercanas.map((gap, i) => {
    const { x, y } = ringPosition(
      i,
      Math.max(cercanas.length, 3),
      RADIO_OPORTUNIDAD,
      gap.job.id,
    );
    return {
      id: gap.job.id,
      label: gap.job.title,
      payLabel: gap.payLabel,
      missing: gap.missing,
      matchPct: gap.matchPct,
      x,
      y,
    };
  });

  // ── 4. Nodos, ordenados de forma ESTABLE (alfabético normalizado) ─────
  const todasLasClaves = [...new Set([...declaradas.keys(), ...pruebas.keys()])].sort();

  const solidasKeys: string[] = [];
  const huecasKeys: string[] = [];

  for (const key of todasLasClaves) {
    if (pruebas.has(key)) solidasKeys.push(key);
    else huecasKeys.push(key);
  }

  // Piezas AUSENTES: lo que hace falta para alcanzar las oportunidades cercanas
  // y no está ni declarado ni probado. Sin estos nodos, el puente hacia el
  // empleo no tendría de dónde salir — y el puente es el producto.
  const jugada = bestMove(jobs, ownedLabels);
  const ausentesLabels = new Map<string, string>();

  for (const op of oportunidades) {
    for (const miss of op.missing) {
      const key = normalizeSkill(miss);
      if (!key || declaradas.has(key) || pruebas.has(key)) continue;
      if (!ausentesLabels.has(key)) ausentesLabels.set(key, String(miss).trim());
    }
  }

  const ausentesKeys = [...ausentesLabels.keys()]
    .sort((a, b) => {
      // La jugada recomendada va primero: siempre tiene que estar en pantalla.
      if (jugada) {
        const jk = normalizeSkill(jugada.skill);
        if (a === jk) return -1;
        if (b === jk) return 1;
      }
      const da = demanda.get(a) ?? 0;
      const db = demanda.get(b) ?? 0;
      return db - da || a.localeCompare(b);
    })
    .slice(0, MAX_AUSENTES);

  const nodos: NodoRed[] = [];

  const empujar = (key: string, anillo: 0 | 1 | 2, index: number, total: number) => {
    const decl = declaradas.get(key);
    const proof = pruebas.get(key);
    const demand = demanda.get(key) ?? 0;
    const unlocks = unlocksPorSkill.get(key) ?? 0;

    let estado: EstadoNodo;
    let label: string;
    let base: number;
    let radio: number;

    if (anillo === 2) {
      // AUSENTE: no es tuyo. El tamaño lo pone el MERCADO (cuánto la pide),
      // porque no hay ni afirmación ni prueba que medir.
      estado = 'ausente';
      label = ausentesLabels.get(key) ?? key;
      base = Math.min(100, 34 + demand * 22);
      radio = RADIO_AUSENTE;
    } else {
      label = proof?.skill_label?.trim() || decl?.name || key;
      estado = proof ? 'solido' : enCurso.has(key) ? 'latiendo' : 'hueco';
      // El tamaño dice algo verdadero:
      //  • sólido → qué tan bien lo probaste (o base si no hay score registrado)
      //  • hueco  → qué tan fuerte es la AFIRMACIÓN sin respaldo
      base = anillo === 0 ? (proof?.best_score ?? 70) : (decl?.pct ?? 0);
      radio = anillo === 0 ? RADIO_NUCLEO : RADIO_FRONTERA;
    }

    const { x, y } = ringPosition(index, total, radio, key);

    nodos.push({
      id: key,
      label,
      estado,
      declaredPct: decl ? decl.pct : null,
      provenScore: proof ? proof.best_score : null,
      tokensEarned: Number(proof?.tokens_earned ?? 0) || 0,
      demand,
      unlocks,
      x,
      y,
      r: 0.36 + Math.max(0, Math.min(100, base)) / 100 * 0.64,
      anillo,
    });
  };

  solidasKeys.forEach((key, i) => empujar(key, 0, i, solidasKeys.length));
  huecasKeys.forEach((key, i) => empujar(key, 1, i, huecasKeys.length));
  ausentesKeys.forEach((key, i) => empujar(key, 2, i, ausentesKeys.length));

  // ── 5. Aristas ────────────────────────────────────────────────────────
  const aristas: AristaRed[] = [];
  const nodoIds = new Set(nodos.map((n) => n.id));

  // (a) radios: el centro sos vos; todo lo tuyo cuelga de ahí.
  for (const n of nodos) {
    aristas.push({ from: '·centro·', to: n.id, tipo: 'radio', punteada: n.estado === 'hueco' });
  }

  // (b) mercado: dos habilidades que un mismo empleo pide JUNTAS están
  //     relacionadas de verdad. No es una heurística inventada: es lo que el
  //     mercado declaró en required_skills.
  const vistas = new Set<string>();
  for (const gap of gapsRanked) {
    const claves = gap.required
      .map((r) => normalizeSkill(r))
      .filter((k) => k && nodoIds.has(k));
    for (let i = 0; i < claves.length; i++) {
      for (let j = i + 1; j < claves.length; j++) {
        const par = [claves[i], claves[j]].sort().join('→');
        if (vistas.has(par)) continue;
        vistas.add(par);
        aristas.push({ from: claves[i], to: claves[j], tipo: 'mercado', punteada: false });
      }
    }
  }

  // (c) puentes: de la habilidad que falta a la oportunidad que desbloquea.
  //     Punteado = el puente todavía no se cruzó.
  for (const op of oportunidades) {
    for (const miss of op.missing) {
      const key = normalizeSkill(miss);
      if (key && nodoIds.has(key)) {
        aristas.push({ from: key, to: `empleo:${op.id}`, tipo: 'puente', punteada: true });
      }
    }
  }

  // ── 6. Totales ────────────────────────────────────────────────────────
  const probadas = solidasKeys.length;
  const totalUniverso = todasLasClaves.length;
  const tokensGanados = [...pruebas.values()].reduce(
    (sum, p) => sum + (Number(p.tokens_earned) || 0),
    0,
  );

  return {
    nodos,
    oportunidades,
    aristas,
    totales: {
      declaradas: totalUniverso,
      probadas,
      pctProbado: totalUniverso === 0 ? 0 : Math.round((probadas / totalUniverso) * 100),
      tokensGanados,
      ausentes: ausentesKeys.length,
    },
    jugada,
    brechas: marketGaps(jobs, ownedLabels),
    vacia: totalUniverso === 0,
  };
}

// ══════════════════════════════════════════════════════════════════════
// TEXTOS — cero jerga, cada número con su unidad y su contexto
// ══════════════════════════════════════════════════════════════════════
/**
 * La frase que resume el estado de la red. Es la traducción del modelo 20/80 a
 * lenguaje que entiende cualquiera, sin nombrar "ejes", "nodos" ni "20/80".
 */
export function resumenRed(model: RedVivaModel): string {
  const { declaradas, probadas } = model.totales;

  if (declaradas === 0) {
    return 'Todavía no hay nada acá. Subí tu CV y aparecen tus habilidades.';
  }
  if (probadas === 0) {
    return `Declaraste ${declaradas} ${declaradas === 1 ? 'habilidad' : 'habilidades'} y todavía no probaste ninguna. Probá una y empieza a valer.`;
  }
  if (probadas === declaradas) {
    return `Probaste las ${probadas} ${probadas === 1 ? 'habilidad' : 'habilidades'} que declaraste. Tu red es sólida entera.`;
  }
  return `Probaste ${probadas} de ${declaradas} habilidades. Las ${declaradas - probadas} huecas siguen siendo solo una afirmación.`;
}

/**
 * Qué decir de un nodo, en una línea. Nunca dice "verificada" por heurística.
 */
export function textoEstado(nodo: NodoRed): string {
  if (nodo.estado === 'solido') {
    if (nodo.provenScore === null) {
      return 'Probada. No quedó registrado el puntaje de esa prueba.';
    }
    return `Probada con ${nodo.provenScore}/100.`;
  }
  if (nodo.estado === 'latiendo') {
    return 'La estás probando ahora.';
  }
  if (nodo.estado === 'ausente') {
    if (nodo.unlocks > 0) {
      return `No la tenés. Es lo único que te falta para ${nodo.unlocks} ${nodo.unlocks === 1 ? 'empleo' : 'empleos'}.`;
    }
    return `No la tenés. La piden en ${nodo.demand} ${nodo.demand === 1 ? 'empleo abierto' : 'empleos abiertos'}.`;
  }
  if (nodo.declaredPct !== null && nodo.declaredPct > 0) {
    return `Tu CV dice ${nodo.declaredPct}/100. Nadie lo comprobó todavía.`;
  }
  return 'La declaraste. Nadie lo comprobó todavía.';
}
