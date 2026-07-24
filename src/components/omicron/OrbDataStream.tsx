// src/components/omicron/OrbDataStream.tsx
// Capa holográfica sobre la orbe del home. Muestra:
//  - Anillos ambientales girando (el Gemelo "procesa datos" siempre).
//  - Una ráfaga de datos convergiendo al núcleo cuando llega una notificación
//    (efecto "carga de datos en la orbe").
//  - Un chip con el texto del aviso, que se auto-oculta.
//
// No captura clics (pointerEvents:none) para no tapar los nodos orbitando.
// Es responsivo: todo se dimensiona con % / clamp respecto al contenedor.
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { C, FONT } from '../../theme';
import { useOrbNotice, type OrbTone, type OrbNotice } from '../../lib/orbNotify';

const TONE_COLOR: Record<OrbTone, string> = {
  info: C.cyan,
  success: C.green,
  alert: C.red,
  gold: C.gold,
};

const STREAK_COUNT = 12;
const NOTICE_MS = 4500;

const wrap: React.CSSProperties = {
  position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)',
  width: 'min(78vw, 320px)', height: 'min(78vw, 320px)',
};

// Ráfaga de datos convergiendo al núcleo (se remonta con cada notificación).
function DataBurst({ color }: { color: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [R, setR] = useState(120);
  useEffect(() => {
    const s = ref.current?.clientWidth ?? 260;
    setR(s * 0.46);
  }, []);

  return (
    <div ref={ref} style={{ position: 'absolute', inset: 0 }}>
      {/* Anillo que colapsa hacia adentro (datos entrando) */}
      <motion.div
        initial={{ x: '-50%', y: '-50%', scale: 1.5, opacity: 0.8 }}
        animate={{ x: '-50%', y: '-50%', scale: 0.18, opacity: 0 }}
        transition={{ duration: 1.1, ease: 'easeIn' }}
        style={{ position: 'absolute', left: '50%', top: '50%', width: '72%', height: '72%', borderRadius: '50%', border: `2px solid ${color}`, boxShadow: `0 0 26px ${color}` }}
      />
      {/* Eco expandiéndose (confirmación) */}
      <motion.div
        initial={{ x: '-50%', y: '-50%', scale: 0.3, opacity: 0.5 }}
        animate={{ x: '-50%', y: '-50%', scale: 1.35, opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
        style={{ position: 'absolute', left: '50%', top: '50%', width: '46%', height: '46%', borderRadius: '50%', border: `1px solid ${color}` }}
      />
      {/* Partículas de datos convergiendo desde el perímetro */}
      {Array.from({ length: STREAK_COUNT }).map((_, i) => {
        const a = (i / STREAK_COUNT) * Math.PI * 2;
        return (
          <motion.span
            key={i}
            initial={{ x: Math.cos(a) * R, y: Math.sin(a) * R, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: [0, 1, 0] }}
            transition={{ duration: 0.95, ease: 'easeIn', times: [0, 0.35, 1], delay: (i % 4) * 0.05 }}
            style={{ position: 'absolute', left: '50%', top: '50%', width: 5, height: 5, marginLeft: -2.5, marginTop: -2.5, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }}
          />
        );
      })}
    </div>
  );
}

export default function OrbDataStream() {
  const notice = useOrbNotice();
  const [shown, setShown] = useState<OrbNotice | null>(null);
  const [burstId, setBurstId] = useState(0);

  useEffect(() => {
    if (!notice) return;
    setShown(notice);
    setBurstId((b) => b + 1);
    const t = setTimeout(() => setShown((s) => (s && s.id === notice.id ? null : s)), NOTICE_MS);
    return () => clearTimeout(t);
  }, [notice]);

  const color = shown ? TONE_COLOR[shown.tone] : C.cyan;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 4, overflow: 'hidden' }}>
      {/* Anillos ambientales: sensación de sistema procesando datos */}
      <div style={wrap}>
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '60%', height: '60%', borderRadius: '50%', border: `1px solid ${C.cyan}22`, animation: 'cp-spin 20s linear infinite' }} />
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: '82%', height: '82%', borderRadius: '50%', border: `1px dashed ${C.purple}1c`, animation: 'cp-spin 30s linear infinite reverse' }} />
      </div>

      {/* Ráfaga de datos al llegar una notificación */}
      <div style={wrap}>
        <AnimatePresence>
          {burstId > 0 && <DataBurst key={burstId} color={color} />}
        </AnimatePresence>
      </div>

      {/* Chip holográfico con el texto del aviso */}
      <AnimatePresence>
        {shown && (
          <motion.div
            key={shown.id}
            initial={{ opacity: 0, y: -8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.32 }}
            style={{
              position: 'absolute', top: '5%', left: '50%', transform: 'translateX(-50%)',
              maxWidth: 'min(86%, 320px)', display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 13px', borderRadius: 999,
              background: 'rgba(6,10,22,0.82)', border: `1px solid ${color}66`,
              boxShadow: `0 0 20px ${color}55`, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}`, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 'clamp(10px, 3vw, 12px)', letterSpacing: 0.3, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {shown.text}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
