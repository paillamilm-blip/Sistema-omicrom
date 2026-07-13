// src/hooks/useGemeloProfile.ts
// Hook reactivo del Gemelo. UNIFICADO: cuando hay sesión, la reputación, los
// PE, los ejes y el nodo que ve el usuario salen de la MISMA fuente que el
// ranking, la presencia y los contratos → el perfil de Supabase. Así existe
// UN solo número de reputación en toda la app (antes convivían el valor local
// convalidado y el de Supabase, y podían contradecirse).
//
// El store local sigue guardando los datos CONVALIDADOS (CV, títulos, años,
// aportes) para el flujo de convalidación; lo que cambia es que el número
// mostrado es único y consistente con el ecosistema.
import { useSyncExternalStore } from 'react';
import { useApp } from '../store/AppContext';
import {
  subscribe,
  getProfile,
  getHistory,
  streakDays,
  bestNextStep,
  gemeloActions,
  tierFor,
  type GemeloProfile,
  type GemeloEvent,
} from '../lib/gemeloProfile';

export function useGemeloProfile() {
  const local = useSyncExternalStore(subscribe, getProfile, getProfile) as GemeloProfile;
  const history = useSyncExternalStore(subscribe, getHistory, getHistory) as GemeloEvent[];
  const { profile: sb } = useApp();

  // Fuente canónica (Supabase) con degradación al local si no hay sesión/datos.
  const rep = sb && typeof sb.reputation_score === 'number' ? Math.round(sb.reputation_score) : local.rep;
  const pe = sb && typeof sb.pe_points === 'number' ? sb.pe_points : local.pe;
  const axes = sb
    ? {
        execution: sb.execution_score ?? local.axes.execution,
        quality: sb.quality_score ?? local.axes.quality,
        transcendence: sb.transcendence_score ?? local.axes.transcendence,
        foundation: sb.foundation_score ?? local.axes.foundation,
      }
    : local.axes;

  const profile: GemeloProfile = { ...local, rep, pe, axes };
  const baseTier = tierFor(pe);
  const tier = sb?.node_type ? { ...baseTier, name: sb.node_type } : baseTier;

  return {
    profile,
    actions: gemeloActions,
    tier,
    history,
    streak: streakDays(),
    next: bestNextStep(profile),
  };
}
