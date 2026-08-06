import { useState, lazy, Suspense, useCallback, useRef, useEffect, useMemo } from 'react';
import OrbNeuronal, { type OrbNode } from './OrbNeuronal';
import { OraculoBar } from '../OraculoBar';
import { useApp } from '../../store/AppContext';
import { useRealtime } from '../../store/RealtimeContext';
import { interpret } from '../../lib/oraculo';
import { speak } from '../../lib/voiceEngine';
import { useGemeloProfile } from '../../hooks/useGemeloProfile';
import { C, FONT } from '../../theme';
import type { TabId } from '../../types';

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
const ORB_NODES: OrbNode[] = [
  // ── Hubs principales (navegables) ─────────────────────────────────
  { id: 'inicio',      label: 'Inicio',       tab: 'perfil',     icon: '⬡' },
  { id: 'academia',    label: 'Academia',     tab: 'academia',   icon: '◈' },
  { id: 'empleos',     label: 'Empleos',      tab: 'empleos',    icon: '◇' },
  { id: 'mercado',     label: 'Mercado',      tab: 'market',     icon: '⬢' },
  { id: 'mensajes',    label: 'Mensajes',     tab: 'chat',       icon: '○' },
  { id: 'gobernanza',  label: 'Gobernanza',   tab: 'gobernanza', icon: '△' },
  { id: 'habilidades', label: 'Habilidades',  tab: 'maxskill',   icon: '◎' },
  { id: 'billetera',   label: 'Billetera',    tab: 'wallet',     icon: '▽' },
  { id: 'boveda',      label: 'Bóveda',       tab: 'vault',      icon: '⊡' },
  // ── Nodos de conocimiento (posibilidades) ─────────────────────────
  { id: 'react',        label: 'React',           tab: 'maxskill', icon: '⚛' },
  { id: 'python',       label: 'Python',          tab: 'maxskill', icon: '🐍' },
  { id: 'typescript',   label: 'TypeScript',      tab: 'maxskill', icon: 'TS' },
  { id: 'nodejs',       label: 'Node.js',         tab: 'maxskill', icon: '⬢' },
  { id: 'ia',           label: 'Inteligencia Artificial', tab: 'academia', icon: '🧠' },
  { id: 'ml',           label: 'Machine Learning', tab: 'academia', icon: '📊' },
  { id: 'data',         label: 'Data Science',    tab: 'academia', icon: '📈' },
  { id: 'cloud',        label: 'Cloud',           tab: 'academia', icon: '☁' },
  { id: 'devops',       label: 'DevOps',          tab: 'maxskill', icon: '⚙' },
  { id: 'design',       label: 'Diseño UX',      tab: 'maxskill', icon: '✦' },
  { id: 'liderazgo',    label: 'Liderazgo',      tab: 'maxskill', icon: '★' },
  { id: 'comunicacion', label: 'Comunicación',   tab: 'maxskill', icon: '◆' },
  { id: 'gestion',      label: 'Gestión',        tab: 'maxskill', icon: '▣' },
  { id: 'agile',        label: 'Agile',          tab: 'maxskill', icon: '↻' },
  { id: 'seguridad',    label: 'Ciberseguridad', tab: 'maxskill', icon: '🛡' },
  { id: 'blockchain',   label: 'Blockchain',     tab: 'academia', icon: '⛓' },
  { id: 'web3',         label: 'Web3',           tab: 'academia', icon: '◉' },
  { id: 'mobile',       label: 'Mobile Dev',     tab: 'maxskill', icon: '📱' },
  { id: 'databases',    label: 'Databases',      tab: 'maxskill', icon: '⊞' },
  { id: 'api',          label: 'APIs',           tab: 'maxskill', icon: '⇌' },
  { id: 'testing',      label: 'Testing',        tab: 'maxskill', icon: '✓' },
  { id: 'arquitectura', label: 'Arquitectura',   tab: 'maxskill', icon: '⊿' },
  { id: 'analytics',    label: 'Analytics',      tab: 'academia', icon: '◧' },
  { id: 'marketing',    label: 'Marketing Digital', tab: 'academia', icon: '◩' },
  { id: 'finanzas',     label: 'Finanzas',       tab: 'academia', icon: '◫' },
  { id: 'negocios',     label: 'Negocios',       tab: 'academia', icon: '◪' },
  { id: 'innovacion',   label: 'Innovación',     tab: 'academia', icon: '✧' },
  { id: 'robotica',     label: 'Robótica',       tab: 'academia', icon: '⚡' },
  { id: 'iot',          label: 'IoT',            tab: 'academia', icon: '◌' },
  { id: 'networking',   label: 'Networking',     tab: 'empleos',  icon: '⊛' },
  { id: 'freelance',    label: 'Freelance',      tab: 'empleos',  icon: '◑' },
  { id: 'startup',      label: 'Startups',       tab: 'empleos',  icon: '◐' },
  { id: 'cv',           label: 'CV Digital',     tab: 'perfil',   icon: '◫' },
  { id: 'reputacion',   label: 'Reputación',     tab: 'perfil',   icon: '◉' },
  { id: 'certificados', label: 'Certificados',   tab: 'vault',    icon: '◈' },
  { id: 'mentoria',     label: 'Mentoría',       tab: 'market',   icon: '◇' },
  { id: 'coaching',     label: 'Coaching',       tab: 'market',   icon: '◆' },
  { id: 'cursos',       label: 'Cursos Online',  tab: 'academia', icon: '▢' },
  { id: 'talleres',     label: 'Talleres',       tab: 'academia', icon: '▣' },
  { id: 'proyectos',    label: 'Proyectos',      tab: 'empleos',  icon: '▤' },
  { id: 'colaboracion', label: 'Colaboración',   tab: 'chat',     icon: '▥' },
  { id: 'tokens',       label: 'Tokens',         tab: 'wallet',   icon: '◎' },
  { id: 'stake',        label: 'Staking',        tab: 'wallet',   icon: '◉' },
  { id: 'votacion',     label: 'Votación',       tab: 'gobernanza', icon: '◧' },
  { id: 'propuestas',   label: 'Propuestas',     tab: 'gobernanza', icon: '◨' },
  { id: 'sql',          label: 'SQL',            tab: 'maxskill', icon: '⊞' },
  { id: 'git',          label: 'Git',            tab: 'maxskill', icon: '⑂' },
  { id: 'docker',       label: 'Docker',         tab: 'maxskill', icon: '▦' },
  { id: 'kubernetes',   label: 'Kubernetes',     tab: 'maxskill', icon: '⎈' },
  { id: 'aws',          label: 'AWS',            tab: 'maxskill', icon: '△' },
  { id: 'figma',        label: 'Figma',          tab: 'maxskill', icon: '◈' },
  { id: 'threejs',      label: 'Three.js',       tab: 'maxskill', icon: '▲' },
  { id: 'rust',         label: 'Rust',           tab: 'maxskill', icon: '⚙' },
  { id: 'go',           label: 'Go',             tab: 'maxskill', icon: '⬡' },
  { id: 'idiomas',      label: 'Idiomas',        tab: 'academia', icon: '🌐' },
  { id: 'ingles',       label: 'Inglés',         tab: 'academia', icon: '🇬🇧' },
  { id: 'japones',      label: 'Japonés',        tab: 'academia', icon: '🇯🇵' },
];

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
  const { setActiveTab } = useApp();
  const { profile, next: nextBestStep } = useGemeloProfile();
  const [state, setState] = useState<ShellState>('orb');
  const [selectedNode, setSelectedNode] = useState<OrbNode | null>(null);
  const [voiceLevel, setVoiceLevel] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [nodePositions, setNodePositions] = useState<{ id: string; x: number; y: number; depth: number }[]>([]);
  const [inputText, setInputText] = useState('');
  const [responseMsg, setResponseMsg] = useState<string | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const responseTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    const levelMap: Record<string, { level: number; nextStep: string }> = {
      // Hubs → driven by axes
      inicio:      { level: Math.min(1, rep / 100), nextStep: rep < 50 ? 'Completa tu perfil para subir reputación' : rep < 80 ? 'Sube más convalidaciones' : '¡Perfil sólido! Expándete' },
      academia:    { level: execNorm * 0.5 + foundNorm * 0.5, nextStep: foundNorm < 0.5 ? 'Empieza un curso para subir fundamentos' : 'Toma el siguiente nivel de certificación' },
      empleos:     { level: execNorm, nextStep: execNorm < 0.4 ? 'Agrega proyectos reales a tu CV' : execNorm < 0.7 ? 'Postula a oportunidades' : 'Negocia tu próximo contrato' },
      mercado:     { level: transNorm, nextStep: transNorm < 0.4 ? 'Publica tu primer servicio' : 'Agrega más servicios y sube precios' },
      mensajes:    { level: transNorm * 0.5 + execNorm * 0.5, nextStep: 'Conecta con otros nodos de la red' },
      gobernanza:  { level: foundNorm, nextStep: foundNorm < 0.5 ? 'Participa en tu primera propuesta' : 'Lidera una propuesta' },
      habilidades: { level: qualNorm, nextStep: qualNorm < 0.4 ? 'Valida tus primeras habilidades' : qualNorm < 0.7 ? 'Toma el simulador de nivel' : 'Busca certificación internacional' },
      billetera:   { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: profile.vault === 0 ? 'Haz tu primera recarga de tokens' : 'Expande tus activos' },
      boveda:      { level: Math.min(1, (profile.vault ?? 0) / 5), nextStep: (profile.vault ?? 0) === 0 ? 'Sube tu primer activo a la Bóveda' : 'Diversifica tus activos' },

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

    return ORB_NODES.map(node => ({
      ...node,
      level: levelMap[node.id]?.level ?? 0,
      nextStep: levelMap[node.id]?.nextStep ?? 'Explora esta competencia',
    }));
  }, [profile]);

  // ── Handle text input (interpret intent → navigate or respond) ──────
  const handleTextInput = useCallback((text: string) => {
    const intent = interpret(text);
    if (intent.kind === 'navigate') {
      // Find matching node and tap it
      const node = orbNodesWithLevels.find((n: OrbNode) => n.tab === intent.tab);
      if (node) {
        setSelectedNode(node);
        setState('preview');
        setActiveTab(node.tab);
        const msg = `Abriendo ${node.label}.`;
        setResponseMsg(msg);
        speak(msg);
      }
    } else {
      const msg = 'Toca un nodo del orbe para navegar, o dime: "abre academia", "ve a empleos", etc.';
      setResponseMsg(msg);
      speak(msg);
    }
    // Auto-hide response after 6s
    if (responseTimer.current) clearTimeout(responseTimer.current);
    responseTimer.current = setTimeout(() => setResponseMsg(null), 6000);
  }, [setActiveTab]);

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

  // ── Simulated Jarvis breath when idle ──────────────────────────────
  useEffect(() => {
    if (state === 'orb' && !isListening) {
      const iv = setInterval(() => {
        setVoiceLevel(Math.sin(Date.now() * 0.002) * 0.05 + 0.05);
      }, 50);
      return () => clearInterval(iv);
    }
  }, [state, isListening]);

  // ── Expose voice control for OraculoBar ────────────────────────────
  // OraculoBar can call these to pulse the orb when speaking
  (OrbShell as any).__setVoiceLevel = setVoiceLevel;
  (OrbShell as any).__setIsListening = setIsListening;

  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: '100%',
      background: C.bg,
      overflow: 'hidden',
    }}>
      {/* ── ORB VIEW (always visible, fades when fullscreen) ─────────── */}
      <div style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: state === 'fullscreen' ? 0 : 1,
        transform: state === 'fullscreen' ? 'scale(0.8)' : 'scale(1)',
        transition: 'opacity 0.5s cubic-bezier(0.34,1.56,0.64,1), transform 0.5s cubic-bezier(0.34,1.56,0.64,1)',
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
          />
        </div>
      </div>


      {/* ── PREVIEW PANEL (floating card when node selected) ─────────── */}
      {state === 'preview' && selectedNode && (
        <div
          ref={previewRef}
          onClick={handlePreviewClick}
          style={{
            position: 'absolute',
            bottom: '12%',
            left: '50%',
            transform: 'translateX(-50%)',
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
            animation: 'orbPreviewEnter 0.4s cubic-bezier(0.23,1,0.32,1) both',
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

          {/* Mini preview of the tab content (just a teaser) */}
          <div style={{
            height: 120,
            borderRadius: 12,
            background: C.bg,
            border: `1px solid ${C.line}`,
            overflow: 'hidden',
            position: 'relative',
          }}>
            <div style={{
              transform: 'scale(0.4)',
              transformOrigin: 'top left',
              width: '250%',
              height: '250%',
              pointerEvents: 'none',
              opacity: 0.7,
            }}>
              <Suspense fallback={<TabLoader />}>
                {renderTab(selectedNode.tab)}
              </Suspense>
            </div>
            {/* Gradient overlay for fade effect */}
            <div style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, transparent 40%, ${C.bg} 100%)`,
              pointerEvents: 'none',
            }} />
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
        transition: 'opacity 0.45s cubic-bezier(0.34,1.56,0.64,1), transform 0.45s cubic-bezier(0.34,1.56,0.64,1)',
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
          {nodePositions.map((pos: { id: string; x: number; y: number; depth: number }) => {
            const node = orbNodesWithLevels.find((n: OrbNode) => n.id === pos.id);
            if (!node) return null;
            const isFront = pos.depth < 0.5; // only show labels for front-facing nodes
            const isActive = node.id === selectedNode?.id;
            return (
              <div
                key={node.id}
                style={{
                  position: 'absolute',
                  left: pos.x,
                  top: pos.y,
                  transform: 'translate(-50%, -140%)',
                  opacity: isFront ? (isActive ? 1 : 0.7) : 0,
                  transition: 'opacity 0.3s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 2,
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
                  transition: 'all 0.3s ease',
                }}>
                  {node.label}{node.level !== undefined && node.level > 0 ? ` ${Math.round(node.level * 100)}%` : ''}
                </span>
              </div>
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
          from { opacity: 0; transform: translateX(-50%) translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
