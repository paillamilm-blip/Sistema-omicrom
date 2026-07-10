// src/components/shared/LivePresence.tsx
// UI de la red en vivo:
//   · LiveBadge      → pastilla en el header con el nº REAL de nodos en línea.
//   · LiveNetworkFeed → push efímero (arriba, centrado) con el evento más
//                       reciente del ecosistema (alguien entró / subió de nivel…).
// Ambos leen del mismo canal a través de useRealtime() (una sola conexión).
import { useEffect, useRef, useState } from 'react';
import { useRealtime } from '../../store/RealtimeContext';
import type { LiveEvent, LiveEventKind } from '../../hooks/useRealtimeNetwork';
import { C, FONT } from '../../theme';

export function LiveBadge() {
  const { onlineCount, connected } = useRealtime();
  const label = connected ? onlineCount.toLocaleString() : '—';

  return (
    <span
      title={connected ? `${onlineCount} nodos en línea ahora` : 'Conectando a la red…'}
      aria-label="Nodos en línea"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        padding: '5px 9px',
        borderRadius: 14,
        background: 'rgba(47,224,20,0.08)',
        border: `1px solid ${C.greenDim}`,
        fontFamily: FONT.mono,
        fontSize: 11,
        color: '#eaf2ff',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: connected ? C.green : C.goldDim,
          boxShadow: connected ? `0 0 8px ${C.green}` : 'none',
          animation: connected ? 'cp-breathe 2s ease-in-out infinite' : 'none',
        }}
      />
      <span style={{ fontWeight: 700 }}>{label}</span>
    </span>
  );
}

const KIND_STYLE: Record<LiveEventKind, { color: string; tag: string }> = {
  join:   { color: C.cyan,  tag: 'RED EN VIVO' },
  action: { color: C.cyan,  tag: 'RED EN VIVO' },
  level:  { color: C.gold,  tag: 'ASCENSO' },
  system: { color: C.green, tag: 'SISTEMA' },
};

export function LiveNetworkFeed() {
  const { events, onlineCount } = useRealtime();
  const [current, setCurrent] = useState<LiveEvent | null>(null);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    const e = events[0];
    if (e && e.id !== lastId.current) {
      lastId.current = e.id;
      setCurrent(e);
      const t = setTimeout(() => setCurrent(null), 4600);
      return () => clearTimeout(t);
    }
  }, [events]);

  if (!current) return null;
  const ks = KIND_STYLE[current.kind] ?? KIND_STYLE.action;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(60px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 60,
        width: 'min(92%, 420px)',
        padding: '9px 13px',
        borderRadius: 12,
        background: 'linear-gradient(180deg, rgba(10,20,40,0.92), rgba(2,6,19,0.95))',
        border: `1px solid ${ks.color}55`,
        boxShadow: `0 12px 34px rgba(0,0,0,0.55), 0 0 22px ${ks.color}22`,
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        animation: 'cp-toast-in 0.24s ease both',
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontFamily: FONT.mono,
          fontSize: 8.5,
          letterSpacing: 1,
          color: ks.color,
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: ks.color,
            boxShadow: `0 0 8px ${ks.color}`,
            animation: 'cp-breathe 1.4s ease-in-out infinite',
          }}
        />
        {ks.tag} · {onlineCount.toLocaleString()} NODOS
      </div>
      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13.5, color: '#eaf2ff', marginTop: 3 }}>
        {current.text}
      </div>
    </div>
  );
}
