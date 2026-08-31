import { useState, lazy, Suspense, useCallback, useRef, useEffect, useMemo } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import OrbNeuronal, { type OrbNode } from './OrbNeuronal';
import { OrbOnboarding, type GeneratedProfile } from './OrbOnboarding';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { ProactiveMessage, type ProactiveAction } from './ProactiveMessage';
import { ProactiveCards } from './ProactiveCards';
import { OrbHomeGuide } from './OrbHomeGuide';
import { resolveGreetingName } from '../utils/orbHomeGuide';
import { shouldShowWelcomeCredencial } from '../utils/welcomeCredencial';
import { OrbContextLabel } from './OrbContextLabel';
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
import { getNextProfileQuestion, hasAskedToday, markAskedToday } from '@/features/gemelo/services/progressive';
import { evaluateProactiveEvents } from '@/features/gemelo/services/proactive';
import { C, FONT } from '@/theme';
import { hapticMedium, hapticLight } from '@/shared/utils/haptics';
import { audioSweep, audioTick } from '@/shared/utils/spatialAudio';
import { firePulse } from '@/shared/components/LivePulseBar';
import { getUserColor } from '@/shared/components/ColorPicker';
import { useUserColor } from '@/shared/hooks/useUserColor';
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

  // Synergy groups: related skills boost each other's effective level
  const SYNERGY_GROUPS: string[][] = [
    ['react', 'typescript', 'javascript', 'frontend', 'node', 'next.js'],
    ['python', 'machine learning', 'data', 'ia', 'deep learning', 'analytics'],
    ['docker', 'kubernetes', 'aws', 'devops', 'cloud', 'ci/cd'],
    ['diseño', 'ux', 'ui', 'figma', 'design', 'branding'],
    ['gestión', 'liderazgo', 'scrum', 'agile', 'project management'],
    ['ventas', 'marketing', 'negociación', 'comercial', 'growth'],
  ];

  // Detect which synergy groups are active (2+ skills from same group)
  // Uses word-boundary matching to avoid cross-contamination
  // (e.g. "Google Analytics" should NOT match the ML group's "analytics")
  const activeSynergies = new Set<number>();
  SYNERGY_GROUPS.forEach((group, gi) => {
    const matches = skills.filter((s) => {
      const lower = s.toLowerCase();
      return group.some((g) => {
        // Word boundary: the group keyword must be a whole word in the skill
        const re = new RegExp(`\\b${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return re.test(lower);
      });
    });
    if (matches.length >= 2) activeSynergies.add(gi);
  });

  // Synergy bonus: +0.08 if skill belongs to an active synergy group
  const getSynergyBonus = (skill: string): number => {
    const lower = skill.toLowerCase();
    for (const gi of activeSynergies) {
      if (SYNERGY_GROUPS[gi].some((g) => {
        const re = new RegExp(`\\b${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return re.test(lower);
      })) return 0.08;
    }
    return 0;
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
  const [state, setState] = useState<ShellState>('orb');
  const [selectedNode, setSelectedNode] = useState<OrbNode | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [spectrum, setSpectrum] = useState<{ bass: number; mid: number; treble: number } | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const [nodePositions, setNodePositions] = useState<{ id: string; x: number; y: number; depth: number }[]>([]);
  const [inputText, setInputText] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const [proactiveActions, setProactiveActions] = useState<ProactiveAction[]>([]);
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

  // ── Handle text input — Ómicrom cerebro unificado ───────────────────
  const handleTextInput = useCallback(async (text: string) => {
    // Limpiar respuesta anterior para mostrar que estamos procesando
    setResponseMsg('Un momento…');

    const intent = interpret(text);

    const flash = (msg: string, _ms = 0) => {
      setResponseMsg(msg);
      // Las respuestas persisten hasta que el usuario envíe otro mensaje
      // (no se auto-borran — interacción fluida)
      if (responseTimer.current) clearTimeout(responseTimer.current);
    };

    if (intent.kind === 'navigate') {
      const node = orbNodesWithLevels.find((n: OrbNode) => n.tab === intent.tab);
      if (node) {
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
      flash('Dame un momento, estoy analizando tu perfil…');
      speakLocal('Déjame ver tu Gemelo Digital.');
      const coachTimer = setTimeout(() => flash('Analizando… la IA puede demorar unos segundos.'), 8000);
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
        return;
      }
      if (!checkOmicronLimit()) {
        flash('Alcanzaste el límite diario de consultas. Volvé mañana con energía recargada.');
        clearTimeout(coachTimer);
        return;
      }
      const r = await askOmicron(text, omCtx);
      clearTimeout(coachTimer);
      flash(r.text);
      speakOmicron(r.text);
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
    flash('Déjame pensar…');
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
    const r = await askOmicron(text, omCtx);
    clearTimeout(slowTimer);
    flash(r.text);
    speakOmicron(r.text);
  }, [setActiveTab, sbProfile, orbNodesWithLevels, selectedNode]);

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
    hapticMedium();
    audioSweep();
    firePulse('user');
    setSelectedNode(node);
    setState('preview');
    setActiveTab(node.tab);
    // Dispatch event for ProactiveCards idle/tap tracking
    window.dispatchEvent(new CustomEvent('omicron:node-tap'));
  }, [setActiveTab]);

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
              // Broadcast "activó su Gemelo Digital" a toda la red
              try {
                const ch = supabase.channel('omicron-live');
                ch.send({ type: 'broadcast', event: 'activity', payload: { text: `${sbProfile.username ?? 'Un nodo'} activó su Gemelo Digital`, kind: 'action' } });
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
        <motion.div
          style={{
            width: '64vmin',
            height: '64vmin',
            maxWidth: 360,
            maxHeight: 360,
            transformOrigin: 'center',
            willChange: 'transform',
          }}
          animate={
            prefersReducedMotion
              ? { scale: 1 }
              : isSpeaking
                // Ecualizador en vivo: la escala es un ÚNICO valor que sigue el
                // nivel RMS real (voiceLevel 0..1) en cada render (~60fps vía el
                // evento 'oracle:voice'). No es un keyframe [1, pico, 1]: así las
                // sílabas fuertes saltan al instante y las pausas caen de vuelta,
                // dando la sensación de ecualizador y no de respiración.
                ? { scale: 1 + Math.min(0.34, voiceLevel * 0.36) }
                // Reposo: respiración muy sutil para no pelear con la animación interna del orbe.
                : { scale: [1, 1.015, 1] }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : isSpeaking
                // Transición corta y elástica: rastrea el nivel actual en lugar de
                // correr un tween fijo. Sin repeat: Infinity en el estado hablando.
                ? { type: 'spring', stiffness: 500, damping: 30 }
                : { repeat: Infinity, duration: 4, ease: 'easeInOut' }
          }
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
        </motion.div>
      </div>


      {/* ── PROFILE AVATAR BUTTON (sutil, esquina superior derecha) ──── */}
      {state !== 'fullscreen' && (
        <button
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
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
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
        </button>
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

        // ── Sinergias con este nodo
        const nodeSkills = (sbProfile?.skills ?? []) as string[];
        const SYNERGY_MAP: Record<string, string[]> = {
          habilidades: ['react', 'typescript', 'node', 'python', 'java', 'docker'],
          academia: ['machine learning', 'data', 'analytics', 'deep learning'],
          empleos: ['liderazgo', 'gestión', 'scrum', 'agile'],
          market: ['diseño', 'ux', 'figma', 'freelance'],
        };
        const relatedSkills = (SYNERGY_MAP[selectedNode.id] ?? [])
          .filter(s => nodeSkills.some(sk => sk.toLowerCase().includes(s)));

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

            {/* Sinergias activas */}
            {relatedSkills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: C.gold, textTransform: 'uppercase', width: '100%', marginBottom: 2 }}>
                  ⚡ Sinergias
                </span>
                {relatedSkills.map(s => (
                  <span key={s} style={{
                    padding: '3px 8px', borderRadius: 999, fontFamily: FONT.mono, fontSize: 9,
                    background: `${C.gold}14`, border: `1px solid ${C.gold}44`, color: C.ink,
                  }}>
                    {s}
                  </span>
                ))}
              </div>
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
            aria-label="Volver al orbe"
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
      {state !== 'fullscreen' && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 2 }}>
          {/* P1: aria-live announces active node to screen readers */}
          <div aria-live="polite" aria-atomic="true" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
            {selectedNode ? `${selectedNode.label} seleccionado. ${selectedNode.nextStep || ''}` : 'Orbe de navegación. Usa Tab para explorar.'}
          </div>
          {nodePositions.map((pos: { id: string; x: number; y: number; depth: number }) => {
            const node = orbNodesWithLevels.find((n: OrbNode) => n.id === pos.id);
            if (!node) return null;
            const isFront = pos.depth < 0.5;
            const isActive = node.id === selectedNode?.id;
            const isHub = HUB_NODES.findIndex(n => n.id === node.id) >= 0;
            if (!isHub && !isActive) return null;
            return (
              <button
                key={node.id}
                onClick={() => { handleNodeTap(node); }}
                aria-label={`${node.label}${node.level ? ` ${Math.round(node.level * 100)}%` : ''}: ${node.nextStep || 'Explorar'}`}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -140%)',
                  opacity: isFront ? (isActive ? 1 : 0.7) : 0,
                  transition: 'opacity 0.15s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  pointerEvents: isFront ? 'auto' : 'none',
                }}
              >
                <span style={{
                  fontFamily: FONT.mono,
                  fontSize: isActive ? 11 : 9,
                  fontWeight: isActive ? 700 : 500,
                  letterSpacing: 1,
                  color: isActive ? C.cyan : C.mut,
                  textTransform: 'uppercase',
                  textShadow: isActive ? `0 0 8px ${C.cyan}` : 'none',
                  whiteSpace: 'nowrap',
                  transition: 'color 0.15s ease, font-size 0.15s ease',
                }}>
                  {node.label}{node.level !== undefined && node.level > 0 ? ` ${Math.round(node.level * 100)}%` : ''}
                </span>
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
              : (!inputText && !responseMsg ? `0 0 12px ${orbColor}22, 0 0 4px ${orbColor}11` : 'none'),
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
            placeholder={state === 'fullscreen' ? 'Pregunta a Ómicrom…' : 'Habla o escribe a Ómicrom…'}
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

        {/* Suggestion Chips removed — ProactiveCards now guide the user */}
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

      {/* Saludo: anclado arriba, debajo del OrbContextLabel para no chocar. */}
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

      {/* ── PROACTIVE MESSAGE (con botones — reemplaza la burbuja plana) ── */}
      {state === 'orb' && responseMsg && (
        <ProactiveMessage
          message={responseMsg}
          actions={proactiveActions}
          onDismiss={() => { setResponseMsg(null); setProactiveActions([]); }}
        />
      )}

      {/* ── ORB CONTEXT LABEL (texto flotante arriba) ──────────────── */}
      {state === 'orb' && <OrbContextLabel visible={!responseMsg} />}

      {/* ── PROACTIVE INFO CARDS (above the orb, centered) ──────────── */}
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
          <div style={{ maxWidth: 300, width: '100%', pointerEvents: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Confirmación efímera: aparece SOLO tras un guardado exitoso
                (escucha 'omicron:profile-saved') y se auto-oculta con fade
                ~3s después. Renderiza null el resto del tiempo, así que no
                ocupa espacio ni se muestra de forma permanente. */}
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <CloudSavedBadge />
            </div>
            {/* Se suprime mientras la bienvenida (showHomeGuide) está en
                pantalla: el saludo + chips ES la guía de la primera sesión,
                así dos superficies de guía no compiten en la banda superior.
                ProactiveCards reanuda sus tips ociosos solo tras descartar la
                bienvenida; su tope por sesión es independiente (sessionStorage
                propio), así que sigue funcionando después. */}
            <ProactiveCards
              visible={state === 'orb' && onboardingDone && !showHomeGuide}
              hasCv={Boolean(sbProfile?.cv_summary)}
              onNavigate={(tab) => {
                if (tab === 'cv') {
                  setShowConvalida(true);
                  return;
                }
                const node = orbNodesWithLevels.find((n: OrbNode) => n.tab === tab);
                if (node) handleNodeTap(node);
              }}
            />
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
