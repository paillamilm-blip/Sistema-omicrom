// src/components/shared/LiveRanking.tsx
// Ranking en vivo: leaderboard de reputación que se actualiza en TIEMPO REAL.
// Carga `get_leaderboard` y se re-sincroniza (con debounce) cuando cambia
// cualquier reputación en `profiles` (Supabase Realtime). Empuja la mejora
// continua: ves el ecosistema competir y moverse en directo.
// Degradación elegante: si Realtime no está en `profiles`, muestra el estado
// inicial igualmente (solo no se auto-actualiza).
import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

interface RankRow {
  user_id: string;
  username: string;
  full_name: string;
  reputation_score: number;
}

interface RawRow {
  user_id: string;
  username: string;
  full_name?: string | null;
  reputation_score?: number | string | null;
}

export function LiveRanking() {
  const { profile } = useApp();
  const [rows, setRows] = useState<RankRow[]>([]);
  const [pulse, setPulse] = useState(false);
  const reloadTimer = useRef<number | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.rpc('get_leaderboard', { p_limit: 10 });
    const list: RankRow[] = ((data as RawRow[]) ?? []).map((x) => ({
      user_id: x.user_id,
      username: x.username,
      full_name: x.full_name ?? x.username,
      reputation_score: Number(x.reputation_score ?? 0),
    }));
    setRows(list);
    setPulse(true);
    window.setTimeout(() => setPulse(false), 700);
  }, []);

  useEffect(() => {
    void load();
    const channel = supabase
      .channel('omicron-ranking-live')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
        reloadTimer.current = window.setTimeout(() => { void load(); }, 900);
      })
      .subscribe();
    return () => {
      if (reloadTimer.current) window.clearTimeout(reloadTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [load]);

  if (rows.length === 0) return null;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, margin: '14px 0 6px' }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.cyanDim, textTransform: 'uppercase' }}>Ranking en vivo</span>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.gold, boxShadow: `0 0 6px ${C.gold}`, opacity: pulse ? 1 : 0.4, transition: 'opacity .3s' }} />
      </div>
      {rows.map((r, i) => {
        const isSelf = r.user_id === profile?.id;
        const medal = i === 0 ? '#ffd700' : i === 1 ? '#c0c8d8' : i === 2 ? '#e0a060' : C.cyanDim;
        return (
          <div
            key={r.user_id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 6px',
              borderBottom: `1px solid ${C.cyanFaint}`,
              background: isSelf ? 'rgba(255, 176, 46,0.08)' : 'transparent',
              borderRadius: isSelf ? 8 : 0,
            }}
          >
            <span style={{ width: 22, textAlign: 'center', fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color: medal }}>{i + 1}</span>
            <span style={{ flex: 1, minWidth: 0, fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {r.full_name || r.username}{isSelf ? ' (tú)' : ''}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color: C.gold }}>{Math.round(r.reputation_score)}</span>
          </div>
        );
      })}
    </div>
  );
}
