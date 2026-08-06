// components/perfil/PerfilSkillVisual.tsx
// ═══════════════════════════════════════════════════════════════════════
// NUEVA VISTA "MI PERFIL" — Basada en los Top 3 Skills del usuario.
//
// Se activa al completar la extracción de CV. Muestra:
//   1. Núcleo central = Skill #1 (el más fuerte) pulsando
//   2. Dos orbitales = Skills #2 y #3 girando alrededor
//   3. Anillos de sinergia = conexiones entre skills relacionados
//   4. Barras radiales = 4 ejes del Gemelo (exec, qual, trans, fund)
//   5. ADN Digital = nombre + posicionamiento + reputación
//
// Diseño: "sistema solar personal" — cada persona tiene un perfil
// visualmente ÚNICO basado en sus habilidades reales.
// ═══════════════════════════════════════════════════════════════════════
import { useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, TrendingUp, Zap, Shield, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { C, FONT } from '../../theme';

export interface SkillVisualData {
  name: string;
  pct: number; // 0-100
}

export interface PerfilSkillVisualProps {
  isOpen: boolean;
  onClose: () => void;
  /** Nombre del profesional */
  name: string;
  /** Posicionamiento / senior label */
  seniorLabel: string;
  /** Años de experiencia */
  years: number;
  /** Top skills con % dominio (ordenados por pct desc, se usan los top 3) */
  skillsDetail: SkillVisualData[];
  /** 4 ejes del Gemelo Digital (0-100 cada uno) */
  axes: { exec: number; qual: number; trans: number; fund: number };
  /** Reputación total (0-100) */
  reputation: number;
  /** Sinergias detectadas (frases) */
  synergies?: string[];
  /** Resumen del CV extraído por IA (2 párrafos) — se muestra integrado en la tarjeta */
  cvSummary?: string;
  /** Callback al tocar "Explorar mi orbe" */
  onExplore?: () => void;
}

// ── Colores para cada skill orbital ────────────────────────────────────
const SKILL_COLORS = [C.cyan, C.purple, C.gold, C.green, C.red];
const AXIS_META = [
  { key: 'exec', label: 'Ejecución', color: C.cyan, Icon: Zap },
  { key: 'qual', label: 'Calidad', color: C.purple, Icon: Shield },
  { key: 'trans', label: 'Trascendencia', color: C.gold, Icon: Globe },
  { key: 'fund', label: 'Fundamento', color: C.green, Icon: TrendingUp },
] as const;

export function PerfilSkillVisual({
  isOpen,
  onClose,
  name,
  seniorLabel,
  years,
  skillsDetail,
  axes,
  reputation,
  synergies = [],
  cvSummary,
  onExplore,
}: PerfilSkillVisualProps) {
  // Top 3 skills (ya ordenados por pct desc)
  const top3 = useMemo(() => {
    const sorted = [...skillsDetail].sort((a, b) => b.pct - a.pct);
    return sorted.slice(0, 3);
  }, [skillsDetail]);

  const nucleus = top3[0];
  const orbital1 = top3[1];
  const orbital2 = top3[2];

  // Orbital ring sizes based on skill count
  const hasThree = top3.length >= 3;
  const hasTwo = top3.length >= 2;

  const handleExplore = useCallback(() => {
    onExplore?.();
    onClose();
  }, [onExplore, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: C.overlay,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            overflow: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Cerrar"
            style={{
              position: 'absolute', top: 16, right: 16, zIndex: 10,
              width: 36, height: 36, borderRadius: '50%',
              background: C.glass2, border: `1px solid ${C.line}`,
              color: C.mut, cursor: 'pointer',
              display: 'grid', placeItems: 'center',
            }}
          >
            <X size={16} />
          </button>

          {/* ═══ HEADER: ADN Digital ═══ */}
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ textAlign: 'center', paddingTop: 'calc(env(safe-area-inset-top, 20px) + 24px)', marginBottom: 8 }}
          >
            <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2.5, color: C.cyan, textTransform: 'uppercase', marginBottom: 6 }}>
              ADN Digital · Perfil Ómicron
            </div>
            <h1 style={{ margin: 0, fontFamily: FONT.display, fontSize: 22, fontWeight: 700, color: C.ink, letterSpacing: -0.3 }}>
              {name || 'Tu Gemelo Digital'}
            </h1>
            <p style={{ margin: '4px 0 0', fontFamily: FONT.body, fontSize: 13, color: C.mut }}>
              {seniorLabel}{years > 0 ? ` · ${years} años` : ''}
            </p>
          </motion.div>

          {/* ═══ ORBITAL VISUALIZATION ═══ */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.25, type: 'spring', stiffness: 120 }}
            style={{
              position: 'relative',
              width: 280, height: 280,
              margin: '12px auto 16px',
              flexShrink: 0,
            }}
          >
            {/* Outer ring (skill #3) */}
            {hasThree && (
              <div style={{
                position: 'absolute', inset: 0,
                borderRadius: '50%',
                border: `1px solid ${SKILL_COLORS[2]}33`,
                animation: 'cp-spin 25s linear infinite',
              }}>
                {/* Orbital dot */}
                <motion.div
                  animate={{ boxShadow: [`0 0 8px ${SKILL_COLORS[2]}`, `0 0 20px ${SKILL_COLORS[2]}`, `0 0 8px ${SKILL_COLORS[2]}`] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  style={{
                    position: 'absolute', top: -6, left: '50%', transform: 'translateX(-50%)',
                    width: 12, height: 12, borderRadius: '50%',
                    background: SKILL_COLORS[2],
                  }}
                />
              </div>
            )}

            {/* Middle ring (skill #2) */}
            {hasTwo && (
              <div style={{
                position: 'absolute', inset: 40,
                borderRadius: '50%',
                border: `1.5px solid ${SKILL_COLORS[1]}44`,
                animation: 'cp-spin 18s linear infinite reverse',
              }}>
                <motion.div
                  animate={{ boxShadow: [`0 0 8px ${SKILL_COLORS[1]}`, `0 0 22px ${SKILL_COLORS[1]}`, `0 0 8px ${SKILL_COLORS[1]}`] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                  style={{
                    position: 'absolute', bottom: -7, left: '50%', transform: 'translateX(-50%)',
                    width: 14, height: 14, borderRadius: '50%',
                    background: SKILL_COLORS[1],
                  }}
                />
              </div>
            )}

            {/* Nucleus (skill #1 — the core) */}
            {nucleus && (
              <motion.div
                animate={{
                  boxShadow: [
                    `0 0 30px ${SKILL_COLORS[0]}66, inset 0 0 20px ${SKILL_COLORS[0]}33`,
                    `0 0 50px ${SKILL_COLORS[0]}99, inset 0 0 30px ${SKILL_COLORS[0]}55`,
                    `0 0 30px ${SKILL_COLORS[0]}66, inset 0 0 20px ${SKILL_COLORS[0]}33`,
                  ],
                }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                  position: 'absolute',
                  inset: 80,
                  borderRadius: '50%',
                  background: `radial-gradient(circle at 35% 35%, ${SKILL_COLORS[0]}44, ${C.bg} 70%)`,
                  border: `2px solid ${SKILL_COLORS[0]}88`,
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'center', justifyContent: 'center',
                  gap: 4,
                }}
              >
                <span style={{ fontFamily: FONT.display, fontSize: 28, fontWeight: 800, color: SKILL_COLORS[0] }}>
                  {nucleus.pct}%
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1.2, color: C.ink, textTransform: 'uppercase', textAlign: 'center', padding: '0 8px', lineHeight: 1.3 }}>
                  {nucleus.name}
                </span>
              </motion.div>
            )}

            {/* Synergy connection lines (decorative SVG) */}
            {hasTwo && (
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                <line x1="50%" y1="20%" x2="50%" y2="38%" stroke={C.cyan} strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3">
                  <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" />
                </line>
                {hasThree && (
                  <line x1="30%" y1="70%" x2="42%" y2="58%" stroke={C.gold} strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3">
                    <animate attributeName="opacity" values="0.2;0.5;0.2" dur="3s" repeatCount="indefinite" />
                  </line>
                )}
              </svg>
            )}

            {/* Reputation ring (outer glow) */}
            <div style={{
              position: 'absolute', inset: -8,
              borderRadius: '50%',
              border: `1px solid ${C.line}`,
              opacity: 0.4,
            }} />
          </motion.div>

          {/* ═══ SKILL LABELS (below orbitals) ═══ */}
          <motion.div
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', padding: '0 20px', marginBottom: 16 }}
          >
            {top3.map((skill, i) => (
              <div key={skill.name} style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 12px', borderRadius: 999,
                background: `${SKILL_COLORS[i]}14`,
                border: `1px solid ${SKILL_COLORS[i]}44`,
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: SKILL_COLORS[i], boxShadow: `0 0 6px ${SKILL_COLORS[i]}` }} />
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.ink, letterSpacing: 0.5 }}>
                  {skill.name}
                </span>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: SKILL_COLORS[i], fontWeight: 700 }}>
                  {skill.pct}%
                </span>
              </div>
            ))}
          </motion.div>

          {/* ═══ CV INTEGRADO — Skills fluyendo + resumen ═══ */}
          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.45 }}
            style={{
              width: '100%', maxWidth: 360, padding: '0 24px', marginBottom: 16,
            }}
          >
            {/* Header de la sección */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FileText size={13} color={C.cyan} />
              <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' }}>
                CV Convalidado
              </span>
              <CheckCircle2 size={11} color={C.green} />
            </div>

            {/* Todas las skills con barras de dominio (evidencia de convalidación) */}
            <div style={{
              borderRadius: 16, padding: '14px 14px 10px',
              background: `linear-gradient(135deg, ${C.glass}, ${C.cyanGhost})`,
              border: `1px solid ${C.line}`,
              marginBottom: cvSummary ? 10 : 0,
            }}>
              {skillsDetail.slice(0, 8).map((skill, i) => (
                <div key={skill.name} style={{ marginBottom: i < Math.min(skillsDetail.length, 8) - 1 ? 8 : 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 12, color: C.ink }}>
                      {skill.name}
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 11, color: SKILL_COLORS[i % SKILL_COLORS.length], fontWeight: 700 }}>
                      {skill.pct}%
                    </span>
                  </div>
                  <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.pct}%` }}
                      transition={{ delay: 0.5 + i * 0.08, duration: 0.7, ease: 'easeOut' }}
                      style={{
                        height: '100%', borderRadius: 3,
                        background: `linear-gradient(90deg, ${SKILL_COLORS[i % SKILL_COLORS.length]}cc, ${SKILL_COLORS[(i + 1) % SKILL_COLORS.length]}88)`,
                        boxShadow: `0 0 6px ${SKILL_COLORS[i % SKILL_COLORS.length]}44`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Resumen del CV (fluye como texto integrado) */}
            {cvSummary && (
              <div style={{
                borderRadius: 14, padding: '12px 14px',
                background: C.glass,
                border: `1px solid ${C.line}`,
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Línea de flujo decorativa (izquierda) */}
                <div style={{
                  position: 'absolute', left: 0, top: 8, bottom: 8, width: 2,
                  borderRadius: 1,
                  background: `linear-gradient(to bottom, ${C.cyan}, ${C.purple}, ${C.gold})`,
                  opacity: 0.6,
                }} />
                <div style={{ paddingLeft: 10 }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1.5, color: C.mut, textTransform: 'uppercase', marginBottom: 6 }}>
                    Resumen extraído
                  </div>
                  <p style={{
                    margin: 0, fontFamily: FONT.body, fontSize: 12.5, lineHeight: 1.55,
                    color: C.ink, whiteSpace: 'pre-wrap',
                  }}>
                    {cvSummary}
                  </p>
                </div>
              </div>
            )}
          </motion.div>

          {/* ═══ 4 EJES — Barras radiales ═══ */}
          <motion.div
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr',
              gap: 10, padding: '0 24px', width: '100%', maxWidth: 360,
              marginBottom: 16,
            }}
          >
            {AXIS_META.map(({ key, label, color, Icon }) => {
              const val = axes[key as keyof typeof axes] ?? 0;
              return (
                <div key={key} style={{
                  padding: '10px 12px', borderRadius: 14,
                  background: C.glass, border: `1px solid ${color}33`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Icon size={12} color={color} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.mut, textTransform: 'uppercase' }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${color}22` }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ delay: 0.6 + 0.1 * AXIS_META.findIndex(a => a.key === key), duration: 0.8, ease: 'easeOut' }}
                        style={{ height: '100%', borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}66` }}
                      />
                    </div>
                    <span style={{ fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, color, minWidth: 28, textAlign: 'right' }}>
                      {val}
                    </span>
                  </div>
                </div>
              );
            })}
          </motion.div>

          {/* ═══ REPUTACIÓN TOTAL ═══ */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.65 }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              padding: '10px 20px', borderRadius: 999,
              background: `linear-gradient(135deg, ${C.cyanGhost}, ${C.purpleFaint})`,
              border: `1px solid ${C.line}`,
              marginBottom: 14,
            }}
          >
            <Sparkles size={14} color={C.gold} />
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.ink, letterSpacing: 0.5 }}>
              Reputación Ómicron
            </span>
            <span style={{ fontFamily: FONT.display, fontSize: 20, fontWeight: 800, color: C.cyan }}>
              {reputation}
            </span>
            <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut }}>/100</span>
          </motion.div>

          {/* ═══ SINERGIAS DETECTADAS ═══ */}
          {synergies.length > 0 && (
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.75 }}
              style={{ padding: '0 24px', width: '100%', maxWidth: 360, marginBottom: 16 }}
            >
              <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase', marginBottom: 8 }}>
                Sinergias activas
              </div>
              {synergies.map((s, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 12px', borderRadius: 10, marginBottom: 6,
                  background: `${C.goldFaint}`, border: `1px solid ${C.gold}33`,
                }}>
                  <span style={{ fontSize: 13 }}>⚡</span>
                  <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.ink, lineHeight: 1.4 }}>{s}</span>
                </div>
              ))}
            </motion.div>
          )}

          {/* ═══ CTA: Explorar el orbe ═══ */}
          <motion.button
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.85 }}
            whileTap={{ scale: 0.96 }}
            onClick={handleExplore}
            style={{
              padding: '14px 28px', borderRadius: 999,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.purple})`,
              border: 'none', cursor: 'pointer',
              fontFamily: FONT.display, fontSize: 14, fontWeight: 700,
              color: '#fff', letterSpacing: 0.3,
              boxShadow: `0 4px 20px ${C.cyan}44`,
              marginBottom: 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
            }}
          >
            Explorar mi Orbe →
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
