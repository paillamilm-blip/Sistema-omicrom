// components/shared/DashboardVivo.tsx
// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD VIVO — 3 números que CAMBIAN cada día.
// "Si nada cambia, no hay motivo para volver."
// Muestra deltas: rep +/- , ranking posición, ofertas nuevas.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { C, FONT } from '../../theme';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../lib/supabase';

interface DashboardData {
  reputation: number;
  repDelta: number;
  ranking: number;
  rankDelta: number;
  newJobs: number;
}

export function DashboardVivo() {
  const { profile } = useApp();
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    if (!profile) return;
    void loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  async function loadDashboard() {
    if (!profile) return;

    const rep = profile.reputation_score ?? 0;

    // Delta de reputación (vs última vez que abrió)
    const lastRepKey = 'omicron_last_rep';
    const lastRep = parseFloat(localStorage.getItem(lastRepKey) ?? String(rep));
    const repDelta = Math.round((rep - lastRep) * 10) / 10;
    localStorage.setItem(lastRepKey, String(rep));

    // Ranking (cuántos están arriba)
    let ranking = 0;
    let rankDelta = 0;
    try {
      const { count } = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .gt('reputation_score', rep);
      ranking = (count ?? 0) + 1;

      const lastRankKey = 'omicron_last_rank';
      const lastRank = parseInt(localStorage.getItem(lastRankKey) ?? String(ranking));
      rankDelta = lastRank - ranking; // positivo = subió
      localStorage.setItem(lastRankKey, String(ranking));
    } catch { /* ignore */ }

    // Ofertas nuevas (últimas 24h)
    let newJobs = 0;
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('job_postings')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'OPEN')
        .gt('published_at', yesterday);
      newJobs = count ?? 0;
    } catch { /* ignore */ }

    setData({ reputation: rep, repDelta, ranking, rankDelta, newJobs });
  }

  if (!data) return null;

  return (
    <div style={S.container}>
      {/* Reputación */}
      <div style={S.stat}>
        <div style={S.statValue}>{data.reputation.toFixed(1)}</div>
        <div style={S.statLabel}>Reputación</div>
        {data.repDelta !== 0 && (
          <div style={{ ...S.delta, color: data.repDelta > 0 ? C.green : '#ff5c7a' }}>
            {data.repDelta > 0 ? '↑' : '↓'}{Math.abs(data.repDelta).toFixed(1)}
          </div>
        )}
      </div>

      {/* Ranking */}
      <div style={S.stat}>
        <div style={S.statValue}>#{data.ranking}</div>
        <div style={S.statLabel}>Ranking</div>
        {data.rankDelta !== 0 && (
          <div style={{ ...S.delta, color: data.rankDelta > 0 ? C.green : '#ff5c7a' }}>
            {data.rankDelta > 0 ? `↑${data.rankDelta}` : `↓${Math.abs(data.rankDelta)}`}
          </div>
        )}
      </div>

      {/* Ofertas nuevas */}
      <div style={S.stat}>
        <div style={{ ...S.statValue, color: data.newJobs > 0 ? C.gold : C.mut }}>
          {data.newJobs}
        </div>
        <div style={S.statLabel}>Nuevas hoy</div>
        {data.newJobs > 0 && (
          <div style={{ ...S.delta, color: C.gold }}>💼</div>
        )}
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    gap: 8,
    margin: '0 0 14px',
    padding: '12px',
    borderRadius: 12,
    background: 'rgba(8,16,38,0.5)',
    border: '1px solid rgba(92,200,255,0.1)',
  },
  stat: {
    flex: 1,
    textAlign: 'center' as const,
    position: 'relative' as const,
  },
  statValue: {
    fontFamily: FONT.mono,
    fontSize: 16,
    fontWeight: 700,
    color: C.ink,
    fontVariantNumeric: 'tabular-nums',
  },
  statLabel: {
    fontFamily: FONT.mono,
    fontSize: 8,
    color: C.mut,
    letterSpacing: 1,
    textTransform: 'uppercase' as const,
    marginTop: 2,
  },
  delta: {
    fontFamily: FONT.mono,
    fontSize: 9,
    fontWeight: 700,
    marginTop: 2,
  },
};
