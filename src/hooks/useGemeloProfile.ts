// src/hooks/useGemeloProfile.ts
// Hook reactivo al perfil compartido del Gemelo. Cualquier componente que lo
// use (galaxia, Oráculo, tabs) lee exactamente la misma fuente y se
// re-renderiza al convalidar datos.
import { useSyncExternalStore } from 'react';
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
  const profile = useSyncExternalStore(subscribe, getProfile, getProfile) as GemeloProfile;
  const history = useSyncExternalStore(subscribe, getHistory, getHistory) as GemeloEvent[];
  return {
    profile,
    actions: gemeloActions,
    tier: tierFor(profile.pe),
    history,
    streak: streakDays(),
    next: bestNextStep(profile),
  };
}
