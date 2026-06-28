// components/tabs/MaxSkillTab.tsx
// Árbol de Habilidades — diseño cyberpunk con ramas SVG reales

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { Play, Trophy } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { supabase } from '../../lib/supabase';
import { SimulatorChallenge } from '../shared/SimulatorChallenge';
import type { SkillTreeNode, UserSkillProgress, SkillTest } from '../../types';

// ─────────────────────────────────────────────
// Constantes de diseño
// ─────────────────────────────────────────────
const NODE_W = 128;
const NODE_H = 52;
const TIER_GAP_Y = 110;   // espacio vertical entre tiers
const PEER_GAP_X = 14;    // espacio horizontal entre nodos del mismo tier

const COLORS = {
  cyan:       '#2e9bff',
  cyanDim:    'rgba(46,155,255,0.40)',
  cyanFaint:  'rgba(46,155,255,0.14)',
  gold:       '#ff9d2e',
  goldDim:    'rgba(255,157,46,0.40)',
  purple:     '#6fc3ff',
  purpleDim:  'rgba(111,195,255,0.35)',
  green:      '#2bd97c',
  greenDim:   'rgba(43,217,124,0.35)',
  locked:     'rgba(255,255,255,0.07)',
  lockedBorder: 'rgba(255,255,255,0.12)',
  bg:         '#06090f',
  panel:      'rgba(16,23,34,0.97)',
  grid:       'rgba(46,155,255,0.05)',
} as const;


// Color por status
function nodeColor(status: string, depth: number) {
  if (status === 'VALIDATED' || status === 'MASTERED') return COLORS.green;
  if (status === 'IN_PROGRESS' || status === 'AVAILABLE') return COLORS.cyan;
  // locked — varía por profundidad para jerarquía visual
  if (depth === 0) return COLORS.cyan;
  if (depth === 1) return COLORS.cyanDim;
  if (depth === 2) return COLORS.gold;
  return COLORS.purple;
}

// ─────────────────────────────────────────────
// Tipos internos para layout
// ─────────────────────────────────────────────
interface LayoutNode {
  node: SkillTreeNode;
  x: number;      // centro x del nodo
  y: number;      // top y del nodo
  depth: number;
  children: LayoutNode[];
}

// ─────────────────────────────────────────────
// Algoritmo de layout (árbol top-down)
// ─────────────────────────────────────────────
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

      result.push({
        node: root,
        x: centerX,
        y,
        depth,
        children: sub.nodes,
      });
      curX += sub.totalWidth;
    }
  }

  const totalWidth = curX - startX;
  return { nodes: result, totalWidth };
}

// Aplanar árbol de layout en lista
function flattenLayout(nodes: LayoutNode[]): LayoutNode[] {
  const out: LayoutNode[] = [];
  for (const n of nodes) {
    out.push(n);
    out.push(...flattenLayout(n.children));
  }
  return out;
}

// Calcular dimensiones totales del SVG
function svgDimensions(flat: LayoutNode[]) {
  const maxX = Math.max(...flat.map(n => n.x + NODE_W / 2));
  const maxY = Math.max(...flat.map(n => n.y + NODE_H));
  return { width: maxX + 20, height: maxY + 40 };
}


