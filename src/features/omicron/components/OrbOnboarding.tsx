// src/features/omicron/components/OrbOnboarding.tsx
// ═══════════════════════════════════════════════════════════════════════
// ONBOARDING CONVERSACIONAL — Jarvis meets you for the first time.
//
// Taste: One question. No wizard. Instant profile.
// Animate: Everything enters with spring physics.
// Impeccable: TextReveal types the greeting. Chips stagger in. ScaleIn on orb.
// Superpowers: audioHum on load, audioTick on chip, audioAscend on complete,
//              CelebrationBurst on profile generated, PulseBar on submit.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { speakOmicron } from '@/features/omicron/services/voice';
import { C, FONT, RADIUS } from '@/theme';
import { TextReveal } from '@/shared/motion/TextReveal';
import { ScaleIn } from '@/shared/motion/ScaleIn';
import { SlideUp } from '@/shared/motion/SlideUp';
import { CelebrationBurst } from '@/shared/motion/CelebrationBurst';
import { MagneticButton } from '@/shared/motion/MagneticButton';
import { audioHum, audioTick, audioAscend, audioConfirm } from '@/shared/utils/spatialAudio';
import { firePulse } from '@/shared/components/LivePulseBar';
import { hapticMedium, hapticSuccess } from '@/shared/utils/haptics';

const ONBOARDING_KEY = 'omicron_onboarding_done';

interface OrbOnboardingProps {
  onComplete: (choice: 'examen' | 'cv' | 'ambos' | 'empleo' | 'aprender' | 'vender' | 'validar' | 'explorar') => void;
  onProfileGenerated?: (profile: GeneratedProfile) => void;
  onSkillsPreview?: (skills: string[]) => void;
}

export interface GeneratedProfile {
  profession: string;
  years: number;
  skills: string[];
  axes: { exec: number; qual: number; trans: number; fund: number };
  seniorLabel: string;
  summary: string;
}

const PROFILE_PROMPT = 'Eres Ómicron. El usuario te dice a qué se dedica en 1 frase. Extrae un perfil profesional ESTIMADO. Responde SOLO JSON válido: {"profession":"título corto","years":0,"skills":["skill1","skill2","skill3","skill4","skill5"],"axes":{"exec":0,"qual":0,"trans":0,"fund":0},"seniorLabel":"Profesional X","summary":"2 frases de quién es"} Reglas: skills 4-6, axes 0-100 (mínimo 20), seniorLabel real, conservador si no es claro.';

function classifyIntent(text: string): 'empleo' | 'aprender' | 'validar' | 'vender' | 'explorar' {
  const t = text.toLowerCase();
  if (/trabajo|empleo|busco|oportunidad|vacante|postular/.test(t)) return 'empleo';
  if (/aprender|curso|estudiar|mejorar|crecer|capacitar|react|python|node/.test(t)) return 'aprender';
  if (/validar|demostrar|certificar|skill|competencia|examen/.test(t)) return 'validar';
  if (/vender|servicio|freelance|ofrecer|monetizar|cobrar/.test(t)) return 'vender';
  return 'explorar';
}

function quickSkillsFromText(text: string): string[] {
  const t = text.toLowerCase();
  const matches: string[] = [];
  const map: [RegExp, string][] = [
    [/react|frontend|front.?end/, 'React'], [/node|backend|express/, 'Node.js'],
    [/python|django|flask/, 'Python'], [/typescript/, 'TypeScript'],
    [/docker|kubernetes|devops/, 'DevOps'], [/aws|cloud|azure/, 'Cloud'],
    [/figma|ux|ui|diseñ/, 'Diseño UX'], [/data|analyt|machine.?learn/, 'Data/IA'],
    [/ingenier|industrial|lean|procesos|manufactur/, 'Ing. Industrial'],
    [/civil|construcc|estructura/, 'Ing. Civil'],
    [/electr[oó]n|automat|control/, 'Electrónica'],
    [/gesti[oó]n|liderazgo|scrum|agile|gerente|director/, 'Gestión'],
    [/market|ventas|growth|comercial|publicidad/, 'Marketing'],
    [/finanz|contab|audit|tributar|impuesto/, 'Finanzas'],
    [/rrhh|recursos humanos|talento|selecci[oó]n|reclut/, 'RRHH'],
    [/emprendedor|startup|negocio|empresa/, 'Emprendimiento'],
    [/m[eé]dic|doctor|salud|cl[ií]nic/, 'Medicina'],
    [/enfermer|paramédic/, 'Enfermería'],
    [/psic[oó]log|terap/, 'Psicología'],
    [/nutrici|diet/, 'Nutrición'],
    [/profes|docen|pedagog|enseñ|educac/, 'Educación'],
    [/investig|acad[eé]mic|cient[ií]f/, 'Investigación'],
    [/abogad|derecho|legal|jur[ií]d|notari/, 'Derecho'],
    [/fotograf|video|audiovisual|cine/, 'Audiovisual'],
    [/period|comunic|prensa|redacc/, 'Comunicaciones'],
    [/arqu|urbanis/, 'Arquitectura'],
    [/chef|cocin|gastronom|culinari/, 'Gastronomía'],
    [/electricista|t[eé]cnico|mec[aá]nic|soldad/, 'Técnico'],
    [/log[ií]stic|transporte|bodega|supply/, 'Logística'],
    [/administra|secretar|asistente|oficina/, 'Administración'],
    [/freelanc|independiente|consul/, 'Consultoría'],
    [/estudiant|universid|carrera/, 'Estudiante'],
  ];
  for (const [regex, skill] of map) {
    if (regex.test(t) && matches.length < 6) matches.push(skill);
  }
  return matches;
}

