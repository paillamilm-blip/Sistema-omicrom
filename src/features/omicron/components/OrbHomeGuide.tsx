// src/features/omicron/components/OrbHomeGuide.tsx
// ═══════════════════════════════════════════════════════════════════════
// <OrbHomeGuide /> — Superficie de bienvenida CALMA del orbe.
//
// Aparece SOLO la primera vez de cada sesión de navegador (la gestión del
// flag de sesión vive en OrbShell). Muestra un saludo personalizado y
// 2-3 chips de acción tocables para que la persona nunca se sienta
// perdida al aterrizar. Es descartable (tocar un chip o el cierre) y no
// vuelve a aparecer esa sesión.
//
// Reutiliza la navegación existente vía onNavigate(tab); coexiste con
// ProactiveCards y OrbContextLabel (que quedan tal cual).
//
// Estética: glass card al estilo ProactiveCards, acento userColor.
// Animación con framer-motion, respetando prefers-reduced-motion.
// ═══════════════════════════════════════════════════════════════════════

import { motion, AnimatePresence, useReducedMotion, type Variants } from 'framer-motion';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { hapticLight } from '@/shared/utils/haptics';
import { C, FONT, RADIUS } from '@/theme';
import { buildGreeting, buildHomeActions } from '../utils/orbHomeGuide';

export interface OrbHomeGuideProps {
  userName: string;
  hasCv: boolean;
  visible: boolean;
  onNavigate: (tab: string) => void;
  onDismiss: () => void;
}

export function OrbHomeGuide({ userName, hasCv, visible, onNavigate, onDismiss }: OrbHomeGuideProps) {
  const userColor = useUserColor();
  const reduce = useReducedMotion();

  const greeting = buildGreeting(userName);
  const actions = buildHomeActions(hasCv);

  const handleChip = (tab: string) => {
    hapticLight();
    onNavigate(tab);
    onDismiss();
  };

  // Variantes con animación; en reduced-motion se anulan transform/opacity.
  const containerVariants: Variants = reduce
    ? { hidden: {}, show: {}, exit: {} }
    : {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.06, delayChildren: 0.04 } },
        exit: { opacity: 0, transition: { duration: 0.18 } },
      };

  const itemVariants: Variants = reduce
    ? { hidden: {}, show: {}, exit: {} }
    : {
        hidden: { opacity: 0, y: 10 },
        show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 340, damping: 28 } },
        exit: { opacity: 0, y: 6 },
      };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="orb-home-guide"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          exit="exit"
          style={{
            maxWidth: 340,
            width: '100%',
            margin: '0 auto',
            pointerEvents: 'auto',
            background: 'rgba(12,16,30,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${userColor}4D`,
            borderRadius: RADIUS.lg,
            padding: '14px 16px',
            boxShadow: `0 4px 24px ${userColor}1A, 0 8px 32px rgba(0,0,0,0.4)`,
          }}
        >
          {/* Cabecera: eyebrow + cierre */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <motion.p
              variants={itemVariants}
              style={{
                margin: 0,
                fontFamily: FONT.body,
                fontSize: 14,
                lineHeight: 1.4,
                color: C.ink,
                fontWeight: 600,
              }}
            >
              {greeting}
            </motion.p>
            <button
              onClick={onDismiss}
              aria-label="Cerrar"
              style={{
                flexShrink: 0,
                width: 24,
                height: 24,
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: C.mut,
                fontSize: 11,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                padding: 0,
                lineHeight: 1,
              }}
            >
              ✕
            </button>
          </div>

          {/* Chips de acción tocables */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12 }}>
            {actions.map((action) => (
              <motion.button
                key={action.tab + action.label}
                variants={itemVariants}
                onClick={() => handleChip(action.tab)}
                style={{
                  pointerEvents: 'auto',
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid ${userColor}66`,
                  background: `${userColor}1A`,
                  color: C.ink,
                  fontFamily: FONT.body,
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: 0.2,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {action.label}
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
