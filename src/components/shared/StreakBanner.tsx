// components/shared/StreakBanner.tsx
// ═══════════════════════════════════════════════════════════════════════
// STREAK BANNER — Muestra la racha prominente con multiplicador PE.
// "La racha que duele perder" — FOMO + gamificación intrínseca.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { C, FONT } from '../../theme';
import { streakDays } from '../../lib/gemeloProfile';

/** Multiplicador PE basado en la racha */
function getMultiplier(streak: number): { mult: number; label: string; nextAt: number } {
  if (streak >= 30) return { mult: 2.0, label: 'x2.0', nextAt: 0 };
  if (streak >= 14) return { mult: 1.75, label: 'x1.75', nextAt: 30 };
  if (streak >= 7) return { mult: 1.5, label: 'x1.5', nextAt: 14 };
  if (streak >= 3) return { mult: 1.25, label: 'x1.25', nextAt: 7 };
  return { mult: 1.0, label: 'x1.0', nextAt: 3 };
}

/** Badge de racha */
function getStreakBadge(streak: number): string | null {
  if (streak >= 30) return 'Imparable';
  if (streak >= 14) return 'Constante';
  if (streak >= 7) return 'En racha';
  return null;
}

export function StreakBanner() {
  const [streak, setStreak] = useState(0);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    setStreak(streakDays());
  }, []);

  // Registrar actividad del día actual
  useEffect(() => {
    const key = 'omicron_streak_today';
    const today = new Date().toISOString().slice(0, 10);
    if (localStorage.getItem(key) !== today) {
      localStorage.setItem(key, today);
    }
  }, []);

  if (streak === 0) {
    return (
      <div style={S.banner0}>
        <span style={S.fireOff}>💤</span>
        <span style={S.text0}>Sin racha — haz algo hoy para empezar</span>
      </div>
    );
  }

  const { mult, label, nextAt } = getMultiplier(streak);
  const badge = getStreakBadge(streak);
  const daysToNext = nextAt > 0 ? nextAt - streak : 0;

  return (
    <div style={S.banner} onClick={() => setShowDetail(!showDetail)}>
      <div style={S.row}>
        <span style={S.fire}>🔥</span>
        <span style={S.streakNum}>{streak}</span>
        <span style={S.days}>día{streak > 1 ? 's' : ''}</span>
        <span style={S.mult}>{label} PE</span>
        {badge && <span style={S.badge}>{badge}</span>}
      </div>

      {showDetail && (
        <div style={S.detail}>
          <div style={S.detailRow}>
            <span style={S.detailLabel}>Multiplicador actual:</span>
            <span style={S.detailValue}>{label} en todo lo que ganes</span>
          </div>
          {daysToNext > 0 && (
            <div style={S.detailRow}>
              <span style={S.detailLabel}>Próximo nivel:</span>
              <span style={S.detailValue}>{daysToNext} día{daysToNext > 1 ? 's' : ''} más → x{mult + 0.25}</span>
            </div>
          )}
          <div style={S.progress}>
            <div style={{ ...S.progressFill, width: `${Math.min(100, (streak / 30) * 100)}%` }} />
          </div>
          <div style={S.tiers}>
            <span style={{ color: streak >= 3 ? C.green : C.mut }}>3d x1.25</span>
            <span style={{ color: streak >= 7 ? C.cyan : C.mut }}>7d x1.5</span>
            <span style={{ color: streak >= 14 ? C.gold : C.mut }}>14d x1.75</span>
            <span style={{ color: streak >= 30 ? '#ff5c7a' : C.mut }}>30d x2.0</span>
          </div>
        </div>
      )}
    </div>
  );
}

/** Aplica multiplicador de racha a PE ganados */
export function applyStreakMultiplier(basePe: number): number {
  const streak = streakDays();
  const { mult } = getMultiplier(streak);
  return Math.round(basePe * mult);
}

const S: Record<string, React.CSSProperties> = {
  banner: {
    margin: '0 0 12px',
    padding: '10px 14px',
    borderRadius: 12,
    background: 'linear-gradient(135deg, rgba(255,100,50,0.08), rgba(255,176,46,0.06))',
    border: '1px solid rgba(255,176,46,0.25)',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  banner0: {
    margin: '0 0 12px',
    padding: '8px 14px',
    borderRadius: 12,
    background: 'rgba(107,117,144,0.06)',
    border: '1px solid rgba(107,117,144,0.15)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
  },
  fire: { fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(255,100,50,0.6))' },
  fireOff: { fontSize: 14, opacity: 0.5 },
  streakNum: {
    fontFamily: FONT.mono,
    fontSize: 20,
    fontWeight: 700,
    color: C.gold,
    textShadow: '0 0 10px rgba(255,176,46,0.4)',
  },
  days: { fontFamily: FONT.mono, fontSize: 10, color: C.mut, letterSpacing: 1 },
  mult: {
    fontFamily: FONT.mono,
    fontSize: 10,
    color: C.green,
    background: 'rgba(63,208,201,0.1)',
    border: '1px solid rgba(63,208,201,0.3)',
    padding: '2px 7px',
    borderRadius: 4,
    marginLeft: 6,
  },
  badge: {
    fontFamily: FONT.mono,
    fontSize: 9,
    color: C.gold,
    background: 'rgba(255,176,46,0.1)',
    border: '1px solid rgba(255,176,46,0.3)',
    padding: '2px 7px',
    borderRadius: 4,
    marginLeft: 'auto',
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
  },
  text0: { fontFamily: FONT.mono, fontSize: 10, color: C.mut },
  detail: {
    marginTop: 10,
    paddingTop: 10,
    borderTop: '1px solid rgba(255,176,46,0.15)',
  },
  detailRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  detailLabel: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  detailValue: { fontFamily: FONT.mono, fontSize: 9, color: C.ink },
  progress: {
    height: 4,
    borderRadius: 2,
    background: 'rgba(255,255,255,0.06)',
    margin: '8px 0 6px',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    background: 'linear-gradient(90deg, #ff6432, #ffb02e, #3fd0c9)',
    transition: 'width 0.5s',
  },
  tiers: {
    display: 'flex',
    justifyContent: 'space-between',
    fontFamily: FONT.mono,
    fontSize: 8,
    letterSpacing: 0.5,
  },
};
