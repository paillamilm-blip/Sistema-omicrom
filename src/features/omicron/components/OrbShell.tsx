import { useState, lazy, Suspense, useCallback, useRef, useEffect, useMemo } from 'react';
import OrbNeuronal, { type OrbNode } from './OrbNeuronal';
import { OrbOnboarding, type GeneratedProfile } from './OrbOnboarding';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { ProactiveMessage, type ProactiveAction } from './ProactiveMessage';
// NOTE ("Matar el Escritorio" Inc 2): ProactiveCards y OrbContextLabel se
// DESMONTARON del shell para consolidar el Home en UNA sola voz ambiental
// (OrbEstadoDelDia). Sus archivos permanecen en el repo (reversible), pero
// ya no se importan aquí.
import { OrbHomeGuide } from './OrbHomeGuide';
import { OrbEstadoDelDia } from './OrbEstadoDelDia';
import { resolveGreetingName } from '../utils/orbHomeGuide';
import { pickHomeStatus } from '../utils/homeStatus';
import { nodeUnlock, levelBandFor } from '../utils/nodeUnlock';
import { shouldShowWelcomeCredencial } from '../utils/welcomeCredencial';
import { CloudSavedBadge } from './CloudSavedBadge';
import { PremiumLock } from '@/features/wallet/components/Premium';
import { ErrorBoundary } from '@/shared/components/ErrorBoundary';
import { useNavigation } from '@/store/NavigationContext';
import { useProfile } from '@/store/ProfileContext';
import { interpret } from '@/features/omicron/services/oraculo';
import { speakOmicron } from '@/features/omicron/services/voice';
import { askOmicron, checkOmicronLimit, type OmicronContext } from '@/features/omicron/services/brain';
import { stopAI, isAudioUnlocked, speakLocal } from '@/infrastructure/voice/voiceAI';
import { useGemeloProfile } from '@/features/gemelo/hooks/useGemeloProfile';
import { useIdleEscalation } from '@/hooks/useIdleEscalation';
import { computeSteps, nodeGuidance } from '@/features/omicron/services/coach';
import { streakDays } from '@/features/gemelo/services/profile';
import { getNextProfileQuestion, hasAskedToday, markAskedToday } from '@/features/gemelo/services/progressive';
import { evaluateProactiveEvents } from '@/features/gemelo/services/proactive';
import { motion, useReducedMotion } from 'framer-motion';
import { C, FONT, SIZE } from '@/theme';
import { hapticMedium, hapticLight } from '@/shared/utils/haptics';
import { audioSweep, audioTick } from '@/shared/utils/spatialAudio';
import { firePulse } from '@/shared/components/LivePulseBar';
import { getUserColor } from '@/shared/components/ColorPicker';
import { useUserColor } from '@/shared/hooks/useUserColor';
import {
  detectActiveSynergies,
  synergyGroupForSkill,
  SYNERGY_GROUP_META,
} from '@/features/omicron/utils/skillSynergy';
import type { TabId, GemeloDigital } from '@/types';

// =====================================================================
// <OrbShell /> — La shell completa de la app.
//
// Flujo:
//   1. IDLE → solo el orbe flotando sobre negro. Oráculo abajo.
//   2. TAP NODO → el orbe gira, aparece preview flotante del nodo.
//   3. CLICK PREVIEW → fullscreen (se renderiza la tab completa).
//   4. BACK → contrae de vuelta al orbe.
//
// Reemplaza: AppShell + NavigationStack + BottomNav + UnifiedLayout
// =====================================================================

// ── Lazy tab components ─────────────────────────────────────────────
const WalletTab     = lazy(() => import('@/features/wallet/components/WalletTab').then(m => ({ default: m.WalletTab })));
const RedSocialTab  = lazy(() => import('@/features/gemelo/components/RedSocialTab').then(m => ({ default: m.RedSocialTab })));
const EmpleosTab    = lazy(() => import('@/features/empleos/components/EmpleosTab').then(m => ({ default: m.EmpleosTab })));
const MarketTab     = lazy(() => import('@/features/market/components/MarketTab').then(m => ({ default: m.MarketTab })));
const GemeloTab     = lazy(() => import('@/features/gemelo/components/GemeloTab').then(m => ({ default: m.GemeloTab })));
const MaxSkillTab   = lazy(() => import('@/features/academia/components/MaxSkillTab').then(m => ({ default: m.MaxSkillTab })));
const AcademiaTab   = lazy(() => import('@/features/academia/components/AcademiaTab').then(m => ({ default: m.AcademiaTab })));
const GobernanzaTab = lazy(() => import('@/features/gobernanza/components/GobernanzaTab').then(m => ({ default: m.GobernanzaTab })));
const VaultTab      = lazy(() => import('@/features/market/components/VaultTab').then(m => ({ default: m.VaultTab })));
const ConvalidaOmicron = lazy(() => import('./ConvalidaOmicron'));
const CredencialModal = lazy(() => import('@/features/gemelo/components/CredencialModal').then(m => ({ default: m.CredencialModal })));

// ── Orb node definitions (the app sections) ─────────────────────────
// Los primeros 9 son los HUBS navegables de la app.
// El resto son NODOS DE CONOCIMIENTO: cada partícula es una posibilidad
// de integrar conocimiento al Gemelo Digital.
// ── Hub nodes (always present — the 9 app sections) ─────────────────
const HUB_NODES: OrbNode[] = [
  { id: 'inicio',      label: 'Mi Gemelo',    tab: 'perfil',     icon: '⬡' },
  { id: 'academia',    label: 'Academia',     tab: 'academia',   icon: '◈' },
  { id: 'empleos',     label: 'Empleos',      tab: 'empleos',    icon: '◇' },
  { id: 'mercado',     label: 'Mercado',      tab: 'market',     icon: '⬢' },
  { id: 'mensajes',    label: 'Red Social',   tab: 'chat',       icon: '🌐' },
  { id: 'gobernanza',  label: 'Gobernanza',   tab: 'gobernanza', icon: '△' },
  { id: 'habilidades', label: 'Habilidades',  tab: 'maxskill',   icon: '◎' },
  { id: 'billetera',   label: 'Billetera',    tab: 'wallet',     icon: '▽' },
  { id: 'boveda',      label: 'Bóveda',       tab: 'vault',      icon: '⊡' },
];

// ── Shared orb box dimensions ───────────────────────────────────────
// El orbe y la capa de etiquetas (labels HTML proyectadas desde 3D)
// DEBEN compartir exactamente la misma caja centrada para que las
// coordenadas proyectadas (0..box) caigan sobre el orbe visible.
const ORB_SIZE_VMIN = 54;
const ORB_MAX = 300;

// ── Default invitation nodes (when user has no skills yet) ───────────
const INVITATION_NODES: OrbNode[] = [
  { id: 'inv-cv',       label: 'Sube tu CV',        tab: 'perfil',   icon: '📄' },
  { id: 'inv-skills',   label: 'Descubre skills',   tab: 'maxskill', icon: '✦' },
  { id: 'inv-curso',    label: 'Primer curso',      tab: 'academia', icon: '📚' },
  { id: 'inv-empleo',   label: 'Tu primer match',   tab: 'empleos',  icon: '🎯' },
  { id: 'inv-servicio', label: 'Ofrece un servicio', tab: 'market',  icon: '💡' },
  { id: 'inv-token',    label: 'Gana tokens',       tab: 'wallet',   icon: '⚡' },
  { id: 'inv-connect',  label: 'Conecta',           tab: 'chat',     icon: '🤝' },
  { id: 'inv-valida',   label: 'Valida expertise',  tab: 'maxskill', icon: '🏆' },
];

// ── Icon generator for skill nodes (first letter + geometric shape) ──
const SKILL_ICONS = ['◉', '◈', '◇', '◆', '○', '●', '◎', '⬡', '⬢', '△', '▽', '▣', '▢', '⊡', '⊛', '✦', '✧', '⊿', '⊞', '◧'];

/**
 * Builds knowledge nodes dynamically from the user's real skills.
 * Each skill from the CV becomes a unique node in the orb.
 * Uses skillsDetail (from AI analysis) for REAL domination % instead of a
 * flat 0.7. Also detects SYNERGIES between related skills and boosts
 * connected nodes.
 */
function buildSkillNodes(
  skills: string[],
  skillsDetail?: { name: string; pct: number }[],
): OrbNode[] {
  if (!skills || skills.length === 0) return INVITATION_NODES;

  // Build a lookup from skill name → pct (0-100 → normalized 0-1)
  // Uses fuzzy matching: checks exact, then includes, to handle naming
  // differences between skills[] and skills_detail[] (e.g. "React.js" vs "React")
  const pctMap = new Map<string, number>();
  if (skillsDetail && skillsDetail.length > 0) {
    skillsDetail.forEach((sd) => {
      if (sd.name) pctMap.set(sd.name.toLowerCase().trim(), (sd.pct ?? 70) / 100);
    });
  }

  /** Fuzzy lookup: exact match first, then substring includes in both directions */
  const lookupPct = (skillName: string): number | undefined => {
    const key = skillName.toLowerCase().trim();
    // Exact match
    if (pctMap.has(key)) return pctMap.get(key);
    // Skill name includes a detail name (e.g. "React.js" includes "react")
    for (const [detailKey, pct] of pctMap) {
      if (key.includes(detailKey) || detailKey.includes(key)) return pct;
    }
    return undefined;
  };

  // Detect which synergy groups are active (2+ skills from same group).
  // La detección vive en el helper PURO skillSynergy.ts (fuente única de
  // verdad, unit-testeada). Word-boundary + regla de 2+ coincidencias por
  // grupo evitan activaciones espurias (p.ej. "Google Analytics" sola no
  // activa el grupo de datos). La matemática del bono no cambia.
  const activeSynergies = detectActiveSynergies(skills);

  // Synergy bonus: +0.08 if skill belongs to an active synergy group
  const getSynergyBonus = (skill: string): number => {
    return synergyGroupForSkill(skill, activeSynergies) !== null ? 0.08 : 0;
  };

  return skills.map((skill, i) => {
    // Real level from AI analysis (fuzzy match), or fallback 0.7
    const baseLvl = lookupPct(skill) ?? 0.7;
    const synergy = getSynergyBonus(skill);
    const level = Math.min(1, baseLvl + synergy);

    return {
      id: `skill-${i}-${skill.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 20)}`,
      label: skill.length > 22 ? skill.slice(0, 20) + '…' : skill,
      tab: categorizeSkill(skill),
      icon: SKILL_ICONS[i % SKILL_ICONS.length],
      level,
      nextStep: synergy > 0
        ? `Sinergia activa (+${Math.round(synergy * 100)}%) · dominio ${Math.round(level * 100)}%`
        : `Dominio ${Math.round(level * 100)}%`,
    };
  });
}

