// @ts-nocheck
// ═══════════════════════════════════════════════════════════════════════
// <ProactiveCards /> — Floating info cards that appear proactively
//
// Shows one message at a time, guiding the user to explore the app.
// Auto-dismisses after 6 seconds or on tap. Cycles through messages
// every 8 seconds. Stops after 5 cards shown or 3 node taps.
//
// Design: Landing Pro glass card with framer-motion animations.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { hapticLight } from '@/shared/utils/haptics';
import { C, FONT, RADIUS } from '@/theme';

// ── Message definitions ─────────────────────────────────────────────
interface CardMessage {
  id: string;
  icon: string;
  text: string;
  action?: string; // tab to navigate to, or undefined for informational
}

const MESSAGES: CardMessage[] = [
  { id: 'cv', icon: '📄', text: 'Sube tu CV para activar tu Gemelo Digital', action: 'cv' },
  { id: 'nodo', icon: '🎯', text: 'Toca un nodo del orbe para explorar' },
  { id: 'empleos', icon: '💼', text: 'Busca empleos que matchean contigo', action: 'empleos' },
  { id: 'academia', icon: '🎓', text: 'Aprende y sube tu reputación', action: 'academia' },
  { id: 'omicron', icon: '💡', text: 'Hablale a Ómicron — te responde con IA' },
];

// ── Session storage keys ────────────────────────────────────────────
const STORAGE_KEY = 'proactive_cards_shown_count';
const MAX_CARDS_PER_SESSION = 5;

function getShownCount(): number {
  try {
    return parseInt(sessionStorage.getItem(STORAGE_KEY) || '0', 10);
  } catch {
    return 0;
  }
}

function incrementShownCount(): number {
  const next = getShownCount() + 1;
  try {
    sessionStorage.setItem(STORAGE_KEY, String(next));
  } catch {}
  return next;
}

// ── Props ───────────────────────────────────────────────────────────
export interface ProactiveCardsProps {
  visible: boolean;
  onNavigate: (tab: string) => void;
  onDismiss?: () => void;
}

