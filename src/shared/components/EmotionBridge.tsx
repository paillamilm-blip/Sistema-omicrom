// shared/components/EmotionBridge.tsx
// ═══════════════════════════════════════════════════════════════════════
// JARVIS PRESENCE · Emotion Signal Bridge
//
// Reads real user data from ProfileContext and computes emotion signals
// for the EmotionProvider. This is the "nervous system" that connects
// your actual state to the ambient UI.
//
// Signals computed:
//   streakDays         ← from profile.streak_days or local streak calc
//   daysSinceLastActivity ← from profile.last_active_at
//   recentAchievement  ← from profile changes (PE increased, axis up)
//   recentLevelUp      ← from node_type change or PE threshold cross
// ═══════════════════════════════════════════════════════════════════════
import { useMemo } from 'react';
import { useApp } from '@/store/AppContext';
import { EmotionProvider, EmotionParticles, useEmotion } from '@/shared/components/EmotionAwareUI';
import { ambientDrone } from '@/shared/utils/ambientDrone';
import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

/** Syncs ambient drone to emotion state */
function DroneSync() {
  const { emotion } = useEmotion();
  ambientDrone.setEmotion(emotion);
  return null;
}

/**
 * Wraps EmotionProvider with real signals derived from the user's profile.
 * Place this INSIDE AppProvider (needs access to useApp).
 */
export function EmotionBridge({ children }: Props) {
  const { profile } = useApp();

  const signals = useMemo(() => {
    if (!profile) return undefined;

    // Streak: use profile.streak_days if available, or compute from last_active_at
    const streakDays = (profile as unknown as Record<string, unknown>).streak_days as number | undefined ?? 0;

    // Days since last activity
    const lastActive = (profile as unknown as Record<string, unknown>).last_active_at as string | undefined;
    let daysSinceLastActivity = 0;
    if (lastActive) {
      const lastDate = new Date(lastActive);
      const now = new Date();
      daysSinceLastActivity = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Recent achievement: PE increased recently (session flag)
    const pe = profile.pe_points ?? 0;
    const sessionPE = Number(sessionStorage.getItem('omicron_session_pe') ?? '0');
    const recentAchievement = pe > sessionPE && sessionPE > 0;
    if (pe > 0) sessionStorage.setItem('omicron_session_pe', String(pe));

    // Recent level up: check if node changed this session
    const nodeType = (profile as unknown as Record<string, unknown>).node_type as string | undefined ?? '';
    const sessionNode = sessionStorage.getItem('omicron_session_node') ?? '';
    const recentLevelUp = nodeType !== sessionNode && sessionNode !== '';
    if (nodeType) sessionStorage.setItem('omicron_session_node', nodeType);

    return {
      streakDays,
      daysSinceLastActivity,
      recentAchievement,
      recentLevelUp,
    };
  }, [profile]);

  return (
    <EmotionProvider signals={signals}>
      <EmotionParticles />
      <DroneSync />
      {children}
    </EmotionProvider>
  );
}
