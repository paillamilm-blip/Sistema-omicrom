// src/features/omicron/components/OrbOnboarding.tsx
// ONBOARDING CONVERSACIONAL — Burbuja de mensaje solamente.
// El input lo maneja OrbShell (barra unificada).
import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '@/store/AppContext';
import { speakOmicron } from '@/features/omicron/services/voice';
import { C, FONT, RADIUS } from '@/theme';

const ONBOARDING_KEY = 'omicron_onboarding_done';

export interface GeneratedProfile {
  profession: string;
  years: number;
  skills: string[];
  axes: { exec: number; qual: number; trans: number; fund: number };
  seniorLabel: string;
  summary: string;
}

interface OrbOnboardingProps {
  onComplete: (choice: 'examen' | 'cv' | 'ambos' | 'empleo' | 'aprender' | 'vender' | 'validar' | 'explorar') => void;
  onProfileGenerated?: (profile: GeneratedProfile) => void;
  onSkillsPreview?: (skills: string[]) => void;
  /** Called by OrbShell when user submits text in the unified bar */
  onTextInput?: null; // Deprecated — now uses imperative ref
}

/** Imperative handle for OrbShell to call into onboarding */
export interface OnboardingHandle {
  submit: (text: string) => void;
  phase: 'ask' | 'processing' | 'result' | 'done' | 'hidden';
  placeholder: string;
  chips: string[];
}

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
    [/profes|docen|pedagog|enseñ|educac/, 'Educación'],
    [/abogad|derecho|legal|jur[ií]d|notari/, 'Derecho'],
    [/fotograf|video|audiovisual|cine/, 'Audiovisual'],
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

const PROFILE_PROMPT = 'Eres Ómicron. El usuario te dice a qué se dedica en 1 frase. Extrae un perfil profesional ESTIMADO. Responde SOLO JSON válido: {"profession":"título corto","years":0,"skills":["skill1","skill2","skill3","skill4","skill5"],"axes":{"exec":0,"qual":0,"trans":0,"fund":0},"seniorLabel":"Profesional X","summary":"2 frases de quién es"} Reglas: skills 4-6, axes 0-100 (mínimo 20), seniorLabel real, conservador si no es claro.';

/**
 * Hook that manages onboarding state and returns an imperative handle.
 * OrbShell uses this to integrate onboarding into the unified input bar.
 */
export function useOnboarding({ onComplete, onProfileGenerated, onSkillsPreview }: {
  onComplete: (choice: 'examen' | 'cv' | 'ambos' | 'empleo' | 'aprender' | 'vender' | 'validar' | 'explorar') => void;
  onProfileGenerated?: (profile: GeneratedProfile) => void;
  onSkillsPreview?: (skills: string[]) => void;
}): OnboardingHandle & { messageEl: React.ReactNode } {
  const { profile } = useApp();
  const [phase, setPhase] = useState<'ask' | 'processing' | 'result' | 'done'>('ask');
  const [generating, setGenerating] = useState(false);
  const [resultMsg, setResultMsg] = useState('');
  const hasSpoken = useRef(false);

  const shouldHide = (typeof localStorage !== 'undefined' && !!localStorage.getItem(ONBOARDING_KEY))
    || !!(profile?.skills && profile.skills.length > 0);

  useEffect(() => {
    if (profile?.skills && profile.skills.length > 0) {
      localStorage.setItem(ONBOARDING_KEY, 'true');
    }
  }, [profile?.skills]);

  const userName = profile?.display_name || profile?.full_name || profile?.username || '';

  // Speak greeting once
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

  // Submit handler
  const submit = useCallback(async (text: string) => {
    if (!text.trim() || generating || shouldHide) return;
    setGenerating(true);
    setPhase('processing');

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
      ? `Listo, tu Gemelo Digital ya tiene forma. Veo que dominas ${skillsList}. ¡Explorá tu orbe!`
      : `Listo, tu Gemelo Digital ya tiene forma. Eres ${instantProfile.profession}. ¡Explorá tu orbe!`;
    setResultMsg(msg);
    setPhase('result');
    speakOmicron(msg);
    localStorage.setItem(ONBOARDING_KEY, 'true');

    import('@/shared/utils/analytics').then(({ track }) => {
      track('onboarding_completed', { intent, skills_count: instantProfile.skills.length });
    }).catch(() => {});

    setTimeout(() => { setPhase('done'); onComplete(intent); }, 1500);

    // Background: IA refina
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
    } catch { /* silencioso */ }
    finally { setGenerating(false); }
  }, [generating, shouldHide, onComplete, onProfileGenerated, onSkillsPreview]);

  // Determine current state for the unified bar
  const effectivePhase = shouldHide ? 'hidden' as const : phase;
  const placeholder = effectivePhase === 'ask'
    ? 'Ej: Ingeniero industrial con 8 años'
    : 'Hablá o escribí a Ómicron…';
  const chips = effectivePhase === 'ask'
    ? ['Desarrollador web', 'Diseñadora UX', 'Ingeniero industrial', 'Estudiante']
    : [];

  // Message bubble (rendered by OrbShell above the input)
  const messageEl = (effectivePhase !== 'hidden' && effectivePhase !== 'done') ? (
    <AnimatePresence>
      <motion.div
        key={phase}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          padding: '16px 20px',
          borderRadius: RADIUS.lg,
          background: C.surface,
          border: `1px solid ${C.line}`,
          maxWidth: 360,
          width: '100%',
        }}
      >
        <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, display: 'block', marginBottom: 6 }}>ÓMICRON</span>
        <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 15, color: C.ink, lineHeight: 1.5 }}>
          {phase === 'processing' && <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 8, height: 8, borderRadius: '50%', background: C.cyan, animation: 'cp-pulse 1s ease-in-out infinite' }} />Analizando tu perfil…</span>}
          {phase === 'result' && resultMsg}
          {phase === 'ask' && (userName ? `Hey ${userName}, ¿a qué te dedicas? Cuéntame en una frase.` : '¿A qué te dedicas? Cuéntame en una frase.')}
        </p>
      </motion.div>
    </AnimatePresence>
  ) : null;

  return { submit, phase: effectivePhase, placeholder, chips, messageEl };
}

// Legacy export for backward compat (renders nothing — logic moved to useOnboarding hook)
export function OrbOnboarding(_props: OrbOnboardingProps) {
  return null;
}