// ── Component ───────────────────────────────────────────────────────
export function ProactiveCards({ visible, onNavigate, onDismiss }: ProactiveCardsProps) {
  const userColor = useUserColor();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [show, setShow] = useState(false);
  const [stopped, setStopped] = useState(false);
  const lastInteraction = useRef(Date.now());
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Track node taps (listens for custom event dispatched on node tap)
  const nodeTapCount = useRef(0);

  // Stop condition check
  const shouldStop = useCallback(() => {
    return getShownCount() >= MAX_CARDS_PER_SESSION || nodeTapCount.current >= 3;
  }, []);

  // Listen for node tap events to count interactions
  useEffect(() => {
    const handleNodeTap = () => {
      nodeTapCount.current += 1;
      lastInteraction.current = Date.now();
      if (nodeTapCount.current >= 3) {
        setStopped(true);
        setShow(false);
      }
    };
    window.addEventListener('omicron:node-tap', handleNodeTap);
    return () => window.removeEventListener('omicron:node-tap', handleNodeTap);
  }, []);

  // Track any user interaction (touch, click, key) for idle detection
  useEffect(() => {
    const markActive = () => { lastInteraction.current = Date.now(); };
    window.addEventListener('pointerdown', markActive);
    window.addEventListener('keydown', markActive);
    return () => {
      window.removeEventListener('pointerdown', markActive);
      window.removeEventListener('keydown', markActive);
    };
  }, []);

  // Main cycle logic: wait for idle, show card, auto-dismiss, move to next
  useEffect(() => {
    if (!visible || stopped) {
      setShow(false);
      return;
    }

    if (shouldStop()) {
      setStopped(true);
      setShow(false);
      return;
    }

    // Start idle detection (first card shows after 2s, subsequent after 5s idle)
    const startIdleCheck = () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      const isFirstCard = currentIndex === 0 && !show;
      const idleThreshold = isFirstCard ? 2000 : 5000;
      idleTimer.current = setTimeout(() => {
        const elapsed = Date.now() - lastInteraction.current;
        if (elapsed >= idleThreshold) {
          // User is idle, show card
          showNextCard();
        } else {
          // Not idle yet, check again
          const remaining = idleThreshold - elapsed;
          idleTimer.current = setTimeout(() => startIdleCheck(), remaining);
        }
      }, idleThreshold);
    };

    const showNextCard = () => {
      if (shouldStop()) {
        setStopped(true);
        setShow(false);
        return;
      }
      setShow(true);
      hapticLight();
      incrementShownCount();

      // Auto-dismiss after 6 seconds
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      dismissTimer.current = setTimeout(() => {
        setShow(false);
        // After dismiss animation, schedule next card (8s cycle)
        if (cycleTimer.current) clearTimeout(cycleTimer.current);
        cycleTimer.current = setTimeout(() => {
          setCurrentIndex(prev => (prev + 1) % MESSAGES.length);
          startIdleCheck();
        }, 8000);
      }, 6000);
    };

    startIdleCheck();

    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
      if (dismissTimer.current) clearTimeout(dismissTimer.current);
      if (cycleTimer.current) clearTimeout(cycleTimer.current);
    };
  }, [visible, stopped, shouldStop]);

  // Dismiss handler
  const handleDismiss = useCallback(() => {
    setShow(false);
    lastInteraction.current = Date.now();
    if (dismissTimer.current) clearTimeout(dismissTimer.current);
    onDismiss?.();
  }, [onDismiss]);

  // CTA handler
  const handleCTA = useCallback(() => {
    const msg = MESSAGES[currentIndex];
    if (msg?.action) {
      onNavigate(msg.action);
    }
    handleDismiss();
  }, [currentIndex, onNavigate, handleDismiss]);

  const currentMessage = MESSAGES[currentIndex];

  if (!visible || stopped) return null;

  return (
    <AnimatePresence>
      {show && currentMessage && (
        <motion.div
          key={currentMessage.id}
          initial={{ opacity: 0, y: -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.97 }}
          transition={{ type: 'spring', stiffness: 340, damping: 28 }}
          style={{
            position: 'relative',
            zIndex: 45,
            maxWidth: 280,
            width: 'auto',
            margin: '0 auto',
            background: 'rgba(12,16,30,0.92)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)',
            border: `1px solid ${userColor}4D`, // 30% opacity
            borderRadius: RADIUS.lg,
            padding: '14px 16px 14px 14px',
            boxShadow: `0 4px 24px ${userColor}1A, 0 8px 32px rgba(0,0,0,0.4)`,
            cursor: 'pointer',
          }}
          onClick={handleDismiss}
        >
          {/* Close button */}
          <button
            onClick={(e) => { e.stopPropagation(); handleDismiss(); }}
            aria-label="Cerrar"
            style={{
              position: 'absolute',
              top: 6,
              right: 6,
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

          {/* Header */}
          <div style={{
            fontFamily: FONT.mono,
            fontSize: 9,
            letterSpacing: 1.5,
            color: userColor,
            textTransform: 'uppercase',
            marginBottom: 8,
            opacity: 0.8,
          }}>
            ⬡ TIP
          </div>

          {/* Icon + Text */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>
              {currentMessage.icon}
            </span>
            <p style={{
              margin: 0,
              fontFamily: FONT.body,
              fontSize: 13,
              lineHeight: 1.45,
              color: C.ink,
            }}>
              {currentMessage.text}
            </p>
          </div>

          {/* CTA button (only if action exists) */}
          {currentMessage.action && (
            <button
              onClick={(e) => { e.stopPropagation(); handleCTA(); }}
              style={{
                marginTop: 10,
                padding: '6px 14px',
                borderRadius: 999,
                border: 'none',
                background: userColor,
                color: '#000',
                fontFamily: FONT.body,
                fontWeight: 600,
                fontSize: 11,
                cursor: 'pointer',
                letterSpacing: 0.2,
              }}
            >
              Ir ahora →
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
