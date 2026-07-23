// components/omicron/OmicronAssistant.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Asistente tipo "Jarvis" — capa presente en toda la app.
//
// Orbe viva (reacciona al estado) + barra de comando (voz + texto) +
// sub-nodo de ACCIÓN (te empuja a tu próximo paso según tu eje más débil) +
// medidor de capacidades en tiempo real + nodos de navegación.
//
// Auto-contenido: usa solo dependencias ya instaladas (framer-motion,
// lucide-react). El cerebro es la Edge Function `coach` vía oraculo.ts;
// la voz, voiceEngine.ts; la navegación, setActiveTab del AppContext.
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, Send, X, Sparkles, ArrowRight, Home, GraduationCap, Zap,
  Briefcase, Store, Wallet, Database, MessageSquare, Scale,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { interpret, askCoach } from '../../lib/oraculo';
import { speak, stopSpeaking } from '../../lib/voiceEngine';
import { C, FONT, RADIUS } from '../../theme';
import type { TabId, GemeloDigital } from '../../types';

// ── Estados de la orbe ─────────────────────────────────────────────────
type OrbState = 'idle' | 'listening' | 'thinking' | 'speaking';

const STATE_COLOR: Record<OrbState, string> = {
  idle: C.cyan,
  listening: C.green,
  thinking: C.purple,
  speaking: C.gold,
};

const STATE_LABEL: Record<OrbState, string> = {
  idle: 'En línea',
  listening: 'Escuchando…',
  thinking: 'Procesando…',
  speaking: 'Ómicron responde',
};

// ── Nodos de navegación (secciones de la app) ──────────────────────────
const NODES: { tab: TabId; label: string; Icon: typeof Home }[] = [
  { tab: 'perfil', label: 'Inicio', Icon: Home },
  { tab: 'academia', label: 'Academia', Icon: GraduationCap },
  { tab: 'maxskill', label: 'Habilidades', Icon: Zap },
  { tab: 'empleos', label: 'Empleos', Icon: Briefcase },
  { tab: 'market', label: 'Servicios', Icon: Store },
  { tab: 'wallet', label: 'Billetera', Icon: Wallet },
  { tab: 'vault', label: 'Bóveda', Icon: Database },
  { tab: 'chat', label: 'Mensajes', Icon: MessageSquare },
  { tab: 'gobernanza', label: 'Gobernanza', Icon: Scale },
];

// ── Sub-nodo de ACCIÓN por eje (la "puerta" que empuja a mejorar) ──────
type AxisKey = 'execution' | 'quality' | 'transcendence' | 'foundation';

const AXIS_ACTION: Record<AxisKey, { label: string; tab: TabId; step: string; color: string }> = {
  execution: {
    label: 'Ejecución',
    tab: 'maxskill',
    step: 'Completá un reto en Habilidades para demostrar tu velocidad de ejecución.',
    color: C.cyan,
  },
  quality: {
    label: 'Calidad',
    tab: 'academia',
    step: 'Rendí un examen en Academia y validá tu calidad técnica con evidencia real.',
    color: C.purple,
  },
  transcendence: {
    label: 'Trascendencia',
    tab: 'vault',
    step: 'Subí un aporte a la Bóveda: compartir conocimiento multiplica tu impacto.',
    color: C.gold,
  },
  foundation: {
    label: 'Fundamento',
    tab: 'perfil',
    step: 'Convalidá tu CV y títulos en tu Perfil para reforzar tu base teórica.',
    color: C.green,
  },
};

function weakestAxis(g: GemeloDigital): AxisKey {
  const entries: [AxisKey, number][] = [
    ['execution', g.execution],
    ['quality', g.quality],
    ['transcendence', g.transcendence],
    ['foundation', g.foundation],
  ];
  entries.sort((a, b) => a[1] - b[1]);
  return entries[0][0];
}

