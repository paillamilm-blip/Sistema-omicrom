// components/omicron/ProactiveMessage.tsx
// ═══════════════════════════════════════════════════════════════════════
// PROACTIVE MESSAGE — Burbuja del Oráculo CON botones de acción.
// Reemplaza el texto plano anterior. Cada mensaje tiene CTA.
// "Un mensaje sin botón es publicidad que se ignora."
//
// RESPUESTA VIVA (Inc 1):
//  • Los acentos usan el COLOR DEL USUARIO (userColor), no el gris/dorado
//    de marca. Las variantes translúcidas se derivan del color en runtime
//    (se le añade alfa, p.ej. `${userColor}22`) — sin nuevos hex fijos.
//  • Cuando `thinking` es true, la burbuja "respira" con una elipsis
//    animada ("Ómicrom está pensando…"). Bajo prefers-reduced-motion se
//    queda estática (estado final, sin animación ni loop).
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect } from 'react';
import { useReducedMotion } from 'framer-motion';
import { C, FONT } from '@/theme';

export interface ProactiveAction {
  label: string;
  emoji?: string;
  primary?: boolean;
  onClick: () => void;
}

interface Props {
  message: string;
  actions?: ProactiveAction[];
  /** Color del usuario para los acentos (tag, botón primario, borde, glow). */
  userColor: string;
  /** Mientras Ómicrom consulta la IA: muestra la elipsis viva. */
  thinking?: boolean;
  onDismiss?: () => void;
}

export function ProactiveMessage({ message, actions, userColor, thinking, onDismiss }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setVisible(true), 200);
    // Auto-dismiss después de 10s si el usuario no interactúa
    const autoDismiss = setTimeout(() => {
      setDismissed(true);
      onDismiss?.();
    }, 10000);
    return () => { clearTimeout(t); clearTimeout(autoDismiss); };
  }, [message, onDismiss]);

  if (!message || dismissed) return null;

  function handleDismiss() {
    setDismissed(true);
    onDismiss?.();
  }

  // Acentos derivados del color del usuario en runtime (alfa en hex).
  const accent = {
    tag: userColor,
    border: `${userColor}44`,
    glow: `${userColor}14`,
    btnBg: `linear-gradient(135deg, ${userColor}, ${userColor}cc)`,
    btnShadow: `0 0 12px ${userColor}40`,
  };

  return (
    <div style={{
      ...S.container,
      border: `1px solid ${accent.border}`,
      boxShadow: `0 1px 3px rgba(0,0,0,0.3), 0 12px 40px rgba(0,0,0,0.45), 0 0 20px ${accent.glow}`,
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0) scale(1)' : 'translateY(8px) scale(0.97)',
    }}>
      {/* Header */}
      <div style={S.header}>
        <span style={{ ...S.tag, color: accent.tag }}>ÓMICROM</span>
        <button onClick={handleDismiss} style={S.closeBtn}>✕</button>
      </div>

      {/* Message */}
      <p style={S.message}>
        {message}
        {thinking && (
          <span
            className={reduceMotion ? undefined : 'omicron-thinking-dots'}
            aria-hidden="true"
            style={{ marginLeft: 2 }}
          >
            …
          </span>
        )}
      </p>

      {/* Actions */}
      {actions && actions.length > 0 && (
        <div style={S.actions}>
          {actions.map((action, i) => (
            <button
              key={i}
              onClick={() => { action.onClick(); handleDismiss(); }}
              style={action.primary
                ? { ...S.btnPrimary, background: accent.btnBg, boxShadow: accent.btnShadow }
                : S.btnGhost}
            >
              {action.emoji && <span>{action.emoji}</span>}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {/* Animación de la elipsis "pensando". Bajo prefers-reduced-motion se
          apaga por completo (queda la elipsis estática, sin pulso ni loop). */}
      <style>{`
        .omicron-thinking-dots {
          display: inline-block;
          animation: omicron-thinking-pulse 1.2s ease-in-out infinite;
        }
        @keyframes omicron-thinking-pulse {
          0%, 100% { opacity: 0.35; }
          50%      { opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          .omicron-thinking-dots { animation: none; opacity: 1; }
        }
      `}</style>
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
    padding: '16px',
    borderRadius: 16,
    background: 'rgba(6,12,26,0.92)',
    backdropFilter: 'blur(14px)',
    WebkitBackdropFilter: 'blur(14px)',
    transition: 'opacity 0.3s cubic-bezier(0.32, 0.72, 0, 1), transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
    // Por encima de la vista fullscreen (zIndex 20) y de las superficies de
    // preview (4/5), pero por debajo de la barra de input (zIndex 50), para
    // que la respuesta acompañe al usuario sin quedar tapada ni tapar la barra.
    zIndex: 30,
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
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    color: C.mut,
    cursor: 'pointer',
    fontSize: 13,
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    display: 'grid',
    placeItems: 'center',
    borderRadius: 8,
  },
  message: {
    margin: 0,
    fontFamily: FONT.body,
    fontSize: 15,
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
    gap: 4,
    padding: '8px 12px',
    minHeight: 44,
    borderRadius: 12,
    border: 'none',
    color: '#000',
    fontFamily: FONT.mono,
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
  },
  btnGhost: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '8px 12px',
    minHeight: 44,
    borderRadius: 12,
    border: `1px solid ${C.line}`,
    background: 'transparent',
    color: C.ink,
    fontFamily: FONT.mono,
    fontSize: 11,
    cursor: 'pointer',
  },
};
