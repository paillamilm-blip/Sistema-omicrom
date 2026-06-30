// components/tabs/MaxSkillTab.tsx
// Aprender — mapa robotico tipo placa de circuito (PCB) con chip-nucleo central,
// trazas con energia fluyendo y nodos-chip que se ramifican.

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Play, Trophy, BookOpen, ArrowRight } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../lib/supabase';
import { useToast } from '../shared/Toast';
import { SimulatorChallenge } from '../shared/SimulatorChallenge';
import { CourseFlowModal } from '../shared/CourseFlow';
import type { SkillTreeNode, UserSkillProgress, SkillTest } from '../../types';

const NODE_W = 136;
const NODE_H = 58;
const TIER_GAP_Y = 124;
const PEER_GAP_X = 22;
const TOP = 116;
const CORE_W = 92;
const CORE_H = 68;
const CORE_CY = 50;

const COLORS = {
  cyan:       '#00F0FF',
  cyanDim:    'rgba(0,240,255,0.40)',
  cyanFaint:  'rgba(0,240,255,0.12)',
  gold:       '#F59E0B',
  goldDim:    'rgba(245,158,11,0.45)',
  purple:     '#0a8ba3',
  green:      '#39FF14',
  greenDim:   'rgba(57,255,20,0.40)',
  locked:     'rgba(255,255,255,0.04)',
  lockedBorder: 'rgba(255,255,255,0.10)',
  copper:     'rgba(0,240,255,0.13)',
  copperLock: 'rgba(255,255,255,0.06)',
  bg:         '#020613',
  panel:      'rgba(8,16,38,0.65)',
  grid:       'rgba(0,240,255,0.05)',
} as const;

function nodeColor(status: string, depth: number) {
  if (status === 'VALIDATED' || status === 'MASTERED') return COLORS.green;
  if (status === 'IN_PROGRESS' || status === 'AVAILABLE') return COLORS.cyan;
  if (depth === 0) return COLORS.cyan;
  if (depth === 1) return COLORS.cyanDim;
  if (depth === 2) return COLORS.gold;
  return COLORS.purple;
}

function hexVerts(cx: number, cy: number, w: number, h: number) {
  return [
    { x: cx - 0.25 * w, y: cy - h / 2 },
    { x: cx + 0.25 * w, y: cy - h / 2 },
    { x: cx + w / 2,    y: cy },
    { x: cx + 0.25 * w, y: cy + h / 2 },
    { x: cx - 0.25 * w, y: cy + h / 2 },
    { x: cx - w / 2,    y: cy },
  ];
}
function hexPoints(cx: number, cy: number, w: number, h: number) {
  return hexVerts(cx, cy, w, h).map(p => `${p.x},${p.y}`).join(' ');
}
function tracePath(px: number, py: number, cx: number, cy: number) {
  const midY = (py + cy) / 2;
  return `M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`;
}

interface LayoutNode {
  node: SkillTreeNode;
  x: number;
  y: number;
  depth: number;
  children: LayoutNode[];
}

function buildLayout(
  roots: SkillTreeNode[],
  allNodes: SkillTreeNode[],
  depth = 0,
  startX = 0
): { nodes: LayoutNode[]; totalWidth: number } {
  const result: LayoutNode[] = [];
  let curX = startX;

  for (const root of roots) {
    const children = allNodes.filter(n => n.parent_node_id === root.id);
    const y = depth * TIER_GAP_Y;

    if (children.length === 0) {
      result.push({ node: root, x: curX + NODE_W / 2, y, depth, children: [] });
      curX += NODE_W + PEER_GAP_X;
    } else {
      const sub = buildLayout(children, allNodes, depth + 1, curX);
      const leftmost = sub.nodes[0].x;
      const rightmost = sub.nodes[sub.nodes.length - 1].x;
      const centerX = (leftmost + rightmost) / 2;
      result.push({ node: root, x: centerX, y, depth, children: sub.nodes });
      curX += sub.totalWidth;
    }
  }
  return { nodes: result, totalWidth: curX - startX };
}

function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const n of nodes) {
    out.push(n);
    out.push(...flattenLayout(n.children));
  }
  return out;
}

