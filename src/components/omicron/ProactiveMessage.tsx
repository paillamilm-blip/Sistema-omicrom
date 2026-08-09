// components/omicron/ProactiveMessage.tsx
// ═══════════════════════════════════════════════════════════════════════
// PROACTIVE MESSAGE — Burbuja del Oráculo CON botones de acción.
// Reemplaza el texto plano anterior. Cada mensaje tiene CTA.
// "Un mensaje sin botón es publicidad que se ignora."
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { C, FONT } from '../../theme';

export interface ProactiveAction {
  label: string;
  emoji?: string;
  primary?: boolean;
  onClick: () => void;
}

interface Props {
  message: string;
  actions?: ProactiveAction[];
  onDismiss?: () => void;
}

export function ProactiveMessage({ message, actions, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setVisible(true), 200);
    return () => clearTimeout(t);
  }, [message]);

  if (!message || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  return (
    <div style={{
      ...S.container,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
    }}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.tag}>ÓMICRON</span>
        <button onClick={handleDismiss} style={S.closeBtn}>✕</button>
      </div>

      {/* Message */}
      <p style={S.message}>{message}</p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div style={S.actions}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); handleDismiss(); }}
              style={action.primary ? S.btnPrimary : S.btnGhost}
            >
              {action.emoji && <span>{action.emoji}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'absolute',
    bottom: 110,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 'min(88%, 340px)',
    padding: '14px 16px',
    borderRadius: 16,
    background: 'rgba(6,12,26,0.92)',
    border: `1px solid ${C.cyanFaint}`,
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    boxShadow: '0 12px 40px rgba(0,0,0,0.55), 0 0 20px rgba(92,200,255,0.08)',
    transition: 'opacity 0.3s ease, transform 0.3s ease',
    zIndex: 8,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  tag: {
    fontFamily: FONT.mono,
    fontSize: 9,
    letterSpacing: 1.5,
    color: C.cyan,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: C.mut,
    cursor: 'pointer',
    fontSize: 12,
    padding: 4,
  },
  message: {
    margin: 0,
    fontFamily: FONT.body,
    fontSize: 13.5,
    color: C.ink,
    lineHeight: 1.5,
  },
  actions: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  btnPrimary: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '9px 14px',
    borderRadius: 10,
    border: 'none',
    background: `linear-gradient(135deg, ${C.cyan}, #008b9e)`,
    color: '#04121f',
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    boxShadow: '0 0 12px rgba(92,200,255,0.25)',
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '9px 14px',
    borderRadius: 10,
    border: `1px solid ${C.line}`,
    background: 'transparent',
    color: C.ink,
    fontFamily: FONT.mono,
    fontSize: 11,
    cursor: 'pointer',
  },
};
