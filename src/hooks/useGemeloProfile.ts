// src/hooks/useGemeloProfile.ts
// ═══════════════════════════════════════════════════════════════════════
// Hook reactivo del Gemelo. FUENTE ÚNICA: Supabase `profiles`.
// El store local es solo caché de degradación (offline/sin sesión).
// Las acciones de convalidación son ASÍNCRONAS (van al servidor).
// ═══════════════════════════════════════════════════════════════════════
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

  // Fuente canónica: Supabase. Degradación al local si no hay sesión.
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
    /** Acciones asíncronas que van al servidor (RPCs SECURITY DEFINER). */
    actions: gemeloActions,
    tier,
    history,
    streak: streakDays(),
    next: bestNextStep(profile),
  };
}
