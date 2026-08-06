import { useState, lazy, Suspense, useCallback, useRef, useEffect, useMemo } from 'react';
import OrbNeuronal, { type OrbNode } from './OrbNeuronal';
import { OrbOnboarding } from './OrbOnboarding';
import { useApp } from '../../store/AppContext';
import { useRealtime } from '../../store/RealtimeContext';
import { interpret, askCoach } from '../../lib/oraculo';
import { speak } from '../../lib/voiceEngine';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { computeSteps, nodeGuidance } from '../../lib/omicronCoach';
import { evaluateProactiveEvents } from '../../lib/proactiveEngine';
import { C, FONT } from '../../theme';
import type { TabId, GemeloDigital } from '../../types';

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
const WalletTab     = lazy(() => import('../tabs/WalletTab').then(m => ({ default: m.WalletTab })));
const ChatTab       = lazy(() => import('../tabs/ChatTab').then(m => ({ default: m.ChatTab })));
const EmpleosTab    = lazy(() => import('../tabs/EmpleosTab').then(m => ({ default: m.EmpleosTab })));
const MarketTab     = lazy(() => import('../tabs/MarketTab').then(m => ({ default: m.MarketTab })));
const PerfilTab     = lazy(() => import('../tabs/PerfilTab').then(m => ({ default: m.PerfilTab })));
const MaxSkillTab   = lazy(() => import('../tabs/MaxSkillTab').then(m => ({ default: m.MaxSkillTab })));
const AcademiaTab   = lazy(() => import('../tabs/AcademiaTab').then(m => ({ default: m.AcademiaTab })));
const GobernanzaTab = lazy(() => import('../tabs/GobernanzaTab').then(m => ({ default: m.GobernanzaTab })));
const VaultTab      = lazy(() => import('../tabs/VaultTab').then(m => ({ default: m.VaultTab })));

// ── Orb node definitions (the app sections) ─────────────────────────
// Los primeros 9 son los HUBS navegables de la app.
// El resto son NODOS DE CONOCIMIENTO: cada partícula es una posibilidad
// de integrar conocimiento al Gemelo Digital.
// ── Hub nodes (always present — the 9 app sections) ─────────────────
const HUB_NODES: OrbNode[] = [
  { id: 'inicio',      label: 'Mi ADN',       tab: 'perfil',     icon: '⬡' },
  { id: 'academia',    label: 'Academia',     tab: 'academia',   icon: '◈' },
  { id: 'empleos',     label: 'Empleos',      tab: 'empleos',    icon: '◇' },
  { id: 'mercado',     label: 'Mercado',      tab: 'market',     icon: '⬢' },
  { id: 'mensajes',    label: 'Mensajes',     tab: 'chat',       icon: '○' },
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
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <div style={{ width: 18, height: 18, borderRadius: '50%', border: `2px solid ${C.cyan}`, borderTopColor: 'transparent', animation: 'cp-spin 0.8s linear infinite' }} />
    </div>
  );
}

function renderTab(tab: TabId) {
  switch (tab) {
    case 'perfil':     return <PerfilTab />;
    case 'maxskill':   return <MaxSkillTab />;
    case 'academia':   return <AcademiaTab />;
    case 'market':     return <MarketTab />;
    case 'empleos':    return <EmpleosTab />;
    case 'chat':       return <ChatTab />;
    case 'wallet':     return <WalletTab />;
    case 'gobernanza': return <GobernanzaTab />;
    case 'vault':      return <VaultTab />;
    default:           return null;
  }
}


