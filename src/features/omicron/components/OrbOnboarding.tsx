// src/components/omicron/OrbOnboarding.tsx
// ONBOARDING CONVERSACIONAL — R1-R5 completas.
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { speakOmicron } from '@/features/omicron/services/voice';
import { C, FONT, RADIUS } from '@/theme';

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
    // Tech
    [/react|frontend|front.?end/, 'React'], [/node|backend|express/, 'Node.js'],
    [/python|django|flask/, 'Python'], [/typescript/, 'TypeScript'],
    [/docker|kubernetes|devops/, 'DevOps'], [/aws|cloud|azure/, 'Cloud'],
    [/figma|ux|ui|diseñ/, 'Diseño UX'], [/data|analyt|machine.?learn/, 'Data/IA'],
    // Ingeniería
    [/ingenier|industrial|lean|procesos|manufactur/, 'Ing. Industrial'],
    [/civil|construcc|estructura/, 'Ing. Civil'],
    [/electr[oó]n|automat|control/, 'Electrónica'],
    // Negocios
    [/gesti[oó]n|liderazgo|scrum|agile|gerente|director/, 'Gestión'],
    [/market|ventas|growth|comercial|publicidad/, 'Marketing'],
    [/finanz|contab|audit|tributar|impuesto/, 'Finanzas'],
    [/rrhh|recursos humanos|talento|selecci[oó]n|reclut/, 'RRHH'],
    [/emprendedor|startup|negocio|empresa/, 'Emprendimiento'],
    // Salud
    [/m[eé]dic|doctor|salud|cl[ií]nic/, 'Medicina'],
    [/enfermer|paramédic/, 'Enfermería'],
    [/psic[oó]log|terap/, 'Psicología'],
    [/nutrici|diet/, 'Nutrición'],
    // Educación
    [/profes|docen|pedagog|enseñ|educac/, 'Educación'],
    [/investig|acad[eé]mic|cient[ií]f/, 'Investigación'],
    // Derecho
    [/abogad|derecho|legal|jur[ií]d|notari/, 'Derecho'],
    // Creativos
    [/fotograf|video|audiovisual|cine/, 'Audiovisual'],
    [/period|comunic|prensa|redacc/, 'Comunicaciones'],
    [/arqu|urbanis/, 'Arquitectura'],
    [/chef|cocin|gastronom|culinari/, 'Gastronomía'],
    // Oficios
    [/electricista|t[eé]cnico|mec[aá]nic|soldad/, 'Técnico'],
    [/log[ií]stic|transporte|bodega|supply/, 'Logística'],
    [/administra|secretar|asistente|oficina/, 'Administración'],
    // Genérico (si dice años de experiencia)
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

