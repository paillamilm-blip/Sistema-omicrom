// features/omicron/components/GemeloReveal.tsx
// ═══════════════════════════════════════════════════════════════════════
// GEMELO REVEAL — La experiencia "Tu Primer Minuto en Ómicron".
//
// 5 Actos:
//   1. "La Orbe Te Lee"        — datos aparecen tipo terminal, orbe crece
//   2. "El Veredicto"          — Ómicron habla tu eje débil (TTS)
//   3. "Mapa de Posibilidades" — dónde estás vs dónde podrías
//   4. "Oportunidad Real"      — 1 empleo que matchea + % + gap
//   5. "Momento de Verdad"     — CTA con countdown de desvanecimiento
//
// Reemplaza el Dossier viejo. Se muestra después del análisis (IA o local).
// NO requiere auth — si es guest, al final pide registro para guardar.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Briefcase, TrendingUp, Shield, Target, Clock, ChevronRight, Sparkles } from 'lucide-react';
import { C, FONT, SIZE, RADIUS } from '@/theme';
import { getUserColor } from '@/shared/components/ColorPicker';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { ProgressBar } from '@/shared/components/OmicronChrome';
import type { AnalyzedProfile } from '@/features/gemelo/services/cvAnalyzer';

// ── Types ──────────────────────────────────────────────────────────────
interface Props {
  analyzed: AnalyzedProfile;
  onActivate: () => void; // Called when user wants to register/save
  isAuthenticated: boolean;
}

interface SyntheticJob {
  title: string;
  location: string;
  salary: string;
  matchPct: number;
  matches: string[];
  gap: { skill: string; current: number; needed: number } | null;
}

// ── Constants ──────────────────────────────────────────────────────────
const ACTS = ['reading', 'verdict', 'map', 'opportunity', 'cta'] as const;
type Act = typeof ACTS[number];

const AXIS_LABELS: Record<string, { name: string; icon: typeof Zap; color: string }> = {
  exec: { name: 'Ejecución', icon: Zap, color: C.cyan },
  qual: { name: 'Calidad', icon: Shield, color: C.purple },
  trans: { name: 'Trascendencia', icon: TrendingUp, color: C.gold },
  fund: { name: 'Fundamento', icon: Target, color: C.green },
};

// ── Synthetic job generation based on skills ────────────────────────────
function generateSyntheticJob(analyzed: AnalyzedProfile): SyntheticJob {
  const { skills, labels, axes, years } = analyzed;

  // Job templates by detected industry
  const templates: Record<string, { title: string; salary: string }[]> = {
    operations: [
      { title: 'Jefe de Operaciones — Planta Productiva', salary: '$2.5M - $3.2M' },
      { title: 'Gerente de Excelencia Operacional', salary: '$3.0M - $4.0M' },
      { title: 'Coordinador de Mejora Continua', salary: '$1.8M - $2.4M' },
    ],
    leadership: [
      { title: 'Gerente de Área — Operaciones', salary: '$3.5M - $4.5M' },
      { title: 'Director de Planta', salary: '$4.0M - $5.5M' },
    ],
    react: [
      { title: 'Senior Frontend Engineer — React/TS', salary: 'USD $4,000 - $6,000' },
      { title: 'Tech Lead Frontend', salary: 'USD $6,000 - $8,500' },
    ],
    python: [
      { title: 'Senior Data Engineer', salary: 'USD $5,000 - $7,000' },
      { title: 'ML Engineer — NLP', salary: 'USD $6,000 - $9,000' },
    ],
    design: [
      { title: 'Lead UX Designer — Producto', salary: 'USD $4,500 - $6,500' },
      { title: 'Design System Lead', salary: 'USD $5,000 - $7,000' },
    ],
    default: [
      { title: 'Profesional Senior — Tu Industria', salary: 'Competitivo' },
      { title: 'Líder de Equipo', salary: 'Sobre promedio mercado' },
    ],
  };

  // Find best matching template
  const industry = skills.find(s => templates[s]) || 'default';
  const pool = templates[industry] || templates.default;
  const job = pool[Math.min(Math.floor(years / 4), pool.length - 1)];

  // Calculate match percentage
  const matchBase = Math.min(95, 55 + years * 2 + (labels.length * 3));
  const matchPct = Math.min(95, Math.max(60, matchBase));

  // Build matches list
  const matches = labels.slice(0, 3).map(l => `${l} — cumple`);
  if (years > 0) matches.push(`${years} años experiencia — cumple`);

  // Find the gap (weakest axis below 60)
  const weakest = Object.entries(axes).reduce((min, [k, v]) => v < min.val ? { key: k, val: v } : min, { key: 'trans', val: 100 });
  const gap = weakest.val < 65 ? { skill: AXIS_LABELS[weakest.key]?.name || weakest.key, current: weakest.val, needed: 60 } : null;

  return { title: job.title, location: 'Santiago · Remoto posible', salary: job.salary, matchPct, matches, gap };
}

