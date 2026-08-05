// components/omicron/OmicronAssistant.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Gemelo Digital automatizado — la experiencia principal.
//
// NO es un botón: es la pantalla de inicio. Al entrar, la orbe de
// partículas (vibrando con el sonido) te recibe, te motiva a subir tu CV
// real (PDF/Word) y a medir tu nivel con un examen; muestra tu nivel y las
// propuestas de mejora por nodos; y desde acá navegás por toda la app.
// Escribir/hablar van DEBAJO de la orbe. Sistema de aprendizaje continuo.
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Send, Sparkles, ArrowRight, Upload, FileCheck2, LogOut,
  GraduationCap, Zap, Briefcase, Store, Wallet, Database, MessageSquare, Scale, RotateCcw,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../lib/supabase';
import { interpret, askCoach, askTutor } from '../../lib/oraculo';
import { computeSteps, nodeGuidance, type NextStep } from '../../lib/omicronCoach';
import { speak, stopSpeaking } from '../../lib/voiceEngine';
import { C, FONT, RADIUS } from '../../theme';
import ParticleOrb from './ParticleOrb';
import OrbDataStream from './OrbDataStream';
import ConvalidaOmicron from './ConvalidaOmicron';
import { notifyOrb } from '../../lib/orbNotify';
import type { TabId } from '../../types';

type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'En línea',
  listening: 'Escuchando…',
  thinking: 'Procesando…',
  speaking: 'Ómicron responde',
};
const STATE_COLOR: Record<OrbState, string> = {
  idle: C.cyan, listening: C.green, thinking: C.purple, speaking: C.gold,
};

const NODES: { tab: TabId; label: string; Icon: typeof GraduationCap }[] = [
  { tab: 'academia', label: 'Academia', Icon: GraduationCap },
  { tab: 'maxskill', label: 'Habilidades', Icon: Zap },
  { tab: 'empleos', label: 'Empleos', Icon: Briefcase },
  { tab: 'market', label: 'Servicios', Icon: Store },
  { tab: 'wallet', label: 'Billetera', Icon: Wallet },
  { tab: 'vault', label: 'Bóveda', Icon: Database },
  { tab: 'chat', label: 'Mensajes', Icon: MessageSquare },
  { tab: 'gobernanza', label: 'Gobernanza', Icon: Scale },
];

// Reconocimiento de voz (tipos mínimos)
interface SRAlt { transcript: string }
interface SREvent { results: ArrayLike<ArrayLike<SRAlt>> }
interface SpeechRecognitionLike {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: SREvent) => void) | null; onerror: (() => void) | null; onend: (() => void) | null;
  start: () => void; stop: () => void; abort: () => void;
}
type SRCtor = new () => SpeechRecognitionLike;
function getRecognitionCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ─────────────────────────────────────────────────────────────────────────
// NodeOrbit — los nodos flotan y orbitan alrededor de la orbe. Sinergia real:
// cada nodo se puede TOCAR y ARRASTRAR para reposicionarlo donde el usuario
// quiera; su lugar queda guardado (localStorage) y conectado al núcleo con
// una línea de "sinergia". Los nodos que aún no se movieron siguen girando
// solos (efecto vivo, guía visual inicial). Profundidad real: los del
// frente se ven grandes y brillantes; los del fondo, chicos y tenues. El
// nodo recomendado por el motor (highlightTab) brilla para guiarte.
//
// ZONA DE ANCLAJE (pedido explícito del usuario): si sueltas un nodo en la
// franja inferior (justo arriba de donde se habla/escribe), en vez de
// quedar flotando libre se ORDENA EN FILA junto a los demás nodos anclados,
// según el criterio del usuario: el punto horizontal donde lo soltás
// determina su lugar en el orden (izquierda = primero). Se puede reordenar
// sacando y volviendo a soltar cualquier nodo anclado.
//
// BRILLO DE SELECCIÓN (pedido explícito del usuario, independiente del
// brillo dorado de "sugerencia de la IA" = highlightTab): al tocar un nodo
// para navegar, se enciende un anillo verde pulsante + el ícono brilla,
// como confirmación inmediata de "tu toque se registró" — visible durante
// la breve pausa antes de cambiar de pantalla (Ómicron suele hablar
// primero, ver goNode en el padre).
//
// Al confirmarse un arrastre (onDragStart) el nodo se congela en su posición
// actual (sin salto) y desde ahí sigue libre → al soltar, la posición queda
// fija para siempre (hasta "Reordenar"). Esto evita el bug histórico de
// "el nodo se aleja al tocarlo": no hay pelea entre la rotación automática
// y el gesto de arrastre porque la rotación deja de aplicarse en cuanto el
// drag arranca. Navegar (tap) y reposicionar (drag) usan los gestos nativos
// de Framer Motion (onTap/onDragStart/onDragEnd) más una bandera propia
// (justDraggedRef) que bloquea la navegación justo después de soltar un
// arrastre real — ver nota técnica 2 y la definición de justDraggedRef más
// abajo. Se aísla en su propio componente para no re-renderizar todo el
// asistente.
// ─────────────────────────────────────────────────────────────────────────
const NODE_POS_KEY = 'omicron_node_positions_v1';
const NODE_ANCHOR_KEY = 'omicron_node_anchor_v1';
const NODE_HINT_KEY = 'omicron_node_hint_seen_v1';

