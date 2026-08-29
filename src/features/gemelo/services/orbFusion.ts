// features/gemelo/services/orbFusion.ts
// ═══════════════════════════════════════════════════════════════════════
// Fusión de orbes — lógica pura y determinista que compara mis skills con
// los de otra persona para descubrir en qué crecemos juntos: qué compartimos,
// en qué nos complementamos (aprender/enseñar) y qué podría aprender de nueva.
//
// Sin efectos secundarios, sin dependencias externas. Toda la salida es
// derivable únicamente de las dos listas de entrada.
// ═══════════════════════════════════════════════════════════════════════

// Umbral de brecha (en puntos /100) a partir del cual dos personas se
// consideran complementarias en una misma skill.
export const COMPLEMENTARY_THRESHOLD = 25;

/** Una skill con su nivel de dominio estimado (0-100). */
export type Skill = { name: string; pct: number };

/** Dirección de la complementariedad respecto a mí. */
export type FusionDirection = 'learn' | 'teach';

/** Skill presente en ambas personas. */
export type SharedSkill = { name: string; minePct: number; theirsPct: number };

/** Skill presente en ambas con brecha suficiente para complementarse. */
export type ComplementarySkill = {
  name: string;
  minePct: number;
  theirsPct: number;
  direction: FusionDirection;
};

/** Skill que solo tiene la otra persona (oportunidad de aprender algo nuevo). */
export type OnlyTheirsSkill = { name: string; theirsPct: number };

/** Resultado completo de la fusión de orbes. */
export type OrbFusion = {
  shared: SharedSkill[];
  complementary: ComplementarySkill[];
  onlyTheirs: OnlyTheirsSkill[];
};

// Normaliza el nombre para el emparejamiento (sin distinguir mayúsculas ni
// espacios sobrantes) manteniendo aparte el nombre original para mostrar.
function normalize(name: string): string {
  return name.trim().toLowerCase();
}

// Deduplica una lista por nombre normalizado conservando la primera aparición.
function dedupe(list: Skill[]): Skill[] {
  const seen = new Set<string>();
  const out: Skill[] = [];
  for (const skill of list) {
    if (!skill || typeof skill.name !== 'string') continue;
    const key = normalize(skill.name);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(skill);
  }
  return out;
}

/**
 * Calcula la fusión de orbes entre mis skills y las de la otra persona.
 *
 * - shared: nombres presentes en ambas listas.
 * - complementary: nombres presentes en ambas cuya brecha de dominio es
 *   >= COMPLEMENTARY_THRESHOLD. direction 'learn' si la otra persona domina
 *   más que yo, 'teach' si domino más yo.
 * - onlyTheirs: nombres presentes en la otra persona pero ausentes en mí.
 *
 * Entradas vacías o indefinidas devuelven un resultado vacío sin lanzar error.
 * Función pura y determinista.
 */
export function computeOrbFusion(
  mine: Skill[] | undefined,
  theirs: Skill[] | undefined,
): OrbFusion {
  const mineList = dedupe(mine ?? []);
  const theirsList = dedupe(theirs ?? []);

  // Índice de mis skills por nombre normalizado para búsquedas O(1).
  const mineByKey = new Map<string, Skill>();
  for (const skill of mineList) {
    mineByKey.set(normalize(skill.name), skill);
  }

  const shared: SharedSkill[] = [];
  const complementary: ComplementarySkill[] = [];
  const onlyTheirs: OnlyTheirsSkill[] = [];

  for (const their of theirsList) {
    const key = normalize(their.name);
    const mineMatch = mineByKey.get(key);

    if (!mineMatch) {
      // Solo la otra persona la tiene: oportunidad de aprender algo nuevo.
      onlyTheirs.push({ name: their.name, theirsPct: their.pct });
      continue;
    }

    // Presente en ambas: es compartida y, si hay brecha, complementaria.
    shared.push({ name: mineMatch.name, minePct: mineMatch.pct, theirsPct: their.pct });

    const gap = Math.abs(mineMatch.pct - their.pct);
    if (gap >= COMPLEMENTARY_THRESHOLD) {
      complementary.push({
        name: mineMatch.name,
        minePct: mineMatch.pct,
        theirsPct: their.pct,
        direction: their.pct > mineMatch.pct ? 'learn' : 'teach',
      });
    }
  }

  return { shared, complementary, onlyTheirs };
}