// ── Terminal line component ──────────────────────────────────────────────
function TerminalLine({ text, delay, color = C.cyan }: { text: string; delay: number; color?: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => { const t = setTimeout(() => setVisible(true), delay); return () => clearTimeout(t); }, [delay]);
  if (!visible) return null;
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}
    >
      <span style={{ color: C.mut }}>{'>'}</span> {text}
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export function GemeloReveal({ analyzed, onActivate, isAuthenticated }: Props) {
  const uc = getUserColor();
  const [currentAct, setCurrentAct] = useState<Act>('reading');
  const [orbNodes, setOrbNodes] = useState(3);
  const [orbIntensity, setOrbIntensity] = useState(0.2);
  const [countdown, setCountdown] = useState('23:59:59');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const actTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const job = useRef(generateSyntheticJob(analyzed)).current;
  const weakAxis = Object.entries(analyzed.axes).reduce((min, [k, v]) => v < min.val ? { key: k, val: v } : min, { key: 'trans', val: 100 });
  const strongAxis = Object.entries(analyzed.axes).reduce((max, [k, v]) => v > max.val ? { key: k, val: v } : max, { key: 'exec', val: 0 });

  // ── Countdown timer (desvanecimiento) ────────────────────────────────
  useEffect(() => {
    const EXPIRE_KEY = 'omicron_gemelo_phantom_expire';
    let expire = localStorage.getItem(EXPIRE_KEY);
    if (!expire) {
      const expireDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
      expire = expireDate.toISOString();
      localStorage.setItem(EXPIRE_KEY, expire);
    }
    timerRef.current = setInterval(() => {
      const remaining = new Date(expire!).getTime() - Date.now();
      if (remaining <= 0) { setCountdown('00:00:00'); return; }
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);
      setCountdown(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  // ── Auto-progress through acts ───────────────────────────────────────
  useEffect(() => {
    if (currentAct === 'reading') {
      // Grow orb during reading
      const growInterval = setInterval(() => {
        setOrbNodes(n => Math.min(n + 1, 5 + analyzed.skills.length));
        setOrbIntensity(i => Math.min(i + 0.05, 0.9));
      }, 400);
      // Move to verdict after reading completes
      actTimerRef.current = setTimeout(() => {
        clearInterval(growInterval);
        setCurrentAct('verdict');
      }, 4500);
      return () => { clearInterval(growInterval); if (actTimerRef.current) clearTimeout(actTimerRef.current); };
    }
  }, [currentAct, analyzed.skills.length]);

  const advanceAct = useCallback(() => {
    const idx = ACTS.indexOf(currentAct);
    if (idx < ACTS.length - 1) setCurrentAct(ACTS[idx + 1]);
  }, [currentAct]);

  // ── TTS for verdict ──────────────────────────────────────────────────
  useEffect(() => {
    if (currentAct === 'verdict') {
      import('@/infrastructure/voice/engine').then(({ speak }) => {
        const weakName = AXIS_LABELS[weakAxis.key]?.name || 'Trascendencia';
        speak(`${analyzed.name || 'Tu perfil'}. ${analyzed.seniorLabel}. Tu ${AXIS_LABELS[strongAxis.key]?.name || 'Ejecución'} es fuerte. Pero tu ${weakName} está en ${weakAxis.val}. Ómicron puede ayudarte a subirla.`);
      }).catch(() => {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAct]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg, overflow: 'hidden' }}>
      {/* Orb — always visible, grows with acts */}
      <div style={{ position: 'absolute', top: '8%', left: '50%', transform: 'translateX(-50%)', zIndex: 1, opacity: currentAct === 'cta' ? 0.4 : 1, transition: 'opacity 1s' }}>
        <GeodesicOrb size={currentAct === 'reading' ? 140 : 100} nodes={orbNodes} color={uc} spinning={15} intensity={orbIntensity} breathing />
      </div>

      {/* Content area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: currentAct === 'reading' ? '42%' : '28%', overflow: 'auto' }}>
        <AnimatePresence mode="wait">

          {/* ── ACT 1: LA ORBE TE LEE ────────────────────────────────── */}
          {currentAct === 'reading' && (
            <motion.div key="reading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1 }}>
              <TerminalLine text="Detectando identidad..." delay={200} color={C.mut} />
              <TerminalLine text={analyzed.name || 'Profesional detectado'} delay={800} color={C.ink} />
              <TerminalLine text={analyzed.seniorLabel} delay={1400} color={uc} />
              <TerminalLine text={`${analyzed.years} años en entornos productivos`} delay={2000} color={C.ink} />
              <TerminalLine text={analyzed.labels.slice(0, 4).join(' · ')} delay={2600} color={C.gold} />
              <TerminalLine text="Gemelo Digital calibrado." delay={3600} color={C.green} />
            </motion.div>
          )}

          {/* ── ACT 2: EL VEREDICTO ──────────────────────────────────── */}
          {currentAct === 'verdict' && (
            <motion.div key="verdict" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1 }}>
              {/* 4 Axes visual */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                {Object.entries(analyzed.axes).map(([key, val]) => {
                  const info = AXIS_LABELS[key];
                  const isWeak = key === weakAxis.key;
                  const Icon = info?.icon || Zap;
                  return (
                    <div key={key} style={{ padding: 12, borderRadius: RADIUS.lg, background: isWeak ? `${C.red}12` : C.glass, border: `1px solid ${isWeak ? C.red + '44' : C.line}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <Icon size={12} color={info?.color || C.cyan} />
                        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textTransform: 'uppercase', letterSpacing: 1 }}>{info?.name || key}</span>
                      </div>
                      <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color: isWeak ? C.red : info?.color || C.cyan }}>{val}</div>
                      {isWeak && <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.red }}>← tu punto ciego</span>}
                    </div>
                  );
                })}
              </div>

              {/* Verdict message */}
              <div style={{ padding: 16, borderRadius: RADIUS.xl, background: C.glass, border: `1px solid ${C.line}`, marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Sparkles size={14} color={uc} />
                  <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.4, color: uc, textTransform: 'uppercase' }}>Ómicron dice</span>
                </div>
                <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.6, margin: 0 }}>
                  Tu <strong style={{ color: AXIS_LABELS[strongAxis.key]?.color }}>{AXIS_LABELS[strongAxis.key]?.name}</strong> es sólida — {strongAxis.val}/100.
                  Pero tu <strong style={{ color: C.red }}>{AXIS_LABELS[weakAxis.key]?.name}</strong> está en {weakAxis.val}.
                  Si la subís a 60, desbloqueas oportunidades de un nivel superior.
                </p>
              </div>

              <button onClick={advanceAct} style={{ width: '100%', padding: '14px 20px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Ver mi mapa de posibilidades <ChevronRight size={16} />
              </button>
            </motion.div>
          )}

          {/* ── ACT 3: MAPA DE POSIBILIDADES ─────────────────────────── */}
          {currentAct === 'map' && (
            <motion.div key="map" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2, color: C.mut, textTransform: 'uppercase', marginBottom: 16, textAlign: 'center' }}>Tu mapa de posibilidades</div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                {/* WHERE YOU ARE */}
                <div style={{ padding: 14, borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${C.line}` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, marginBottom: 10, textTransform: 'uppercase' }}>Hoy</div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color: C.gold, marginBottom: 4 }}>{Math.round(0.2 * 20 + 0.8 * ((analyzed.axes.exec + analyzed.axes.qual + analyzed.axes.trans + analyzed.axes.fund) / 4))}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>Reputación</div>
                  <div style={{ marginTop: 10, fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.ink }}>💼 {Math.max(1, Math.floor(analyzed.years / 3))} empleos accesibles</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.ink }}>🎯 Nodo {analyzed.arch === 'senior' || analyzed.arch === 'lead' ? 'Senior' : 'Mid'}</div>
                </div>

                {/* WHERE YOU COULD BE */}
                <div style={{ padding: 14, borderRadius: RADIUS.lg, background: `${C.green}0a`, border: `1px solid ${C.green}33` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.green, marginBottom: 10, textTransform: 'uppercase' }}>En 2 semanas</div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xl, color: C.green, marginBottom: 4 }}>{Math.min(95, Math.round(0.2 * 40 + 0.8 * ((analyzed.axes.exec + analyzed.axes.qual + Math.min(analyzed.axes.trans + 15, 80) + analyzed.axes.fund) / 4)))}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>Reputación</div>
                  <div style={{ marginTop: 10, fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.green }}>💼 {Math.max(3, Math.floor(analyzed.years / 2) + 4)} empleos</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.green }}>🎯 Nodo {analyzed.arch === 'senior' ? 'Lead' : 'Senior'}</div>
                </div>
              </div>

              {/* What's needed */}
              <div style={{ padding: 14, borderRadius: RADIUS.lg, background: C.glass, border: `1px solid ${uc}33`, marginBottom: 16 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: 10 }}>¿Qué falta?</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>
                    <span style={{ color: C.gold }}>△</span> {AXIS_LABELS[weakAxis.key]?.name} +15 → subir eje
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>
                    <span style={{ color: C.gold }}>△</span> 1 validación de pares
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink }}>
                    <span style={{ color: C.gold }}>△</span> 1 reto completado
                  </div>
                </div>
                <div style={{ marginTop: 10, fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>⚡ Tiempo estimado: 2 semanas con Ómicron</div>
              </div>

              <button onClick={advanceAct} style={{ width: '100%', padding: '14px 20px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Ver oportunidad real <Briefcase size={16} />
              </button>
            </motion.div>
          )}

          {/* ── ACT 4: OPORTUNIDAD REAL ──────────────────────────────── */}
          {currentAct === 'opportunity' && (
            <motion.div key="opportunity" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1 }}>
              <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2, color: C.gold, textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>Oportunidad detectada</div>

              <div style={{ padding: 16, borderRadius: RADIUS.xl, background: C.glass, border: `1px solid ${C.gold}33`, marginBottom: 16 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.lg, color: C.ink, marginBottom: 4 }}>{job.title}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut, marginBottom: 12 }}>{job.location} · {job.salary}</div>

                {/* Match bar */}
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>Match con tu perfil</span>
                    <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, color: job.matchPct >= 80 ? C.green : C.gold }}>{job.matchPct}%</span>
                  </div>
                  <ProgressBar pct={job.matchPct} color={job.matchPct >= 80 ? C.green : C.gold} height={6} />
                </div>

                {/* Matches */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                  {job.matches.map((m, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.green }}>
                      <span>✓</span> {m}
                    </div>
                  ))}
                  {job.gap && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT.body, fontSize: SIZE.sm, color: C.gold }}>
                      <span>△</span> {job.gap.skill} ({job.gap.current}%) — debajo del ideal
                    </div>
                  )}
                </div>

                {/* Coaching hint */}
                {job.gap && (
                  <div style={{ padding: 10, borderRadius: RADIUS.md, background: `${uc}0a`, border: `1px solid ${uc}22` }}>
                    <p style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, margin: 0, lineHeight: 1.5 }}>
                      <span style={{ color: uc, fontWeight: 700 }}>Si subís {job.gap.skill} a 60</span>, este match pasa a {Math.min(95, job.matchPct + 13)}%. Ómicron puede ayudarte HOY.
                    </p>
                  </div>
                )}
              </div>

              <button onClick={advanceAct} style={{ width: '100%', padding: '14px 20px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                Activar mi Gemelo Digital <Sparkles size={16} />
              </button>
            </motion.div>
          )}

          {/* ── ACT 5: MOMENTO DE VERDAD ─────────────────────────────── */}
          {currentAct === 'cta' && (
            <motion.div key="cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 2, color: C.mut, textTransform: 'uppercase', marginBottom: 8 }}>Tu Gemelo Digital está vivo</div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.hero, color: C.ink, marginBottom: 4 }}>{analyzed.seniorLabel}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Pero solo en tu memoria.</div>
              </div>

              {/* Without vs With account */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
                <div style={{ padding: 12, borderRadius: RADIUS.lg, background: `${C.red}08`, border: `1px solid ${C.red}22` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.red, textTransform: 'uppercase', marginBottom: 8 }}>Sin cuenta</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut }}>
                    <span>× Desaparece al cerrar</span>
                    <span>× Sin acceso a empleos</span>
                    <span>× Sin mejora continua</span>
                    <span>× Nadie te encuentra</span>
                  </div>
                </div>
                <div style={{ padding: 12, borderRadius: RADIUS.lg, background: `${C.green}08`, border: `1px solid ${C.green}33` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.green, textTransform: 'uppercase', marginBottom: 8 }}>Con cuenta</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: FONT.body, fontSize: SIZE.xs, color: C.ink }}>
                    <span>✓ Gemelo vive 24/7</span>
                    <span>✓ Ómicron te empuja</span>
                    <span>✓ Oportunidades reales</span>
                    <span>✓ Reputación imparable</span>
                  </div>
                </div>
              </div>

              {/* CTA Button */}
              <motion.button
                onClick={onActivate}
                whileTap={{ scale: 0.97 }}
                style={{ width: '100%', padding: '16px 24px', borderRadius: RADIUS.pill, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, border: 'none', color: '#fff', fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.lg, cursor: 'pointer', boxShadow: `0 4px 24px ${uc}44`, marginBottom: 12 }}
              >
                🧬 {isAuthenticated ? 'Guardar mi Gemelo Digital' : 'Activar mi Gemelo Digital'}
              </motion.button>
              <p style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, margin: '0 0 16px' }}>
                {isAuthenticated ? 'Se guarda en tu perfil permanentemente' : '30 segundos — sin tarjeta de crédito'}
              </p>

              {/* Countdown */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '10px 16px', borderRadius: RADIUS.pill, background: `${C.red}0a`, border: `1px solid ${C.red}22` }}>
                <Clock size={12} color={C.red} />
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.red }}>Tu Gemelo se desvanece en {countdown}</span>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