function svgDimensions(flat: LayoutNode[]) {
  const maxX = Math.max(...flat.map(n => n.x + NODE_W / 2));
  const maxY = Math.max(...flat.map(n => n.y + NODE_H));
  return { width: maxX + 24, height: maxY + 40 };
}

export function MaxSkillTab() {
  const { profile } = useApp();
  const { toast } = useToast();
  const [nodes, setNodes]             = useState<SkillTreeNode[]>([]);
  const [progress, setProgress]       = useState<Map<string, UserSkillProgress>>(new Map());
  const [isLoading, setIsLoading]     = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillTreeNode | null>(null);
  const [simulatorTest, setSimulatorTest] = useState<SkillTest | null>(null);
  const [simulatorNode, setSimulatorNode] = useState<string>('');
  const [lastPeEarned, setLastPeEarned]   = useState<number | null>(null);
  const [courseByNode, setCourseByNode]   = useState<Map<string, string>>(new Map());
  const [courseNode, setCourseNode]       = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('skill_tree_nodes')
          .select('*')
          .order('order_index', { ascending: true });
        if (!error) setNodes(data || []);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    supabase.from('academy_courses').select('title,node_id').eq('is_published', true)
      .then(({ data }) => {
        const m = new Map<string, string>();
        ((data as { title: string; node_id: string | null }[]) ?? []).forEach(c => {
          if (c.node_id) m.set(c.node_id, c.title);
        });
        setCourseByNode(m);
      });
  }, []);

  useEffect(() => {
    if (!profile?.id) return;
    const load = async () => {
      const { data, error } = await supabase
        .from('user_skill_progress')
        .select('*')
        .eq('user_id', profile.id);
      if (!error && data)
        setProgress(new Map(data.map(p => [p.node_id, p])));
    };
    load();

    const channel = supabase
      .channel(`skill-progress-${profile.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public',
        table: 'user_skill_progress',
        filter: `user_id=eq.${profile.id}`,
      }, (payload) => {
        const updated = payload.new as UserSkillProgress;
        setProgress(prev => new Map(prev).set(updated.node_id, updated));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [profile?.id]);

  const getStatus = useCallback((id: string): string => {
    const p = progress.get(id);
    if (p) return p.status;
    const node = nodes.find(n => n.id === id);
    if (!node) return 'LOCKED';
    if (!node.parent_node_id) return 'AVAILABLE';
    const parentNode = nodes.find(n => n.id === node.parent_node_id);
    const parentStatus = progress.get(node.parent_node_id)?.status
      ?? (parentNode && !parentNode.parent_node_id ? 'AVAILABLE' : 'LOCKED');
    return (parentStatus === 'VALIDATED' || parentStatus === 'MASTERED') ? 'AVAILABLE' : 'LOCKED';
  }, [progress, nodes]);
  const getPercentage = (id: string) => progress.get(id)?.progress_percentage || 0;

  const handleStartChallenge = useCallback(async (node: SkillTreeNode) => {
    const { data, error } = await supabase
      .from('skill_tests')
      .select('*')
      .eq('node_id', node.id)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast('No se pudo cargar el reto. Intenta de nuevo.', 'error');
      return;
    }
    if (!data) {
      toast('Este nodo todavía no tiene un reto disponible. 🛠️', 'info');
      return;
    }
    setSimulatorTest(data as SkillTest);
    setSimulatorNode(node.id);
  }, [toast]);

  const handleRangeChallenge = useCallback(async () => {
    const { data, error } = await supabase
      .from('skill_tests')
      .select('*')
      .order('difficulty_multiplier', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      toast('No se pudo cargar el reto. Intenta de nuevo.', 'error');
      return;
    }
    if (!data) {
      toast('Aún no hay retos disponibles. 🛠️', 'info');
      return;
    }
    const test = data as SkillTest;
    setSimulatorTest(test);
    setSimulatorNode(test.node_id);
  }, [toast]);

  const roots = useMemo(() => nodes.filter(n => !n.parent_node_id), [nodes]);
  const { nodes: layoutRoots } = useMemo(
    () => buildLayout(roots, nodes, 0, 24),
    [roots, nodes]
  );
  const flat    = useMemo(() => flattenLayout(layoutRoots), [layoutRoots]);
  const { width: svgW, height: svgH } = useMemo(() => svgDimensions(flat), [flat]);

  const totalPe = useMemo(() =>
    [...progress.values()]
      .filter(p => p.status === 'VALIDATED' || p.status === 'MASTERED')
      .reduce((sum, p) => sum + (nodes.find(n => n.id === p.node_id)?.pe_reward || 0), 0),
    [progress, nodes]
  );
  const maxPe = useMemo(() => nodes.reduce((s, n) => s + n.pe_reward, 0), [nodes]);

  if (isLoading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinnerBox}><div style={styles.spinner} /></div>
        <p style={styles.loadingText}>Inicializando protocolo...</p>
      </div>
    );
  }

  const W = Math.max(svgW, 320);
  const corePct = maxPe > 0 ? Math.round((totalPe / maxPe) * 100) : 0;
  const rootXs = layoutRoots.map(r => r.x);
  const coreX = rootXs.length ? (Math.min(...rootXs) + Math.max(...rootXs)) / 2 : W / 2;
  const coreBottomY = CORE_CY + CORE_H / 2;

  return (
    <div style={styles.root}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px', borderBottom: `1px solid ${COLORS.cyanFaint}` }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Rajdhani', sans-serif", fontWeight: 700, fontSize: 15, color: '#eaf4ff', letterSpacing: 0.5 }}>SISTEMA DE APRENDIZAJE</div>
          <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, color: COLORS.cyanDim, marginTop: 1 }}>Circuito unificado · {totalPe}/{maxPe} PE</div>
          <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginTop: 7 }}>
            <div style={{ height: '100%', width: `${corePct}%`, background: `linear-gradient(90deg, ${COLORS.gold}, ${COLORS.cyan})`, borderRadius: 4, transition: 'width 0.5s ease' }} />
          </div>
        </div>
      </div>

      <div style={styles.rangeCard}>
        <div style={styles.rangeCardInner}>
          <div style={styles.rangeIcon}>⚡</div>
          <div>
            <div style={styles.rangeTitle}>Simulador de Rango (Contrarreloj)</div>
            <div style={styles.rangeSub}>Reto de alta dificultad para defender tu estatus.</div>
          </div>
        </div>
        <button style={styles.rangeBtn} onClick={handleRangeChallenge}>
          <Play size={14} fill="currentColor" />
          Iniciar Reto de Alta Frecuencia
        </button>
      </div>

      <div style={styles.treeLabel}>PLACA DE COMPETENCIAS · NÚCLEO ACTIVO</div>
      <div style={styles.treeScroll} ref={scrollRef}>
        {flat.length === 0 ? (
          <p style={{ color: COLORS.cyanDim, fontFamily: 'monospace', fontSize: 12, padding: 20 }}>No hay nodos cargados.</p>
        ) : (
          <svg width={W} height={svgH + TOP} style={{ display: 'block', overflow: 'visible' }}>
            <defs>
              <pattern id="cp-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                <path d="M 22 0 L 0 0 0 22" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
              </pattern>
              <linearGradient id="core-grad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={COLORS.cyan} />
                <stop offset="100%" stopColor={COLORS.gold} />
              </linearGradient>
              <radialGradient id="core-inner" cx="50%" cy="40%" r="70%">
                <stop offset="0%" stopColor="rgba(0,240,255,0.18)" />
                <stop offset="100%" stopColor={COLORS.bg} />
              </radialGradient>
              <filter id="cp-glow-cyan" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.6" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="cp-glow-gold" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="cp-glow-green" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <pattern id="cp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,240,255,0.06)" strokeWidth="1.5" />
              </pattern>
            </defs>

            <rect width={W} height={svgH + TOP} fill={COLORS.bg} rx="12" />
            <rect width={W} height={svgH + TOP} fill="url(#cp-grid)" rx="12" />

            {layoutRoots.map(r => {
              const rootTop = r.y + TOP;
              const d = tracePath(coreX, coreBottomY, r.x, rootTop);
              return (
                <g key={`coretrace-${r.node.id}`}>
                  <path d={d} fill="none" stroke={COLORS.copper} strokeWidth={3.2} strokeLinecap="round" />
                  <path d={d} fill="none" stroke={COLORS.cyan} strokeWidth={1.6} strokeLinecap="round" strokeDasharray="5 11" filter="url(#cp-glow-cyan)" style={{ animation: 'dash 1.1s linear infinite' }} />
                  <circle r={2.8} fill={COLORS.cyan} filter="url(#cp-glow-cyan)">
                    <animateMotion dur="2.1s" repeatCount="indefinite" path={d} />
                  </circle>
                </g>
              );
            })}

            <g>
              <circle cx={coreX} cy={CORE_CY} r={46} fill="none" stroke={COLORS.cyanFaint} strokeWidth={1} />
              <g>
                <circle cx={coreX} cy={CORE_CY} r={43} fill="none" stroke={COLORS.cyanDim} strokeWidth={1.1} strokeDasharray="3 9" />
                <animateTransform attributeName="transform" type="rotate" from={`0 ${coreX} ${CORE_CY}`} to={`360 ${coreX} ${CORE_CY}`} dur="16s" repeatCount="indefinite" />
              </g>
              <polygon points={hexPoints(coreX, CORE_CY, CORE_W, CORE_H)} fill="url(#core-grad)" filter="url(#cp-glow-cyan)" />
              <polygon points={hexPoints(coreX, CORE_CY, CORE_W - 9, CORE_H - 9)} fill="url(#core-inner)" stroke={COLORS.cyanFaint} strokeWidth={0.5} />
              {hexVerts(coreX, CORE_CY, CORE_W, CORE_H).map((p, i) => (
                <circle key={`pad-${i}`} cx={p.x} cy={p.y} r={3.2} fill={COLORS.cyan} filter="url(#cp-glow-cyan)" style={{ animation: `cp-breathe ${1.6 + (i % 3) * 0.3}s ease-in-out infinite` }} />
              ))}
              <text x={coreX} y={CORE_CY - 1} textAnchor="middle" dominantBaseline="central" fontFamily="'Rajdhani', sans-serif" fontWeight="700" fontSize="21" fill="#eaf4ff">{corePct}%</text>
              <text x={coreX} y={CORE_CY + 16} textAnchor="middle" fontFamily="'Share Tech Mono', monospace" fontSize="7" letterSpacing="1.5" fill={COLORS.cyanDim}>NÚCLEO</text>
            </g>

            <g transform={`translate(0 ${TOP})`}>
            {flat.map(layoutNode =>
              layoutNode.children.map(child => {
                const d = tracePath(layoutNode.x, layoutNode.y + NODE_H, child.x, child.y);
                const status = getStatus(child.node.id);
                const color = nodeColor(status, child.depth);
                const isActive = status !== 'LOCKED';
                return (
                  <g key={`branch-${layoutNode.node.id}-${child.node.id}`}>
                    <path d={d} fill="none" stroke={isActive ? COLORS.copper : COLORS.copperLock} strokeWidth={isActive ? 3 : 1.4} strokeLinecap="round" />
                    {isActive && (
                      <path d={d} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeDasharray="5 11" filter="url(#cp-glow-cyan)" style={{ animation: 'dash 1.2s linear infinite' }} />
                    )}
                    {isActive && (
                      <circle r={2.6} fill={color} filter="url(#cp-glow-cyan)">
                        <animateMotion dur="2.4s" repeatCount="indefinite" path={d} />
                      </circle>
                    )}
                  </g>
                );
              })
            )}

            {flat.map(layoutNode =>
              layoutNode.children.length > 1 ? (
                <circle
                  key={`junction-${layoutNode.node.id}`}
                  cx={layoutNode.x}
                  cy={layoutNode.y + NODE_H + (TIER_GAP_Y - NODE_H) / 2}
                  r={3.2}
                  fill={nodeColor(getStatus(layoutNode.node.id), layoutNode.depth)}
                  filter="url(#cp-glow-cyan)"
                  opacity={0.8}
                />
              ) : null
            )}

            {flat.map(({ node, x, y, depth }) => {
              const status  = getStatus(node.id);
              const pct     = getPercentage(node.id);
              const color   = nodeColor(status, depth);
              const locked  = status === 'LOCKED';
              const isSelected = selectedNode?.id === node.id;
              const validated = status === 'VALIDATED' || status === 'MASTERED';
              const glowFilter =
                validated ? 'url(#cp-glow-green)'
                : locked   ? undefined
                : depth >= 2 ? 'url(#cp-glow-gold)'
                : 'url(#cp-glow-cyan)';
              const nodeX = x - NODE_W / 2;
              const ledColor = validated ? COLORS.green : locked ? 'rgba(255,255,255,0.22)' : color;

              return (
                <g key={node.id} style={{ cursor: 'pointer' }} onClick={() => setSelectedNode(isSelected ? null : node)}>
                  {[0.3, 0.5, 0.7].map((f, pi) => (
                    <g key={`pin-${pi}`}>
                      <rect x={nodeX - 6} y={y + NODE_H * f - 3} width={6} height={6} rx={1} fill={color} opacity={locked ? 0.18 : 0.55} />
                      <rect x={nodeX + NODE_W} y={y + NODE_H * f - 3} width={6} height={6} rx={1} fill={color} opacity={locked ? 0.18 : 0.55} />
                    </g>
                  ))}

                  {isSelected && (
                    <rect x={nodeX - 3} y={y - 3} width={NODE_W + 6} height={NODE_H + 6} rx="9" fill="none" stroke={color} strokeWidth="2" opacity="0.45" filter={glowFilter} />
                  )}

                  <rect x={nodeX} y={y} width={NODE_W} height={NODE_H} rx="7"
                    fill={locked ? COLORS.locked : COLORS.panel}
                    stroke={isSelected ? color : locked ? COLORS.lockedBorder : color}
                    strokeWidth={isSelected ? 1.6 : locked ? 0.5 : 1}
                    filter={!locked && !isSelected ? glowFilter : undefined}
                    opacity={locked ? 0.7 : 1} />

                  {locked && (
                    <rect x={nodeX} y={y} width={NODE_W} height={NODE_H} rx="7" fill="url(#cp-hatch)" />
                  )}

                  <rect x={nodeX} y={y} width={NODE_W} height={3} rx="3" fill={color} opacity={locked ? 0.3 : 0.85} />
                  <circle cx={x} cy={y + 6} r={2} fill={color} opacity={locked ? 0.3 : 0.9} />

                  <circle cx={nodeX + 13} cy={y + 15} r={3.4} fill={ledColor}
                    filter={locked ? undefined : glowFilter}
                    style={!locked ? { animation: 'cp-breathe 1.8s ease-in-out infinite' } : undefined} />
                  {locked && (
                    <text x={nodeX + 9} y={y + 19} fontSize="9" fill={color} style={{ animation: 'lockPulse 2.2s ease-in-out infinite' }}>🔒</text>
                  )}

                  {status === 'IN_PROGRESS' && pct > 0 && (
                    <>
                      <rect x={nodeX + 10} y={y + NODE_H - 9} width={NODE_W - 20} height={3} rx="1.5" fill="rgba(0,240,255,0.15)" />
                      <rect x={nodeX + 10} y={y + NODE_H - 9} width={(NODE_W - 20) * (pct / 100)} height={3} rx="1.5" fill={COLORS.cyan} />
                    </>
                  )}

                  <text x={x + 6} y={y + (status === 'IN_PROGRESS' && pct > 0 ? NODE_H / 2 - 3 : NODE_H / 2 + 1)}
                    textAnchor="middle" dominantBaseline="central"
                    fontFamily="'Rajdhani', 'Share Tech Mono', monospace" fontWeight="700" fontSize="12"
                    fill={locked ? color : '#eaf4ff'} opacity={locked ? 0.5 : 1}>
                    {node.title.toUpperCase()}
                  </text>

                  <text x={x + 6} y={y + NODE_H - 11} textAnchor="middle"
                    fontFamily="'Share Tech Mono', monospace" fontSize="8" fill={color} opacity={locked ? 0.25 : 0.6}>
                    {'+' + node.pe_reward + ' PE · ' + node.estimated_hours + 'h '}{'★'.repeat(node.difficulty_level)}
                  </text>
                </g>
              );
            })}
            </g>
          </svg>
        )}
      </div>

      {selectedNode && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <div>
              <div style={styles.detailTitle}>{selectedNode.title}</div>
              <div style={styles.detailSub}>{selectedNode.description}</div>
            </div>
            <button style={styles.closeBtn} onClick={() => setSelectedNode(null)}>×</button>
          </div>

          <div style={styles.detailGrid}>
            {[
              { label: 'Dificultad', value: '·'.repeat(selectedNode.difficulty_level) },
              { label: 'Recompensa', value: `${selectedNode.pe_reward} PE` },
              { label: 'Categoría', value: selectedNode.category },
              { label: 'Horas Est.', value: `${selectedNode.estimated_hours}h` },
            ].map(item => (
              <div key={item.label} style={styles.detailCard}>
                <div style={styles.detailCardLabel}>{item.label}</div>
                <div style={styles.detailCardValue}>{item.value}</div>
              </div>
            ))}
          </div>

          <div style={{ borderRadius: 10, padding: '12px 14px', marginBottom: 12, background: 'rgba(57,255,20,0.07)', border: `1px solid ${COLORS.greenDim}` }}>
            <div style={{ fontFamily: "'Share Tech Mono', monospace", fontSize: 9, letterSpacing: 1.5, color: COLORS.green, marginBottom: 8 }}>⬡ LO QUE GANAS AL COMPLETARLO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: '#dbeafe' }}>
              <div>⚡ <strong style={{ color: COLORS.gold }}>+{selectedNode.pe_reward} PE</strong> de experiencia</div>
              <div>🧬 Sube tu <strong style={{ color: COLORS.cyan }}>Fundamento</strong> en el Gemelo Digital</div>
              <div>🎯 Validas la habilidad <strong style={{ color: COLORS.green }}>{selectedNode.title}</strong></div>
              <div>⏱️ Inversión: <strong>{selectedNode.estimated_hours}h</strong> · Dificultad {'·'.repeat(selectedNode.difficulty_level)}</div>
            </div>
          </div>

          <div style={styles.progressBox}>
            <div style={styles.progressRow}>
              <span style={styles.progressStatus}>{getStatus(selectedNode.id)}</span>
              <span style={styles.progressPct}>{getPercentage(selectedNode.id)}%</span>
            </div>
            <div style={styles.progressBg}>
              <div style={{ ...styles.progressFill, width: `${getPercentage(selectedNode.id)}%` }} />
            </div>
          </div>

          {getStatus(selectedNode.id) === 'LOCKED' ? (
            <button style={{ ...styles.challengeBtn, opacity: 0.4, cursor: 'not-allowed' }} disabled>
              🔒 Completa el nodo anterior para desbloquear
            </button>
          ) : (
            <button style={styles.challengeBtn} onClick={() => handleStartChallenge(selectedNode)}>
              <Play size={14} fill="currentColor" /> Iniciar Desafío
            </button>
          )}

          {courseByNode.get(selectedNode.id) && (
            <button onClick={() => setCourseNode(selectedNode.id)} style={{
              width: '100%', marginTop: 10, padding: '11px', borderRadius: 10, cursor: 'pointer',
              background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.45)', color: '#F59E0B',
              fontFamily: "'Share Tech Mono', monospace", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              <BookOpen size={14} /> APRENDER ESTE NODO
            </button>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 12, fontFamily: "'Share Tech Mono', monospace", fontSize: 8.5, letterSpacing: 0.5 }}>
            {(() => {
              const st = getStatus(selectedNode.id);
              const validated = st === 'VALIDATED' || st === 'MASTERED';
              const steps = [{ k: 'APRENDE', on: true, col: '#00F0FF' }, { k: 'DESAFÍA', on: st !== 'LOCKED', col: '#00F0FF' }, { k: 'VALIDA', on: validated, col: '#39FF14' }];
              return steps.map((s, i) => (
                <span key={s.k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ color: s.on ? s.col : 'rgba(255,255,255,0.25)' }}>{s.k}</span>
                  {i < 2 && <ArrowRight size={9} style={{ color: 'rgba(255,255,255,0.25)' }} />}
                </span>
              ));
            })()}
          </div>
        </div>
      )}

      {lastPeEarned !== null && (
        <div style={styles.peToast}><Trophy size={16} /> +{lastPeEarned} PE ganados</div>
      )}

      {simulatorTest && (
        <SimulatorChallenge
          test={simulatorTest}
          nodeId={simulatorNode}
          onClose={() => { setSimulatorTest(null); setSimulatorNode(''); }}
          onSuccess={(pe) => { setLastPeEarned(pe); setTimeout(() => setLastPeEarned(null), 3000); }}
        />
      )}

      {courseNode && (
        <CourseFlowModal nodeId={courseNode} onClose={() => setCourseNode(null)} onValidated={() => {}} />
      )}
    </div>
  );
}

const FONT_MONO = "'Share Tech Mono', 'Courier New', monospace";
const FONT_RAJDHANI = "'Rajdhani', sans-serif";

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: COLORS.bg, overflow: 'hidden', position: 'relative' },
  loadingWrap: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: COLORS.bg, gap: 12 },
  spinnerBox: { width: 44, height: 44, borderRadius: 10, background: 'rgba(0,240,255,0.08)', border: `1px solid rgba(0,240,255,0.3)`, display: 'flex', alignItems: 'center', justifyContent: 'center' },
  spinner: { width: 20, height: 20, borderRadius: '50%', border: `2px solid ${COLORS.cyan}`, borderTopColor: 'transparent', animation: 'spin 0.8s linear infinite' },
  loadingText: { fontFamily: FONT_MONO, fontSize: 12, color: COLORS.cyanDim, letterSpacing: 2 },
  rangeCard: { margin: '12px 14px 8px', padding: '12px 14px', borderRadius: 12, border: `1px solid rgba(245,158,11,0.35)`, background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(8,16,38,0.45))', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', boxShadow: '0 0 18px rgba(245,158,11,0.18), inset 0 1px 1px rgba(255,255,255,0.05)', flexShrink: 0 },
  rangeCardInner: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  rangeIcon: { fontSize: 18, filter: 'drop-shadow(0 0 6px rgba(245,158,11,0.7))' },
  rangeTitle: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 13, color: COLORS.gold },
  rangeSub: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.goldDim, marginTop: 2 },
  rangeBtn: { width: '100%', padding: '10px 0', background: `linear-gradient(90deg, ${COLORS.gold}, #ffb84d)`, color: '#020613', border: 'none', borderRadius: 8, fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5, animation: 'amberBreathe 2.8s ease-in-out infinite' },
  treeLabel: { fontFamily: FONT_MONO, fontSize: 9, color: 'rgba(0,240,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', padding: '4px 16px', flexShrink: 0 },
  treeScroll: { flex: 1, overflowY: 'auto', overflowX: 'auto', padding: '8px 12px 20px', WebkitOverflowScrolling: 'touch' },
  detailPanel: { flexShrink: 0, borderTop: `1px solid rgba(0,240,255,0.18)`, padding: '14px 16px', background: 'rgba(2,6,19,0.85)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', maxHeight: '38vh', overflowY: 'auto', boxShadow: '0 -8px 30px rgba(0,240,255,0.08)' },
  detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  detailTitle: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 16, color: COLORS.cyan },
  detailSub: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.cyanDim, marginTop: 3, maxWidth: '80%' },
  closeBtn: { background: 'none', border: 'none', color: 'rgba(0,240,255,0.4)', fontSize: 22, cursor: 'pointer', lineHeight: 1, padding: 0 },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  detailCard: { padding: '8px 10px', borderRadius: 6, background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.08)' },
  detailCardLabel: { fontFamily: FONT_MONO, fontSize: 9, color: COLORS.cyanDim, letterSpacing: 1, marginBottom: 4 },
  detailCardValue: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 15, color: COLORS.cyan },
  progressBox: { padding: '8px 10px', borderRadius: 6, background: 'rgba(0,240,255,0.04)', border: '1px solid rgba(0,240,255,0.08)', marginBottom: 12 },
  progressRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  progressStatus: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.cyan, letterSpacing: 1 },
  progressPct: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.cyanDim },
  progressBg: { height: 4, background: 'rgba(0,240,255,0.1)', borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: '100%', background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.purple})`, borderRadius: 2, transition: 'width 0.3s ease' },
  challengeBtn: { width: '100%', padding: '10px 0', background: 'rgba(0,240,255,0.10)', border: `1px solid ${COLORS.cyanDim}`, color: COLORS.cyan, borderRadius: 8, fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, letterSpacing: 0.5, boxShadow: '0 0 15px rgba(0,240,255,0.25)', transition: 'box-shadow 0.3s ease, background 0.15s' },
  peToast: { position: 'absolute', bottom: 80, left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 18px', borderRadius: 12, background: COLORS.gold, color: COLORS.bg, fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 14, boxShadow: `0 4px 20px rgba(245,158,11,0.45)`, whiteSpace: 'nowrap', zIndex: 50 },
};
