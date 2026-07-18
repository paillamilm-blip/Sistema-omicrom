// components/GemeloProactive.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · NOTIFICACIÓN PROACTIVA DEL GEMELO
// Toast animado que aparece cuando el Gemelo detecta algo importante.
// Voz + visual + acciones sincronizadas. Estilo premium holográfico.
// ═══════════════════════════════════════════════════════════════════════

import { useEffect, useState } from 'react';
import { X, Sparkles, AlertCircle, TrendingUp, Trophy, Bell } from 'lucide-react';
import type { ProactiveEvent } from '../lib/proactiveEngine';
import { C, FONT } from '../theme';

interface Props {
  event: ProactiveEvent | null;
  onDismiss: () => void;
  onAction?: (actionIndex: number) => void;
}

const EMOTION_ICONS = {
  idle: Sparkles,
  thinking: Bell,
  excited: TrendingUp,
  alert: AlertCircle,
  celebrating: Trophy,
};

const EMOTION_COLORS = {
  idle: C.cyan,
  thinking: C.purple,
  excited: C.gold,
  alert: C.red,
  celebrating: C.green,
};

export function GemeloProactive({ event, onDismiss, onAction }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (event && !dismissed) {
      // Animación de entrada con delay
      setTimeout(() => setVisible(true), 300);
      
      // Auto-dismiss después de 15 segundos si no tiene acciones
      if (!event.actions || event.actions.length === 0) {
        setTimeout(() => handleDismiss(), 15000);
      }
    } else {
      setVisible(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, dismissed]);

  const handleDismiss = () => {
    setVisible(false);
    setDismissed(true);
    setTimeout(() => {
      onDismiss();
      setDismissed(false);
    }, 300);
  };

  const handleAction = (index: number) => {
    if (onAction) {
      onAction(index);
    }
    handleDismiss();
  };

  if (!event) return null;

  const Icon = EMOTION_ICONS[event.emotion] || Sparkles;
  const color = EMOTION_COLORS[event.emotion] || C.cyan;
  const isUrgent = event.priority >= 4;

  return (
    <div
      style={{
        position: 'fixed',
        top: 60,
        right: 10,
        zIndex: 1000,
        maxWidth: 300,
        width: 'calc(100vw - 80px)',
        transform: visible ? 'translateX(0)' : 'translateX(calc(100% + 20px))',
        opacity: visible ? 1 : 0,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      {/* Toast container con glass effect */}
      <div
        style={{
          borderRadius: 18,
          background: 'linear-gradient(165deg, rgba(22,34,58,0.98), rgba(10,17,32,0.99))',
          border: `2px solid ${color}`,
          boxShadow: `0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${color}44`,
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          overflow: 'hidden',
          animation: isUrgent ? 'gemelo-urgent-pulse 2s ease-in-out infinite' : undefined,
        }}
      >
        {/* Header con icono emocional */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 12px',
            borderBottom: `1px solid ${color}33`,
            background: `linear-gradient(90deg, ${color}18, transparent)`,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: `${color}22`,
              border: `1.5px solid ${color}`,
              boxShadow: `0 0 12px ${color}44`,
              flexShrink: 0,
            }}
          >
            <Icon size={16} style={{ color }} />
          </div>
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 12, color: C.ink }}>
              Gemelo Digital
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.mut, letterSpacing: 0.6 }}>
              {event.type.toUpperCase().replace('_', ' ')} · P{event.priority}
            </div>
          </div>

          <button
            onClick={handleDismiss}
            aria-label="Cerrar notificación"
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(255,255,255,0.06)',
              border: `1px solid ${C.line}`,
              color: C.mut,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Mensaje del Gemelo */}
        <div style={{ padding: '10px 12px 8px' }}>
          <p
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontSize: 13,
              color: C.ink,
              lineHeight: 1.5,
              whiteSpace: 'pre-wrap',
            }}
          >
            {event.message}
          </p>
        </div>

        {/* Acciones (si existen) */}
        {event.actions && event.actions.length > 0 && (
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '0 12px 10px',
              borderTop: `1px solid ${C.line}`,
              paddingTop: 8,
            }}
          >
            {event.actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(index)}
                style={{
                  flex: 1,
                  padding: '8px 10px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontFamily: FONT.display,
                  fontWeight: 600,
                  fontSize: 11,
                  border: index === 0 ? 'none' : `1px solid ${C.line}`,
                  background: index === 0 
                    ? `linear-gradient(135deg, ${color}, ${color}cc)`
                    : 'rgba(255,255,255,0.05)',
                  color: index === 0 ? '#fff' : C.ink,
                  boxShadow: index === 0 ? `0 3px 10px ${color}44` : 'none',
                }}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Barra de progreso de auto-dismiss (solo si no hay acciones) */}
        {(!event.actions || event.actions.length === 0) && (
          <div
            style={{
              height: 3,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                background: `linear-gradient(90deg, ${color}, ${color}88)`,
                animation: 'gemelo-progress 15s linear forwards',
                transformOrigin: 'left',
              }}
            />
          </div>
        )}
      </div>

      {/* Keyframes inline */}
      <style>{`
        @keyframes gemelo-urgent-pulse {
          0%, 100% { 
            box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 40px ${color}44;
          }
          50% { 
            box-shadow: 0 20px 60px rgba(0,0,0,0.7), 0 0 60px ${color}88;
          }
        }
        
        @keyframes gemelo-progress {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
    </div>
  );
}