export function OrbOnboarding({ onComplete, onProfileGenerated, onSkillsPreview }: OrbOnboardingProps) {
  const { profile } = useApp();
  const [phase, setPhase] = useState<'ask' | 'processing' | 'result' | 'done'>('ask');
  const [input, setInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const hasSpoken = useRef(false);
  const inputRef = useRef('');
  inputRef.current = input; // Always fresh for mic callback

  // Check if should hide (BEFORE hooks — but hooks still declared below)
  const shouldHide = (typeof localStorage !== 'undefined' && localStorage.getItem(ONBOARDING_KEY))
    || (profile?.skills && profile.skills.length > 0);

  // Mark done if already has skills
  useEffect(() => {
    if (profile?.skills && profile.skills.length > 0) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, [profile?.skills]);

  const userName = profile?.display_name || profile?.full_name || profile?.username || '';

  // Speak greeting once — intenta hablar al entrar.
  // En iOS puede fallar sin gesto previo (silencioso, no crashea).
  // En Android/Chrome desktop SÍ funciona.
  // La confirmación post-submit SIEMPRE funciona (es respuesta a gesto).
  useEffect(() => {
    if (shouldHide || hasSpoken.current) return;
    hasSpoken.current = true;
    const t = setTimeout(() => {
      const greeting = userName
        ? `Hey ${userName}, soy Ómicron. Cuéntame, ¿a qué te dedicas?`
        : 'Hey, soy Ómicron. Cuéntame, ¿a qué te dedicas?';
      speakOmicron(greeting);
    }, 1800);
    return () => clearTimeout(t);
  }, [shouldHide, userName]);

  // Mobile: detectar si el teclado está abierto para ajustar layout
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    if (shouldHide) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      setKbOpen(window.innerHeight - vv.height > 100);
    };
    vv.addEventListener('resize', onResize);
    return () => vv.removeEventListener('resize', onResize);
  }, [shouldHide]);

  // R5: Preview skills while typing
  useEffect(() => {
    if (shouldHide || phase !== 'ask' || input.length < 3) return;
    const preview = quickSkillsFromText(input);
    if (preview.length > 0) onSkillsPreview?.(preview);
  }, [input, phase, onSkillsPreview, shouldHide]);

  // Submit handler — INSTANT PROFILE: regex primero, IA refina en background
  const handleSubmit = useCallback(async (overrideText?: string) => {
    const text = overrideText || inputRef.current;
    if (!text.trim() || generating) return;
    setGenerating(true);

    // PASO 1: INSTANT (0ms) — perfil por regex, sin esperar IA
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

    // Mostrar resultado INMEDIATAMENTE (sin spinner)
    onProfileGenerated?.(instantProfile);
    onSkillsPreview?.(instantProfile.skills);
    // Guardar como guest profile (para migrar cuando se registre)
    import('@/shared/utils/guestMode').then(({ saveGuestProfile }) => {
      saveGuestProfile({ ...instantProfile, createdAt: new Date().toISOString() });
    }).catch(() => {});
    const skillsList = instantProfile.skills.slice(0, 3).join(', ');
    const msg = instantProfile.skills.length > 1
      ? `Listo, tu Gemelo Digital ya tiene forma. Veo que dominas ${skillsList}. ¿Quieres afinarlo subiendo tu CV o empezamos así?`
      : `Listo, tu Gemelo Digital ya tiene forma. Eres ${instantProfile.profession}. ¿Quieres afinarlo subiendo tu CV o empezamos así?`;
    setResultMsg(msg);
    setPhase('result');
    // Voz: esta llamada SÍ funciona en iOS porque es respuesta a un gesto (submit/chip tap)
    speakOmicron(msg);
    localStorage.setItem(ONBOARDING_KEY, 'true');

    // Analytics: track onboarding + profile generation
    import('@/shared/utils/analytics').then(({ track }) => {
      track('onboarding_started');
      track('onboarding_completed', { intent, skills_count: instantProfile.skills.length });
      track('first_profile_generated', { profession: instantProfile.profession });
    }).catch(() => {});

    // Auto-navegar a intent rápido (1.5s en vez de 3.5s)
    setTimeout(() => { setPhase('done'); onComplete(intent); }, 1500);

    // PASO 2: BACKGROUND — IA refina (sin bloquear al usuario)
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
        // Refinar silenciosamente (el usuario ya está navegando)
        onProfileGenerated?.(parsed);
        onSkillsPreview?.(parsed.skills);
      }
    } catch {
      // Silencioso — el perfil instant ya funciona
    } finally { setGenerating(false); }
  }, [generating, onComplete, onProfileGenerated, onSkillsPreview]);

  // Mic handler — stores ref for cleanup
  const recognitionRef = useRef<{ abort: () => void } | null>(null);
  const handleMic = useCallback(() => {
    import('@/infrastructure/voice/recognition').then(({ startSpeechRecognition, isSpeechAvailable }) => {
      if (!isSpeechAvailable()) return;
      const handle = startSpeechRecognition({
        lang: 'es-CL',
        interimResults: true,
        onResult: (transcript, isFinal) => {
          setInput(transcript);
          if (isFinal) handleSubmit(transcript);
        },
        onEnd: () => { recognitionRef.current = null; },
      });
      if (handle) recognitionRef.current = handle;
    });
  }, [handleSubmit]);

  // Cleanup: abort recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  // === RENDER ===
  if (shouldHide || phase === 'done') return null;

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
        style={{
          position: 'absolute', inset: 0, zIndex: 50,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
          background: 'rgba(0,2,6,0.82)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          padding: '24px 20px',
          // Mobile keyboard-aware: cuando el teclado está abierto, reducir padding
          // para que el form no quede tapado
          paddingBottom: kbOpen ? '12px' : 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
          transition: 'padding-bottom 0.2s ease',
          overflow: 'auto',
        }}>
        <div style={{ maxWidth: 360, width: '100%', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Mensaje de Ómicron — se oculta cuando el teclado está abierto para dar espacio */}
          {!kbOpen && (
            <motion.div key={phase} initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ padding: '16px 20px', borderRadius: RADIUS.lg, background: C.surface, border: `1px solid ${C.line}` }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, display: 'block', marginBottom: 6 }}>ÓMICRON</span>
              <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.5 }}>
                {phase === 'processing' && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 10, height: 10, borderRadius: '50%', background: C.cyan, animation: 'cp-pulse 1s ease-in-out infinite' }} />Analizando tu perfil…</span>}
                {phase === 'result' && resultMsg}
                {phase === 'ask' && (userName ? `Hey ${userName}, cuéntame ¿a qué te dedicas?` : '¿A qué te dedicas? Cuéntame en una frase.')}
              </p>
            </motion.div>
          )}
          {/* Versión compacta del mensaje cuando el teclado está abierto */}
          {kbOpen && phase === 'ask' && (
            <div style={{ padding: '8px 12px', borderRadius: 12, background: `${C.surface}99` }}>
              <span style={{ fontFamily: FONT.body, fontSize: 13, color: C.mut }}>
                {userName ? `${userName}, ¿a qué te dedicas?` : '¿A qué te dedicas?'}
              </span>
            </div>
          )}
          {phase === 'ask' && (
            <motion.form initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }}
              onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}
              style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              {hasMicSupport() && (
                <button type="button" onClick={handleMic} aria-label="Hablar"
                  style={{ width: 48, height: 48, borderRadius: '50%', border: `1px solid ${C.cyanDim}`, background: C.glass2, color: C.cyan, cursor: 'pointer', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0 }}>
                  🎤
                </button>
              )}
              <input value={input} onChange={(e) => setInput(e.target.value)}
                placeholder="Ej: Ingeniero industrial con 8 años"
                enterKeyHint="send"
                autoComplete="off"
                style={{ flex: 1, padding: '16px', borderRadius: RADIUS.pill, background: C.surface, border: `1px solid ${C.cyanDim}`, fontFamily: FONT.body, fontSize: 15, color: C.ink, outline: 'none', WebkitAppearance: 'none' }} />
              <button type="submit" disabled={!input.trim() || generating}
                aria-label="Enviar"
                style={{ width: 48, height: 48, borderRadius: '50%', border: 'none', background: input.trim() ? `linear-gradient(135deg, ${C.cyan}, ${C.purple})` : C.glass2, color: input.trim() ? '#000' : C.mut, cursor: input.trim() ? 'pointer' : 'default', display: 'grid', placeItems: 'center', fontSize: 20, flexShrink: 0, boxShadow: input.trim() ? '0 4px 16px rgba(92,200,255,0.3)' : 'none', transition: 'background 0.2s, box-shadow 0.2s' }}>
                ➤
              </button>
            </motion.form>
          )}
          {/* Suggestion chips — más grandes para touch mobile (min 44px height) */}
          {phase === 'ask' && !input && !kbOpen && (
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {['Desarrollador web', 'Diseñadora UX', 'Ingeniero industrial', 'Estudiante', 'Freelancer'].map(s => (
                <button key={s} onClick={() => { setInput(s); handleSubmit(s); }}
                  style={{
                    padding: '10px 16px', minHeight: 44, borderRadius: RADIUS.pill,
                    background: C.glass, border: `1px solid ${C.line}`, color: C.ink,
                    fontFamily: FONT.body, fontSize: 13, cursor: 'pointer',
                    WebkitTapHighlightColor: 'transparent',
                    transition: 'background var(--timing-fast) var(--ease-default)',
                  }}>
                  {s}
                </button>
              ))}
            </motion.div>
          )}
          {phase === 'result' && (
            <>
              {!kbOpen && (
                <motion.div key="result-msg" initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ padding: '16px 20px', borderRadius: RADIUS.lg, background: C.surface, border: `1px solid ${C.line}` }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, display: 'block', marginBottom: 6 }}>ÓMICRON</span>
                  <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.5 }}>{resultMsg}</p>
                </motion.div>
              )}
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 11, color: C.mut, margin: 0, letterSpacing: 1 }}>
                Preparando tu orbe…
              </motion.p>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