// Zona de anclaje: franja horizontal en la parte inferior del área del
// orbe, justo arriba de donde se habla/escribe. Soltar un nodo ahí lo
// ordena en fila (según el criterio del usuario: el orden en que lo va
// soltando/arrastrando), en vez de dejarlo flotando en cualquier punto.
const ANCHOR_ZONE_Y_MIN = 74; // % del alto del área del orbe
const ANCHOR_SLOT_Y = 87;     // % — línea vertical donde se alinean los nodos anclados

type NodePos = { xPct: number; yPct: number };

function loadNodePositions(): Partial<Record<TabId, NodePos>> {
  try {
    const raw = localStorage.getItem(NODE_POS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<TabId, NodePos>>) : {};
  } catch { return {}; }
}

function loadAnchoredOrder(): TabId[] {
  try {
    const raw = localStorage.getItem(NODE_ANCHOR_KEY);
    return raw ? (JSON.parse(raw) as TabId[]) : [];
  } catch { return []; }
}

/** Posición (x%, y%) del slot i-ésimo de n nodos anclados, distribuidos en la franja. */
function anchorSlotPos(i: number, n: number): { x: number; y: number } {
  const x = n <= 1 ? 50 : 12 + i * (76 / (n - 1));
  return { x, y: ANCHOR_SLOT_Y };
}

