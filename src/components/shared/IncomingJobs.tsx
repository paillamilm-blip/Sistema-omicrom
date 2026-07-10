// src/components/shared/IncomingJobs.tsx
// A · "EL TRABAJO TE BUSCA" en tiempo real.
// Se suscribe a los INSERT de `job_postings` vía Supabase Realtime. Cuando la
// red publica una oferta nueva (que no sea tuya), aparece un push accionable
// para ir directo a Empleos. Degradación elegante: si Realtime no está
// habilitado para la tabla, simplemente no dispara (sin errores).
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

export function IncomingJobPush() {
  const { profile, setActiveTab } = useApp();
  const [job, setJob] = useState<JobRow | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!profile?.id) return;
    const uid = profile.id;

    const channel = supabase
      .channel('omicron-jobs-live')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_postings' },
        (payload) => {
          const row = payload.new as JobRow;
          if (!row) return;
          if (row.company_id === uid) return; // no te avises tus propias ofertas
          if (row.status && row.status !== 'OPEN') return;
          setJob(row);
          if (timerRef.current) window.clearTimeout(timerRef.current);
          timerRef.current = window.setTimeout(() => setJob(null), 11000);
        },
      )
      .subscribe();

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      void supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  if (!job) return null;

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
        border: `1px solid ${C.gold}66`,
        boxShadow: `0 16px 44px rgba(0,0,0,0.6), 0 0 26px ${C.gold}22`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'cp-toast-in 0.24s ease both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.gold }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.gold, boxShadow: `0 0 8px ${C.gold}`, animation: 'cp-breathe 1.2s ease-in-out infinite' }} />
        EL TRABAJO TE BUSCA
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf2ff', marginTop: 4 }}>
        {job.title || 'Nueva oportunidad'}
      </div>
      <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: 'rgba(234,242,255,0.7)', marginTop: 2 }}>
        Nueva oferta publicada en la red · toca para verla
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <button
          onClick={() => { setActiveTab('empleos'); setJob(null); }}
          style={{ flex: 1, padding: '9px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: '#05060f', background: `linear-gradient(135deg, #ffd27a, ${C.gold})` }}
        >
          Ver oferta
        </button>
        <button
          onClick={() => setJob(null)}
          style={{ padding: '9px 12px', borderRadius: 10, border: `1px solid ${C.cyanFaint}`, cursor: 'pointer', fontFamily: FONT.body, fontSize: 12, color: 'rgba(234,242,255,0.55)', background: 'transparent' }}
        >
          Después
        </button>
      </div>
    </div>
  );
}