export function OrbShell() {
  const { setActiveTab, unreadCount } = useApp();
  const { profile } = useGemeloProfile();

  // ── Build GemeloDigital from Supabase profile for omicronCoach ──────
  const sbProfile = (useApp() as any).profile;
  const gemeloDigital = useMemo((): GemeloDigital | null => {
    if (!sbProfile) return null;
    return {
      execution: sbProfile.execution_score ?? 40,
      quality: sbProfile.quality_score ?? 50,
      transcendence: sbProfile.transcendence_score ?? 18,
      foundation: sbProfile.foundation_score ?? 25,
      overallReputation: sbProfile.reputation_score ?? 0,
    };
  }, [sbProfile]);
  const [state, setState] = useState<ShellState>('orb');
  const [selectedNode, setSelectedNode] = useState<OrbNode | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [nodePositions, setNodePositions] = useState<{ id: string; x: number; y: number; depth: number }[]>([]);
  const [inputText, setInputText] = useState('');
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<number | null>(null);

  // ── Build orb nodes dynamically from user's real skills ─────────────
  // The 9 hubs are always present. Knowledge nodes come FROM the user's CV.
  // Now uses skills_detail (from AI analysis) for real domination %.
  const dynamicOrbNodes = useMemo((): OrbNode[] => {
    const userSkills: string[] = sbProfile?.skills ?? (profile as any).skills ?? [];
    const skillsDetail: { name: string; pct: number }[] = sbProfile?.skills_detail ?? [];
    const skillNodes = buildSkillNodes(userSkills, skillsDetail);
    return [...HUB_NODES, ...skillNodes];
  }, [sbProfile, profile]);

  // ── Compute node levels from user's Gemelo profile ──────────────────
  // Maps each node to a 0-1 level based on validated skills and axes
  const orbNodesWithLevels = useMemo((): OrbNode[] => {
    const validatedSkills: string[] = (profile as any).skills ?? [];
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

    // Map node id → level (0-1) + next step text
    // GAP 7 FIX: Hub nextSteps come from omicronCoach.nodeGuidance() (dynamic, real data)
    const levelMap: Record<string, { level: number; nextStep: string }> = {
      // Hubs → driven by axes + nodeGuidance from omicronCoach (dynamic)
      inicio:      { level: Math.min(1, rep / 100), nextStep: nodeGuidance('perfil', sbProfile, gemeloDigital) || (rep < 50 ? 'Completa tu perfil' : '¡Perfil sólido!') },
      academia:    { level: execNorm * 0.5 + foundNorm * 0.5, nextStep: nodeGuidance('academia', sbProfile, gemeloDigital) },
      empleos:     { level: execNorm, nextStep: nodeGuidance('empleos', sbProfile, gemeloDigital) },
      mercado:     { level: transNorm, nextStep: nodeGuidance('market', sbProfile, gemeloDigital) },
      mensajes:    { level: transNorm * 0.5 + execNorm * 0.5, nextStep: nodeGuidance('chat', sbProfile, gemeloDigital) },
      gobernanza:  { level: foundNorm, nextStep: nodeGuidance('gobernanza', sbProfile, gemeloDigital) },
      habilidades: { level: qualNorm, nextStep: nodeGuidance('maxskill', sbProfile, gemeloDigital) },
      billetera:   { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: nodeGuidance('wallet', sbProfile, gemeloDigital) },
      boveda:      { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: nodeGuidance('vault', sbProfile, gemeloDigital) },

      // Knowledge nodes → based on validated skills
      react:        { level: hasSkill(['react', 'jsx', 'frontend']) ? 0.8 : execNorm * 0.3, nextStep: hasSkill(['react']) ? 'Aprende Server Components' : 'Empieza con React fundamentals' },
      python:       { level: hasSkill(['python', 'django', 'flask']) ? 0.8 : foundNorm * 0.3, nextStep: hasSkill(['python']) ? 'Aplica Python a ML/Data' : 'Empieza con Python básico' },
      typescript:   { level: hasSkill(['typescript', 'ts']) ? 0.85 : execNorm * 0.25, nextStep: hasSkill(['typescript']) ? 'Aprende tipos avanzados' : 'Agrega TypeScript a tus proyectos' },
      nodejs:       { level: hasSkill(['node', 'nodejs', 'backend']) ? 0.75 : execNorm * 0.3, nextStep: hasSkill(['node']) ? 'Aprende microservicios' : 'Crea tu primer servidor Node' },
      ia:           { level: hasSkill(['ia', 'inteligencia', 'gpt', 'ai']) ? 0.7 : foundNorm * 0.2, nextStep: 'Integra IA en tu próximo proyecto' },
      ml:           { level: hasSkill(['machine learning', 'ml', 'scikit']) ? 0.75 : foundNorm * 0.15, nextStep: hasSkill(['ml']) ? 'Construye tu primer modelo en prod' : 'Toma el curso de ML fundamentals' },
      data:         { level: hasSkill(['data', 'analytics', 'sql', 'pandas']) ? 0.7 : foundNorm * 0.2, nextStep: 'Analiza datos reales de tu área' },
      cloud:        { level: hasSkill(['cloud', 'aws', 'azure', 'gcp']) ? 0.75 : execNorm * 0.2, nextStep: hasSkill(['cloud']) ? 'Obtén certificación cloud' : 'Despliega tu primera app en la nube' },
      devops:       { level: hasSkill(['devops', 'docker', 'ci/cd', 'kubernetes']) ? 0.7 : execNorm * 0.25, nextStep: 'Automatiza tu pipeline de deploy' },
      design:       { level: hasSkill(['diseño', 'ux', 'figma', 'ui']) ? 0.8 : qualNorm * 0.3, nextStep: hasSkill(['diseño', 'ux']) ? 'Crea un case study de diseño' : 'Aprende principios de UX' },
      liderazgo:    { level: transNorm * 0.7 + (hasSkill(['liderazgo', 'management']) ? 0.3 : 0), nextStep: transNorm < 0.5 ? 'Lidera tu primer proyecto de equipo' : 'Mentoriza a otro nodo' },
      comunicacion: { level: transNorm * 0.6 + qualNorm * 0.4, nextStep: 'Participa en una presentación o charla' },
      gestion:      { level: transNorm * 0.5 + foundNorm * 0.5, nextStep: foundNorm < 0.5 ? 'Toma un curso de gestión de proyectos' : 'Certifícate en Scrum' },
      agile:        { level: hasSkill(['agile', 'scrum', 'kanban']) ? 0.8 : foundNorm * 0.3, nextStep: hasSkill(['agile', 'scrum']) ? 'Obtén certificación PMP' : 'Aplica Scrum en tu próximo proyecto' },
      seguridad:    { level: hasSkill(['seguridad', 'ciberseguridad', 'security']) ? 0.75 : foundNorm * 0.15, nextStep: 'Toma el curso de ciberseguridad básica' },
      blockchain:   { level: hasSkill(['blockchain', 'web3', 'solidity']) ? 0.8 : transNorm * 0.2, nextStep: hasSkill(['blockchain']) ? 'Despliega tu primer contrato' : 'Entiende cómo funciona blockchain' },
      web3:         { level: hasSkill(['web3', 'ethereum', 'nft']) ? 0.75 : transNorm * 0.15, nextStep: 'Construye una dApp simple' },
      mobile:       { level: hasSkill(['mobile', 'react native', 'flutter', 'ios', 'android']) ? 0.75 : execNorm * 0.25, nextStep: 'Publica tu primera app en la tienda' },
      databases:    { level: hasSkill(['sql', 'database', 'postgres', 'mongodb']) ? 0.8 : foundNorm * 0.3, nextStep: hasSkill(['sql']) ? 'Aprende optimización de queries' : 'Domina SQL básico' },
      api:          { level: hasSkill(['api', 'rest', 'graphql']) ? 0.8 : execNorm * 0.35, nextStep: hasSkill(['api']) ? 'Diseña APIs más robustas' : 'Crea tu primera REST API' },
      testing:      { level: hasSkill(['testing', 'test', 'jest', 'cypress']) ? 0.75 : qualNorm * 0.3, nextStep: 'Agrega tests a tu proyecto actual' },
      arquitectura: { level: hasSkill(['arquitectura', 'architecture', 'system design']) ? 0.7 : foundNorm * 0.3, nextStep: 'Documenta la arquitectura de un proyecto tuyo' },
      analytics:    { level: hasSkill(['analytics', 'ga', 'plausible']) ? 0.7 : transNorm * 0.25, nextStep: 'Instala analytics en tu app' },
      marketing:    { level: hasSkill(['marketing', 'seo', 'ads']) ? 0.7 : transNorm * 0.25, nextStep: 'Aprende growth hacking básico' },
      finanzas:     { level: hasSkill(['finanzas', 'finance']) ? 0.7 : foundNorm * 0.25, nextStep: 'Toma el módulo de finanzas personales' },
      negocios:     { level: transNorm * 0.6 + foundNorm * 0.4, nextStep: 'Lee sobre modelos de negocio innovadores' },
      innovacion:   { level: transNorm, nextStep: 'Propone una mejora en tu próximo proyecto' },
      robotica:     { level: hasSkill(['robotica', 'robot', 'arduino']) ? 0.7 : foundNorm * 0.1, nextStep: 'Explora proyectos de robótica open source' },
      iot:          { level: hasSkill(['iot', 'arduino', 'raspberry']) ? 0.7 : foundNorm * 0.1, nextStep: 'Conecta un dispositivo IoT' },
      networking:   { level: transNorm * 0.7 + Math.min(0.3, (profile.vault ?? 0) * 0.06), nextStep: 'Conecta con 3 profesionales esta semana' },
      freelance:    { level: execNorm * 0.5 + transNorm * 0.5, nextStep: execNorm < 0.5 ? 'Arma tu propuesta de servicios' : 'Sube tu primera propuesta al mercado' },
      startup:      { level: transNorm * 0.6 + execNorm * 0.4, nextStep: 'Valida una idea de startup en 1 semana' },
      cv:           { level: profile.cv ? 0.9 : 0.1, nextStep: profile.cv ? 'Actualiza tu CV con proyectos recientes' : '¡Sube tu CV para activar tu Gemelo!' },
      reputacion:   { level: Math.min(1, rep / 100), nextStep: rep < 50 ? 'Convalida tus credenciales' : rep < 80 ? 'Completa los 4 ejes del Gemelo' : '¡Reputación de élite! Comparte tu badge' },
      certificados: { level: Math.min(1, (profile.titles ?? 0) / 5), nextStep: profile.titles === 0 ? 'Sube tu primer certificado' : 'Agrega más certificaciones' },
      mentoria:     { level: transNorm * 0.8, nextStep: transNorm > 0.6 ? 'Ofrece mentorías en el mercado' : 'Primero sube tu reputación' },
      coaching:     { level: transNorm * 0.7, nextStep: 'Publica tu servicio de coaching' },
      cursos:       { level: foundNorm, nextStep: foundNorm < 0.5 ? 'Inscríbete en un curso estructurado' : 'Busca certificación de nivel avanzado' },
      talleres:     { level: transNorm * 0.5, nextStep: 'Asiste o dicta un taller práctico' },
      proyectos:    { level: execNorm, nextStep: execNorm < 0.5 ? 'Documenta un proyecto tuyo en la Bóveda' : 'Agrega más proyectos a tu portfolio' },
      colaboracion: { level: transNorm, nextStep: 'Inicia un proyecto colaborativo' },
      tokens:       { level: Math.min(1, (profile.vault ?? 0) / 3), nextStep: 'Acumula tokens participando' },
      stake:        { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: 'Aprende sobre staking en Ómicron' },
      votacion:     { level: foundNorm * 0.5, nextStep: 'Participa en la próxima votación de gobernanza' },
      propuestas:   { level: foundNorm * 0.4 + transNorm * 0.3, nextStep: 'Redacta tu primera propuesta' },
      sql:          { level: hasSkill(['sql', 'database']) ? 0.8 : foundNorm * 0.3, nextStep: 'Practica queries complejos' },
      git:          { level: hasSkill(['git', 'github']) ? 0.85 : execNorm * 0.4, nextStep: hasSkill(['git']) ? 'Aprende GitFlow y branching avanzado' : 'Aprende Git básico hoy' },
      docker:       { level: hasSkill(['docker', 'container']) ? 0.8 : execNorm * 0.25, nextStep: hasSkill(['docker']) ? 'Aprende Docker Compose y Kubernetes' : 'Dockeriza tu primera app' },
      kubernetes:   { level: hasSkill(['kubernetes', 'k8s']) ? 0.75 : execNorm * 0.15, nextStep: 'Despliega en un cluster Kubernetes' },
      aws:          { level: hasSkill(['aws', 'amazon']) ? 0.8 : execNorm * 0.2, nextStep: hasSkill(['aws']) ? 'Certifícate en AWS Solutions Architect' : 'Crea tu primera instancia EC2' },
      figma:        { level: hasSkill(['figma', 'design', 'ux']) ? 0.8 : qualNorm * 0.2, nextStep: hasSkill(['figma']) ? 'Crea un sistema de diseño completo' : 'Diseña tu primer wireframe' },
      threejs:      { level: hasSkill(['three', 'webgl', '3d']) ? 0.8 : execNorm * 0.15, nextStep: 'Crea una escena 3D interactiva' },
      rust:         { level: hasSkill(['rust']) ? 0.75 : foundNorm * 0.1, nextStep: 'Aprende ownership y borrowing en Rust' },
      go:           { level: hasSkill(['go', 'golang']) ? 0.75 : execNorm * 0.15, nextStep: 'Crea un microservicio en Go' },
      idiomas:      { level: hasSkill(['inglés', 'ingles', 'english', 'idioma']) ? 0.7 : transNorm * 0.3, nextStep: 'Practica con conversaciones técnicas' },
      ingles:       { level: hasSkill(['inglés', 'ingles', 'english', 'b2', 'c1']) ? 0.85 : transNorm * 0.25, nextStep: hasSkill(['inglés', 'english']) ? 'Obtén certificación IELTS o Cambridge' : 'Empieza con inglés técnico' },
      japones:      { level: hasSkill(['japonés', 'japones', 'japanese', 'jlpt']) ? 0.7 : 0.05, nextStep: 'El japonés abre puertas al mercado asiático' },
    };

    return dynamicOrbNodes.map(node => ({
      ...node,
      level: levelMap[node.id]?.level ?? node.level ?? 0,
      nextStep: levelMap[node.id]?.nextStep ?? node.nextStep ?? 'Explora esta competencia',
    }));
  }, [profile, sbProfile, gemeloDigital, dynamicOrbNodes]);

  // ── Handle text input — GAP 1 FIX: todos los intents del Oráculo ────
  const handleTextInput = useCallback(async (text: string) => {
    const intent = interpret(text);

    // Build coach context from real profile
    const coachCtx = {
      skills: sbProfile?.skills ?? [],
      cv_summary: sbProfile?.cv_summary ?? '',
      execution: sbProfile?.execution_score,
      quality: sbProfile?.quality_score,
      transcendence: sbProfile?.transcendence_score,
      foundation: sbProfile?.foundation_score,
      reputation: sbProfile?.reputation_score,
      pe: sbProfile?.pe_points,
    };

    const flash = (msg: string, ms = 6000) => {
      setResponseMsg(msg);
      if (responseTimer.current) clearTimeout(responseTimer.current);
      responseTimer.current = setTimeout(() => setResponseMsg(null), ms);
    };

    if (intent.kind === 'navigate') {
      const node = orbNodesWithLevels.find((n: OrbNode) => n.tab === intent.tab);
      if (node) {
        setSelectedNode(node);
        setState('preview');
        setActiveTab(node.tab);
        const msg = `Abriendo ${node.label}.`;
        flash(msg);
        speak(msg);
      }
      return;
    }

    if (intent.kind === 'coach') {
      flash('Consultando al Coach IA con tu Gemelo…', 20000);
      speak('Déjame analizar tu Gemelo Digital.');
      const r = await askCoach(coachCtx);
      const msg = r.advice || r.error || 'Sin respuesta del Coach.';
      flash(msg, 14000);
      speak(msg.length > 320 ? msg.slice(0, 320) : msg);
      return;
    }

    if (intent.kind === 'fact') {
      let msg = '';
      if (intent.topic === 'reputacion') msg = `Tu reputación es ${Math.round(sbProfile?.reputation_score ?? 0)} sobre 100.`;
      else if (intent.topic === 'tokens') msg = `Tienes ${(sbProfile?.token_balance ?? 0).toLocaleString()} tokens.`;
      else if (intent.topic === 'pe') msg = `Tienes ${(sbProfile?.pe_points ?? 0).toLocaleString()} puntos de experiencia.`;
      else msg = 'Podés decirme: "abre academia", "dame un consejo", "cuánta reputación tengo", o toca un nodo del orbe.';
      flash(msg);
      speak(msg);
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
      const msg = `Para convalidar ${names[intent.item]}, abrí tu perfil y usá el botón de convalidación.`;
      flash(msg);
      speak(msg);
      return;
    }

    // unknown — consultar al Tutor IA (igual que OmicronAssistant)
    flash('Consultando al Tutor IA…', 15000);
    try {
      const { askTutor } = await import('../../lib/oraculo');
      const t = await askTutor(text, coachCtx);
      const msg = t.answer || t.error || 'No pude responder. Probá de nuevo.';
      flash(msg, 12000);
      speak(msg.length > 320 ? msg.slice(0, 320) : msg);
    } catch {
      flash('Error al consultar la IA. Probá de nuevo.', 6000);
    }
  }, [setActiveTab, sbProfile, orbNodesWithLevels]);

  // ── Toggle listening (speech recognition) ──────────────────────────
  const toggleListening = useCallback(() => {
    if (isListening) {
      setIsListening(false);
      setVoiceLevel(0);
      window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: false } }));
      return;
    }
    setIsListening(true);
    setVoiceLevel(0.4);
    window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: true } }));

    // Use SpeechRecognition if available
    const SR = ((window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition);
    if (!SR) {
      setResponseMsg('Tu navegador no soporta reconocimiento de voz. Prueba en Chrome.');
      setIsListening(false);
      return;
    }
    const recog = new SR();
    recog.lang = 'es-ES';
    recog.interimResults = false;
    recog.continuous = false;
    recog.onresult = (e: any) => {
      const transcript = e.results[e.results.length - 1][0].transcript;
      setInputText(transcript);
      handleTextInput(transcript);
    };
    recog.onerror = () => {
      setIsListening(false);
      setVoiceLevel(0);
      window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: false } }));
    };
    recog.onend = () => {
      setIsListening(false);
      setVoiceLevel(0);
      window.dispatchEvent(new CustomEvent('oracle:listening', { detail: { listening: false } }));
    };
    recog.start();
  }, [isListening, handleTextInput]);

  // ── Handle node tap → go to preview ─────────────────────────────────
  // Todos los nodos usan el mismo flujo: tap → preview → fullscreen.
  // El nodo Mi ADN va a renderTab('perfil') que ahora muestra el ADN Digital.
  const handleNodeTap = useCallback((node: OrbNode) => {
    setSelectedNode(node);
    setState('preview');
    setActiveTab(node.tab);
  }, [setActiveTab]);

  // ── Handle preview click → fullscreen ───────────────────────────────
  const handlePreviewClick = useCallback(() => {
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
    window.addEventListener('oracle:listening', handleOracleListening);
    window.addEventListener('oracle:voice', handleOracleVoice);
    return () => {
      window.removeEventListener('oracle:listening', handleOracleListening);
      window.removeEventListener('oracle:voice', handleOracleVoice);
    };
  }, []);

  // ── GAP 3 FIX: Proactive Engine — Gemelo te empuja sin pedirlo ─────
  useEffect(() => {
    const timer = setTimeout(() => {
      const context = {
        currentHour: new Date().getHours(),
        dayOfWeek: new Date().getDay(),
        reputation: sbProfile?.reputation_score ?? 0,
        pe: sbProfile?.pe_points ?? 0,
        onlineCount: 0,
        lastOnlineCount: 0,
        daysSinceLastLogin: 0,
        currentTab: 'perfil',
        userName: sbProfile?.display_name || sbProfile?.username || 'operador',
      };

      const event = evaluateProactiveEvents(context);
      if (event) {
        setResponseMsg(event.message);
        speak(event.message.length > 200 ? event.message.slice(0, 200) : event.message);
        if (responseTimer.current) clearTimeout(responseTimer.current);
        responseTimer.current = setTimeout(() => setResponseMsg(null), 10000);
      }
    }, 2000); // 2s delay to let orbe appear first

    return () => clearTimeout(timer);
  }, [sbProfile]);

  // Fix 2: rAF instead of setInterval — no unnecessary re-renders on idle
  useEffect(() => {
    if (state !== 'orb' || isListening) return;
    let running = true;
    const loop = () => {
      if (!running) return;
      setVoiceLevel(Math.sin(Date.now() * 0.002) * 0.05 + 0.05);
      rafRef.current = requestAnimationFrame(loop);
    };
    // Throttle: only update voiceLevel every ~100ms (not every rAF frame)
    let last = 0;
    const throttled = (ts: number) => {
      if (!running) return;
      if (ts - last > 100) { last = ts; setVoiceLevel(Math.sin(ts * 0.002) * 0.05 + 0.05); }
      rafRef.current = requestAnimationFrame(throttled);
    };
    rafRef.current = requestAnimationFrame(throttled);
    return () => {
      running = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [state, isListening]);

  // ── Onboarding handler ───────────────────────────────────────────────
  const handleOnboardingComplete = useCallback((choice: 'examen' | 'cv' | 'ambos') => {
    if (choice === 'cv' || choice === 'ambos') {
      setActiveTab('perfil');
      const node = dynamicOrbNodes[0]; // Inicio hub
      setSelectedNode(node);
      setState('fullscreen');
    } else {
      setActiveTab('maxskill');
      const node = dynamicOrbNodes.find((n: OrbNode) => n.id === 'habilidades');
      if (node) { setSelectedNode(node); setState('fullscreen'); }
    }
  }, [setActiveTab, dynamicOrbNodes]);

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
      <OrbOnboarding onComplete={handleOnboardingComplete} />

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
        <div style={{ width: '85vmin', height: '85vmin', maxWidth: 420, maxHeight: 420 }}>
          <OrbNeuronal
            nodes={orbNodesWithLevels}
            activeNodeId={selectedNode?.id ?? null}
            onNodeTap={handleNodeTap}
            voiceLevel={voiceLevel}
            isListening={isListening}
            onProjectedPositions={handleProjected}
            notifications={unreadCount > 0 ? { mensajes: unreadCount } : undefined}
          />
        </div>
      </div>


      {/* ── PREVIEW PANEL (floating card when node selected) ─────────── */}
      {state === 'preview' && selectedNode && (
        <div
          onClick={handlePreviewClick}
          role="dialog"
          aria-label={`Vista previa: ${selectedNode.label}. ${selectedNode.nextStep || 'Toca para abrir'}`}
          aria-modal="false"
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: '85%',
            maxWidth: 360,
            background: C.surface,
            border: `1px solid ${C.line}`,
            borderRadius: 20,
            padding: '20px 24px',
            cursor: 'pointer',
            zIndex: 10,
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${C.cyanFaint}`,
            animation: 'orbPreviewEnter 0.25s cubic-bezier(0.23,1,0.32,1) both',
          }}
        >
          {/* Node label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <span style={{ fontSize: 24 }}>{selectedNode.icon}</span>
            <div>
              <h3 style={{
                margin: 0,
                fontFamily: FONT.display,
                fontSize: 18,
                fontWeight: 700,
                color: C.ink,
                letterSpacing: -0.3,
              }}>
                {selectedNode.label}
              </h3>
              <p style={{
                margin: '2px 0 0',
                fontFamily: FONT.mono,
                fontSize: 10,
                color: C.cyan,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}>
                {selectedNode.nextStep || 'Toca para abrir'}
              </p>
            </div>
          </div>

          {/* Fix 1: Static preview placeholder — no tab render, no queries */}
          <div
            role="img"
            aria-label={`Vista previa de ${selectedNode.label}`}
            style={{
              height: 120,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${C.bg} 0%, rgba(92,200,255,0.06) 100%)`,
              border: `1px solid ${C.line}`,
              overflow: 'hidden',
              position: 'relative',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <span style={{ fontSize: 32, opacity: 0.7 }}>{selectedNode.icon}</span>
            <span style={{
              fontFamily: FONT.mono,
              fontSize: 9,
              letterSpacing: 1.5,
              color: C.cyanDim,
              textTransform: 'uppercase',
            }}>
              Toca para abrir →
            </span>
            {selectedNode.level !== undefined && selectedNode.level > 0 && (
              <div style={{
                position: 'absolute',
                bottom: 8,
                right: 10,
                fontFamily: FONT.mono,
                fontSize: 10,
                color: C.cyan,
                fontWeight: 700,
              }}>
                {Math.round(selectedNode.level * 100)}%
              </div>
            )}
          </div>

        </div>
      )}


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
              width: 36,
              height: 36,
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

        {/* Tab content */}
        <div style={{ flex: 1, overflow: 'auto' }}>
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

      {/* ── ORÁCULO INPUT BAR (always visible at bottom) ────────────── */}
      {state !== 'fullscreen' && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 15,
          padding: '12px 16px',
          paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)',
          background: 'linear-gradient(0deg, rgba(0,2,6,0.95) 60%, transparent 100%)',
        }}>
          {/* Input bar (Hablá o escribí a Ómicron) */}
          <form
            onSubmit={(e: { preventDefault: () => void }) => {
              e.preventDefault();
              if (!inputText.trim()) return;
              handleTextInput(inputText.trim());
              setInputText('');
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: 28,
              padding: '8px 12px',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
            }}
          >
            {/* Mic button */}
            <button
              type="button"
              onClick={toggleListening}
              aria-label={isListening ? 'Dejar de escuchar' : 'Hablar al Oráculo'}
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: `1px solid ${isListening ? '#ff5c7a' : C.line}`,
                background: isListening ? 'rgba(255,92,122,0.15)' : C.glass2,
                color: isListening ? '#ff5c7a' : C.cyan,
                cursor: 'pointer',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
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
              placeholder="Hablá o escribí a Ómicron…"
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
                width: 36,
                height: 36,
                borderRadius: '50%',
                border: 'none',
                background: inputText.trim() ? C.cyan : C.glass2,
                color: inputText.trim() ? '#000' : C.mut,
                cursor: inputText.trim() ? 'pointer' : 'default',
                display: 'grid',
                placeItems: 'center',
                fontSize: 14,
                flexShrink: 0,
                transition: 'background 0.15s ease, color 0.15s ease',
              }}
            >
              ➤
            </button>
          </form>

          {/* Response bubble */}
          {responseMsg && (
            <div style={{
              marginTop: 8,
              padding: '8px 12px',
              background: C.surface,
              border: `1px solid ${C.line}`,
              borderRadius: 12,
              fontFamily: FONT.body,
              fontSize: 13,
              color: C.ink,
              lineHeight: 1.5,
              backdropFilter: 'blur(10px)',
            }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan }}>
                ÓMICRON ▸{' '}
              </span>
              {responseMsg}
            </div>
          )}
        </div>
      )}

      {/* ── CSS Animations ──────────────────────────────────────────── */}
      <style>{`
        @keyframes orbPreviewEnter {
          from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
