// components/perfil/ProactivePushes.tsx
// ═══════════════════════════════════════════════════════════════════════
// PUSHES PROACTIVOS EN TIEMPO REAL: notificaciones flotantes sobre el
// Oráculo que aparecen automáticamente (ofertas de trabajo, actividad de
// la red, mejoras sugeridas). Sistema de cola con auto-dismiss.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { C, FONT } from '../../theme';

export interface Push {
  id: string;
  type: 'offer' | 'activity' | 'improvement';
  title: string;
  subtitle?: string;
  tag?: string;
  actions?: Array<{ label: string; onClick: () => void; primary?: boolean }>;
  duration?: number; // ms, default 8000
}

interface Props {
  pushes: Push[];
  onDismiss: (id: string) => void;
}

export function ProactivePushes({ pushes, onDismiss }: Props) {
  const [visiblePushes, setVisiblePushes] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Mostrar nuevos pushes con animación
    pushes.forEach((push) => {
      if (!visiblePushes.has(push.id)) {
        setVisiblePushes((prev) => new Set(prev).add(push.id));

        // Auto-dismiss después del tiempo configurado
        const duration = push.duration || 8000;
        const timer = setTimeout(() => {
          onDismiss(push.id);
        }, duration);

        return () => clearTimeout(timer);
      }
    });
  }, [pushes, visiblePushes, onDismiss]);

  if (pushes.length === 0) return null;

  return (
    <div style={S.container}>
      {pushes.map((push) => (
        <PushItem key={push.id} push={push} onDismiss={() => onDismiss(push.id)} />
      ))}
    </div>
  );
}

function PushItem({ push, onDismiss }: { push: Push; onDismiss: () => void }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animar entrada
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  const typeStyles = getTypeStyles(push.type);

  return (
    <div
      style={{
        ...S.push,
        ...typeStyles.card,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.98)',
      }}
    >
      {push.tag && (
        <div style={{ ...S.tag, ...typeStyles.tag }}>
          <span style={{ ...S.tagDot, ...typeStyles.dot }} />
          {push.tag}
        </div>
      )}

      <div style={S.title}>{push.title}</div>

      {push.subtitle && <div style={S.subtitle}>{push.subtitle}</div>}

      {push.actions && push.actions.length > 0 && (
        <div style={S.actions}>
          {push.actions.map((action, i) => (
            <button
              key={i}
              onClick={() => {
                action.onClick();
                onDismiss();
              }}
              style={action.primary ? S.btnPrimary : S.btnGhost}
            >
              {action.label}
            </button>
          ))}
          <button onClick={onDismiss} style={S.btnGhost}>
            ✕
          </button>
        </div>
      )}
    </div>
  );
}

function getTypeStyles(type: Push['type']) {
  if (type === 'offer') {
    return {
      card: {
        borderColor: 'rgba(255,176,46,0.5)',
        boxShadow: '0 16px 44px rgba(0,0,0,0.55), 0 0 26px rgba(255,176,46,0.15)',
      },
      tag: { color: C.gold },
      dot: { background: C.gold, boxShadow: `0 0 8px ${C.gold}` },
    };
  }

  if (type === 'activity') {
    return {
      card: { borderColor: 'rgba(92,200,255,0.4)' },
      tag: { color: C.cyan },
      dot: { background: C.cyan, boxShadow: `0 0 8px ${C.cyan}` },
    };
  }

  // improvement
  return {
    card: { borderColor: 'rgba(63,208,201,0.4)' },
    tag: { color: C.green },
    dot: { background: C.green, boxShadow: `0 0 8px ${C.green}` },
  };
}

// ───────────────────────────────────────────────────────────────────────
// Hook para gestionar la cola de pushes
// ───────────────────────────────────────────────────────────────────────

export function usePushQueue() {
  const [pushes, setPushes] = useState<Push[]>([]);

  const addPush = useCallback((push: Omit<Push, 'id'>) => {
    const newPush: Push = {
      ...push,
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    };
    setPushes((prev) => [...prev, newPush]);
  }, []);

  const dismissPush = useCallback((id: string) => {
    setPushes((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setPushes([]);
  }, []);

  return { pushes, addPush, dismissPush, clearAll };
}

// ───────────────────────────────────────────────────────────────────────
// Estilos
// ───────────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  container: {
    position: 'fixed',
    left: '50%',
    transform: 'translateX(-50%)',
    bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
    zIndex: 26,
    width: 'min(80%, 320px)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: 5,
    pointerEvents: 'none',
    maxHeight: '22vh',
    overflow: 'hidden',
  },
  push: {
    pointerEvents: 'auto',
    borderRadius: 12,
    padding: '8px 12px',
    background: 'linear-gradient(180deg, rgba(10,14,26,0.88), rgba(5,7,16,0.94))',
    border: '1px solid rgba(80,100,140,0.12)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
    transition: 'all 0.34s cubic-bezier(0.2, 0.9, 0.25, 1)',
  },
  tag: {
    fontFamily: FONT.mono,
    fontSize: 9.5,
    fontWeight: 700,
    letterSpacing: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  tagDot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    animation: 'cp-pulse 1.2s ease-in-out infinite',
  },
  title: {
    fontFamily: FONT.display,
    fontSize: 13,
    fontWeight: 700,
    marginTop: 3,
    lineHeight: 1.25,
    color: C.ink,
  },
  subtitle: {
    fontFamily: FONT.mono,
    fontSize: 10.5,
    color: C.mut,
    marginTop: 2,
  },
  actions: {
    display: 'flex',
    gap: 6,
    marginTop: 9,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  btnPrimary: {
    flex: '0 0 auto',
    padding: '6px 13px',
    borderRadius: 10,
    border: 'none',
    cursor: 'pointer',
    fontFamily: FONT.display,
    fontSize: 11.5,
    fontWeight: 600,
    color: '#05060f',
    background: 'linear-gradient(135deg, #ffd27a, #ffb02e)',
  },
  btnGhost: {
    flex: '0 0 auto',
    padding: '6px 9px',
    borderRadius: 10,
    cursor: 'pointer',
    color: C.mut,
    background: 'transparent',
    border: 'none',
    fontFamily: FONT.display,
    fontSize: 11.5,
    fontWeight: 500,
  },
};
