// components/shared/DailyChallengeCard.tsx
// ═══════════════════════════════════════════════════════════════════════
// DAILY CHALLENGE CARD — Reto del día con timer y recompensa.
// Aparece en el perfil / shell principal.
// ═══════════════════════════════════════════════════════════════════════

import { useState } from 'react';
import { C, FONT } from '@/theme';
import {
  getDailyChallenge,
  isChallengeCompleted,
  markChallengeCompleted,
  getCurrentStreak,
} from '@/lib/dailyChallenge';
import { applyStreakMultiplier } from './StreakBanner';
import { supabase } from '@/lib/supabase';
import { useRealtime } from '@/store/RealtimeContext';
import { useApp } from '@/store/AppContext';

interface Props {
  onNavigate?: (tab: string) => void;
}

export function DailyChallengeCard({ onNavigate }: Props) {
  const { gemelo } = useApp();
  const challenge = getDailyChallenge(gemelo);
  const [completed, setCompleted] = useState(challenge ? isChallengeCompleted(challenge.id) : false);
  const [justCompleted, setJustCompleted] = useState(false);
  const cStreak = getCurrentStreak();
  const { broadcast } = useRealtime();

  if (!challenge) return null;

  function handleComplete() {
    if (!challenge) return;
    markChallengeCompleted(challenge.id);
    const basePe = challenge.reward.pe;
    const finalPe = applyStreakMultiplier(basePe);
    setCompleted(true);
    setJustCompleted(true);

    // Navegar según el tipo de challenge
    if (onNavigate) {
      const tab = challenge.targetTab;
      if (tab) setTimeout(() => onNavigate(tab), 800);
    }

    // Guardar PE ganados (para mostrar en toast)
    localStorage.setItem('omicron_last_challenge_pe', String(finalPe));

    // CABLE 5: Challenge → PE server-side + Broadcast a la red
    supabase.rpc('register_daily_activity', { p_challenge: true, p_pe: finalPe }).then(() => {});
    broadcast(`completó su reto diario (+${finalPe} PE)`, 'action');
  }

  if (completed && !justCompleted) {
    return (
      <div style={S.cardDone}>
        <span style={S.checkEmoji}>✅</span>
        <div>
          <div style={S.doneTitle}>Reto completado</div>
          <div style={S.doneSubtitle}>Vuelve mañana para el siguiente</div>
        </div>
        {cStreak > 1 && (
          <span style={S.cStreak}>🎯 {cStreak} retos seguidos</span>
        )}
      </div>
    );
  }

  if (justCompleted) {
    const pe = parseInt(localStorage.getItem('omicron_last_challenge_pe') ?? '0');
    return (
      <div style={S.cardCelebrate}>
        <div style={S.celebrateEmoji}>🎉</div>
        <div style={S.celebrateTitle}>¡Reto completado!</div>
        <div style={S.celebratePe}>+{pe} PE ganados</div>
        {cStreak > 1 && <div style={S.celebrateStreak}>🎯 {cStreak} retos seguidos</div>}
      </div>
    );
  }

  return (
    <div style={S.card}>
      <div style={S.header}>
        <span style={S.emoji}>{challenge.icon}</span>
        <div style={S.headerText}>
          <span style={S.label}>RETO DEL DÍA</span>
          <span style={S.time}>{challenge.duration}</span>
        </div>
        <span style={S.reward}>+{challenge.reward.pe} PE</span>
      </div>

      <div style={S.title}>{challenge.title}</div>
      <div style={S.desc}>{challenge.description}</div>

      <button onClick={handleComplete} style={S.cta}>
        {challenge.action}
      </button>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  card: {
    margin: '0 0 14px',
    padding: '14px 16px',
    borderRadius: 14,
    background: 'linear-gradient(145deg, rgba(92,200,255,0.06), rgba(94,92,230,0.04))',
    border: '1px solid rgba(92,200,255,0.2)',
    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  emoji: { fontSize: 22 },
  headerText: { flex: 1, display: 'flex', flexDirection: 'column' as const },
  label: { fontFamily: FONT.mono, fontSize: 9, color: C.cyan, letterSpacing: 1.5, textTransform: 'uppercase' as const },
  time: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  reward: {
    fontFamily: FONT.mono,
    fontSize: 11,
    color: C.green,
    fontWeight: 700,
    background: 'rgba(63,208,201,0.1)',
    padding: '4px 8px',
    borderRadius: 6,
  },
  title: { fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 4 },
  desc: { fontFamily: FONT.display, fontSize: 12, color: '#b9d4e6', lineHeight: 1.4, marginBottom: 12 },
  cta: {
    width: '100%',
    padding: '11px',
    borderRadius: 8,
    border: 'none',
    background: 'linear-gradient(135deg, #5cc8ff, #008b9e)',
    color: '#04121f',
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    letterSpacing: 1,
    cursor: 'pointer',
    boxShadow: '0 0 14px rgba(92,200,255,0.3)',
  },
  cardDone: {
    margin: '0 0 14px',
    padding: '12px 14px',
    borderRadius: 14,
    background: 'rgba(63,208,201,0.05)',
    border: '1px solid rgba(63,208,201,0.2)',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  checkEmoji: { fontSize: 18 },
  doneTitle: { fontFamily: FONT.mono, fontSize: 11, color: C.green },
  doneSubtitle: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  cStreak: {
    marginLeft: 'auto',
    fontFamily: FONT.mono,
    fontSize: 9,
    color: C.gold,
    background: 'rgba(255,176,46,0.1)',
    padding: '3px 7px',
    borderRadius: 4,
  },
  cardCelebrate: {
    margin: '0 0 14px',
    padding: '20px 16px',
    borderRadius: 14,
    background: 'linear-gradient(145deg, rgba(255,176,46,0.08), rgba(63,208,201,0.06))',
    border: '1px solid rgba(255,176,46,0.3)',
    textAlign: 'center' as const,
  },
  celebrateEmoji: { fontSize: 32, marginBottom: 6 },
  celebrateTitle: { fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: C.ink },
  celebratePe: { fontFamily: FONT.mono, fontSize: 13, color: C.green, marginTop: 4 },
  celebrateStreak: { fontFamily: FONT.mono, fontSize: 10, color: C.gold, marginTop: 6 },
};
