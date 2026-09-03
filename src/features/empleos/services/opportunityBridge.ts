// src/features/empleos/services/opportunityBridge.ts
// ═══════════════════════════════════════════════════════════════════════
// EL PUENTE: aprender -> oportunidad, hecho VISIBLE.
//
// El problema que resuelve: la persona estudia en la Academia y no ve que eso
// le cambie NADA. La reputación sube, pero las oportunidades se sienten
// desconectadas del esfuerzo. Este helper produce UNA línea honesta que une
// las dos puntas: "esto es lo que tus habilidades te abren HOY, y esto es lo
// que hacés para abrir más".
//
// REGLA DURA — CERO DATOS FALSOS (decisión del fundador, misma que mató el
// TrabajoTeEncuentra simulado): esta línea se compone SOLO con conteos reales
// que ya están en memoria del cliente (ofertas OPEN de job_postings + matches
// reales/locales + skills reales del perfil). Si no hay ofertas, lo DICE; no
// inventa una oferta ni promete un número que no existe.
//
// Nota deliberada: NO usa `JOBS` de matcher.ts, que es un array hardcodeado de
// ejemplos. Ese array no es la realidad del usuario.
//
// Es puro y sin dependencias (no React, no Supabase, no window), así que se
// prueba con Vitest sin mocks — mismo criterio que nodeUnlock.ts,
// homeStatus.ts y commissionQuote.ts.
// ═══════════════════════════════════════════════════════════════════════

/** Entrada del puente: SOLO conteos reales, nunca datos inventados. */
export interface OpportunityBridgeInput {
  /** Ofertas realmente abiertas (job_postings con status OPEN). */
  openJobs: number;
  /** Ofertas que piden habilidades que la persona YA tiene (match real o local). */
  matchedJobs: number;
  /** Cuántas habilidades tiene registradas la persona (0 = todavía no sabemos nada de ella). */
  skillCount: number;
}

/** Salida del puente: una línea para mostrar, y qué hacer con ella. */
export interface OpportunityBridge {
  /** Texto listo para mostrar. Siempre con números y su unidad. */
  label: string;
  /**
   * Tono, para que la UI elija color sin re-interpretar el texto:
   *  - 'win'    : ya hay oportunidades esperándola (celebrar)
   *  - 'invite' : no hay match todavía, pero SÍ hay un paso concreto (aprender)
   *  - 'empty'  : la red todavía no tiene ofertas (honestidad, no es su culpa)
   */
  tone: 'win' | 'invite' | 'empty';
}

/** Normaliza un conteo a entero >= 0 (defensa ante undefined/NaN/negativos). */
function count(n: number): number {
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/**
 * Construye la línea del puente. Determinista, sin efectos secundarios.
 *
 * Orden de los casos elegido a propósito: primero la HONESTIDAD (si la red no
 * tiene ofertas, ningún consejo sirve), después la INVITACIÓN (sabemos que no
 * hay match y le decimos exactamente qué hacer), y al final la CELEBRACIÓN.
 */
export function opportunityBridge(input: OpportunityBridgeInput): OpportunityBridge {
  const openJobs = count(input.openJobs);
  const matchedJobs = Math.min(count(input.matchedJobs), openJobs);
  const skillCount = count(input.skillCount);

  // 1. La red todavía no tiene ofertas. Se dice tal cual: no es culpa suya y
  //    no hay ningún curso que lo cambie hoy.
  if (openJobs === 0) {
    return {
      label: 'Todavía no hay ofertas abiertas en la red. Cuando una empresa publique, te avisamos acá.',
      tone: 'empty',
    };
  }

  // 2. Hay ofertas, pero no sabemos qué sabe hacer. El paso es el CV, y le
  //    decimos exactamente qué gana con subirlo.
  if (skillCount === 0) {
    return {
      label: `Hay ${openJobs} ${openJobs === 1 ? 'oferta abierta' : 'ofertas abiertas'}. Sube tu CV y te decimos cuáles te sirven a ti.`,
      tone: 'invite',
    };
  }

  // 3. Hay ofertas y sabemos qué sabe hacer, pero ninguna le calza todavía.
  //    ACÁ ESTÁ EL PUENTE: aprender es lo que mueve este número.
  if (matchedJobs === 0) {
    return {
      label: `Ninguna de las ${openJobs} ${openJobs === 1 ? 'oferta abierta' : 'ofertas abiertas'} pide tus ${skillCount} ${skillCount === 1 ? 'habilidad' : 'habilidades'} todavía. Suma un curso en la Academia: cada habilidad nueva puede abrirte estas ofertas.`,
      tone: 'invite',
    };
  }

  // 4. Ya hay oportunidades esperándola. Se nombra el número exacto y de dónde
  //    salió, para que el mérito quede claro.
  return {
    label: `${matchedJobs} de las ${openJobs} ofertas abiertas piden habilidades que ya tienes. Tu ${skillCount === 1 ? 'habilidad' : 'aprendizaje'} te abrió esta puerta.`,
    tone: 'win',
  };
}
