// src/components/shared/IncomingJobs.tsx
// A · "EL TRABAJO TE BUSCA" en tiempo real (dos señales, vía Supabase Realtime):
//   1) MATCH personalizado → INSERT en `job_matches` para tu usuario: el sistema
//      encontró una oferta que encaja con TU perfil. Es el "el trabajo te busca
//      a ti" en su forma más pura (prioritario, dorado).
//   2) Oferta nueva en la red → INSERT en `job_postings` (que no sea tuya).
// Push accionable con CTA directo a Empleos. Degradación elegante: si Realtime
// no está habilitado para esas tablas, simplemente no dispara (sin errores).
import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

interface JobRow {
  id?: string;
  title?: string;
  company_id?: string;
  status?: string;
  category?: string;
}

type IncomingKind = 'match' | 'new';
interface Incoming {
  kind: IncomingKind;
  title: string;
  sub: string;
}

export function IncomingJobPush() {
  const { profile, setActiveTab } = useApp();
  const [incoming, setIncoming] = useState<Incoming | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const uid = profile.id;

    const show = (next: Incoming) => {
      setIncoming(next);
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setIncoming(null), 12000);
    };

    const channel = supabase
      .channel('omicron-jobs-live')
      // 1) Match personalizado: el trabajo te busca A TI.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_matches', filter: `user_id=eq.${uid}` },
        () => {
          show({
            kind: 'match',
            title: 'Coincides con una oferta',
            sub: 'El sistema encontró una oportunidad que encaja con tu perfil.',
          });
        },
      )
      // 2) Oferta nueva publicada en la red.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_postings' },
        (payload) => {
          const row = payload.new as JobRow;
          if (!row) return;
          if (row.company_id === uid) return; // no te avises tus propias ofertas
          if (row.status && row.status !== 'OPEN') return;
          show({
            kind: 'new',
            title: row.title || 'Nueva oportunidad',
            sub: 'Nueva oferta publicada en la red · toca para verla.',
          });
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!incoming) return null;

  const isMatch = incoming.kind === 'match';
  const accent = isMatch ? C.gold : C.cyan;
  const label = isMatch ? 'EL TRABAJO TE BUSCA' : 'NUEVA OFERTA EN LA RED';

  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        bottom: 'calc(150px + env(safe-area-inset-bottom, 0px))',
        zIndex: 62,
        width: 'min(92%, 420px)',
        padding: '12px 15px',
        borderRadius: 16,
        background: 'linear-gradient(180deg, rgba(20,26,46,0.95), rgba(9,12,24,0.97))',
        border: `1px solid ${accent}66`,
        boxShadow: `0 16px 44px rgba(0,0,0,0.6), 0 0 26px ${accent}22`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'cp-toast-in 0.24s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: accent }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, boxShadow: `0 0 8px ${accent}`, animation: 'cp-breathe 1.2s ease-in-out infinite' }} />
        {label}
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf0fb', marginTop: 4 }}>
        {incoming.title}
      </div>
      <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: 'rgba(234,242,255,0.7)', marginTop: 2 }}>
        {incoming.sub}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={() => { setActiveTab('empleos'); setIncoming(null); }}
          style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: '#05060f', background: `linear-gradient(135deg, #ffd27a, ${accent})` }}
        >
          Ver {isMatch ? 'mi match' : 'oferta'}
        </button>
        <button
          onClick={() => setIncoming(null)}
          style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.cyanFaint}`, cursor: 'pointer', fontFamily: FONT.body, fontSize: 12, color: 'rgba(234,242,255,0.55)', background: 'transparent' }}
        >
          Después
        </button>
      </div>
    </div>
  );
}
