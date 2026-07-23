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
  GraduationCap, Zap, Briefcase, Store, Wallet, Database, MessageSquare, Scale,
} from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../lib/supabase';
import { interpret, askCoach, askTutor } from '../../lib/oraculo';
import { speak, stopSpeaking } from '../../lib/voiceEngine';
import { C, FONT, RADIUS } from '../../theme';
import ParticleOrb from './ParticleOrb';
import ConvalidaOmicron from './ConvalidaOmicron';
import type { TabId, GemeloDigital } from '../../types';

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

type AxisKey = 'execution' | 'quality' | 'transcendence' | 'foundation';
const AXIS_ACTION: Record<AxisKey, { label: string; tab: TabId; step: string; color: string }> = {
  execution: { label: 'Ejecución', tab: 'maxskill', step: 'Completá un reto en Habilidades para demostrar tu velocidad de ejecución.', color: C.cyan },
  quality: { label: 'Calidad', tab: 'academia', step: 'Rendí un examen en Academia y validá tu calidad técnica con evidencia real.', color: C.purple },
  transcendence: { label: 'Trascendencia', tab: 'vault', step: 'Subí un aporte a la Bóveda: compartir conocimiento multiplica tu impacto.', color: C.gold },
  foundation: { label: 'Fundamento', tab: 'perfil', step: 'Convalidá tu CV y títulos para reforzar tu base teórica.', color: C.green },
};
function weakestAxis(g: GemeloDigital): AxisKey {
  const e: [AxisKey, number][] = [['execution', g.execution], ['quality', g.quality], ['transcendence', g.transcendence], ['foundation', g.foundation]];
  e.sort((a, b) => a[1] - b[1]);
  return e[0][0];
}

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

  const action = useMemo(() => {
    if (!gemelo) return null;
    const key = weakestAxis(gemelo);
    return { ...AXIS_ACTION[key], value: Math.round(gemelo[key]) };
  }, [gemelo]);

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
    const base = `Hola ${name}. Soy Ómicron, tu Gemelo Digital. Para empezar, subí tu CV real y calculo tu nivel, o hacé el examen de nivel.`;
    const push = action ? ` Tu ${action.label} está en ${action.value}: ahí está tu mayor oportunidad.` : '';
    const t = setTimeout(() => omicronSay(base + push), 500);
    return () => clearTimeout(t);
  }, [profile, action, omicronSay]);

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

  const goToAction = useCallback(() => {
    if (!action) return;
    if (action.tab === 'perfil') { onOpenPerfil?.(); return; }
    omicronSay(`Vamos. ${action.step}`);
    setTimeout(() => setActiveTab(action.tab), 700);
  }, [action, omicronSay, setActiveTab, onOpenPerfil]);

  const goNode = useCallback((tab: TabId) => {
    if (tab === 'perfil') { onOpenPerfil?.(); return; }
    setActiveTab(tab);
  }, [setActiveTab, onOpenPerfil]);

  const doLogout = useCallback(() => {
    omicronSay('Cerrando tu sesión. Hasta pronto, Nodo.');
    setTimeout(() => { void supabase.auth.signOut(); }, 900);
  }, [omicronSay]);

  // Alertas / nodos que flotan sobre la orbe (sistema de aprendizaje continuo).
  const alerts: { text: string; color: string; onClick: () => void; pos: React.CSSProperties }[] = [];
  if (action) alerts.push({ text: `${action.label} ${action.value}`, color: action.color, onClick: goToAction, pos: { top: '6%', left: '4%' } });
  if (unreadCount > 0) alerts.push({ text: `${unreadCount} alerta${unreadCount > 1 ? 's' : ''}`, color: C.gold, onClick: () => setActiveTab('empleos'), pos: { top: '11%', right: '4%' } });
  alerts.push({ text: 'Subí tu CV', color: C.cyan, onClick: () => setCvOpen(true), pos: { bottom: '8%', right: '7%' } });

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 11px', borderRadius: RADIUS.pill, background: C.glass, border: `1px solid ${C.line}` }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut }}>NIVEL</span>
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.cyan }}>N{level}</span>
            <span style={{ width: 1, height: 12, background: C.line }} />
            <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.gold }}>{rep}</span>
          </div>
          <button onClick={doLogout} aria-label="Cerrar sesión" title="Cerrar sesión"
            style={{ width: 34, height: 34, borderRadius: 11, border: `1px solid ${C.line}`, background: C.glass, color: C.mut, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>

      {/* ORBE DE PARTÍCULAS */}
      <div style={{ position: 'relative', zIndex: 2, height: '32vh', minHeight: 210, flexShrink: 0 }}>
        <ParticleOrb enableMic={state === 'listening'} />
        {/* Alertas / nodos flotando sobre la orbe */}
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
      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 16px calc(env(safe-area-inset-bottom, 0px) + 20px)', position: 'relative', zIndex: 2, minHeight: 0 }}>
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

        {/* Propuesta de mejora (puerta) */}
        {action && (
          <div style={{ borderRadius: RADIUS.lg, padding: '13px 14px', marginBottom: 12, background: `linear-gradient(135deg, ${action.color}1f, rgba(255,255,255,0.03))`, border: `1px solid ${action.color}55` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
              <Sparkles size={14} color={action.color} />
              <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: action.color }}>
                Próximo paso · {action.label} {action.value}
              </span>
            </div>
            <p style={{ margin: '0 0 11px', fontFamily: FONT.body, fontSize: 14, lineHeight: 1.45, color: C.ink }}>{action.step}</p>
            <button onClick={goToAction} style={{ width: '100%', padding: '11px 0', borderRadius: 13, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${action.color}, ${C.purple})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              Ir a mejorar <ArrowRight size={17} />
            </button>
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

        {/* Nodos de la app */}
        <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.2, textTransform: 'uppercase', color: C.mut, margin: '2px 2px 8px' }}>Explorá tus nodos</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {NODES.map(({ tab, label, Icon }) => (
            <button key={tab} onClick={() => goNode(tab)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '12px 6px', borderRadius: RADIUS.md, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}`, color: C.ink }}>
              <Icon size={19} color={C.cyan} />
              <span style={{ fontFamily: FONT.mono, fontSize: 9.5, letterSpacing: 0.3, color: C.mut }}>{label}</span>
            </button>
          ))}
        </div>
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