// ─────────────────────────────────────────────
// Componente principal
// ─────────────────────────────────────────────
export function MaxSkillTab() {
  const { profile } = useApp();
  const [nodes, setNodes]             = useState<SkillTreeNode[]>([]);
  const [progress, setProgress]       = useState<Map<string, UserSkillProgress>>(new Map());
  const [isLoading, setIsLoading]     = useState(true);
  const [selectedNode, setSelectedNode] = useState<SkillTreeNode | null>(null);
  const [simulatorTest, setSimulatorTest] = useState<SkillTest | null>(null);
  const [simulatorNode, setSimulatorNode] = useState<string>('');
  const [lastPeEarned, setLastPeEarned]   = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Cargar nodos
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


  // Cargar progreso + realtime
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

  // Estado efectivo: si no hay progreso, los nodos raíz (o hijos de nodos
  // ya validados) quedan AVAILABLE (brillan y son clickeables). El resto LOCKED.
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
    if (error || !data) return;
    setSimulatorTest(data as SkillTest);
    setSimulatorNode(node.id);
  }, []);

  // Layout
  const roots = useMemo(() => nodes.filter(n => !n.parent_node_id), [nodes]);
  const { nodes: layoutRoots } = useMemo(
    () => buildLayout(roots, nodes, 0, 20),
    [roots, nodes]
  );
  const flat    = useMemo(() => flattenLayout(layoutRoots), [layoutRoots]);
  const { width: svgW, height: svgH } = useMemo(() => svgDimensions(flat), [flat]);

  // PE totales del usuario
  const totalPe    = useMemo(() =>
    [...progress.values()]
      .filter(p => p.status === 'VALIDATED' || p.status === 'MASTERED')
      .reduce((sum, p) => sum + (nodes.find(n => n.id === p.node_id)?.pe_reward || 0), 0),
    [progress, nodes]
  );
  const maxPe = useMemo(() => nodes.reduce((s, n) => s + n.pe_reward, 0), [nodes]);


  // ─── Render ───────────────────────────────
  if (isLoading) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinnerBox}>
          <div style={styles.spinner} />
        </div>
        <p style={styles.loadingText}>Inicializando protocolo...</p>
      </div>
    );
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.pulseWrap}>
            <div style={styles.pulseDot} />
          </div>
          <div>
            <div style={styles.headerTitle}>ÁRBOL DE HABILIDADES</div>
            <div style={styles.headerSub}>SISTEMA ÓMICRON // PROTOCOLO N1</div>
          </div>
        </div>
        <div style={styles.peCounter}>
          <span style={styles.peValue}>{totalPe}</span>
          <span style={styles.peSuffix}> PE</span>
        </div>
      </div>

      {/* Barra de PE */}
      <div style={styles.peBarWrap}>
        <div style={styles.peBarBg}>
          <div
            style={{
              ...styles.peBarFill,
              width: maxPe > 0 ? `${Math.round((totalPe / maxPe) * 100)}%` : '0%',
            }}
          />
        </div>
        <span style={styles.peBarLabel}>
          {maxPe > 0 ? Math.round((totalPe / maxPe) * 100) : 0}% COMPLETADO
        </span>
      </div>


      {/* Reto de rango */}
      <div style={styles.rangeCard}>
        <div style={styles.rangeCardInner}>
          <div style={styles.rangeIcon}>⚡</div>
          <div>
            <div style={styles.rangeTitle}>Simulador de Rango (Contrarreloj)</div>
            <div style={styles.rangeSub}>Reto de alta dificultad para defender tu estatus.</div>
          </div>
        </div>
        <button style={styles.rangeBtn}>
          <Play size={14} fill="currentColor" />
          Iniciar Reto de Alta Frecuencia
        </button>
      </div>

      {/* Árbol SVG */}
      <div style={styles.treeLabel}>RUTAS DE COMPETENCIA</div>
      <div style={styles.treeScroll} ref={scrollRef}>
        {flat.length === 0 ? (
          <p style={{ color: COLORS.cyanDim, fontFamily: 'monospace', fontSize: 12, padding: 20 }}>
            No hay nodos cargados.
          </p>
        ) : (
          <svg
            width={Math.max(svgW, 320)}
            height={svgH + 20}
            style={{ display: 'block', overflow: 'visible' }}
          >


            <defs>
              <pattern id="cp-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke={COLORS.grid} strokeWidth="0.5" />
              </pattern>
              <filter id="cp-glow-cyan" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="cp-glow-gold" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <filter id="cp-glow-green" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
              <pattern id="cp-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(46,155,255,0.07)" strokeWidth="1.5" />
              </pattern>
            </defs>

            {/* Fondo grilla */}
            <rect
              width={Math.max(svgW, 320)}
              height={svgH + 20}
              fill={COLORS.bg}
              rx="10"
            />
            <rect
              width={Math.max(svgW, 320)}
              height={svgH + 20}
              fill="url(#cp-grid)"
              rx="10"
            />


            {/* Ramas (conectores padre→hijo) */}
            {flat.map(layoutNode =>
              layoutNode.children.map(child => {
                const px = layoutNode.x;
                const py = layoutNode.y + NODE_H;
                const cx = child.x;
                const cy = child.y;
                const midY = (py + cy) / 2;
                const status = getStatus(child.node.id);
                const color = nodeColor(status, child.depth);
                const isActive = status !== 'LOCKED';

                return (
                  <path
                    key={`branch-${layoutNode.node.id}-${child.node.id}`}
                    d={`M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`}
                    fill="none"
                    stroke={isActive ? color : 'rgba(46,155,255,0.18)'}
                    strokeWidth={isActive ? 1.5 : 1}
                    strokeDasharray={isActive ? undefined : '4,5'}
                  />
                );
              })
            )}

            {/* Puntos de unión en bifurcaciones */}
            {flat.map(layoutNode =>
              layoutNode.children.length > 1 ? (
                <circle
                  key={`junction-${layoutNode.node.id}`}
                  cx={layoutNode.x}
                  cy={layoutNode.y + NODE_H + (TIER_GAP_Y - NODE_H) / 2}
                  r={3}
                  fill={nodeColor(getStatus(layoutNode.node.id), layoutNode.depth)}
                  opacity={0.7}
                />
              ) : null
            )}


            {/* Nodos */}
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

              return (
                <g
                  key={node.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setSelectedNode(isSelected ? null : node)}
                >
                  {/* Sombra/glow exterior si seleccionado */}
                  {isSelected && (
                    <rect
                      x={nodeX - 3}
                      y={y - 3}
                      width={NODE_W + 6}
                      height={NODE_H + 6}
                      rx="9"
                      fill="none"
                      stroke={color}
                      strokeWidth="2"
                      opacity="0.4"
                      filter={glowFilter}
                    />
                  )}


                  {/* Fondo del nodo */}
                  <rect
                    x={nodeX}
                    y={y}
                    width={NODE_W}
                    height={NODE_H}
                    rx="6"
                    fill={locked ? COLORS.locked : COLORS.panel}
                    stroke={isSelected ? color : locked ? COLORS.lockedBorder : color}
                    strokeWidth={isSelected ? 1.5 : locked ? 0.5 : 1}
                    filter={!locked && !isSelected ? glowFilter : undefined}
                    opacity={locked ? 0.7 : 1}
                  />

                  {/* Hatch para locked */}
                  {locked && (
                    <rect
                      x={nodeX}
                      y={y}
                      width={NODE_W}
                      height={NODE_H}
                      rx="6"
                      fill="url(#cp-hatch)"
                    />
                  )}

                  {/* Barra superior de color */}
                  <rect
                    x={nodeX}
                    y={y}
                    width={NODE_W}
                    height={3}
                    rx="3"
                    fill={color}
                    opacity={locked ? 0.3 : 0.85}
                  />


                  {/* Barra de progreso (si in_progress) */}
                  {status === 'IN_PROGRESS' && pct > 0 && (
                    <>
                      <rect
                        x={nodeX + 8}
                        y={y + NODE_H - 8}
                        width={NODE_W - 16}
                        height={3}
                        rx="1.5"
                        fill="rgba(46,155,255,0.15)"
                      />
                      <rect
                        x={nodeX + 8}
                        y={y + NODE_H - 8}
                        width={(NODE_W - 16) * (pct / 100)}
                        height={3}
                        rx="1.5"
                        fill={COLORS.cyan}
                      />
                    </>
                  )}

                  {/* Icono de lock o check */}
                  {locked ? (
                    <text x={nodeX + 10} y={y + 20} fontSize="10" fill={color} opacity={0.5}>
                      🔒
                    </text>
                  ) : validated ? (
                    <text x={nodeX + 10} y={y + 20} fontSize="10" fill={COLORS.green}>
                      ✓
                    </text>
                  ) : null}


                  {/* Título del nodo */}
                  <text
                    x={x}
                    y={y + (status === 'IN_PROGRESS' && pct > 0 ? NODE_H / 2 - 4 : NODE_H / 2 + 2)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontFamily="'Rajdhani', 'Share Tech Mono', monospace"
                    fontWeight="700"
                    fontSize="12"
                    fill={color}
                    opacity={locked ? 0.45 : 1}
                  >
                    {node.title.toUpperCase()}
                  </text>

                  {/* PE + estrellas */}
                  <text
                    x={x}
                    y={y + NODE_H - 10}
                    textAnchor="middle"
                    fontFamily="'Share Tech Mono', monospace"
                    fontSize="8"
                    fill={color}
                    opacity={locked ? 0.25 : 0.55}
                  >
                    {node.pe_reward} PE {'★'.repeat(node.difficulty_level)}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>


      {/* Panel de detalle del nodo seleccionado */}
      {selectedNode && (
        <div style={styles.detailPanel}>
          <div style={styles.detailHeader}>
            <div>
              <div style={styles.detailTitle}>{selectedNode.title}</div>
              <div style={styles.detailSub}>{selectedNode.description}</div>
            </div>
            <button style={styles.closeBtn} onClick={() => setSelectedNode(null)}>
              ×
            </button>
          </div>

          <div style={styles.detailGrid}>
            {[
              { label: 'Dificultad', value: '⭐'.repeat(selectedNode.difficulty_level) },
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


          {/* Barra de progreso del nodo */}
          <div style={styles.progressBox}>
            <div style={styles.progressRow}>
              <span style={styles.progressStatus}>{getStatus(selectedNode.id)}</span>
              <span style={styles.progressPct}>{getPercentage(selectedNode.id)}%</span>
            </div>
            <div style={styles.progressBg}>
              <div
                style={{
                  ...styles.progressFill,
                  width: `${getPercentage(selectedNode.id)}%`,
                }}
              />
            </div>
          </div>

          {getStatus(selectedNode.id) === 'LOCKED' ? (
            <button style={{ ...styles.challengeBtn, opacity: 0.4, cursor: 'not-allowed' }} disabled>
              🔒 Completa el nodo anterior para desbloquear
            </button>
          ) : (
            <button
              style={styles.challengeBtn}
              onClick={() => handleStartChallenge(selectedNode)}
            >
              <Play size={14} fill="currentColor" />
              Iniciar Desafío
            </button>
          )}
        </div>
      )}

      {/* Toast PE */}
      {lastPeEarned !== null && (
        <div style={styles.peToast}>
          <Trophy size={16} />
          +{lastPeEarned} PE ganados
        </div>
      )}


      {/* Simulador */}
      {simulatorTest && (
        <SimulatorChallenge
          test={simulatorTest}
          nodeId={simulatorNode}
          onClose={() => { setSimulatorTest(null); setSimulatorNode(''); }}
          onSuccess={(pe) => {
            setLastPeEarned(pe);
            setTimeout(() => setLastPeEarned(null), 3000);
          }}
        />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Estilos en objeto (compatible sin Tailwind)
// ─────────────────────────────────────────────
const FONT_MONO = "'Share Tech Mono', 'Courier New', monospace";
const FONT_RAJDHANI = "'Rajdhani', sans-serif";

const styles: Record<string, React.CSSProperties> = {
  root: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    background: COLORS.bg,
    overflow: 'hidden',
    position: 'relative',
  },
  loadingWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    background: COLORS.bg,
    gap: 12,
  },


  spinnerBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    background: 'rgba(46,155,255,0.08)',
    border: `1px solid rgba(46,155,255,0.3)`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spinner: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    border: `2px solid ${COLORS.cyan}`,
    borderTopColor: 'transparent',
    animation: 'spin 0.8s linear infinite',
  },
  loadingText: {
    fontFamily: FONT_MONO,
    fontSize: 12,
    color: COLORS.cyanDim,
    letterSpacing: 2,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid rgba(46,155,255,0.1)`,
    background: 'rgba(46,155,255,0.02)',
    flexShrink: 0,
  },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  pulseWrap: { display: 'flex', alignItems: 'center' },


  pulseDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    background: COLORS.cyan,
    boxShadow: `0 0 6px ${COLORS.cyan}`,
    animation: 'pulse-cp 1.5s ease-in-out infinite',
  },
  headerTitle: { fontFamily: FONT_MONO, fontSize: 12, color: COLORS.cyan, letterSpacing: 2 },
  headerSub: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: 'rgba(46,155,255,0.35)',
    letterSpacing: 1,
    marginTop: 2,
  },
  peCounter: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 16, color: COLORS.gold },
  peValue: { color: COLORS.gold },
  peSuffix: { color: COLORS.goldDim, fontSize: 12 },
  peBarWrap: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '6px 16px',
    borderBottom: `1px solid rgba(46,155,255,0.06)`,
    flexShrink: 0,
  },
  peBarBg: {
    flex: 1,
    height: 3,
    background: 'rgba(46,155,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  peBarFill: {
    height: '100%',
    background: COLORS.cyan,
    borderRadius: 2,
    boxShadow: `0 0 6px ${COLORS.cyan}`,
    transition: 'width 0.4s ease',
  },


  peBarLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: 'rgba(46,155,255,0.35)',
    letterSpacing: 1,
    whiteSpace: 'nowrap',
  },
  rangeCard: {
    margin: '12px 14px 8px',
    padding: '12px 14px',
    borderRadius: 10,
    border: `1px solid rgba(255,157,46,0.25)`,
    background: 'rgba(255,157,46,0.04)',
    flexShrink: 0,
  },
  rangeCardInner: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  rangeIcon: { fontSize: 18 },
  rangeTitle: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 13, color: COLORS.gold },
  rangeSub: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.goldDim, marginTop: 2 },
  rangeBtn: {
    width: '100%',
    padding: '10px 0',
    background: COLORS.gold,
    color: COLORS.bg,
    border: 'none',
    borderRadius: 8,
    fontFamily: FONT_RAJDHANI,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    letterSpacing: 0.5,
  },


  treeLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: 'rgba(46,155,255,0.3)',
    letterSpacing: 2,
    textTransform: 'uppercase',
    padding: '4px 16px',
    flexShrink: 0,
  },
  treeScroll: {
    flex: 1,
    overflowY: 'auto',
    overflowX: 'auto',
    padding: '8px 12px 20px',
    WebkitOverflowScrolling: 'touch',
  },
  detailPanel: {
    flexShrink: 0,
    borderTop: `1px solid rgba(46,155,255,0.12)`,
    padding: '14px 16px',
    background: 'rgba(6,9,15,0.98)',
    maxHeight: '38vh',
    overflowY: 'auto',
  },
  detailHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  detailTitle: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 16, color: COLORS.cyan },
  detailSub: {
    fontFamily: FONT_MONO,
    fontSize: 10,
    color: COLORS.cyanDim,
    marginTop: 3,
    maxWidth: '80%',
  },


  closeBtn: {
    background: 'none',
    border: 'none',
    color: 'rgba(46,155,255,0.4)',
    fontSize: 22,
    cursor: 'pointer',
    lineHeight: 1,
    padding: 0,
  },
  detailGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 },
  detailCard: {
    padding: '8px 10px',
    borderRadius: 6,
    background: 'rgba(46,155,255,0.04)',
    border: '1px solid rgba(46,155,255,0.08)',
  },
  detailCardLabel: {
    fontFamily: FONT_MONO,
    fontSize: 9,
    color: COLORS.cyanDim,
    letterSpacing: 1,
    marginBottom: 4,
  },
  detailCardValue: { fontFamily: FONT_RAJDHANI, fontWeight: 700, fontSize: 15, color: COLORS.cyan },
  progressBox: {
    padding: '8px 10px',
    borderRadius: 6,
    background: 'rgba(46,155,255,0.04)',
    border: '1px solid rgba(46,155,255,0.08)',
    marginBottom: 12,
  },
  progressRow: { display: 'flex', justifyContent: 'space-between', marginBottom: 6 },
  progressStatus: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.cyan, letterSpacing: 1 },
  progressPct: { fontFamily: FONT_MONO, fontSize: 10, color: COLORS.cyanDim },


  progressBg: {
    height: 4,
    background: 'rgba(46,155,255,0.1)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    background: `linear-gradient(90deg, ${COLORS.cyan}, ${COLORS.purple})`,
    borderRadius: 2,
    transition: 'width 0.3s ease',
  },
  challengeBtn: {
    width: '100%',
    padding: '10px 0',
    background: 'rgba(46,155,255,0.12)',
    border: `1px solid ${COLORS.cyanDim}`,
    color: COLORS.cyan,
    borderRadius: 8,
    fontFamily: FONT_RAJDHANI,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    letterSpacing: 0.5,
    transition: 'background 0.15s',
  },
  peToast: {
    position: 'absolute',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 12,
    background: COLORS.gold,
    color: COLORS.bg,
    fontFamily: FONT_RAJDHANI,
    fontWeight: 700,
    fontSize: 14,
    boxShadow: `0 4px 20px rgba(255,157,46,0.4)`,
    whiteSpace: 'nowrap',
    zIndex: 50,
  },
};