const hasMicSupport = () => typeof window !== 'undefined' && !!(
  (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
  (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
);

// ── Suggestion chips data ─────────────────────────────────────────────
const SUGGESTIONS = [
  { label: 'Desarrollador web', emoji: '💻' },
  { label: 'Diseñadora UX', emoji: '🎨' },
  { label: 'Ingeniero industrial', emoji: '⚙️' },
  { label: 'Estudiante', emoji: '📚' },
  { label: 'Freelancer', emoji: '🚀' },
];

export function OrbOnboarding({ onComplete, onProfileGenerated, onSkillsPreview }: OrbOnboardingProps) {
  const { profile } = useApp();
  const [phase, setPhase] = useState<'ask' | 'processing' | 'result' | 'done'>('ask');
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const [showCelebration, setShowCelebration] = useState(false);
  const hasSpoken = useRef(false);
  const inputRef = useRef('');
  inputRef.current = input;

  const shouldHide = (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_KEY))
    || (profile?.skills && profile.skills.length > 0);

  useEffect(() => {
    if (profile?.skills && profile.skills.length > 0) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, [profile?.skills]);

  const userName = profile?.display_name || profile?.full_name || profile?.username || '';

  // Speak + audio hum on first appearance
  useEffect(() => {
    if (shouldHide || hasSpoken.current) return;
    hasSpoken.current = true;
    // Jarvis "wakes up" — subtle hum
    const t1 = setTimeout(() => audioHum(), 800);
    const t2 = setTimeout(() => {
      const greeting = userName
        ? `Hey ${userName}, soy Ómicron. Cuéntame, ¿a qué te dedicas?`
        : 'Hey, soy Ómicron. Cuéntame, ¿a qué te dedicas?';
      speakOmicron(greeting);
    }, 1800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [shouldHide, userName]);

  // Keyboard detection
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    if (shouldHide) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => setKbOpen(window.innerHeight - vv.height > 100);
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [shouldHide]);

  // Skills preview while typing
  useEffect(() => {
    if (shouldHide || phase !== 'ask' || input.length < 3) return;
    const preview = quickSkillsFromText(input);
    if (preview.length > 0) onSkillsPreview?.(preview);
  }, [input, phase, onSkillsPreview, shouldHide]);

  // Submit
  const handleSubmit = useCallback(async (overrideText?: string) => {
    const text = overrideText || inputRef.current;
    if (!text.trim() || generating) return;
    setGenerating(true);
    hapticMedium();
    audioConfirm();
    firePulse('user');

    const quickSkills = quickSkillsFromText(text);
    const yearsMatch = text.match(/(\d+)\s*a[ñn]os?/i);
    const years = yearsMatch ? parseInt(yearsMatch[1]) : 3;
    const intent = classifyIntent(text);

    const instantProfile: GeneratedProfile = {
      profession: text.trim().slice(0, 50),
      years,
      skills: quickSkills.length > 0 ? quickSkills : ['Profesional', 'Adaptabilidad', 'Trabajo en equipo'],
      axes: {
        exec: Math.min(80, 30 + years * 5),
        qual: Math.min(75, 25 + years * 4),
        trans: Math.min(60, 15 + years * 3),
        fund: Math.min(70, 20 + years * 4),
      },
      seniorLabel: years >= 8 ? 'Profesional Senior' : years >= 4 ? 'Profesional Mid-Senior' : years >= 2 ? 'Profesional Mid' : 'Profesional',
      summary: `Profesional en ${text.trim().slice(0, 40)}.`,
    };

    onProfileGenerated?.(instantProfile);
    onSkillsPreview?.(instantProfile.skills);
    import('@/shared/utils/guestMode').then(({ saveGuestProfile }) => {
      saveGuestProfile({ ...instantProfile, createdAt: new Date().toISOString() });
    }).catch(() => {});

    const skillsList = instantProfile.skills.slice(0, 3).join(', ');
    const msg = instantProfile.skills.length > 1
      ? `Listo, tu Gemelo Digital ya tiene forma. Veo que dominas ${skillsList}. ¿Quieres afinarlo subiendo tu CV o empezamos así?`
      : `Listo, tu Gemelo Digital ya tiene forma. Eres ${instantProfile.profession}. ¿Quieres afinarlo subiendo tu CV o empezamos así?`;
    setResultMsg(msg);
    setPhase('result');
    setShowCelebration(true);

    // Audio celebration
    setTimeout(() => { audioAscend(); hapticSuccess(); firePulse('success'); }, 300);

    speakOmicron(msg);
    localStorage.setItem(ONBOARDING_KEY, 'true');

    import('@/shared/utils/analytics').then(({ track }) => {
      track('onboarding_started');
      track('onboarding_completed', { intent, skills_count: instantProfile.skills.length });
      track('first_profile_generated', { profession: instantProfile.profession });
    }).catch(() => {});

    setTimeout(() => { setPhase('done'); onComplete(intent); }, 2200);

    // Background AI refinement
    try {
      const { callAI } = await import('@/infrastructure/ai/client');
      const raw = await callAI([
        { role: 'system', content: PROFILE_PROMPT },
        { role: 'user', content: text.trim() },
      ], { maxTokens: 512, temperature: 0.5, jsonMode: true });
      if (!raw) throw new Error('IA no disponible');
      let parsed: GeneratedProfile | null = null;
      try { parsed = JSON.parse(raw); } catch { const a = raw.indexOf('{'); const b = raw.lastIndexOf('}'); if (a >= 0 && b > a) parsed = JSON.parse(raw.slice(a, b + 1)); }
      if (parsed && parsed.skills) {
        onProfileGenerated?.(parsed);
        onSkillsPreview?.(parsed.skills);
      }
    } catch {
      // Silencioso
    } finally { setGenerating(false); }
  }, [generating, onComplete, onProfileGenerated, onSkillsPreview]);

  // Mic handler
  const recognitionRef = useRef<{ abort: () => void } | null>(null);
  const handleMic = useCallback(() => {
    import('@/infrastructure/voice/recognition').then(({ startSpeechRecognition, isSpeechAvailable }) => {
      if (!isSpeechAvailable()) return;
      const handle = startSpeechRecognition({
        lang: 'es-CL',
        interimResults: true,
        onResult: (transcript: string, isFinal: boolean) => {
          setInput(transcript);
          if (isFinal) handleSubmit(transcript);
        },
        onEnd: () => { recognitionRef.current = null; },
      });
      if (handle) recognitionRef.current = handle;
    });
  }, [handleSubmit]);

  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // === RENDER ===
  if (shouldHide || phase === 'done') return null;

  const greeting = userName
    ? `Hey ${userName}, cuéntame ¿a qué te dedicas?`
    : '¿A qué te dedicas? Cuéntame en una frase.';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
        style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          background: 'rgba(0,2,6,0.88)',
          backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)',
          padding: '24px 20px',
          paddingBottom: kbOpen ? '12px' : 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
          transition: 'padding-bottom 0.2s ease',
          overflow: 'auto',
        }}
      >
        {/* Celebration burst on profile generated */}
        <CelebrationBurst trigger={showCelebration} onComplete={() => setShowCelebration(false)} />

        <div style={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* ═══ MESSAGE BUBBLE ═══ */}
          {!kbOpen && phase === 'ask' && (
            <SlideUp offset={20} delay={0.3}>
              <div style={{
                padding: '18px 22px', borderRadius: RADIUS.xl,
                background: `linear-gradient(145deg, ${C.surface}, rgba(12,16,30,0.95))`,
                border: `1px solid ${C.cyanFaint}`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 12px ${C.cyan}11`,
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
                }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: C.cyan, boxShadow: `0 0 8px ${C.cyan}`,
                    animation: 'cp-breathe 2s ease-in-out infinite',
                  }} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: C.cyan, textTransform: 'uppercase' }}>
                    ÓMICRON
                  </span>
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.6 }}>
                  <TextReveal text={greeting} speed={24} cursor={true} />
                </div>
              </div>
            </SlideUp>
          )}

          {/* Compact message when keyboard open */}
          {kbOpen && phase === 'ask' && (
            <div style={{ padding: '8px 14px', borderRadius: 12, background: `${C.surface}cc` }}>
              <span style={{ fontFamily: FONT.body, fontSize: 13, color: C.mut }}>
                {userName ? `${userName}, ¿a qué te dedicas?` : '¿A qué te dedicas?'}
              </span>
            </div>
          )}

          {/* ═══ INPUT FORM ═══ */}
          {phase === 'ask' && (
            <SlideUp offset={16} delay={0.8}>
              <form
                onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
                style={{ display: 'flex', gap: 10, alignItems: 'center' }}
              >
                {hasMicSupport() && (
                  <MagneticButton onClick={handleMic} style={{
                    width: 52, height: 52, borderRadius: '50%',
                    border: `1.5px solid ${C.cyanDim}`, background: `${C.glass2}`,
                    color: C.cyan, display: 'grid', placeItems: 'center', fontSize: 22,
                    boxShadow: `0 0 12px ${C.cyan}15`,
                  }}>
                    🎤
                  </MagneticButton>
                )}
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ej: Ingeniero industrial con 8 años"
                  enterKeyHint="send"
                  autoComplete="off"
                  style={{
                    flex: 1, padding: '16px 18px', borderRadius: RADIUS.pill,
                    background: C.surface, border: `1.5px solid ${C.cyanDim}`,
                    fontFamily: FONT.body, fontSize: 15, color: C.ink, outline: 'none',
                    WebkitAppearance: 'none',
                    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = C.cyan; e.currentTarget.style.boxShadow = `0 0 16px ${C.cyan}22`; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = C.cyanDim; e.currentTarget.style.boxShadow = 'none'; }}
                />
                <MagneticButton
                  onClick={() => handleSubmit()}
                  disabled={!input.trim() || generating}
                  style={{
                    width: 52, height: 52, borderRadius: '50%', border: 'none',
                    background: input.trim() ? `linear-gradient(135deg, ${C.cyan}, ${C.purple})` : C.glass2,
                    color: input.trim() ? '#000' : C.mut,
                    display: 'grid', placeItems: 'center', fontSize: 20,
                    boxShadow: input.trim() ? `0 4px 20px ${C.cyan}44` : 'none',
                    transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  ➤
                </MagneticButton>
              </form>
            </SlideUp>
          )}

          {/* ═══ SUGGESTION CHIPS (staggered entrance) ═══ */}
          {phase === 'ask' && !input && !kbOpen && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { delayChildren: 1.2, staggerChildren: 0.08 } },
              }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}
            >
              {SUGGESTIONS.map(({ label, emoji }) => (
                <motion.button
                  key={label}
                  variants={{
                    hidden: { opacity: 0, y: 14, scale: 0.9 },
                    visible: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 400, damping: 25 } },
                  }}
                  onClick={() => { audioTick(); hapticMedium(); setInput(label); handleSubmit(label); }}
                  style={{
                    padding: '10px 16px', minHeight: 44, borderRadius: RADIUS.pill,
                    background: `linear-gradient(145deg, ${C.glass}, rgba(92,200,255,0.04))`,
                    border: `1px solid ${C.line}`,
                    color: C.ink, fontFamily: FONT.body, fontSize: 13, cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 6,
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'border-color 0.15s ease, background 0.15s ease',
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span>{emoji}</span> {label}
                </motion.button>
              ))}
            </motion.div>
          )}

          {/* ═══ RESULT PHASE ═══ */}
          {phase === 'result' && (
            <ScaleIn from={0.9} delay={0.1}>
              <div style={{
                padding: '20px 22px', borderRadius: RADIUS.xl,
                background: `linear-gradient(145deg, ${C.surface}, rgba(12,16,30,0.95))`,
                border: `1px solid ${C.greenFaint || C.cyanFaint}`,
                boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px rgba(63,208,201,0.08)`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: '#3fd0c9', boxShadow: '0 0 8px #3fd0c9',
                  }} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: '#3fd0c9', textTransform: 'uppercase' }}>
                    GEMELO ACTIVADO
                  </span>
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 14, color: C.ink, lineHeight: 1.6 }}>
                  <TextReveal text={resultMsg} speed={18} cursor={false} />
                </div>
              </div>
            </ScaleIn>
          )}

          {phase === 'result' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              style={{ textAlign: 'center', padding: '4px 0' }}
            >
              <span style={{
                fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.5, color: C.mut,
                display: 'inline-flex', alignItems: 'center', gap: 8,
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: '50%', background: C.cyan,
                  animation: 'cp-breathe 1.5s ease-in-out infinite',
                }} />
                Preparando tu orbe…
              </span>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
