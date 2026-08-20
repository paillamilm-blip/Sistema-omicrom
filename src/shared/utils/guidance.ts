// src/shared/utils/guidance.ts
// ═══════════════════════════════════════════════════════════════════════
// Funciones PURAS de guía contextual — extraídas para romper la
// dependencia circular gemelo/ ↔ omicron/.
//
// Tanto el Coach (omicron) como el banner Guidance (gemelo) importan
// de aquí. No depende de ningún feature module.
// ═══════════════════════════════════════════════════════════════════════
import type { TabId, Profile, GemeloDigital } from '@/types';

const r = (n: number) => Math.round(n);

/**
 * Umbrales de nivel por PE (alineado con la Billetera: Operativo/Core/Arquitecto).
 */
export function levelInfo(pe: number): { tier: string; next: string | null; toNext: number; pct: number } {
  if (pe >= 2000) return { tier: 'Nodo Arquitecto', next: null, toNext: 0, pct: 100 };
  if (pe >= 500) return { tier: 'Nodo Core', next: 'Nodo Arquitecto', toNext: 2000 - pe, pct: ((pe - 500) / 1500) * 100 };
  return { tier: 'Nodo Operativo', next: 'Nodo Core', toNext: 500 - pe, pct: (pe / 500) * 100 };
}

/**
 * Empuje contextual al ABRIR un nodo: cada nodo es una "puerta de mejora".
 * Devuelve una frase concreta con los números reales del usuario.
 */
export function nodeGuidance(tab: TabId, profile: Profile | null, gemelo: GemeloDigital | null): string {
  const pe = profile?.pe_points ?? 0;
  const skills = profile?.skills ?? [];
  const topSkill = skills[0] || 'tu especialidad';
  const rep = gemelo ? r(gemelo.overallReputation) : 0;

  switch (tab) {
    case 'academia':
      return `Cada curso valida un nodo real. Aprobá su examen para subir tu Calidad${gemelo ? ` (hoy ${r(gemelo.quality)})` : ''} con evidencia.`;
    case 'maxskill':
      return `Validá tu próximo nodo para subir tu Ejecución${gemelo ? ` (hoy ${r(gemelo.execution)})` : ''}. Cada nodo que superás abre el siguiente.`;
    case 'empleos':
      return rep >= 45
        ? `Con reputación ${rep} ya podés postular. Buscá vacantes que pidan ${topSkill}.`
        : 'Subí tu reputación validando nodos y pronto el trabajo te va a encontrar.';
    case 'market':
      return `Publicá un servicio con tu experticia en ${topSkill} y empezá a ganar tokens.`;
    case 'vault':
      return `Subí un aporte para subir tu Trascendencia${gemelo ? ` (hoy ${r(gemelo.transcendence)})` : ''} y ganar regalías.`;
    case 'wallet': {
      const li = levelInfo(pe);
      return li.next
        ? `Tenés ${pe} PE. Te faltan ${li.toNext} PE para llegar a ${li.next}.`
        : `Sos ${li.tier}: nivel máximo. Seguí ganando tokens con tu experticia.`;
    }
    case 'gobernanza':
      return 'Participá como árbitro o votá propuestas: la gobernanza refuerza tu reputación en la red.';
    case 'chat':
      return 'Coordiná tus contratos acá. Cada acuerdo queda protegido en la caja negra.';
    case 'perfil':
      return skills.length === 0
        ? 'Subí tu CV para activar tu Gemelo Digital. Es la base de todo: habilidades, ejes y reputación.'
        : `Tu Fundamento está en ${gemelo ? r(gemelo.foundation) : '?'}. Convalidá más credenciales para fortalecer tu base.`;
    default:
      return 'Explorá este nodo para descubrir cómo mejorar tu Gemelo Digital.';
  }
}