// ── Reconocimiento de voz (tipos mínimos, sin `any`) ───────────────────
interface SRAlt { transcript: string }
interface SREvent { results: ArrayLike<ArrayLike<SRAlt>> }
interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: SREvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SRCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SRCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { SpeechRecognition?: SRCtor; webkitSpeechRecognition?: SRCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

// ── Mensajes de la conversación ────────────────────────────────────────
interface Msg { id: number; role: 'user' | 'omicron'; text: string }
let msgSeq = 0;

export default function OmicronAssistant() {
  const { profile, gemelo, setActiveTab } = useApp();

  const [open, setOpen] = useState(false);
  const [state, setState] = useState<OrbState>('idle');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const greetedRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const logRef = useRef<HTMLDivElement | null>(null);

  const color = STATE_COLOR[state];

  const action = useMemo(() => {
    if (!gemelo) return null;
    const key = weakestAxis(gemelo);
    const value = Math.round(gemelo[key]);
    return { ...AXIS_ACTION[key], value };
  }, [gemelo]);

  const pushMsg = useCallback((role: Msg['role'], text: string) => {
    setMessages((prev) => [...prev.slice(-8), { id: ++msgSeq, role, text }]);
  }, []);

  // Ómicron habla (voz) y sincroniza el estado de la orbe.
  const omicronSay = useCallback((text: string) => {
    pushMsg('omicron', text);
    const started = speak(text, () => setState('speaking'), () => setState('idle'));
    if (!started) setState('idle');
  }, [pushMsg]);

  // Autoscroll del log.
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [messages]);

  // Saludo proactivo al abrir (una sola vez por apertura).
  useEffect(() => {
    if (!open) { greetedRef.current = false; return; }
    if (greetedRef.current) return;
    greetedRef.current = true;

    const name = profile?.display_name || profile?.full_name || profile?.username || 'Nodo';
    let greeting = `Hola ${name}. Soy Ómicron. ¿En qué te impulso hoy?`;
    if (action) {
      greeting = `Hola ${name}. Detecté que tu ${action.label} está en ${action.value}. Te muestro tu próximo paso para subirla.`;
    }
    const t = setTimeout(() => omicronSay(greeting), 320);
    return () => clearTimeout(t);
  }, [open, profile, action, omicronSay]);

  // Limpieza de voz al cerrar/desmontar.
  useEffect(() => {
    if (!open) stopSpeaking();
    return () => { stopSpeaking(); recognitionRef.current?.abort(); };
  }, [open]);

  // Responde una consulta (voz o texto) → intención → acción.
  const handleQuery = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    pushMsg('user', text);
    setInput('');
    setState('thinking');

    const intent = interpret(text);

    if (intent.kind === 'navigate') {
      omicronSay(`Te llevo a ${intent.label}.`);
      setTimeout(() => { setActiveTab(intent.tab); setOpen(false); }, 700);
      return;
    }

    if (intent.kind === 'convalidate') {
      omicronSay('Vamos a tu Perfil para convalidar y reforzar tu Gemelo.');
      setTimeout(() => { setActiveTab('perfil'); setOpen(false); }, 800);
      return;
    }

    if (intent.kind === 'fact') {
      let ans = 'Estoy para impulsarte. Pedime tu próximo paso o llevarte a una sección.';
      if (intent.topic === 'reputacion' && gemelo) ans = `Tu reputación es ${Math.round(gemelo.overallReputation)} sobre 100. Subamos tu eje más débil para mejorarla.`;
      else if (intent.topic === 'tokens' && profile) ans = `Tenés ${profile.token_balance} tokens disponibles.`;
      else if (intent.topic === 'pe' && profile) ans = `Acumulaste ${profile.pe_points} puntos de experiencia. Seguí sumando para subir de nivel.`;
      else if (intent.topic === 'ayuda') ans = 'Puedo llevarte por la app, darte tu próximo paso para mejorar, o consultar al Coach. Hablame o escribime.';
      omicronSay(ans);
      return;
    }

    // coach + unknown → siempre intentamos EMPUJAR con el Coach IA.
    const r = await askCoach();
    if (r.advice) omicronSay(r.advice);
    else omicronSay(r.error || 'No pude consultar al Coach ahora. Probemos tu próximo paso desde el nodo de acción.');
  }, [gemelo, profile, pushMsg, omicronSay, setActiveTab]);

  // Escucha por voz (SpeechRecognition es-ES).
  const toggleListen = useCallback(() => {
    if (state === 'listening') { recognitionRef.current?.stop(); return; }
    const Ctor = getRecognitionCtor();
    if (!Ctor) { omicronSay('Tu navegador no soporta reconocimiento de voz, pero podés escribirme.'); return; }
    stopSpeaking();
    const rec = new Ctor();
    rec.lang = 'es-ES';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e: SREvent) => {
      const transcript = e.results?.[0]?.[0]?.transcript ?? '';
      if (transcript) void handleQuery(transcript);
    };
    rec.onerror = () => setState('idle');
    rec.onend = () => setState((s) => (s === 'listening' ? 'idle' : s));
    recognitionRef.current = rec;
    setState('listening');
    try { rec.start(); } catch { setState('idle'); }
  }, [state, handleQuery, omicronSay]);

  const goToAction = useCallback(() => {
    if (!action) return;
    omicronSay(`Vamos. ${action.step}`);
    setTimeout(() => { setActiveTab(action.tab); setOpen(false); }, 800);
  }, [action, omicronSay, setActiveTab]);

  // ── LAUNCHER (botón flotante presente en toda la app) ────────────────
  const launcher = (
    <div style={{
      position: 'fixed', bottom: 'calc(env(safe-area-inset-bottom, 0px) + 22px)',
      left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 60, pointerEvents: 'none',
    }}>
      <motion.button
        onClick={() => setOpen(true)}
        aria-label="Abrir a Ómicron"
        initial={false}
        animate={{ boxShadow: [`0 0 0 0 ${C.cyanFaint}`, `0 0 0 14px rgba(92,200,255,0)`] }}
        transition={{ duration: 2.4, repeat: Infinity }}
        whileTap={{ scale: 0.92 }}
        style={{
          pointerEvents: 'auto',
          width: 62, height: 62, borderRadius: '50%', cursor: 'pointer',
          border: `1px solid ${C.cyanDim}`,
          background: 'radial-gradient(circle at 40% 35%, #5cc8ff, #5e5ce6 70%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 26,
        }}
      >
        Ω
      </motion.button>
    </div>
  );

  return (
    <>
      {!open && launcher}

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 80,
              background: 'radial-gradient(130% 100% at 50% 12%, rgba(10,16,34,0.96), rgba(2,3,10,0.985) 60%, #000 100%)',
              backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Rejilla de fondo */}
            <div style={{
              position: 'absolute', inset: 0, pointerEvents: 'none',
              backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`,
              backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 30%, #000, transparent 75%)',
            }} />

            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '16px 18px', position: 'relative', zIndex: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 10px ${color}` }} />
                <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>ÓMICRON</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: C.mut }}>· {STATE_LABEL[state]}</span>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Cerrar"
                style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X size={18} />
              </button>
            </div>

            {/* ORBE */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 6, zIndex: 2 }}>
              <div style={{ position: 'relative', width: 200, height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Anillos */}
                {[0, 1, 2].map((i) => (
                  <motion.div key={i}
                    animate={{ rotate: state === 'thinking' ? 360 : 0, scale: state === 'listening' ? [1, 1.06, 1] : 1 }}
                    transition={{ rotate: { duration: 8 - i * 2, repeat: Infinity, ease: 'linear' }, scale: { duration: 1.4, repeat: Infinity } }}
                    style={{
                      position: 'absolute', width: 150 + i * 26, height: 150 + i * 26,
                      borderRadius: '50%', border: `1px solid ${color}`, opacity: 0.16 + i * 0.05,
                    }} />
                ))}
                {/* Núcleo */}
                <motion.div
                  animate={{
                    scale: state === 'speaking' ? [1, 1.08, 1] : state === 'listening' ? [1, 1.05, 1] : [1, 1.03, 1],
                    boxShadow: [`0 0 40px ${color}`, `0 0 70px ${color}`, `0 0 40px ${color}`],
                  }}
                  transition={{ duration: state === 'idle' ? 3.2 : 1.2, repeat: Infinity, ease: 'easeInOut' }}
                  style={{
                    width: 130, height: 130, borderRadius: '50%',
                    background: `radial-gradient(circle at 38% 32%, #fff, ${color} 42%, ${C.purple} 100%)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: FONT.display, fontWeight: 700, fontSize: 54, color: 'rgba(255,255,255,0.92)',
                  }}
                >
                  Ω
                </motion.div>
              </div>
            </div>

            {/* Log de conversación */}
            <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: '10px 18px 4px', position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
              {messages.map((m) => (
                <div key={m.id} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '82%' }}>
                  <div style={{
                    padding: '9px 13px', borderRadius: 14, fontFamily: FONT.body, fontSize: 14, lineHeight: 1.45,
                    background: m.role === 'user' ? 'rgba(92,200,255,0.14)' : C.glass,
                    border: `1px solid ${m.role === 'user' ? C.cyanDim : C.line}`,
                    color: m.role === 'user' ? C.cyan : C.ink,
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* SUB-NODO DE ACCIÓN — la "puerta" que empuja a mejorar */}
            {action && (
              <div style={{ padding: '0 18px 10px', position: 'relative', zIndex: 2 }}>
                <motion.div
                  initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                  style={{
                    borderRadius: RADIUS.lg, padding: '13px 14px',
                    background: `linear-gradient(135deg, ${action.color}1f, rgba(255,255,255,0.03))`,
                    border: `1px solid ${action.color}55`,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                    <Sparkles size={14} color={action.color} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: action.color }}>
                      Próximo paso · {action.label} {action.value}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 11px', fontFamily: FONT.body, fontSize: 14, lineHeight: 1.45, color: C.ink }}>
                    {action.step}
                  </p>
                  <button onClick={goToAction} style={{
                    width: '100%', padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer',
                    background: `linear-gradient(135deg, ${action.color}, ${C.purple})`,
                    color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 15,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  }}>
                    Ir a mejorar <ArrowRight size={17} />
                  </button>
                </motion.div>
              </div>
            )}

            {/* Capacidades en tiempo real (4 ejes) */}
            {gemelo && (
              <div style={{ padding: '0 18px 10px', position: 'relative', zIndex: 2, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
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

            {/* Barra de comando (voz + texto) */}
            <div style={{ padding: '0 18px', position: 'relative', zIndex: 2 }}>
              <form onSubmit={(e) => { e.preventDefault(); void handleQuery(input); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 6, borderRadius: RADIUS.pill, background: C.glass2, border: `1px solid ${C.line}` }}>
                <button type="button" onClick={toggleListen} aria-label="Hablar"
                  style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
                    border: `1px solid ${state === 'listening' ? C.green : C.cyanDim}`,
                    background: state === 'listening' ? 'rgba(63,208,201,0.2)' : 'rgba(92,200,255,0.12)',
                    color: state === 'listening' ? C.green : C.cyan,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Mic size={18} />
                </button>
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Hablá o escribí a Ómicron…"
                  style={{
                    flex: 1, border: 'none', outline: 'none', background: 'transparent',
                    fontFamily: FONT.body, fontSize: 15, color: C.ink,
                  }}
                />
                <button type="submit" aria-label="Enviar" disabled={!input.trim()}
                  style={{
                    width: 42, height: 42, borderRadius: '50%', flexShrink: 0, border: 'none',
                    cursor: input.trim() ? 'pointer' : 'default', opacity: input.trim() ? 1 : 0.4,
                    background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                  <Send size={17} />
                </button>
              </form>
            </div>

            {/* Nodos de navegación */}
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto', padding: '12px 18px calc(env(safe-area-inset-bottom, 0px) + 16px)',
              position: 'relative', zIndex: 2,
            }}>
              {NODES.map(({ tab, label, Icon }) => (
                <button key={tab} onClick={() => { setActiveTab(tab); setOpen(false); }}
                  style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                    padding: '9px 12px', borderRadius: RADIUS.md, cursor: 'pointer',
                    background: C.glass, border: `1px solid ${C.line}`, color: C.ink, minWidth: 68,
                  }}>
                  <Icon size={18} color={C.cyan} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 0.4, color: C.mut }}>{label}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
