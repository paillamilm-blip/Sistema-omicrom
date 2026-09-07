// features/redviva/index.ts
// RED VIVA — el CV convertido en tablero de recompensas.
// Doctrina y plan de incrementos: .tasks/red-viva-plan.md

export { RedVivaHome } from './components/RedVivaHome';
export { RedVivaCanvas } from './components/RedVivaCanvas';
export { NodoFicha } from './components/NodoFicha';
export { useRedViva } from './hooks/useRedViva';
export { useCotizacion, useExamenDisponible } from './hooks/useNodoDetalle';
export { useProbarHabilidad } from './hooks/useProbarHabilidad';
export {
  asegurarNodoDeExamen,
  pedirExamen,
  tomarExamenPendiente,
  validarTitulo,
  normalizarTitulo,
} from './services/examenSkill';
export {
  buildRedViva,
  resumenRed,
  textoEstado,
  type RedVivaModel,
  type NodoRed,
  type EstadoNodo,
  type SkillProof,
} from './services/redViva';
export {
  analyzeJob,
  bestMove,
  marketGaps,
  rankOpportunities,
  normalizeSkill,
  type RealJob,
  type JobGap,
  type Jugada,
} from './services/gapEngine';