/** Categorize a skill string into the most appropriate tab */
function categorizeSkill(skill: string): TabId {
  const s = skill.toLowerCase();
  // Tech/dev skills → maxskill
  if (/react|vue|angular|node|python|java|typescript|javascript|css|html|docker|kubernetes|aws|git|sql|rust|go|flutter|swift|kotlin|c\+\+|php|ruby/.test(s)) return 'maxskill';
  // Data/AI/science → academia
  if (/machine learning|ml|ia|inteligencia|data|ciencia|investigaci|estadist|analytics|deep learning|nlp|ai/.test(s)) return 'academia';
  // Business/management/soft → empleos
  if (/gesti[oó]n|liderazgo|management|project|scrum|agile|negocio|emprendim|marketing|ventas|comercial/.test(s)) return 'empleos';
  // Design/creative → market (servicios)
  if (/dise[nñ]o|design|ux|ui|figma|creative|ilustra|photoshop|branding/.test(s)) return 'market';
  // Fallback: maxskill (most skills are competencies)
  return 'maxskill';
}

// ── States ──────────────────────────────────────────────────────────
type ShellState = 'orb' | 'preview' | 'fullscreen';

function TabLoader() {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, background: C.bg }}>
      <div style={{ width: 64, height: 64 }}>
        <GeodesicOrb size={64} nodes={8} color={getUserColor()} spinning={15} />
      </div>
      <p style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: C.cyanDim, textTransform: 'uppercase', margin: 0 }}>Cargando...</p>
    </div>
  );
}

function renderTab(tab: TabId) {
  switch (tab) {
    case 'perfil':     return <GemeloTab />;
    case 'maxskill':   return <MaxSkillTab />;
    case 'academia':   return <AcademiaTab />;
    case 'market':     return <MarketTab />;
    case 'empleos':    return <EmpleosTab />;
    case 'chat':       return <RedSocialTab />;
    case 'wallet':     return <WalletTab />;
    case 'gobernanza': return <GobernanzaTab />;
    case 'vault':      return <VaultTab />;
    default:           return null;
  }
}


