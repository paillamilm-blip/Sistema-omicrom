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
const NODE_HINT_KEY = 'omicron_node_hint_seen_v1';

type NodePos = { xPct: number; yPct: number };

function loadNodePositions(): Partial<Record<TabId, NodePos>> {
  try {
    const raw = localStorage.getItem(NODE_POS_KEY);
    return raw ? (JSON.parse(raw) as Partial<Record<TabId, NodePos>>) : {};
  } catch { return {}; }
}

function NodeOrbit({ nodes, onSelect, highlightTab, highlightAccent }: {
  nodes: { tab: TabId; label: string; Icon: typeof GraduationCap }[];
  onSelect: (tab: TabId) => void;
  highlightTab?: TabId | null;
  highlightAccent?: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeElsRef = useRef<Map<TabId, HTMLButtonElement>>(new Map());
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

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(t - last, 64);
      last = t;
      setRot((r) => (r + dt * 0.00015) % (Math.PI * 2));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const persist = useCallback((next: Partial<Record<TabId, NodePos>>) => {
    setPinned(next);
    try { localStorage.setItem(NODE_POS_KEY, JSON.stringify(next)); } catch { /* noop */ }
  }, []);

  const dismissHint = useCallback(() => {
    setHintVisible(false);
    try { localStorage.setItem(NODE_HINT_KEY, '1'); } catch { /* noop */ }
  }, []);

  const resetLayout = useCallback(() => persist({}), [persist]);

  const n = nodes.length;
  const hasPinned = Object.keys(pinned).length > 0;

  return (
    <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 3 }}>
      {/* Anillo guía (se desvanece a medida que armás tu propia red de nodos) */}
      <div style={{ position: 'absolute', left: '50%', top: '47%', width: '88%', height: '40%', transform: 'translate(-50%,-50%)', borderRadius: '50%', border: `1px dashed ${C.line}`, opacity: hasPinned ? 0.16 : 0.45, transition: 'opacity 0.5s ease' }} />

      {/* Líneas de sinergia: cada nodo reposicionado queda conectado al núcleo */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none' }}>
        {nodes.filter((node) => pinned[node.tab]).map((node) => {
          const p = pinned[node.tab]!;
          const isHi = node.tab === highlightTab;
          return (
            <line key={node.tab} x1="50%" y1="47%" x2={`${p.xPct}%`} y2={`${p.yPct}%`}
              stroke={isHi ? (highlightAccent || C.gold) : C.cyan} strokeWidth={1} strokeDasharray="2 5" opacity={0.32} />
          );
        })}
      </svg>

      {nodes.map((node, i) => {
        const custom = pinned[node.tab];
        const ang = rot + (i / n) * Math.PI * 2;
        const autoX = 50 + 42 * Math.cos(ang);
        const autoY = 47 + 20 * Math.sin(ang);
        const x = custom?.xPct ?? autoX;
        const y = custom?.yPct ?? autoY;
        const depth = custom ? 0.85 : (Math.sin(ang) + 1) / 2;   // nodos fijados: siempre "al frente"
        const scale = 0.68 + depth * 0.5;
        const opacity = 0.4 + depth * 0.6;
        const z = 10 + Math.round(depth * 100);
        const hi = node.tab === highlightTab;
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
            dragElastic={0}
            dragConstraints={containerRef}
            onDragStart={() => {
              // Freeze en la posición actual (recién al confirmarse el arrastre,
              // no en cada toque) — así el nodo nunca "se aleja" al agarrarlo.
              if (!pinned[node.tab]) persist({ ...pinned, [node.tab]: { xPct: autoX, yPct: autoY } });
              if (hintVisible) dismissHint();
            }}
            onDragEnd={() => {
              // Se lee la posición REAL del propio nodo (su getBoundingClientRect
              // tras el arrastre), no el punto final del puntero. Si se usara el
              // punto del puntero, soltar el nodo sin haberlo agarrado en su
              // centro exacto provocaría un salto visible al soltar — el mismo
              // tipo de bug de "el nodo se mueve solo" que este rediseño busca
              // eliminar, ahora en la capa de arrastre en vez de en la de click.
              const nodeEl = nodeElsRef.current.get(node.tab);
              const containerEl = containerRef.current;
              if (nodeEl && containerEl) {
                const nodeRect = nodeEl.getBoundingClientRect();
                const containerRect = containerEl.getBoundingClientRect();
                const centerX = nodeRect.left + nodeRect.width / 2;
                const centerY = nodeRect.top + nodeRect.height / 2;
                const px = ((centerX - containerRect.left) / containerRect.width) * 100;
                const py = ((centerY - containerRect.top) / containerRect.height) * 100;
                persist({ ...pinned, [node.tab]: { xPct: Math.min(96, Math.max(4, px)), yPct: Math.min(96, Math.max(4, py)) } });
              }
              // Marca "se acaba de arrastrar" y la limpia en el siguiente ciclo
              // (no ahora mismo) — ver nota técnica junto a justDraggedRef.
              justDraggedRef.current.add(node.tab);
              setTimeout(() => justDraggedRef.current.delete(node.tab), 0);
            }}
            onTap={() => { if (!justDraggedRef.current.has(node.tab)) onSelect(node.tab); }}
            ref={(el) => {
              if (el) nodeElsRef.current.set(node.tab, el);
              else nodeElsRef.current.delete(node.tab);
            }}
            aria-label={`${node.label} — tocá y mantené para reposicionar`}
            style={{
              position: 'absolute',
              left: `calc(${x}% - 24px)`, top: `calc(${y}% - 24px)`,
              width: 48, zIndex: z, scale, opacity,
              pointerEvents: 'auto', touchAction: 'none',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
              background: 'transparent', border: 'none', cursor: 'grab', padding: 0, margin: 0,
            }}
          >
            <span style={{
              width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `radial-gradient(circle at 32% 26%, ${accent}33, rgba(6,10,22,0.82))`,
              border: `1px solid ${accent}${hi ? '' : '66'}`,
              boxShadow: hi ? `0 0 22px ${accent}, inset 0 0 14px ${accent}55` : `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${accent}33`,
              backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
            }}>
              <Icon size={20} color={hi ? '#fff' : accent} />
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 0.3, color: hi ? accent : C.ink, textShadow: '0 1px 5px #000, 0 0 2px #000', whiteSpace: 'nowrap' }}>{node.label}</span>
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
          ✋ Mantené y arrastrá un nodo para armar tu red
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
          <button onClick={() => onOpenPerfil?.()} title="Ver mi perfil"
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: RADIUS.pill, background: C.glass, border: `1px solid ${C.line}`, cursor: 'pointer' }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut }}>NIVEL</span>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.cyan }}>N{level}</span>
            <span style={{ width: 1, height: 12, background: C.line }} />
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.gold }}>{rep}</span>
          </button>
          <button onClick={doLogout} aria-label="Cerrar sesión" title="Cerrar sesión"
            style={{ width: 34, height: 34, borderRadius: 11, border: `1px solid ${C.line}`, background: C.glass, color: C.mut, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        {/* Onboarding: subir CV + examen de nivel */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
          <button onClick={() => setCvOpen(true)} style={ctaStyle(C.cyan)}>
            <Upload size={20} color={C.cyan} />
            <span style={ctaTitle}>Convalidar Gemelo</span>
            <span style={ctaSub}>CV · título · años · aportes</span>
          </button>
          <button onClick={() => { omicronSay('Vamos al examen para calcular tu nivel real.'); setTimeout(() => setActiveTab('maxskill'), 700); }} style={ctaStyle(C.purple)}>
            <FileCheck2 size={20} color={C.purple} />
            <span style={ctaTitle}>Examen de nivel</span>
            <span style={ctaSub}>Medí tu nivel real</span>
          </button>
        </div>

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

// Estilos de las tarjetas de acción (CTA)
function ctaStyle(accent: string): React.CSSProperties {
  return {
    display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
    padding: '13px 13px', borderRadius: RADIUS.lg, cursor: 'pointer', textAlign: 'left',
    background: `linear-gradient(135deg, ${accent}18, rgba(255,255,255,0.03))`, border: `1px solid ${accent}44`,
  };
}
const ctaTitle: React.CSSProperties = { fontFamily: FONT.display, fontWeight: 700, fontSize: 14.5, color: '#fff', marginTop: 2 };
const ctaSub: React.CSSProperties = { fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 0.4, color: 'rgba(234,240,251,0.6)' };