function NodeOrbit({ nodes, onSelect, highlightTab, highlightAccent }: {
  nodes: { tab: TabId; label: string; Icon: typeof GraduationCap }[];
  onSelect: (tab: TabId) => void;
  highlightTab?: TabId | null;
  highlightAccent?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeElsRef = useRef<Map<TabId, HTMLButtonElement>>(new Map());
  // Orden de los nodos anclados en la franja inferior (zona de anclaje),
  // en el orden en que el usuario los fue soltando/reordenando — "según mi
  // criterio", pedido explícito del usuario.
  const [anchoredOrder, setAnchoredOrder] = useState<TabId[]>(() => loadAnchoredOrder());
  // Feedback visual mientras se arrastra un nodo hacia la franja (se activa
  // cruzando ANCHOR_ZONE_Y_MIN, no en cada frame — barato en renders).
  const [zoneActive, setZoneActive] = useState(false);
  // Nodo seleccionado (independiente de highlightTab, que es la SUGERENCIA
  // de la IA). Se enciende al confirmarse un tap real y se apaga solo tras
  // un momento — cubre la ventana de transición hacia la otra pantalla
  // (goNode en el padre demora la navegación hasta ~650ms para que Ómicron
  // hable primero), así el usuario VE que su toque se registró antes de
  // que la pantalla cambie.
  const [selectedTab, setSelectedTab] = useState<TabId | null>(null);
  // Bandera "se acaba de arrastrar" por nodo. Framer Motion NO garantiza que
  // `onTap`/`onClick` se cancelen automáticamente tras un `onDragEnd` real en
  // todos los navegadores/dispositivos (confirmado revisando reportes de la
  // comunidad de Framer Motion) — de ahí el bug reportado de "al mover un
  // nodo se abre la pestaña sola". Se limpia con setTimeout(0), NO de forma
  // inmediata: el evento tap/click se dispara sincrónicamente justo después
  // de onDragEnd, así que si la limpiáramos ahí mismo, tap la vería en false
  // de todos modos. setTimeout(0) la deja en true durante ese instante y la
  // limpia recién en el siguiente ciclo, listo para el próximo gesto.
  const justDraggedRef = useRef<Set<TabId>>(new Set());
  const [rot, setRot] = useState(0);
  const [pinned, setPinned] = useState<Partial<Record<TabId, NodePos>>>(() => loadNodePositions());
  const [hintVisible, setHintVisible] = useState(() => {
    try { return !localStorage.getItem(NODE_HINT_KEY) && Object.keys(loadNodePositions()).length === 0; } catch { return false; }
  });

  const rotRef = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let accum = 0;
    const loop = (t: number) => {
      const dt = Math.min(t - last, 64);
      last = t;
      rotRef.current = (rotRef.current + dt * 0.00008) % (Math.PI * 2);
      accum += dt;
      // Actualizar React solo a ~15fps para no matar rendimiento
      if (accum > 66) {
        setRot(rotRef.current);
        accum = 0;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const persist = useCallback((next: Partial<Record<TabId, NodePos>>) => {
    setPinned(next);
    try { localStorage.setItem(NODE_POS_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  const persistAnchored = useCallback((next: TabId[]) => {
    setAnchoredOrder(next);
    try { localStorage.setItem(NODE_ANCHOR_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    try { localStorage.setItem(NODE_HINT_KEY, '1'); } catch { /* noop */ }
  }, []);

  const resetLayout = useCallback(() => { persist({}); persistAnchored([]); }, [persist, persistAnchored]);

  const n = nodes.length;
  const hasPinned = Object.keys(pinned).length > 0 || anchoredOrder.length > 0;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {/* Anillo guía vertical (se desvanece a medida que armás tu propia red de nodos) */}
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: '76%', height: '80%', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `1px dashed ${C.line}`, opacity: hasPinned ? 0.12 : 0.35, transition: 'opacity 0.8s ease' }} />

      {/* Zona de anclaje: franja justo arriba de donde se habla/escribe. Se
          resalta SOLO mientras se está arrastrando un nodo por encima de ella
          (feedback claro de "acá se ordena en fila"). */}
      <div style={{
        position: 'absolute', left: '4%', right: '4%', top: `${ANCHOR_ZONE_Y_MIN}%`, bottom: 2,
        borderRadius: RADIUS.lg, border: `1px dashed ${zoneActive ? C.cyan : 'transparent'}`,
        background: zoneActive ? `${C.cyan}0f` : 'transparent',
        transition: 'background 0.15s ease, border-color 0.15s ease',
      }} />

      {/* Líneas de sinergia: cada nodo reposicionado (libre o anclado en la
          franja inferior) queda conectado al núcleo. */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        {nodes.map((node) => {
          const anchorIdx = anchoredOrder.indexOf(node.tab);
          const anchorPos = anchorIdx !== -1 ? anchorSlotPos(anchorIdx, anchoredOrder.length) : null;
          const p = anchorPos ?? (pinned[node.tab] ? { x: pinned[node.tab]!.xPct, y: pinned[node.tab]!.yPct } : null);
          if (!p) return null;
          const isHi = node.tab === highlightTab;
          return (
            <line key={node.tab} x1="50%" y1="50%" x2={`${p.x}%`} y2={`${p.y}%`}
              stroke={isHi ? (highlightAccent || C.gold) : C.cyan} strokeWidth={0.8} strokeDasharray="3 6" opacity={0.25}
              style={{ transition: 'all 0.4s ease' }} />
          );
        })}
      </svg>

      {nodes.map((node, i) => {
        const anchorIdx = anchoredOrder.indexOf(node.tab);
        const isAnchored = anchorIdx !== -1;
        const custom = pinned[node.tab];
        // Órbita helicoidal vertical: los nodos están FIJOS en órbita
        // alrededor del ADN. NO se pueden soltar en cualquier parte —
        // solo se pueden reordenar dentro de la órbita o anclar abajo.
        const verticalSpread = 0.70;
        const helixTurns = 1.2;
        const nodeProgress = i / n;
        const ang = rot + nodeProgress * Math.PI * 2 * helixTurns;
        const helixRadius = 40 + Math.sin(ang * 0.3) * 3;
        const autoX = 50 + helixRadius * Math.cos(ang);
        const autoY = (50 - verticalSpread * 50 / 2) + nodeProgress * verticalSpread * 50;
        const anchorPos = isAnchored ? anchorSlotPos(anchorIdx, anchoredOrder.length) : null;
        const x = anchorPos?.x ?? custom?.xPct ?? autoX;
        const y = anchorPos?.y ?? custom?.yPct ?? autoY;
        const depth = isAnchored || custom ? 0.85 : (Math.sin(ang) + 1) / 2;   // fijados/anclados: siempre "al frente"
        const scale = 0.68 + depth * 0.5;
        const opacity = 0.4 + depth * 0.6;
        const z = 10 + Math.round(depth * 100);
        const hi = node.tab === highlightTab;
        const isSelected = node.tab === selectedTab;
        const accent = hi ? (highlightAccent || C.gold) : C.cyan;
        const Icon = node.Icon;

        return (
          // Nota técnica 1: NO se usa `transform: translate()` manual para centrar
          // este botón — colisionaría con el transform que Framer Motion genera
          // para el `drag`. Centrado con calc()/píxeles (mitad del tamaño del
          // nodo) y `scale` pasado como prop de motion (no como string CSS): así
          // Framer Motion compone drag + scale en un único transform consistente,
          // y el hit-box de toque siempre coincide con lo que se ve.
          //
          // Nota técnica 2: navegar usa `onTap` (gesto propio de Framer Motion,
          // más confiable que `onClick` nativo en touch) PERO además se chequea
          // `justDraggedRef` como segunda barrera de seguridad — ver comentario
          // junto a la definición de `justDraggedRef` más arriba (bug real
          // reportado: "al mover un nodo se abre la pestaña sola").
          <motion.button
            key={node.tab}
            drag
            dragMomentum={false}
            dragElastic={0.1}
            dragConstraints={containerRef}
            onDragStart={() => {
              // Freeze en la posición actual (recién al confirmarse el arrastre,
              // no en cada toque) — así el nodo nunca "se aleja" al agarrarlo.
              // Si el nodo ya estaba anclado, se lo saca de la franja al empezar
              // a arrastrarlo (queda libre hasta que se decida su nuevo lugar).
              if (isAnchored) persistAnchored(anchoredOrder.filter((t) => t !== node.tab));
              if (!pinned[node.tab]) persist({ ...pinned, [node.tab]: { xPct: autoX, yPct: autoY } });
              if (hintVisible) dismissHint();
            }}
            onDrag={(_e, info) => {
              // Detecta si el puntero está sobre la franja de anclaje (parte
              // inferior del área del orbe) — solo actualiza el estado al
              // cruzar el umbral, no en cada frame, para no forzar renders de
              // más mientras se arrastra.
              const containerEl = containerRef.current;
              if (!containerEl) return;
              const rect = containerEl.getBoundingClientRect();
              const py = ((info.point.y - rect.top) / rect.height) * 100;
              const inZone = py >= ANCHOR_ZONE_Y_MIN;
              setZoneActive((prev) => (prev === inZone ? prev : inZone));
            }}
            onDragEnd={(_e, info) => {
              const nodeEl = nodeElsRef.current.get(node.tab);
              const containerEl = containerRef.current;
              if (!nodeEl || !containerEl) { setZoneActive(false); return; }
              const containerRect = containerEl.getBoundingClientRect();
              const py = ((info.point.y - containerRect.top) / containerRect.height) * 100;
              const px = ((info.point.x - containerRect.left) / containerRect.width) * 100;

              if (py >= ANCHOR_ZONE_Y_MIN) {
                // Soltado en zona de anclaje: ordenar en fila
                const rest = anchoredOrder.filter((t) => t !== node.tab);
                let insertAt = rest.length;
                for (let k = 0; k < rest.length; k++) {
                  const slot = anchorSlotPos(k, rest.length);
                  if (px < slot.x) { insertAt = k; break; }
                }
                const next = [...rest.slice(0, insertAt), node.tab, ...rest.slice(insertAt)];
                persistAnchored(next);
                if (pinned[node.tab]) {
                  const restPinned = { ...pinned };
                  delete restPinned[node.tab];
                  persist(restPinned);
                }
              } else if (px >= 8 && px <= 92 && py >= 8 && py <= ANCHOR_ZONE_Y_MIN - 2) {
                // Soltado DENTRO de la zona válida del orbe: fijar posición
                persist({ ...pinned, [node.tab]: { xPct: Math.min(92, Math.max(8, px)), yPct: Math.min(ANCHOR_ZONE_Y_MIN - 4, Math.max(8, py)) } });
              } else {
                // Soltado FUERA de la zona válida: snap-back a la órbita (borrar posición fija)
                if (pinned[node.tab]) {
                  const restPinned = { ...pinned };
                  delete restPinned[node.tab];
                  persist(restPinned);
                }
              }
              setZoneActive(false);
              justDraggedRef.current.add(node.tab);
              setTimeout(() => justDraggedRef.current.delete(node.tab), 0);
            }}
            onTap={() => {
              if (justDraggedRef.current.has(node.tab)) return;
              setSelectedTab(node.tab);
              setTimeout(() => setSelectedTab((cur) => (cur === node.tab ? null : cur)), 900);
              onSelect(node.tab);
            }}
            ref={(el) => {
              if (el) nodeElsRef.current.set(node.tab, el);
              else nodeElsRef.current.delete(node.tab);
            }}
            aria-label={`${node.label} — tocá para entrar, mantené para reposicionar`}
            aria-pressed={isSelected}
            whileTap={{ scale: 1.08 }}
            whileHover={{ scale: 1.05 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
              position: 'absolute',
              left: `calc(${x}% - 24px)`, top: `calc(${y}% - 24px)`,
              width: 48, zIndex: isSelected ? 200 : z, scale, opacity,
              pointerEvents: 'auto', touchAction: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'grab', padding: 0, margin: 0,
            }}
          >
            {/* Anillo de selección: feedback de "tu toque se registró",
                independiente del brillo dorado de sugerencia de la IA (hi).
                whileTap arriba ya da el "pop" instantáneo al tocar; este
                anillo sostiene la señal visual durante la breve pausa antes
                de navegar (Ómicron suele hablar primero). */}
            {isSelected && (
              <motion.span
                initial={{ opacity: 0, scale: 0.7 }}
                animate={{ opacity: [0.9, 0.4, 0.9], scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute', top: -5, left: -5, right: -5, bottom: 13,
                  borderRadius: '50%', border: `2px solid ${C.green}`,
                  boxShadow: `0 0 16px ${C.green}`, pointerEvents: 'none',
                }}
              />
            )}
            <span style={{
              width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(circle at 32% 26%, ${isSelected ? C.green : accent}33, rgba(6,10,22,0.82))`,
              border: `1px solid ${isSelected ? C.green : accent}${hi || isSelected ? '' : '66'}`,
              boxShadow: isSelected
                ? `0 0 24px ${C.green}, inset 0 0 14px ${C.green}55`
                : hi ? `0 0 22px ${accent}, inset 0 0 14px ${accent}55` : `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${accent}33`,
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            }}>
              <Icon size={20} color={hi || isSelected ? '#fff' : accent} />
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.3, color: isSelected ? C.green : hi ? accent : C.ink, textShadow: '0 1px 5px #000, 0 0 2px #000', whiteSpace: 'nowrap' }}>{node.label}</span>
          </motion.button>
        );
      })}

      {/* Pista de uso — una sola vez, hasta que el usuario mueva un nodo */}
      {hintVisible && (
        <div style={{
          position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)', pointerEvents: 'none',
          fontFamily: FONT.mono, fontSize: 9, letterSpacing: 0.4, color: C.cyanDim, textShadow: '0 1px 5px #000',
          background: 'rgba(4,8,18,0.55)', padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap',
        }}>
          ✋ Mantené y arrastrá un nodo — soltalo abajo para ordenarlo en fila
        </div>
      )}

      {/* Reordenar: vuelve todos los nodos a la órbita automática */}
      {hasPinned && (
        <button onClick={resetLayout} aria-label="Reordenar nodos automáticamente" style={{
          position: 'absolute', bottom: 4, right: 4, pointerEvents: 'auto', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 5, padding: '5px 9px', borderRadius: 999,
          background: 'rgba(6,10,22,0.65)', border: `1px solid ${C.line}`, color: C.mut,
          fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.4,
          backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        }}>
          <RotateCcw size={11} /> REORDENAR
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// ProfileBadge — acceso rápido al perfil desde el header. Rediseño pedido
// por el usuario ("botón donde aparezca mi perfil de forma innovadora,
// hoy se ve plano y diseño fome"): reemplaza el texto plano "NIVEL N{x}
// · {rep}" por un anillo de progreso circular (HUD) con la reputación
// real 0-100 dibujada en SVG (mismo lenguaje visual "Iron Man" que el
// resto de la app — theme.ts ya usa esta identidad), avatar/iniciales al
// centro, y el nivel como acento superpuesto. whileTap da feedback táctil
// inmediato, igual que los nodos del orbe (consistencia entre controles).
// ─────────────────────────────────────────────────────────────────────────
function ProfileBadge({ rep, level, name, avatarUrl, onClick }: {
  rep: number; level: number | string; name?: string; avatarUrl?: string; onClick: () => void;
}) {
  // Adaptive size: scales between 36-44px based on viewport
  const SIZE = typeof window !== 'undefined' ? Math.min(44, Math.max(36, Math.round(window.innerWidth * 0.1))) : 40;
  const STROKE = 3;
  const r = (SIZE - STROKE) / 2;
  const circumference = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, rep)) / 100;
  const initials = (name || 'Nodo').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

  return (
    <motion.button onClick={onClick} whileTap={{ scale: 0.94 }} title="Ver mi perfil" aria-label={`Ver mi perfil — nivel ${level}, reputación ${rep}`}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '4px 12px 4px 4px', borderRadius: RADIUS.pill,
        background: `linear-gradient(135deg, ${C.cyan}14, rgba(255,255,255,0.03))`, border: `1px solid ${C.cyanDim}`,
        cursor: 'pointer', position: 'relative',
      }}>
      <span style={{ position: 'relative', width: SIZE, height: SIZE, flexShrink: 0 }}>
        <svg width={SIZE} height={SIZE} style={{ transform: 'rotate(-90deg)' }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={STROKE} />
          <circle cx={SIZE / 2} cy={SIZE / 2} r={r} fill="none" stroke={C.cyan} strokeWidth={STROKE} strokeLinecap="round"
            strokeDasharray={circumference} strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 4px ${C.cyan})` }} />
        </svg>
        <span style={{
          position: 'absolute', inset: STROKE + 2, borderRadius: '50%', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'radial-gradient(circle at 32% 26%, rgba(92,200,255,0.22), rgba(6,10,22,0.92))',
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 12, color: '#fff' }}>{initials}</span>}
        </span>
        {/* Acento de nivel: superpuesto sobre el aro, como un "rango" HUD */}
        <span style={{
          position: 'absolute', bottom: -3, right: -3, minWidth: 16, height: 16, padding: '0 3px', borderRadius: 999,
          background: C.gold, border: '1.5px solid #000206', display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: `0 0 6px ${C.gold}`,
        }}>
          <span style={{ fontFamily: FONT.mono, fontWeight: 800, fontSize: 8.5, color: '#1a1205', lineHeight: 1 }}>{level}</span>
        </span>
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.15 }}>
        <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 14, color: '#fff' }}>{rep}</span>
        <span style={{ fontFamily: FONT.mono, fontSize: 7.5, letterSpacing: 0.8, color: C.mut, textTransform: 'uppercase' }}>Reputación</span>
      </span>
    </motion.button>
  );
}

interface Props { onOpenPerfil?: () => void }

export default function OmicronAssistant({ onOpenPerfil }: Props) {
  const { profile, gemelo, setActiveTab, unreadCount } = useApp();

  const [state, setState] = useState<OrbState>('idle');
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [cvOpen, setCvOpen] = useState(false);
  const greetedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const color = STATE_COLOR[state];
  const rep = gemelo ? Math.round(gemelo.overallReputation) : 0;
  const level = profile?.node_level ?? 1;

  const steps = useMemo(() => computeSteps(profile, gemelo), [profile, gemelo]);
  const top = steps[0] ?? null;

  const omicronSay = useCallback((text: string) => {
    setReply(text);
    const started = speak(text, () => setState('speaking'), () => setState('idle'));
    if (!started) setState('idle');
  }, []);

  // Saludo + motivación al entrar (una vez).
  useEffect(() => {
    if (greetedRef.current) return;
    greetedRef.current = true;
    const name = profile?.display_name || profile?.full_name || profile?.username || 'Nodo';
    const base = `Hola ${name}. Soy Ómicron, tu Gemelo Digital.`;
    const push = top ? ` Tu próximo paso: ${top.title}. ${top.why}` : ' Para empezar, subí tu CV real y calculo tu nivel.';
    const t = setTimeout(() => omicronSay(base + push), 500);
    const t2 = setTimeout(() => notifyOrb('Gemelo sincronizado · datos cargados', 'success'), 900);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [profile, top, omicronSay]);

  // Cuando llegan alertas nuevas, la orbe "carga" el aviso.
  const prevUnread = useRef(0);
  useEffect(() => {
    if (unreadCount > prevUnread.current) {
      notifyOrb(`${unreadCount} alerta${unreadCount > 1 ? 's' : ''} nueva${unreadCount > 1 ? 's' : ''}`, 'gold');
    }
    prevUnread.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => () => { stopSpeaking(); recognitionRef.current?.abort(); }, []);

  const handleQuery = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    setInput('');
    setState('thinking');

    // Comando de cierre de sesión (por voz o texto).
    if (/cerrar sesi[oó]n|cerrar sesion|\bsalir\b|logout|log out|desconect|cerrar cuenta/i.test(text)) {
      omicronSay('Cerrando tu sesión. Hasta pronto, Nodo.');
      setTimeout(() => { void supabase.auth.signOut(); }, 900);
      return;
    }

    const intent = interpret(text);

    if (intent.kind === 'navigate') {
      if (intent.tab === 'perfil') {
        omicronSay('Abro tu perfil completo: todo medido, con tus oportunidades de mejora.');
        setTimeout(() => onOpenPerfil?.(), 500);
        return;
      }
      omicronSay(`Te llevo a ${intent.label}.`);
      setTimeout(() => setActiveTab(intent.tab), 650);
      return;
    }
    if (intent.kind === 'convalidate') {
      omicronSay('Abrimos la carga de tu CV para reforzar tu Gemelo.');
      setTimeout(() => setCvOpen(true), 500);
      return;
    }
    if (intent.kind === 'fact') {
      let ans = 'Estoy para impulsarte. Pedime tu próximo paso o llevarte a una sección.';
      if (intent.topic === 'reputacion' && gemelo) ans = `Tu reputación es ${Math.round(gemelo.overallReputation)} sobre 100. Subamos tu eje más débil.`;
      else if (intent.topic === 'tokens' && profile) ans = `Tenés ${profile.token_balance} tokens.`;
      else if (intent.topic === 'pe' && profile) ans = `Acumulaste ${profile.pe_points} puntos de experiencia.`;
      else if (intent.topic === 'ayuda') ans = 'Subí tu CV, hacé el examen de nivel, o pedime tu próximo paso. Hablame o escribime.';
      omicronSay(ans);
      return;
    }
    if (intent.kind === 'coach') {
      const r = await askCoach();
      omicronSay(r.advice || r.error || 'Probemos tu próximo paso desde el nodo de acción.');
      return;
    }
    const t = await askTutor(text);
    omicronSay(t.answer || t.error || 'No pude responder ahora. Probá de nuevo.');
  }, [gemelo, profile, omicronSay, setActiveTab, onOpenPerfil]);

  const toggleListen = useCallback(() => {
    if (state === 'listening') { recognitionRef.current?.stop(); return; }
    const Ctor = getRecognitionCtor();
    if (!Ctor) { omicronSay('Tu navegador no soporta voz, pero podés escribirme.'); return; }
    stopSpeaking();
    const rec = new Ctor();
    rec.lang = 'es-ES'; rec.interimResults = false; rec.continuous = false;
    rec.onresult = (e: SREvent) => { const tr = e.results?.[0]?.[0]?.transcript ?? ''; if (tr) void handleQuery(tr); };
    rec.onerror = () => setState('idle');
    rec.onend = () => setState((s) => (s === 'listening' ? 'idle' : s));
    recognitionRef.current = rec;
    setState('listening');
    try { rec.start(); } catch { setState('idle'); }
  }, [state, handleQuery, omicronSay]);

  const goStep = useCallback((s: NextStep) => {
    if (s.cv) { setCvOpen(true); return; }
    if (s.tab === 'perfil') { onOpenPerfil?.(); return; }
    omicronSay(`Vamos. ${s.why}`);
    setTimeout(() => setActiveTab(s.tab), 700);
  }, [omicronSay, setActiveTab, onOpenPerfil]);

  const goToAction = useCallback(() => { if (top) goStep(top); }, [top, goStep]);

  // Al abrir un nodo, Ómicron te empuja con el paso concreto de ese nodo.
  const goNode = useCallback((tab: TabId) => {
    if (tab === 'perfil') { onOpenPerfil?.(); return; }
    const guide = nodeGuidance(tab, profile, gemelo);
    if (guide) omicronSay(guide);
    setTimeout(() => setActiveTab(tab), guide ? 650 : 0);
  }, [setActiveTab, onOpenPerfil, profile, gemelo, omicronSay]);

  const doLogout = useCallback(() => {
    omicronSay('Cerrando tu sesión. Hasta pronto, Nodo.');
    setTimeout(() => { void supabase.auth.signOut(); }, 900);
  }, [omicronSay]);

  // Alertas / nodos que flotan sobre la orbe (sistema de aprendizaje continuo).
  const alerts: { text: string; color: string; onClick: () => void; pos: React.CSSProperties }[] = [];
  if (top) alerts.push({ text: top.metric || 'Próximo paso', color: top.accent, onClick: goToAction, pos: { top: '3%', left: '3%' } });
  if (unreadCount > 0) alerts.push({ text: `${unreadCount} alerta${unreadCount > 1 ? 's' : ''}`, color: C.gold, onClick: () => setActiveTab('empleos'), pos: { top: '3%', right: '3%' } });

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', overflow: 'hidden',
      background: 'radial-gradient(130% 95% at 50% 8%, #061024 0%, #02030a 55%, #000003 100%)',
    }}>
      {/* Rejilla de fondo */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
        backgroundSize: '46px 46px', maskImage: 'radial-gradient(circle at 50% 22%, #000, transparent 72%)',
      }} />

      {/* Cabecera + nivel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', position: 'relative', zIndex: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>ÓMICRON</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut }}>· {STATE_LABEL[state]}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ProfileBadge rep={rep} level={level} name={profile?.display_name || profile?.full_name || profile?.username}
            avatarUrl={profile?.avatar_url} onClick={() => onOpenPerfil?.()} />
          <button onClick={doLogout} aria-label="Cerrar sesión" title="Cerrar sesión"
            style={{ width: 'clamp(30px, 8vw, 38px)', height: 'clamp(30px, 8vw, 38px)', borderRadius: 11, border: `1px solid ${C.line}`, background: C.glass, color: C.mut, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ORBE DE PARTÍCULAS + NODOS ORBITANDO EN 3D */}
      <div style={{ position: 'relative', zIndex: 2, height: '44vh', minHeight: 340, flexShrink: 0 }}>
        <ParticleOrb enableMic={state === 'listening'} />

        {/* Notificaciones como "carga de datos" holográfica en la orbe */}
        <OrbDataStream />

        {/* Los nodos flotan y orbitan alrededor de la orbe en 3D */}
        <NodeOrbit
          nodes={NODES}
          onSelect={goNode}
          highlightTab={top?.tab ?? null}
          highlightAccent={top?.accent}
        />

        {/* Alertas flotando en las esquinas */}
        {alerts.map((a, i) => (
          <motion.button key={i} onClick={a.onClick}
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
            style={{
              position: 'absolute', ...a.pos, display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
              background: 'rgba(6,10,22,0.72)', border: `1px solid ${a.color}66`, color: C.ink,
              fontFamily: FONT.mono, fontSize: 10, letterSpacing: 0.3,
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
              zIndex: 4, boxShadow: `0 0 14px ${a.color}44`,
            }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: a.color, boxShadow: `0 0 6px ${a.color}` }} />
            {a.text}
          </motion.button>
        ))}
      </div>

      {/* Mensaje de Ómicron */}
      <div style={{ position: 'relative', zIndex: 2, padding: '2px 20px 10px', minHeight: 46 }}>
        <AnimatePresence mode="wait">
          <motion.p key={reply}
            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ margin: 0, textAlign: 'center', fontFamily: FONT.body, fontSize: 14.5, lineHeight: 1.5, color: C.ink }}>
            {reply || 'Escuchando tu próximo movimiento…'}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* COMANDO: escribir + hablar (DEBAJO de la orbe) */}
      <div style={{ padding: '0 16px', position: 'relative', zIndex: 2 }}>
        <form onSubmit={(e) => { e.preventDefault(); void handleQuery(input); }}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: RADIUS.pill, background: C.glass2, border: `1px solid ${C.line}` }}>
          <button type="button" onClick={toggleListen} aria-label="Hablar"
            style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, cursor: 'pointer', border: `1px solid ${state === 'listening' ? C.green : C.cyanDim}`, background: state === 'listening' ? 'rgba(63,208,201,0.2)' : 'rgba(92,200,255,0.12)', color: state === 'listening' ? C.green : C.cyan, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Mic size={18} />
          </button>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Hablá o escribí a Ómicron…"
            style={{ flex: 1, border: 'none', outline: 'none', background: 'transparent', fontFamily: FONT.body, fontSize: 15, color: C.ink }} />
          <button type="submit" aria-label="Enviar" disabled={!input.trim()}
            style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, border: 'none', cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.4, background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Send size={17} />
          </button>
        </form>
      </div>

      {/* CONTENIDO desplazable */}
      <div className="scrollbar-hidden" style={{ flex: 1, overflowY: 'auto', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', scrollBehavior: 'smooth', padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)', position: 'relative', zIndex: 2, minHeight: 0 }}>
        {/* Hero CTA: Convalidar CV — full width, pulsating, high emphasis */}
        <motion.button
          onClick={() => setCvOpen(true)}
          animate={{ boxShadow: ['0 0 20px rgba(92,200,255,0.3)', '0 0 40px rgba(92,200,255,0.6)', '0 0 20px rgba(92,200,255,0.3)'] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '16px 18px', borderRadius: RADIUS.lg, border: `1px solid ${C.cyanDim}`, cursor: 'pointer', background: `linear-gradient(135deg, ${C.cyan}22, ${C.purple}18, rgba(255,255,255,0.04))`, display: 'flex', alignItems: 'center', gap: 14, marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
          {/* Completion ring SVG */}
          <span style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
            <svg width={44} height={44} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={22} cy={22} r={19} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={3} />
              <circle cx={22} cy={22} r={19} fill="none" stroke={C.cyan} strokeWidth={3} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 19} strokeDashoffset={2 * Math.PI * 19 * (1 - (gemelo ? Math.min(1, gemelo.overallReputation / 100) : 0))}
                style={{ transition: 'stroke-dashoffset 0.6s ease', filter: `drop-shadow(0 0 4px ${C.cyan})` }} />
            </svg>
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Upload size={18} color={C.cyan} />
            </span>
          </span>
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontFamily: FONT.display, fontWeight: 700, fontSize: 15.5, color: '#fff' }}>
              {(profile?.skills?.length ?? 0) > 0 ? 'Actualizar mi Gemelo' : 'Convalidar mi CV'}
            </span>
            <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: 9.5, color: C.cyanDim, marginTop: 3 }}>
              {(profile?.skills?.length ?? 0) > 0 ? 'Subí un CV nuevo · todo se actualiza' : 'Un solo toque activa todo automáticamente'}
            </span>
          </span>
          <ArrowRight size={18} color={C.cyan} />
        </motion.button>

        {/* Secondary: Examen de nivel */}
        <button onClick={() => { omicronSay('Vamos al examen para calcular tu nivel real.'); setTimeout(() => setActiveTab('maxskill'), 700); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: RADIUS.lg, cursor: 'pointer', background: `linear-gradient(135deg, ${C.purple}14, rgba(255,255,255,0.03))`, border: `1px solid ${C.purple}44`, marginBottom: 12 }}>
          <FileCheck2 size={18} color={C.purple} />
          <span style={{ flex: 1, textAlign: 'left' }}>
            <span style={{ display: 'block', fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#fff' }}>Examen de nivel</span>
            <span style={{ display: 'block', fontFamily: FONT.mono, fontSize: 9, color: C.mut }}>Medí tu nivel real</span>
          </span>
          <ArrowRight size={16} color={C.mut} />
        </button>

        {/* Propuesta de mejora (puerta) — motor real en tiempo real */}
        {top && (
          <div style={{ borderRadius: RADIUS.lg, padding: '14px 15px', marginBottom: 12, background: `linear-gradient(135deg, ${top.accent}1f, rgba(255,255,255,0.03))`, border: `1px solid ${top.accent}55` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
              <Sparkles size={14} color={top.accent} />
              <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: top.accent }}>
                Próximo paso{top.metric ? ` · ${top.metric}` : ''}
              </span>
            </div>
            <p style={{ margin: '0 0 5px', fontFamily: FONT.display, fontWeight: 700, fontSize: 16, lineHeight: 1.25, color: '#fff' }}>{top.title}</p>
            <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 13, lineHeight: 1.45, color: 'rgba(234,240,251,0.72)' }}>{top.why}</p>
            <button onClick={goToAction} style={{ width: '100%', padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${top.accent}, ${C.purple})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {top.actionLabel} <ArrowRight size={17} />
            </button>
          </div>
        )}

        {/* Ruta de mejora: siguientes pasos encadenados (sinergia entre nodos) */}
        {steps.length > 1 && (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.mut, margin: '2px 2px 8px' }}>Tu ruta de mejora</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {steps.slice(1, 4).map((s) => (
                <button key={s.id} onClick={() => goStep(s)} className="oc-pressable"
                  style={{ display: 'flex', alignItems: 'center', gap: 11, width: '100%', textAlign: 'left', padding: '11px 13px', borderRadius: RADIUS.md, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}` }}>
                  <span style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0, background: s.accent, boxShadow: `0 0 8px ${s.accent}` }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13.5, color: C.ink }}>{s.title}</div>
                    {s.metric && <div style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 0.4, color: C.mut, marginTop: 1 }}>{s.metric}</div>}
                  </div>
                  <ArrowRight size={16} color={C.mut} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Capacidades en tiempo real */}
        {gemelo && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 14 }}>
            {([['Ejecución', gemelo.execution, C.cyan], ['Calidad', gemelo.quality, C.purple], ['Trasc.', gemelo.transcendence, C.gold], ['Fund.', gemelo.foundation, C.green]] as [string, number, string][]).map(([lbl, val, col]) => (
              <div key={lbl} style={{ padding: '7px 8px', borderRadius: 12, background: C.glass, border: `1px solid ${C.line}` }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.6, textTransform: 'uppercase', color: C.mut }}>{lbl}</div>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: col }}>{Math.round(val)}</div>
                <div style={{ height: 3, borderRadius: 2, marginTop: 3, background: 'rgba(255,255,255,0.08)' }}>
                  <div style={{ height: '100%', width: `${Math.round(val)}%`, borderRadius: 2, background: col }} />
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* Convalidación REAL del Gemelo (mueve tus ejes server-side) */}
      {cvOpen && (
        <ConvalidaOmicron
          onClose={() => setCvOpen(false)}
          onViewProfile={() => { setCvOpen(false); onOpenPerfil?.(); }}
        />
      )}
    </div>
  );
}