export function OrbShell() {
  const { setActiveTab, unreadCount } = useNavigation();
  const { profile } = useGemeloProfile();
  // Get full Supabase profile for fields not on GemeloProfile (skills_detail, display_name, etc.)
  const { profile: sbFull } = useProfile();
  // User's accent color for input bar glow and UI accents
  const orbColor = useUserColor();
  // Respetar prefers-reduced-motion para el micro-feedback de las etiquetas
  const prefersReducedMotion = useReducedMotion();

  // ── Build GemeloDigital from Supabase profile for omicronCoach ──────
  const sbProfile = sbFull; // Supabase profile (has execution_score, skills_detail, etc.)
  const gemeloDigital = useMemo((): GemeloDigital | null => {
    if (!sbProfile) return null;
    return {
      execution: sbProfile.execution_score ?? profile.axes.execution ?? 40,
      quality: sbProfile.quality_score ?? profile.axes.quality ?? 50,
      transcendence: sbProfile.transcendence_score ?? profile.axes.transcendence ?? 18,
      foundation: sbProfile.foundation_score ?? profile.axes.foundation ?? 25,
      overallReputation: sbProfile.reputation_score ?? profile.rep ?? 0,
    };
  }, [sbProfile, profile]);

  // ── Alza de eje desde la última visita (para la voz del núcleo) ─────
  // Comparamos los 4 ejes actuales contra la última foto cacheada en
  // localStorage. Si alguno subió, guardamos su nombre HUMANO (ej.
  // "Ejecución") para que el ribbon abra con "Hoy tu {eje} subió". La
  // detección (impura: lee/escribe localStorage) vive AQUÍ; homeStatus.ts
  // sigue siendo puro y solo COMPONE la línea con el label ya resuelto.
  const [risenAxisLabel, setRisenAxisLabel] = useState<string | null>(null);
  useEffect(() => {
    if (!gemeloDigital) return;
    const current = {
      execution: Math.round(gemeloDigital.execution),
      quality: Math.round(gemeloDigital.quality),
      transcendence: Math.round(gemeloDigital.transcendence),
      foundation: Math.round(gemeloDigital.foundation),
    };
    const AXES: { key: keyof typeof current; label: string }[] = [
      { key: 'execution', label: 'Ejecución' },
      { key: 'quality', label: 'Calidad' },
      { key: 'transcendence', label: 'Trascendencia' },
      { key: 'foundation', label: 'Fundamento' },
    ];
    let rose: string | null = null;
    try {
      const raw = localStorage.getItem('omicron_axes_snapshot');
      if (raw) {
        const prev = JSON.parse(raw) as Partial<typeof current>;
        // El eje que MÁS subió es el que anunciamos (una sola voz, un solo dato).
        let bestDelta = 0;
        for (const { key, label } of AXES) {
          const before = typeof prev[key] === 'number' ? (prev[key] as number) : null;
          if (before !== null && current[key] - before > bestDelta) {
            bestDelta = current[key] - before;
            rose = label;
          }
        }
      }
      localStorage.setItem('omicron_axes_snapshot', JSON.stringify(current));
    } catch { /* sin localStorage: sin alza, sin problema */ }
    setRisenAxisLabel(rose);
  }, [gemeloDigital]);

  // El alza es una NOVEDAD, no un estado permanente: se anuncia UNA vez y
  // luego la voz vuelve a su línea normal de próximo paso. Tras mostrarse,
  // un timer one-shot limpia risenAxisLabel a null (la escritura del
  // snapshot ya avanzó la baseline, así que futuras alzas reales se siguen
  // detectando). Sin loop de re-render: solo corre cuando pasa a no-null y
  // se limpia al desmontar.
  useEffect(() => {
    if (!risenAxisLabel) return;
    const t = setTimeout(() => setRisenAxisLabel(null), 6000);
    return () => clearTimeout(t);
  }, [risenAxisLabel]);

  // ── Estado del día / próximo paso (ribbon calmo del Home) ───────────
  // Se compone SOLO con datos ya presentes en el cliente (racha local +
  // próximo paso determinista + reputación del perfil + alza de eje): sin
  // llamadas al backend. El helper pickHomeStatus es puro y unit-testeado.
  const homeStatusLabel = useMemo(() => {
    // B6 — ÓMICROM NUNCA QUEDA MUDO: un invitado (explorando sin cuenta) antes
    // recibía `null` acá y además la superficie no se montaba, así que el
    // núcleo no le decía NADA. Ahora también le habla, con la única
    // invitación honesta que aplica sin datos suyos: activar su Gemelo con el
    // CV. Sin inventar números (no tiene reputación ni ejes todavía).
    if (!sbProfile?.id) return 'Estás explorando sin cuenta. Sube tu CV y activa tu Gemelo Digital en 1 minuto.';
    const nextStep = computeSteps(sbProfile, gemeloDigital)[0] ?? null;
    const rep = sbProfile?.reputation_score ?? null;
    return pickHomeStatus({
      streak: streakDays(),
      nextStep,
      reputation: rep,
      // Nivel humano único (Estudiante / Técnico / Arquitecto) derivado de la
      // reputación real: la voz del núcleo lo muestra como el nivel del usuario.
      levelBand: typeof rep === 'number' ? levelBandFor(rep) : null,
      axisRose: risenAxisLabel,
    }).label;
  }, [sbProfile, gemeloDigital, risenAxisLabel]);

  const [state, setState] = useState<ShellState>('orb');
  const [selectedNode, setSelectedNode] = useState<OrbNode | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [spectrum, setSpectrum] = useState<{ bass: number; mid: number; treble: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [nodePositions, setNodePositions] = useState<{ id: string; x: number; y: number; depth: number }[]>([]);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const [proactiveActions, setProactiveActions] = useState<ProactiveAction[]>([]);
  // RESPUESTA VIVA (Inc 2): cuando la respuesta es de la IA (coach/unknown) la
  // revelamos palabra por palabra. Los mensajes deterministas y cortos
  // (navegar/dato/convalidar/pensando/límite) se muestran al instante.
  const [responseStream, setResponseStream] = useState(false);
  // Indicador vivo: mientras Ómicrom consulta la IA, la burbuja "respira"
  // ("Ómicrom está pensando…") en vez de mostrar texto muerto.
  const [omicronThinking, setOmicronThinking] = useState(false);
  const [showPremium, setShowPremium] = useState(false);
  const [showConvalida, setShowConvalida] = useState(false);
  const [showCredencial, setShowCredencial] = useState(false);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // Idle escalation — si no interactúa, escalamos
  const { helpMessage, resetIdle } = useIdleEscalation(state === 'orb');
  const hasGreeted = useRef(false);
  const [previewSkills, setPreviewSkills] = useState<string[]>([]);

  // ── Track if onboarding is complete (to hide oráculo while onboarding is active)
  const [onboardingDone, setOnboardingDone] = useState(() =>
    typeof localStorage !== 'undefined' && !!localStorage.getItem('omicron_onboarding_done')
  );

  // En un dispositivo nuevo (localStorage vacío) el estado inicial anterior sería
  // false y el oráculo no aparecería tras iniciar sesión. Si el perfil de la nube
  // confirma el onboarding (onboarding_completed_at o skills presentes), lo tratamos
  // como completado para que el orbe se muestre de inmediato, sin repetir onboarding.
  // No regresamos el valor inicial basado en localStorage: solo lo activamos.
  useEffect(() => {
    const cloudOnboardingDone =
      !!sbProfile?.onboarding_completed_at || (sbProfile?.skills?.length ?? 0) > 0;
    if (cloudOnboardingDone) {
      setOnboardingDone(true);
    }
  }, [sbProfile?.onboarding_completed_at, sbProfile?.skills]);

  // ── Bienvenida del orbe: SOLO la primera vez de cada sesión ─────────
  // Un flag en sessionStorage (mismo patrón que ProactiveCards) hace que
  // la superficie de bienvenida aparezca una única vez por sesión de
  // navegador y no vuelva a mostrarse tras descartarla o actuar sobre un chip.
  const [showHomeGuide, setShowHomeGuide] = useState(() => {
    try {
      return sessionStorage.getItem('omicron_home_guide_seen') !== '1';
    } catch {
      return true;
    }
  });
  const dismissHomeGuide = useCallback(() => {
    setShowHomeGuide(false);
    try {
      sessionStorage.setItem('omicron_home_guide_seen', '1');
    } catch { /* noop */ }
  }, []);

  // ── Bienvenida por Credencial: SOLO la primera vez de cada sesión ───
  // La primera vez que la app aterriza en el home autenticado del orbe,
  // auto-abrimos la Credencial Ómicrom (misma que abre el avatar) como
  // bienvenida; al cerrarla, se revela el home y el asistente. Un flag en
  // sessionStorage ('omicron_welcome_credencial_shown') garantiza que sea
  // una única vez por sesión (y vuelva a mostrarse en una sesión nueva).
  //
  // El flag se escribe SOLO al momento de abrir: así un invitado que se
  // autentica más tarde en la misma sesión todavía recibe la bienvenida.
  // El ref evita reevaluar tras montar (incluye el doble-invoke de StrictMode).
  const welcomeCredencialChecked = useRef(false);
  useEffect(() => {
    if (welcomeCredencialChecked.current) return;

    let alreadyShown = false;
    try {
      alreadyShown = sessionStorage.getItem('omicron_welcome_credencial_shown') === '1';
    } catch {
      alreadyShown = false;
    }

    const shouldOpen = shouldShowWelcomeCredencial({
      isAuthenticated: !!sbProfile?.id,
      state,
      onboardingDone,
      alreadyShown,
      showConvalida,
      showCredencial,
      showPremium,
    });

    if (!shouldOpen) return;

    // Fijamos el flag y el guard ANTES de abrir, de modo que jamás pueda
    // abrirse dos veces en la misma sesión ni entre re-renders.
    welcomeCredencialChecked.current = true;
    try {
      sessionStorage.setItem('omicron_welcome_credencial_shown', '1');
    } catch { /* noop */ }
    setShowCredencial(true);
  }, [sbProfile?.id, state, onboardingDone, showConvalida, showCredencial, showPremium]);

  // ── Build orb nodes dynamically from user's real skills ─────────────
  // The 9 hubs are always present. Knowledge nodes come FROM the user's CV.
  // Now uses skills_detail (from AI analysis) for real domination %.
  const dynamicOrbNodes = useMemo((): OrbNode[] => {
    const userSkills: string[] = sbProfile?.skills ?? profile.skills ?? [];
    const skillsDetail: { name: string; pct: number }[] = sbProfile?.skills_detail ?? [];
    const skillNodes = buildSkillNodes(userSkills, skillsDetail);

    // R5: Preview skills del onboarding (nodos temporales mientras escribe)
    const previewNodes: OrbNode[] = previewSkills
      .filter(s => !userSkills.some(us => us.toLowerCase() === s.toLowerCase()))
      .map((skill, i) => ({
        id: `preview-${i}-${skill.toLowerCase().replace(/\s+/g, '-')}`,
        label: skill,
        tab: 'maxskill' as const,
        icon: '✦',
        level: 0.5,
        nextStep: 'Detectado en tu perfil',
      }));

    return [...HUB_NODES, ...skillNodes, ...previewNodes];
  }, [sbProfile, profile, previewSkills]);

  // ── Sinergias activas a nivel shell (solo presentación, read-only) ──
  // Reusa la MISMA fuente de habilidades que buildSkillNodes y el MISMO
  // helper puro. Sirve para que el preview pueda explicar, en cero jerga y
  // en el color del usuario, por qué un nodo recibe el bono de sinergia.
  // No toca reputación ni scores.
  const activeSynergies = useMemo(
    () => detectActiveSynergies(sbProfile?.skills ?? profile.skills ?? []),
    [sbProfile, profile],
  );

  // ── Compute node levels from user's Gemelo profile ──────────────────
  // Maps each node to a 0-1 level based on validated skills and axes
  const orbNodesWithLevels = useMemo((): OrbNode[] => {
    const validatedSkills: string[] = sbProfile?.skills ?? profile.skills ?? [];
    const axes = profile.axes;
    const rep = profile.rep; // 0-100

    // Normalize axes to 0-1
    const execNorm = (axes.execution ?? 0) / 100;
    const qualNorm = (axes.quality ?? 0) / 100;
    const transNorm = (axes.transcendence ?? 0) / 100;
    const foundNorm = (axes.foundation ?? 0) / 100;

    // Helper: check if a skill keyword appears in validated skills
    const hasSkill = (keywords: string[]) =>
      keywords.some(k => validatedSkills.some(s => s.toLowerCase().includes(k.toLowerCase())));

    // Level map for HUB NODES only (the 9 app sections).
    // Skill nodes (skill-0-xxx) get their levels from buildSkillNodes() directly
    // — they use real AI analysis data (skills_detail pct) not this static map.
    const levelMap: Record<string, { level: number; nextStep: string }> = {
      inicio:      { level: Math.min(1, rep / 100), nextStep: nodeGuidance('perfil', sbProfile, gemeloDigital) || (rep < 50 ? 'Completa tu perfil' : '¡Perfil sólido!') },
      academia:    { level: execNorm * 0.5 + foundNorm * 0.5, nextStep: nodeGuidance('academia', sbProfile, gemeloDigital) },
      empleos:     { level: execNorm, nextStep: nodeGuidance('empleos', sbProfile, gemeloDigital) },
      mercado:     { level: transNorm, nextStep: nodeGuidance('market', sbProfile, gemeloDigital) },
      mensajes:    { level: transNorm * 0.5 + execNorm * 0.5, nextStep: nodeGuidance('chat', sbProfile, gemeloDigital) },
      gobernanza:  { level: foundNorm, nextStep: nodeGuidance('gobernanza', sbProfile, gemeloDigital) },
      habilidades: { level: qualNorm, nextStep: nodeGuidance('maxskill', sbProfile, gemeloDigital) },
      billetera:   { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: nodeGuidance('wallet', sbProfile, gemeloDigital) },
      boveda:      { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: nodeGuidance('vault', sbProfile, gemeloDigital) },
      // Invitation nodes (when user has no skills)
      'inv-cv':       { level: hasSkill(['cv', 'curriculum']) ? 0.9 : 0.1, nextStep: '¡Sube tu CV para activar tu Gemelo!' },
      'inv-skills':   { level: qualNorm, nextStep: 'Descubre tus habilidades ocultas' },
      'inv-curso':    { level: foundNorm * 0.5, nextStep: 'Empieza tu primer curso' },
      'inv-empleo':   { level: execNorm * 0.3, nextStep: 'Encuentra tu primer match' },
      'inv-servicio': { level: transNorm * 0.3, nextStep: 'Ofrece tu primer servicio' },
      'inv-token':    { level: Math.min(1, (profile.vault ?? 0) / 3), nextStep: 'Gana tokens participando' },
      'inv-connect':  { level: transNorm * 0.4, nextStep: 'Conecta con otros profesionales' },
      'inv-valida':   { level: qualNorm * 0.5, nextStep: 'Valida tu expertise' },
    };

    return dynamicOrbNodes.map(node => ({
      ...node,
      level: levelMap[node.id]?.level ?? node.level ?? 0,
      nextStep: levelMap[node.id]?.nextStep ?? node.nextStep ?? 'Explora esta competencia',
    }));
  }, [profile, sbProfile, gemeloDigital, dynamicOrbNodes]);

  // ── BLOQUEADO / DESBLOQUEADO ("Matar el Escritorio" Inc 4) ──────────
  // La red del orbe se ARMA con lo que la persona desbloqueó. El desbloqueo
  // de cada nodo hub se decide SOLO leyendo la reputación real del perfil
  // (reputation_score 0..100, la misma fuente que lee la Credencial). Este
  // cliente NUNCA escribe reputación: solo LEE. La lógica de compuertas y las
  // pistas cero-jerga viven en el helper puro nodeUnlock() (unit-testeado);
  // aquí solo lo consultamos con la reputación real y una envoltura estable
  // por render.
  const realReputation = sbProfile?.reputation_score ?? profile.rep ?? 0;
  const unlockFor = useCallback(
    (nodeId: string) => nodeUnlock(nodeId, realReputation),
    [realReputation],
  );

  // ── Handle text input — Ómicrom cerebro unificado ───────────────────
  const handleTextInput = useCallback(async (text: string) => {
    // Limpiar respuesta anterior para mostrar que estamos procesando
    setResponseMsg('Un momento…');
    setResponseStream(false);
    setProactiveActions([]);

    const intent = interpret(text);

    // `flash` muestra un mensaje al instante (por defecto). `stream` marca las
    // respuestas de IA para que la burbuja las revele palabra por palabra.
    const flash = (msg: string, stream = false) => {
      setResponseStream(stream);
      setResponseMsg(msg);
      // Las respuestas persisten hasta que el usuario envíe otro mensaje
      // (no se auto-borran — interacción fluida)
      if (responseTimer.current) clearTimeout(responseTimer.current);
    };

    // Ómicrom no pudo responder (IA caída/offline o texto vacío): NUNCA
    // inventamos una respuesta. Mostramos un mensaje explícito (tuteo, cero
    // jerga) con un botón para reintentar la MISMA consulta. Usamos el ref
    // para reejecutar handleTextInput sin crear un ciclo de dependencias.
    const showRetry = (original: string) => {
      setProactiveActions([
        {
          label: 'Reintentar',
          emoji: '↻',
          primary: true,
          onClick: () => handleTextInputRef.current?.(original),
        },
      ]);
      flash('No pude responder ahora. Vuelve a intentarlo.');
    };

    if (intent.kind === 'navigate') {
      const node = orbNodesWithLevels.find((n: OrbNode) => n.tab === intent.tab);
      if (node) {
        // Misma compuerta que el tap (Inc 4): si la orden hablada/escrita
        // resuelve a un nodo hub BLOQUEADO, mostramos la pista en vez de
        // navegar, para que la barra Jarvis respete el bloqueado/desbloqueado.
        const isHubNode = HUB_NODES.some(h => h.id === node.id);
        if (isHubNode) {
          const gate = unlockFor(node.id);
          if (!gate.unlocked && gate.hint) {
            flash(gate.hint);
            speakLocal(gate.hint);
            return;
          }
        }
        setSelectedNode(node);
        setState('preview');
        setActiveTab(node.tab);
        const msg = `Abriendo ${node.label}.`;
        flash(msg);
        speakLocal(msg);
      }
      return;
    }

    if (intent.kind === 'coach') {
      flash('Ómicrom está pensando…');
      speakLocal('Déjame ver tu Gemelo Digital.');
      const coachTimer = setTimeout(() => flash('Ómicrom está tardando más de lo normal… seguí esperando.'), 8000);
      const omCtx: OmicronContext = {
        skills: sbProfile?.skills ?? [],
        cv_summary: sbProfile?.cv_summary ?? '',
        execution: sbProfile?.execution_score,
        quality: sbProfile?.quality_score,
        transcendence: sbProfile?.transcendence_score,
        foundation: sbProfile?.foundation_score,
        reputation: sbProfile?.reputation_score,
        pe: sbProfile?.pe_points,
        node_level: sbProfile?.node_type,
        activeTab: selectedNode?.tab ?? 'perfil',
        displayName: sbProfile?.display_name || sbProfile?.username,
      };
      if (!checkOmicronLimit()) {
        flash('Alcanzaste el límite diario de consultas. Volvé mañana con energía recargada.');
        clearTimeout(coachTimer);
        return;
      }
      setOmicronThinking(true);
      try {
        const r = await askOmicron(text, omCtx);
        if (r.error || !r.text) {
          showRetry(text);
        } else {
          flash(r.text, true);
          speakOmicron(r.text);
        }
      } finally {
        clearTimeout(coachTimer);
        setOmicronThinking(false);
      }
      return;
    }

    if (intent.kind === 'fact') {
      let msg = '';
      if (intent.topic === 'reputacion') msg = `Tu reputación va en ${Math.round(sbProfile?.reputation_score ?? 0)} de 100. ${(sbProfile?.reputation_score ?? 0) >= 50 ? '¡Vas bien!' : 'Validando skills la subimos juntos.'}`;
      else if (intent.topic === 'tokens') msg = `Tienes ${(sbProfile?.token_balance ?? 0).toLocaleString()} tokens en tu billetera.`;
      else if (intent.topic === 'pe') msg = `Llevas ${(sbProfile?.pe_points ?? 0).toLocaleString()} puntos de experiencia. Cada nodo que valides suma más.`;
      else msg = 'Puedes decirme cosas como: "abre academia", "dame un consejo", "cuánta reputación tengo", o simplemente tocar un nodo del orbe. Estoy aquí para lo que necesites.';
      flash(msg);
      speakLocal(msg);
      return;
    }

    if (intent.kind === 'convalidate') {
      // Redirect to the right hub for convalidation
      const convalNode = orbNodesWithLevels.find((n: OrbNode) => n.id === 'inicio');
      if (convalNode) {
        setSelectedNode(convalNode);
        setState('preview');
        setActiveTab('perfil');
      }
      const names = { cv: 'tu CV', title: 'un título', year: 'un año de experiencia', vault: 'un aporte a la Bóveda' };
      const msg = `Para convalidar ${names[intent.item]}, abre tu perfil y usa el botón de convalidación.`;
      flash(msg);
      speakLocal(msg);
      return;
    }

    // unknown — Ómicrom cerebro unificado (coach + tutor + motivador)
    flash('Ómicrom está pensando…');
    // Show timeout indicator if AI takes too long
    const slowTimer = setTimeout(() => flash('Ómicrom está tardando más de lo normal… seguí esperando.'), 8000);
    const omCtx: OmicronContext = {
      skills: sbProfile?.skills ?? [],
      cv_summary: sbProfile?.cv_summary ?? '',
      execution: sbProfile?.execution_score,
      quality: sbProfile?.quality_score,
      transcendence: sbProfile?.transcendence_score,
      foundation: sbProfile?.foundation_score,
      reputation: sbProfile?.reputation_score,
      pe: sbProfile?.pe_points,
      node_level: sbProfile?.node_type,
      activeTab: selectedNode?.tab ?? 'perfil',
      displayName: sbProfile?.display_name || sbProfile?.username,
    };
    if (!checkOmicronLimit()) {
      flash('Alcanzaste el límite diario de consultas. Volvé mañana con energía recargada.');
      clearTimeout(slowTimer);
      return;
    }
    setOmicronThinking(true);
    try {
      const r = await askOmicron(text, omCtx);
      if (r.error || !r.text) {
        showRetry(text);
      } else {
        flash(r.text, true);
        speakOmicron(r.text);
      }
    } finally {
      clearTimeout(slowTimer);
      setOmicronThinking(false);
    }
  }, [setActiveTab, sbProfile, orbNodesWithLevels, selectedNode, unlockFor]);

  // Ref siempre-fresco a handleTextInput: permite que el botón "Reintentar"
  // reejecute la consulta sin meter handleTextInput en sus propias deps.
  const handleTextInputRef = useRef(handleTextInput);
  handleTextInputRef.current = handleTextInput;

  // ── Toggle listening (speech recognition) ──────────────────────────
  // Voz y texto son LA MISMA experiencia — la voz solo cambia el input method.
  const toggleListening = useCallback(async () => {
    if (isListening) {
      setIsListening(false);
      setVoiceLevel(0);
      window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: false } }));
      return;
    }

    // Speech recognition via shared utility
    const { startSpeechRecognition, isSpeechAvailable } = await import('@/infrastructure/voice/recognition');
    if (!isSpeechAvailable()) {
      setResponseMsg('La voz no está disponible en este navegador. Escríbeme aquí abajo — funciona igual.');
      return;
    }

    setIsListening(true);
    setVoiceLevel(0.4);
    window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: true } }));

    const handle = startSpeechRecognition({
      lang: 'es-US',
      interimResults: true,
      onResult: (transcript, isFinal) => {
        setInputText(transcript);
        if (isFinal) handleTextInput(transcript);
      },
      onEnd: () => {
        setIsListening(false);
        setVoiceLevel(0);
        window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: false } }));
      },
      onError: () => {
        setIsListening(false);
        setVoiceLevel(0);
        window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: false } }));
      },
    });
    if (handle) void 0; // handle stored internally by recognition module
  }, [isListening, handleTextInput]);

  // ── Handle node tap → go to preview ─────────────────────────────────
  // Todos los nodos usan el mismo flujo: tap → preview → fullscreen.
  // El nodo Mi Gemelo va a renderTab('perfil') que ahora muestra el Gemelo Digital.
  const handleNodeTap = useCallback((node: OrbNode) => {
    // BLOQUEADO / DESBLOQUEADO (Inc 4): solo los nodos hub tienen compuerta.
    // Si un hub está BLOQUEADO, tocarlo NO navega: en su lugar mostramos la
    // pista cero-jerga (QUÉ se abre + a QUÉ nivel) por el canal reactivo
    // existente (ProactiveMessage), sin inventar una superficie nueva. Los
    // nodos de habilidades/conocimiento y los desbloqueados se comportan
    // exactamente como hasta hoy (tap → preview → fullscreen).
    const isHubNode = HUB_NODES.some(h => h.id === node.id);
    if (isHubNode) {
      const gate = unlockFor(node.id);
      if (!gate.unlocked && gate.hint) {
        hapticLight();
        setResponseMsg(gate.hint);
        setProactiveActions([]);
        speakLocal(gate.hint);
        return;
      }
    }
    hapticMedium();
    audioSweep();
    firePulse('user');
    setSelectedNode(node);
    setState('preview');
    setActiveTab(node.tab);
    // Señal de tap de nodo (canal 'omicron:node-tap'); se mantiene por si
    // otros oyentes la usan aunque ProactiveCards ya no esté montado.
    window.dispatchEvent(new CustomEvent('omicron:node-tap'));
  }, [setActiveTab, unlockFor]);

  // ── Handle preview click → fullscreen ───────────────────────────────
  const handlePreviewClick = useCallback(() => {
    hapticLight();
    setState('fullscreen');
  }, []);

  // ── Handle back → return to orb ────────────────────────────────────
  const handleBack = useCallback(() => {
    if (state === 'fullscreen') {
      setState('preview');
    } else {
      setState('orb');
      setSelectedNode(null);
    }
  }, [state]);

  // ── Projected positions callback (from OrbNeuronal 3D → 2D) ────────
  const handleProjected = useCallback((positions: { id: string; x: number; y: number; depth: number }[]) => {
    setNodePositions(positions);
  }, []);

  // ── B: Connect real OraculoBar voice state ──────────────────────────
  // Listen for custom events dispatched by OraculoBar when listening starts/stops
  useEffect(() => {
    const handleOracleListening = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setIsListening(detail.listening);
      if (detail.listening) setVoiceLevel(0.4); // initial pulse when mic activates
    };
    const handleOracleVoice = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setVoiceLevel(detail.level);
    };
    // Ecualizador esférico: bandas de frecuencia (bass/mid/treble) — Inc 2.
    const handleSpectrum = (e: Event) => {
      const detail = (e as CustomEvent).detail as
        | { bass: number; mid: number; treble: number }
        | undefined;
      setSpectrum(detail ?? null);
    };
    window.addEventListener('oracle:listening', handleOracleListening);
    window.addEventListener('oracle:voice', handleOracleVoice);
    window.addEventListener('oracle:spectrum', handleSpectrum);
    // Escuchar cuando speakAI está hablando para vibrar el orbe
    const handleSpeaking = (e: Event) => {
      const active = (e as CustomEvent).detail?.active;
      setVoiceLevel(active ? 0.3 : 0);
      setIsSpeaking(!!active);
      if (!active) setSpectrum(null);
    };
    window.addEventListener('omicron:speaking', handleSpeaking);
    return () => {
      window.removeEventListener('oracle:listening', handleOracleListening);
      window.removeEventListener('oracle:voice', handleOracleVoice);
      window.removeEventListener('oracle:spectrum', handleSpectrum);
      window.removeEventListener('omicron:speaking', handleSpeaking);
    };
  }, []);

  // ── GAP 3 FIX: Proactive Engine — Gemelo te empuja sin pedirlo ─────
  useEffect(() => {
    if (!sbProfile) return;
    if (hasGreeted.current) return;
    hasGreeted.current = true;
    const timer = setTimeout(() => {
      const context = {
        currentHour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        reputation: sbProfile?.reputation_score ?? 0,
        pe: sbProfile?.pe_points ?? 0,
        onlineCount: 0,
        lastOnlineCount: 0,
        daysSinceLastLogin: 1, // Siempre al menos 1 para que detecte
        currentTab: 'perfil',
        userName: sbProfile?.display_name || sbProfile?.username || 'operador',
      };

      const event = evaluateProactiveEvents(context);
      if (event) {
        setResponseMsg(event.message);
        setProactiveActions([
          { label: 'Ver empleos', emoji: '💼', primary: true, onClick: () => { setActiveTab('empleos'); const n = dynamicOrbNodes.find((nd: OrbNode) => nd.id === 'empleos'); if (n) { setSelectedNode(n); setState('fullscreen'); } } },
          { label: 'Mi perfil', emoji: '📈', onClick: () => { setActiveTab('perfil'); const n = dynamicOrbNodes.find((nd: OrbNode) => nd.id === 'inicio'); if (n) { setSelectedNode(n); setState('fullscreen'); } } },
        ]);
        // Voz proactiva: hablar si el audio ya está desbloqueado (el usuario ya tocó)
        if (isAudioUnlocked()) {
          speakLocal(event.message.length > 200 ? event.message.slice(0, 200) : event.message);
        }
      } else {
        // R2: PROGRESSIVE PROFILING — si el perfil tiene gaps, PREGUNTAR
        const question = getNextProfileQuestion(sbProfile);

        const name = sbProfile?.display_name || sbProfile?.full_name || sbProfile?.username || 'amigo';
        const hour = new Date().getHours();
        const saludo = hour < 12 ? 'Hey, buen día' : hour < 19 ? 'Hola' : 'Buenas noches';

        if (question && !hasAskedToday()) {
          // Tiene un gap → preguntarle (R2)
          markAskedToday();
          const msg = `${saludo}, ${name}. ${question.question}`;
          setResponseMsg(msg);
          setProactiveActions([
            { label: 'Responder', emoji: '✅', primary: true, onClick: () => { /* focus input */ setResponseMsg(null); } },
            { label: 'Después', onClick: () => setResponseMsg(null) },
          ]);
          // Voz proactiva si el audio está desbloqueado
          if (isAudioUnlocked()) speakLocal(msg.length > 200 ? msg.slice(0, 200) : msg);
        } else {
          // Perfil completo o ya preguntó hoy → consejo de mejora
          const steps = computeSteps(sbProfile, gemeloDigital);
          const top = steps[0];
          const msg = top
            ? `${saludo}, ${name}. ${top.why.slice(0, 140)} ¿Vamos con eso?`
            : `${saludo}, ${name}. Tu Gemelo está al día. Toca un nodo o pregúntame lo que quieras — estoy aquí para ayudarte.`;
          setResponseMsg(msg);
          setProactiveActions(top ? [
            { label: 'Sí, vamos', emoji: '✅', primary: true, onClick: () => { handleTextInput(top.why.includes('CV') ? 'quiero subir mi cv' : 'dame un consejo'); setResponseMsg(null); } },
            { label: 'Otra cosa', emoji: '🔄', onClick: () => setResponseMsg(null) },
          ] : []);
          // Voz proactiva si el audio está desbloqueado
          if (isAudioUnlocked()) speakLocal(msg.length > 200 ? msg.slice(0, 200) : msg);
        }
      }
    }, 1500); // 1.5s para que el orbe aparezca primero

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sbProfile, gemeloDigital]);

  // Cleanup: detener voz al desmontar el componente
  useEffect(() => {
    return () => { stopAI(); };
  }, []);

  // Idle escalation: hablar cuando Ómicrom tiene algo que decir y el usuario no interactúa
  const lastIdleSpoken = useRef('');
  useEffect(() => {
    if (!helpMessage || helpMessage === lastIdleSpoken.current) return;
    if (!isAudioUnlocked()) return;
    lastIdleSpoken.current = helpMessage;
    speakLocal(helpMessage);
  }, [helpMessage]);

  // Cuando el audio se desbloquea (primer toque), hablar el mensaje proactivo pendiente
  const responseMsgRef = useRef(responseMsg);
  responseMsgRef.current = responseMsg; // Siempre fresco
  useEffect(() => {
    const handleUnlock = () => {
      const msg = responseMsgRef.current;
      if (msg && !lastIdleSpoken.current) {
        speakLocal(msg.length > 200 ? msg.slice(0, 200) : msg);
      }
    };
    window.addEventListener('omicron:audio-unlocked', handleUnlock);
    return () => window.removeEventListener('omicron:audio-unlocked', handleUnlock);
  }, []); // deps vacío — usa ref para evitar stale closure

  // Fix 2: Idle breathing — throttled state update (2 Hz, cosmetic only)
  useEffect(() => {
    // Mientras Ómicrom habla, el analizador de voz alimenta voiceLevel en vivo
    // vía 'oracle:voice'; no correr la respiración senoidal para no pisarlo.
    if (state !== 'orb' || isListening || isSpeaking) return;
    let running = true;
    let last = 0;
    const throttled = (ts: number) => {
      if (!running) return;
      if (ts - last > 500) {
        last = ts;
        setVoiceLevel(Math.sin(ts * 0.002) * 0.05 + 0.05);
      }
      rafRef.current = requestAnimationFrame(throttled);
    };
    rafRef.current = requestAnimationFrame(throttled);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, isListening, isSpeaking]);

  // ── Onboarding handler (R3: intent-first routing) ────────────────────
  const handleOnboardingComplete = useCallback((_choice: 'examen' | 'cv' | 'ambos' | 'empleo' | 'aprender' | 'validar' | 'vender' | 'explorar') => {
    // After onboarding: go to orb state (not fullscreen) so user sees their new orb
    // The orb now has their skills as nodes — let them explore naturally
    setOnboardingDone(true);
    setState('orb');
    setSelectedNode(null);
  }, []);

  // (Voice control exposed via CustomEvents — see oracle:listening / oracle:voice listeners above)

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: C.bg,
      overflow: 'hidden',
    }}>
      {/* ── ONBOARDING (first time only) ────────────────────────────── */}
      <OrbOnboarding
        onComplete={handleOnboardingComplete}
        onSkillsPreview={setPreviewSkills}
        onProfileGenerated={async (generated: GeneratedProfile) => {
          // Guardar perfil del onboarding via RPC (respeta lógica aditiva + trigger de protección)
          try {
            const { supabase } = await import('@/infrastructure/supabase/client');
            if (sbProfile?.id) {
              const skillsDetail = generated.skills.map((s: string, i: number) => ({
                name: s,
                pct: Math.max(40, 80 - i * 10),
              }));
              await supabase.rpc('aplicar_analisis_cv', {
                p_name: '',
                p_skills: generated.skills,
                p_exec: Math.round(generated.axes.exec),
                p_qual: Math.round(generated.axes.qual),
                p_trans: Math.round(generated.axes.trans),
                p_fund: Math.round(generated.axes.fund),
                p_years: generated.years || 0,
                p_summary: generated.summary || '',
                p_skills_detail: skillsDetail,
              });
              // Broadcast "activó su Gemelo Digital" a toda la red.
              // Fire-and-forget: se cierra el canal tras enviar para no
              // acumular suscripciones realtime (canal efímero de un solo uso).
              try {
                const ch = supabase.channel('omicron-live');
                ch.send({ type: 'broadcast', event: 'activity', payload: { text: `${sbProfile.username ?? 'Un nodo'} activó su Gemelo Digital`, kind: 'action' } })
                  .finally(() => { void supabase.removeChannel(ch); });
              } catch { /* silencioso */ }
            }
          } catch (e) {
            console.warn('[onboarding] Error guardando perfil:', e);
          }
        }}
      />

      {/* ── ORB VIEW (always visible, fades when fullscreen) ─────────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: state === 'fullscreen' ? 0 : 1,
        transform: state === 'fullscreen' ? 'scale(0.8)' : 'scale(1)',
        transition: 'opacity 0.25s cubic-bezier(0.23,1,0.32,1), transform 0.25s cubic-bezier(0.23,1,0.32,1)',
        pointerEvents: state === 'fullscreen' ? 'none' : 'auto',
        zIndex: 1,
      }}>
        {/*
          Caja ESTABLE sin escala: el orbe ya NO aplica un scale CSS desde
          voiceLevel. clientWidth (usado para proyectar los nodos) es el
          tamaño de layout SIN transformar; si escalábamos aquí, el orbe
          visible y las coordenadas proyectadas se desincronizaban y las
          etiquetas dejaban de caer sobre el orbe. La sensación de
          ecualizador se conserva con la reactividad INTERNA de OrbNeuronal
          (rotación/shake/bandas + un breathing sutil de las mallas),
          guardada por prefers-reduced-motion.
        */}
        <div
          style={{
            width: `${ORB_SIZE_VMIN}vmin`,
            height: `${ORB_SIZE_VMIN}vmin`,
            maxWidth: ORB_MAX,
            maxHeight: ORB_MAX,
            transformOrigin: 'center',
          }}
        >
          <OrbNeuronal
            nodes={orbNodesWithLevels}
            activeNodeId={selectedNode?.id ?? null}
            onNodeTap={handleNodeTap}
            voiceLevel={voiceLevel}
            spectrum={spectrum}
            isListening={isListening}
            onProjectedPositions={handleProjected}
            notifications={unreadCount > 0 ? { mensajes: unreadCount } : undefined}
            userColor={getUserColor()}
          />
        </div>
      </div>


      {/* ── GUEST LOGIN BUTTON (visible, esquina superior izquierda) ── */}
      {state !== 'fullscreen' && !sbProfile?.id && (
        <motion.button
          // Micro-feedback de tap consistente con el Home (OBRA MAESTRA INC 4):
          // press transform-only, <=160ms, neutralizado bajo reduced-motion.
          whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          onClick={() => {
            hapticLight();
            window.dispatchEvent(new CustomEvent('omicron:request-auth'));
          }}
          aria-label="Iniciar sesión"
          title="Iniciar sesión"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 12px) + 14px)',
            left: 16,
            zIndex: 4,
            minHeight: 40,
            padding: '8px 16px',
            borderRadius: 999,
            border: `1.5px solid ${orbColor}`,
            background: `linear-gradient(135deg, ${orbColor}22, rgba(6,10,22,0.85))`,
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: -0.2,
            color: orbColor,
            boxShadow: `0 0 12px ${orbColor}33, 0 4px 14px rgba(0,0,0,0.4)`,
            // El transform lo gobierna framer-motion (whileTap); mantenemos
            // solo la transición de box-shadow para no competir por transform.
            transition: 'box-shadow 0.15s ease',
          }}
        >
          Iniciar sesión
        </motion.button>
      )}

      {/* ── PROFILE AVATAR BUTTON (sutil, esquina superior derecha) ──── */}
      {state !== 'fullscreen' && (
        <motion.button
          // Micro-feedback de tap consistente con el Home (OBRA MAESTRA INC 4):
          // press transform-only, <=160ms, neutralizado bajo reduced-motion.
          whileTap={prefersReducedMotion ? undefined : { scale: 0.96 }}
          transition={{ duration: 0.14, ease: [0.23, 1, 0.32, 1] }}
          onClick={() => setShowCredencial(true)}
          aria-label="Ver mi credencial"
          title="Mi credencial"
          style={{
            position: 'absolute',
            top: 'calc(env(safe-area-inset-top, 12px) + 14px)',
            right: 16,
            zIndex: 4,
            width: 44,
            height: 44,
            borderRadius: '50%',
            border: `1.5px solid ${C.cyanDim}`,
            background: 'radial-gradient(circle at 32% 26%, rgba(160,174,192,0.14), rgba(6,10,22,0.85))',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: `0 0 12px ${C.cyanFaint}, 0 4px 14px rgba(0,0,0,0.4)`,
            // El transform lo gobierna framer-motion (whileTap); mantenemos
            // solo la transición de box-shadow para no competir por transform.
            transition: 'box-shadow 0.15s ease',
            padding: 0,
          }}
        >
          {sbProfile?.avatar_url ? (
            <img
              src={sbProfile.avatar_url}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
            />
          ) : (
            <span style={{
              fontFamily: FONT.display,
              fontWeight: 800,
              fontSize: 13,
              color: C.cyan,
              letterSpacing: -0.3,
            }}>
              {(sbProfile?.display_name || sbProfile?.full_name || sbProfile?.username || 'N')
                .trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase()}
            </span>
          )}
        </motion.button>
      )}


      {/* ── PREVIEW PANEL (swipeable, con mejoras) ─────────────────── */}
      {state === 'preview' && selectedNode && (() => {
        // ── Swipe: encontrar nodos adyacentes para navegar
        const hubNodes = orbNodesWithLevels.filter((n: OrbNode) =>
          ['inicio','academia','empleos','mercado','mensajes','gobernanza','habilidades','billetera','boveda'].includes(n.id)
        );
        const currentIdx = hubNodes.findIndex((n: OrbNode) => n.id === selectedNode.id);
        const canSwipe = currentIdx >= 0;

        // ── Guidance: cómo mejorar en este nodo
        const guidance = nodeGuidance(selectedNode.tab, sbProfile, gemeloDigital);

        // ── Sinergia activa de este nodo (cero jerga, color del usuario) ──
        // Reemplaza los antiguos chips estáticos "⚡ Sinergias" (C.gold/C.cyan)
        // por una explicación real, driven por la detección que ya da el bono.
        // Un nodo de habilidad ('skill-…') participa por su propio nombre; un
        // nodo hub participa cuando la persona tiene habilidades de un grupo
        // activo que caen bajo la misma pestaña que el nodo. Solo lectura.
        const userSkillsForSynergy = (sbProfile?.skills ?? profile.skills ?? []) as string[];
        const synergyGroupId: number | null = (() => {
          if (selectedNode.id.startsWith('skill-')) {
            return synergyGroupForSkill(selectedNode.label, activeSynergies);
          }
          // Nodo hub: busca la primera habilidad real de la persona que caiga
          // en la MISMA pestaña que el nodo y participe de una sinergia activa.
          for (const sk of userSkillsForSynergy) {
            if (categorizeSkill(sk) !== selectedNode.tab) continue;
            const gid = synergyGroupForSkill(sk, activeSynergies);
            if (gid !== null) return gid;
          }
          return null;
        })();
        const synergyMeta =
          synergyGroupId !== null ? SYNERGY_GROUP_META[synergyGroupId] : null;

        return (
          <div
            role="dialog"
            aria-label={`Vista previa: ${selectedNode.label}. ${guidance}`}
            aria-modal="false"
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onTouchStart={(e) => { if (canSwipe) (e.currentTarget as any)._touchX = e.touches[0].clientX; }}
            onTouchEnd={(e) => {
              if (!canSwipe) return;
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const startX = (e.currentTarget as any)._touchX;
              if (startX === undefined) return;
              const diff = e.changedTouches[0].clientX - startX;
              if (Math.abs(diff) > 60) {
                const next = diff < 0
                  ? hubNodes[(currentIdx + 1) % hubNodes.length]
                  : hubNodes[(currentIdx - 1 + hubNodes.length) % hubNodes.length];
                setSelectedNode(next);
                setActiveTab(next.tab);
              }
            }}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '88%',
              maxWidth: 380,
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: 22,
              padding: '22px 22px 18px',
              zIndex: 10,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${C.cyanFaint}`,
              animation: 'orbPreviewEnter 0.25s cubic-bezier(0.23,1,0.32,1) both',
              touchAction: 'pan-y',
            }}
          >
            {/* Swipe indicator (dots) */}
            {canSwipe && (
              <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: 14 }}>
                {hubNodes.map((n: OrbNode, i: number) => (
                  <div key={n.id} style={{
                    width: i === currentIdx ? 16 : 5, height: 5, borderRadius: 3,
                    background: i === currentIdx ? C.cyan : `${C.cyan}33`,
                    transition: 'width 0.2s ease, background 0.2s ease',
                  }} />
                ))}
              </div>
            )}

            {/* Node header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
              <span style={{ fontSize: 26 }}>{selectedNode.icon}</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: 0, fontFamily: FONT.display, fontSize: 20, fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>
                  {selectedNode.label}
                </h3>
                {selectedNode.level !== undefined && selectedNode.level > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${C.cyan}22` }}>
                      <div style={{ height: '100%', width: `${Math.round(selectedNode.level * 100)}%`, borderRadius: 2, background: C.cyan, boxShadow: `0 0 6px ${C.cyan}66` }} />
                    </div>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyan, fontWeight: 700 }}>
                      {Math.round(selectedNode.level * 100)}%
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* CÓMO MEJORAR — consejo concreto */}
            <div style={{
              padding: '12px 14px', borderRadius: 14, marginBottom: 12,
              background: `linear-gradient(135deg, ${C.cyanGhost}, ${C.glass})`,
              border: `1px solid ${C.cyanFaint}`,
            }}>
              <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase', marginBottom: 6 }}>
                ⬡ Cómo mejorar
              </div>
              <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 12.5, lineHeight: 1.5, color: C.ink }}>
                {guidance}
              </p>
            </div>

            {/* Sinergia activa — QUÉ + POR QUÉ + QUÉ GANA, en el color del
                usuario. Aditivo: si el nodo no participa de una sinergia
                activa, no se renderiza nada (sin ruido de estado vacío).
                Beat de entrada de una sola pasada (transform/opacity/box-
                shadow); bajo prefers-reduced-motion se pinta el estado final
                estático, sin animación ni loop. */}
            {synergyMeta && (
              <motion.div
                key={`synergy-${synergyGroupId}-${selectedNode.id}`}
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, transform: 'scale(0.94)', boxShadow: `0 0 0px ${orbColor}00` }
                }
                animate={{
                  opacity: 1,
                  transform: 'scale(1)',
                  boxShadow: `0 8px 24px ${orbColor}22`,
                }}
                transition={
                  prefersReducedMotion
                    ? { duration: 0 }
                    : { duration: 0.5, ease: [0.23, 1, 0.32, 1] }
                }
                style={{
                  padding: '12px 14px', borderRadius: 14, marginBottom: 12,
                  background: `${orbColor}14`,
                  border: `1px solid ${orbColor}44`,
                }}
              >
                <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1.5, color: orbColor, textTransform: 'uppercase', marginBottom: 6 }}>
                  ⚡ Sinergia activa
                </div>
                {/* QUÉ */}
                <p style={{ margin: '0 0 4px', fontFamily: FONT.display, fontSize: 13.5, fontWeight: 700, color: C.ink }}>
                  {synergyMeta.nombre}
                </p>
                {/* POR QUÉ */}
                <p style={{ margin: '0 0 8px', fontFamily: FONT.body, fontSize: 12, lineHeight: 1.5, color: C.mut }}>
                  {synergyMeta.porque}
                </p>
                {/* QUÉ GANA */}
                <div style={{
                  display: 'inline-block', padding: '3px 10px', borderRadius: 999,
                  fontFamily: FONT.mono, fontSize: 10, fontWeight: 700,
                  background: `${orbColor}22`, border: `1px solid ${orbColor}44`, color: orbColor,
                }}>
                  +8/100 en tu dominio
                </div>
              </motion.div>
            )}

            {/* CTA: abrir fullscreen */}
            <button
              onClick={handlePreviewClick}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', cursor: 'pointer',
                background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
                color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
                boxShadow: `0 8px 24px rgba(160,174,192,0.3)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              Abrir {selectedNode.label} →
            </button>

            {/* Swipe hint */}
            {canSwipe && (
              <p style={{ textAlign: 'center', margin: '10px 0 0', fontFamily: FONT.mono, fontSize: 8, color: C.mut, letterSpacing: 1 }}>
                ← DESLIZA PARA CAMBIAR DE NODO →
              </p>
            )}
          </div>
        );
      })()}


      {/* ── FULLSCREEN VIEW (tab expanded) ───────────────────────────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        zIndex: state === 'fullscreen' ? 20 : -1,
        opacity: state === 'fullscreen' ? 1 : 0,
        transform: state === 'fullscreen' ? 'translateY(0)' : 'translateY(30px)',
        transition: 'opacity 0.25s cubic-bezier(0.23,1,0.32,1), transform 0.25s cubic-bezier(0.23,1,0.32,1)',
        pointerEvents: state === 'fullscreen' ? 'auto' : 'none',
        display: 'flex',
        flexDirection: 'column',
        background: C.bg,
      }}>
        {/* Back button header */}
        <div style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          paddingTop: 'calc(env(safe-area-inset-top, 12px) + 8px)',
          borderBottom: `1px solid ${C.line}`,
          background: C.surface,
          backdropFilter: 'blur(20px)',
        }}>
          <button
            onClick={handleBack}
            aria-label="Volver al núcleo"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: C.glass2,
              border: `1px solid ${C.line}`,
              color: C.cyan,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 16,
              fontWeight: 700,
              transition: 'transform 0.15s ease, background 0.15s ease',
            }}
          >
            ←
          </button>
          {selectedNode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>{selectedNode.icon}</span>
              <span style={{
                fontFamily: FONT.display,
                fontSize: 15,
                fontWeight: 600,
                color: C.ink,
              }}>
                {selectedNode.label}
              </span>
            </div>
          )}
        </div>

        {/* Tab content — with page transition */}
        <div key={selectedNode?.tab ?? 'none'} style={{ flex: 1, overflow: 'auto', animation: 'pageEnter 0.28s cubic-bezier(0.32, 0.72, 0, 1) both' }}>
          <Suspense fallback={<TabLoader />}>
            {selectedNode && renderTab(selectedNode.tab)}
          </Suspense>
        </div>
      </div>

      {/* ── Orb-back tap zone (tap empty space to go back from preview) ── */}
      {state === 'preview' && (
        <div
          onClick={handleBack}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 5,
          }}
        />
      )}

      {/* ── NODE LABELS (HTML overlay projected from 3D) ────────────── */}
      {/*
        La caja de etiquetas ocupa EXACTAMENTE la misma caja centrada que el
        orbe (ORB_SIZE_VMIN / ORB_MAX). Las coordenadas proyectadas pos.x/pos.y
        vienen en el espacio de la caja del orbe (0..box), así que este contenedor
        centrado hace que left:pos.x/top:pos.y caiga sobre el orbe visible.
      */}
      {state !== 'fullscreen' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: `${ORB_SIZE_VMIN}vmin`,
          height: `${ORB_SIZE_VMIN}vmin`,
          maxWidth: ORB_MAX,
          maxHeight: ORB_MAX,
          pointerEvents: 'none',
          zIndex: 2,
        }}>
          {/* P1: aria-live announces active node to screen readers */}
          <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            {selectedNode ? `${selectedNode.label} seleccionado. ${selectedNode.nextStep || ''}` : 'Orbe de navegación. Usa Tab para explorar.'}
          </div>
          {nodePositions.map((pos: { id: string; x: number; y: number; depth: number }) => {
            const node = orbNodesWithLevels.find((n: OrbNode) => n.id === pos.id);
            if (!node) return null;
            const isActive = node.id === selectedNode?.id;
            const isHub = HUB_NODES.findIndex(n => n.id === node.id) >= 0;
            if (!isHub && !isActive) return null;
            // BLOQUEADO / DESBLOQUEADO (Inc 4): los nodos hub bloqueados se
            // leen TENUES / lejanos (menor opacidad), así la red se percibe
            // "armada" con lo desbloqueado. Solo aplica a hubs; el gate es
            // read-only sobre la reputación real. Presentación aditiva:
            // los nodos desbloqueados se ven EXACTAMENTE como hasta hoy.
            const gate = isHub ? unlockFor(node.id) : null;
            const isLocked = !!gate && !gate.unlocked;
            // ── El orbe como MAPA VIVO, no como menú ──────────────────
            // En vez del corte binario anterior (frente 0.7 / atrás 0),
            // la opacidad de cada etiqueta hub es una función CONTINUA de
            // su profundidad proyectada (pos.depth: 0=frente .. 1=atrás):
            // las de adelante quedan nítidas y las de atrás se retiran.
            // Así el orbe se lee como un mapa vivo y solo destacan los
            // pocos nodos frontales, en lugar de mostrar las 9 etiquetas
            // con el mismo peso (efecto "grilla de menú"). Todos los
            // botones hub se siguen renderizando para tap/lectores.
            const depthOpacity = Math.max(0.06, 0.85 - pos.depth * 0.79);
            // Los nodos bloqueados se retiran un paso más (atenuación
            // multiplicativa) para leerse "lejanos", pero siguen visibles y
            // TAPPABLES: tocarlos revela la pista de cómo abrirlos.
            const lockedDim = isLocked ? 0.42 : 1;
            const labelOpacity = isActive ? 1 : depthOpacity * lockedDim;
            // El nodo activo siempre es tappable; los demás lo son cuando
            // su etiqueta es legible (evita capturar taps de nodos casi
            // invisibles del hemisferio trasero). Un hub bloqueado del frente
            // sigue siendo tappable (depthOpacity>0.2) y, al tocarlo, revela
            // la pista en vez de navegar. La navegación por voz/texto y el
            // resto del flujo quedan intactos.
            const tappable = isActive || depthOpacity > 0.2;
            return (
              <button
                key={node.id}
                onClick={() => { handleNodeTap(node); }}
                aria-label={isLocked && gate?.hint
                  ? `${node.label}, bloqueado. ${gate.hint}`
                  : `${node.label}${node.level ? ` ${Math.round(node.level * 100)}%` : ''}: ${node.nextStep || 'Explorar'}`}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -140%)',
                  opacity: labelOpacity,
                  transition: prefersReducedMotion ? 'none' : 'opacity 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  pointerEvents: tappable ? 'auto' : 'none',
                }}
              >
                <motion.span
                  whileTap={isActive && !prefersReducedMotion ? { scale: 0.96 } : undefined}
                  transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
                  style={{
                    fontFamily: FONT.mono,
                    fontSize: isActive ? SIZE.xs : SIZE.xxs,
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: isActive ? 1.4 : 1.2,
                    color: isActive ? orbColor : C.mut,
                    textTransform: 'uppercase',
                    textShadow: isActive ? `0 0 8px ${orbColor}` : 'none',
                    whiteSpace: 'nowrap',
                    transition: prefersReducedMotion ? 'none' : 'color 0.15s ease, font-size 0.15s ease',
                  }}
                >
                  {isLocked ? '🔒 ' : ''}{node.label}{!isLocked && node.level !== undefined && node.level > 0 ? ` ${Math.round(node.level * 100)}%` : ''}
                </motion.span>
              </button>
            );
          })}
        </div>
      )}

      {/* ── ORÁCULO INPUT BAR (visible only after onboarding) ──── */}
      {onboardingDone && <div style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        padding: '8px 16px',
        paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 8px)',
        background: 'linear-gradient(0deg, rgba(0,2,6,0.98) 70%, transparent 100%)',
      }}>
        {/* Idle help message (30s sin interacción) */}
        {helpMessage && !responseMsg && (
          <div style={{
            marginBottom: 8, padding: '8px 12px', background: 'rgba(255,176,46,0.08)',
            border: '1px solid rgba(255,176,46,0.2)', borderRadius: 12,
            fontFamily: FONT.mono, fontSize: 11, color: C.gold, textAlign: 'center',
          }}>
            {helpMessage}
          </div>
        )}

        {/* Input bar — morphs on focus */}
        <form
          onSubmit={(e: { preventDefault: () => void }) => {
            e.preventDefault();
            if (!inputText.trim()) return;
            audioTick();
            handleTextInput(inputText.trim());
            setInputText('');
            resetIdle();
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: inputFocused ? 'rgba(12,16,30,0.95)' : C.surface,
            border: `1px solid ${inputFocused ? orbColor + '77' : C.line}`,
            borderRadius: 999,
            padding: inputFocused ? '10px 16px' : '8px 12px',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: inputFocused
              ? `0 0 20px ${orbColor}33, 0 0 8px ${orbColor}22, 0 8px 32px rgba(0,0,0,0.3)`
              // En reposo la barra es el CONTROL PRIMARIO: halo de color de
              // usuario un poco más presente (solo box-shadow, sin nuevos
              // loops; el breathe existente ya lo neutraliza reduced-motion).
              : (!inputText && !responseMsg ? `0 0 18px ${orbColor}33, 0 0 6px ${orbColor}1a, 0 4px 20px rgba(0,0,0,0.28)` : 'none'),
            transform: inputFocused ? 'scale(1.02)' : 'scale(1)',
            transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
            animation: !inputText && !responseMsg && !inputFocused ? 'cp-breathe 3s ease-in-out infinite' : 'none',
          }}
        >
          {/* Mic button */}
          <button
            type="button"
            onClick={toggleListening}
            aria-label={isListening ? 'Dejar de escuchar' : 'Hablar al Oráculo'}
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: `1px solid ${isListening ? C.red : C.line}`,
              background: isListening ? 'rgba(255,92,122,0.15)' : C.glass2,
              color: isListening ? C.red : C.cyan,
              cursor: 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              flexShrink: 0,
              animation: isListening ? 'cp-pulse 1.2s ease-in-out infinite' : 'none',
            }}
          >
            🎤
          </button>

          {/* Text input */}
          <input
            value={inputText}
            onChange={(e: { target: { value: string } }) => setInputText(e.target.value)}
            onFocus={() => setInputFocused(true)}
            onBlur={() => setInputFocused(false)}
            placeholder={state === 'fullscreen' ? 'Pregunta a Ómicrom…' : '¿Qué quieres hacer hoy? Habla o escríbeme…'}
            aria-label="Escribir comando al Oráculo"
            inputMode="text"
            autoComplete="off"
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              background: 'transparent',
              fontFamily: FONT.body,
              fontSize: 15,
              color: C.ink,
            }}
          />

          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            aria-label="Enviar"
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              border: 'none',
              background: inputText.trim() ? C.cyan : C.glass2,
              color: inputText.trim() ? '#000' : C.mut,
              cursor: inputText.trim() ? 'pointer' : 'default',
              display: 'grid',
              placeItems: 'center',
              fontSize: 13,
              flexShrink: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
          >
            ➤
          </button>
        </form>

        {/* Suggestion Chips removed — la voz del núcleo (OrbEstadoDelDia) guía */}
      </div>}

      {/* ── BIENVENIDA DEL ORBE (solo la primera vez de cada sesión) ──
          Superficie calma en dos partes (acceptance criterion #5): el
          SALUDO se ancla ARRIBA del orbe y los CHIPS de acción ABAJO,
          encima de la barra de input.

          Los wrappers se montan mientras state==='orb' && onboardingDone
          (SIN `showHomeGuide` en la condición); es `visible={showHomeGuide}`
          quien gobierna el <AnimatePresence> interno, de modo que al
          descartar se reproduce la variante `exit` (fade-out) en vez de un
          corte seco. Con prefers-reduced-motion la variante `exit` es {} y
          el descarte queda instantáneo (correcto). El wrapper exterior usa
          pointerEvents:'none' para no bloquear el orbe cuando la tarjeta
          se anima hacia afuera; la tarjeta reactiva pointerEvents:'auto'. */}

      {/* Saludo de primera sesión: anclado arriba (banda superior libre). */}
      {state === 'orb' && onboardingDone && !!sbProfile?.id && (
        <div style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 12px) + 96px)',
          left: 0,
          right: 0,
          zIndex: 5,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px',
          pointerEvents: 'none',
        }}>
          <OrbHomeGuide
            slot="greeting"
            visible={showHomeGuide}
            userName={resolveGreetingName(sbProfile)}
          />
        </div>
      )}

      {/* Chips de acción: anclados abajo, encima de la barra de input. */}
      {state === 'orb' && onboardingDone && !!sbProfile?.id && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'calc(env(safe-area-inset-bottom, 12px) + 84px)',
          zIndex: 46,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 16px',
          pointerEvents: 'none',
        }}>
          <OrbHomeGuide
            slot="actions"
            visible={showHomeGuide}
            userName={resolveGreetingName(sbProfile)}
            hasCv={Boolean(sbProfile?.cv_summary)}
            onNavigate={(tab) => {
              if (tab === 'cv') {
                setShowConvalida(true);
                return;
              }
              const node = orbNodesWithLevels.find((n: OrbNode) => n.tab === tab);
              if (node) handleNodeTap(node);
            }}
            onDismiss={dismissHomeGuide}
          />
        </div>
      )}

      {/* ── ESTADO DEL DÍA / PRÓXIMO PASO (LA voz ambiental del Home) ────
          "Matar el Escritorio" Inc 2: esta ES la única voz ambiental del
          núcleo. UNA sola línea sobria anclada JUSTO ENCIMA de la barra de
          input, con su propia banda vertical (bottom safe+76px, zIndex 6 <
          50 de la barra). Se compone SOLO con datos ya presentes en el
          cliente (alza de eje + racha + computeSteps + reputación), sin
          backend, y puede expresar en UNA línea "qué se movió + próximo paso
          + invitación" con números reales.

          Mutua exclusión (a lo sumo UNA voz ambiental a la vez): se suprime
          mientras showHomeGuide está en pantalla (el saludo + chips es la
          guía de la PRIMERA sesión, y su tarjeta de acciones ocupa la banda
          inferior en bottom safe+84px) y mientras responseMsg está activo
          (ProactiveMessage es el canal REACTIVO). Ya no compite con
          OrbContextLabel ni ProactiveCards: ambos fueron desmontados en este
          incremento. El wrapper usa pointerEvents:'none' para no bloquear
          taps de nodos ni la barra de input. */}
      {/* B6: SIN la compuerta `!!sbProfile?.id`. La voz del núcleo también
          acompaña al invitado (pickHomeStatus ya recibe su línea propia en
          homeStatusLabel); `visible` se apaga solo si no hay label. */}
      {state === 'orb' && onboardingDone && !showHomeGuide && !responseMsg && homeStatusLabel && (
        <div style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 'calc(env(safe-area-inset-bottom, 12px) + 76px)',
          zIndex: 6,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px',
          pointerEvents: 'none',
        }}>
          <OrbEstadoDelDia label={homeStatusLabel} visible />
        </div>
      )}

      {/* ── PROACTIVE MESSAGE (con botones — reemplaza la burbuja plana) ──
          RESPUESTA VIVA (Inc 1): la burbuja persiste SIEMPRE que haya
          responseMsg, sin importar el estado del shell. Antes se ocultaba
          con `state === 'orb'`, así que un intent 'navigate' que hace
          setState('preview') la borraba al instante ("no me aparece nada").
          Ahora acompaña al usuario en orbe, preview y fullscreen. */}
      {responseMsg && (
        <ProactiveMessage
          message={responseMsg}
          actions={proactiveActions}
          userColor={orbColor}
          thinking={omicronThinking}
          stream={responseStream}
          onDismiss={() => { setResponseMsg(null); setProactiveActions([]); setResponseStream(false); }}
        />
      )}

      {/* ── CONFIRMACIÓN DE GUARDADO EN LA NUBE (efímera) ──────────────
          "Matar el Escritorio" Inc 2 — CONSOLIDACIÓN A UNA SOLA VOZ:
          el Home ambiental habla ahora con UNA sola voz calma del núcleo
          (OrbEstadoDelDia, arriba de la barra: qué se movió + próximo paso
          + invitación, con números reales). Por eso se RETIRARON de esta
          banda superior las dos superficies ambientales más débiles que
          competían con ella:
            • OrbContextLabel (one-liner rotativo superior) — su valor
              (racha, reputación, "toca un nodo") ya lo expresa la voz del
              núcleo / la bienvenida de primera sesión.
            • ProactiveCards (tips TIP ociosos rotativos) — su tip principal
              ("Sube tu CV") ES el primer paso determinista de computeSteps,
              que la voz del núcleo ya ofrece; los demás tips los cubre la
              bienvenida (saludo + chips) de la sesión 1.
          Sus ARCHIVOS quedan en el repo (diff pequeño y reversible). Aquí
          solo permanece CloudSavedBadge: NO es una voz ambiental de guía,
          sino una confirmación efímera que aparece SOLO tras un guardado
          exitoso ('omicron:profile-saved') y se auto-oculta ~3s después. */}
      {state === 'orb' && onboardingDone && (
        <div style={{
          position: 'absolute',
          top: 'calc(env(safe-area-inset-top, 12px) + 70px)',
          left: 0,
          right: 0,
          zIndex: 4,
          display: 'flex',
          justifyContent: 'center',
          padding: '0 20px',
          pointerEvents: 'none',
        }}>
          <div style={{ maxWidth: 300, width: '100%', pointerEvents: 'auto', display: 'flex', justifyContent: 'center' }}>
            <CloudSavedBadge />
          </div>
        </div>
      )}

      {/* ── PREMIUM UPSELL (cuando llega al límite de IA) ──────────── */}
      {showPremium && <PremiumLock feature="Coach IA" onClose={() => setShowPremium(false)} />}

      {/* ── CREDENCIAL ÓMICROM (abierta desde el avatar) ───────────── */}
      {showCredencial && (
        <ErrorBoundary section="Credencial">
          <Suspense fallback={
            <div style={{ position: 'fixed', inset: 0, zIndex: 95, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'radial-gradient(130% 95% at 50% 18%, #050813 0%, #02030a 52%, #000003 100%)' }}>
              <GeodesicOrb size={80} nodes={8} color={getUserColor()} spinning={0} intensity={0.55} breathing />
            </div>
          }>
            <CredencialModal
              onClose={() => setShowCredencial(false)}
              onUpdateCV={() => { setShowCredencial(false); setShowConvalida(true); }}
            />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* ── CV UPLOAD MODAL (ConvalidaOmicron) ─────────────────────── */}
      {showConvalida && (
        <ErrorBoundary section="ConvalidaCV">
          <Suspense fallback={
            <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
              <button onClick={() => setShowConvalida(false)} aria-label="Cerrar" style={{ position: 'absolute', top: 16, right: 20, width: 44, height: 44, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✕</button>
              <GeodesicOrb size={80} nodes={5} color={getUserColor()} spinning={20} intensity={0.5} breathing />
              <p style={{ marginTop: 16, fontFamily: FONT.mono, fontSize: 12, color: C.mut }}>Cargando módulo CV…</p>
            </div>
          }>
            <ConvalidaOmicron onClose={() => setShowConvalida(false)} />
          </Suspense>
        </ErrorBoundary>
      )}

      {/* ── CSS Animations ──────────────────────────────────────────── */}
      <style>{`
        @keyframes orbPreviewEnter {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes pageEnter {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translate(-50%, -8px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
