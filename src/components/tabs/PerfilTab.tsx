// components/tabs/PerfilTab.tsx
// ═══════════════════════════════════════════════════════════════════════
// PERFIL "MI ADN DIGITAL" — 3 Tarjetas Deslizables (Swipeable Cards)
//
// Card 1: "Mi Identidad" — Orbital solar + Top 3 Skills + Reputación
// Card 2: "Mis Competencias" — Skills con barras de progreso + CV Summary
// Card 3: "Mi Impacto" — 4 Ejes del Gemelo + Accesos directos
//
// Swipe horizontal con snap (Framer Motion drag="x").
// Debajo de las cards: Streak + Dashboard + Challenge (scrollable).
// ═══════════════════════════════════════════════════════════════════════
import { useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';
import { Sparkles, TrendingUp, Zap, Shield, Globe, FileText, CheckCircle2 } from 'lucide-react';
import { useApp, useGemeloDigital } from '../../store/AppContext';
import { C, FONT, SPRING } from '../../theme';
import { StreakBanner } from '../shared/StreakBanner';
import { DailyChallengeCard } from '../shared/DailyChallengeCard';
import { DashboardVivo } from '../shared/DashboardVivo';
import { PushPermissionBanner } from '../shared/PushPermissionBanner';

// ── Colores para cada skill orbital ────────────────────────────────────
const SKILL_COLORS = [C.cyan, C.purple, C.gold, C.green, C.red];
const AXIS_META = [
  { key: 'exec', label: 'Ejecución', color: C.cyan, Icon: Zap },
  { key: 'qual', label: 'Calidad', color: C.purple, Icon: Shield },
  { key: 'trans', label: 'Trascendencia', color: C.gold, Icon: Globe },
  { key: 'fund', label: 'Fundamento', color: C.green, Icon: TrendingUp },
] as const;

const CARD_LABELS = ['Mi Identidad', 'Mis Competencias', 'Mi Impacto'];
const CARD_WIDTH = 320; // px width of each card
const SWIPE_THRESHOLD = 50; // min px para cambiar slide
const SWIPE_VELOCITY = 300; // min velocity para cambiar slide

export function PerfilTab() {
  const { profile, setActiveTab } = useApp();
  const gemelo = useGemeloDigital();
  const [currentSlide, setCurrentSlide] = useState(0);

  const skillsDetail = useMemo(() => {
    const details = profile?.skills_detail ?? [];
    if (details.length > 0) return details;
    return (profile?.skills ?? []).map((s: string, i: number) => ({ name: s, pct: Math.max(30, 85 - i * 8) }));
  }, [profile?.skills_detail, profile?.skills]);

  const top3 = useMemo(() => {
    const sorted = [...skillsDetail].sort((a: { pct: number }, b: { pct: number }) => b.pct - a.pct);
    return sorted.slice(0, 3);
  }, [skillsDetail]);

  const nucleus = top3[0];
  const hasTwo = top3.length >= 2;
  const hasThree = top3.length >= 3;

  const name = profile?.display_name || profile?.full_name || profile?.username || '';
  const years = profile?.cv_years_experience ?? 0;
  const seniorLabel = years >= 10 ? 'Profesional Senior'
    : years >= 5 ? 'Profesional Mid-Senior'
    : years >= 2 ? 'Profesional Mid'
    : 'Profesional';
  const axes = {
    exec: gemelo?.execution ?? profile?.execution_score ?? 0,
    qual: gemelo?.quality ?? profile?.quality_score ?? 0,
    trans: gemelo?.transcendence ?? profile?.transcendence_score ?? 0,
    fund: gemelo?.foundation ?? profile?.foundation_score ?? 0,
  };
  const reputation = gemelo?.overallReputation ?? profile?.reputation_score ?? 0;
  const cvSummary = profile?.cv_summary || '';

  // ── Slide navigation ──────────────────────────────────────────────────
  const goToSlide = useCallback((idx: number) => {
    setCurrentSlide(Math.max(0, Math.min(2, idx)));
  }, []);

  const handleDragEnd = useCallback((_: unknown, info: PanInfo) => {
    const { offset, velocity } = info;
    if (offset.x < -SWIPE_THRESHOLD || velocity.x < -SWIPE_VELOCITY) {
      goToSlide(currentSlide + 1);
    } else if (offset.x > SWIPE_THRESHOLD || velocity.x > SWIPE_VELOCITY) {
      goToSlide(currentSlide - 1);
    }
  }, [currentSlide, goToSlide]);

  if (!profile) return null;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      overflow: 'auto', WebkitOverflowScrolling: 'touch',
      paddingBottom: 'calc(env(safe-area-inset-bottom, 20px) + 24px)',
      width: '100%',
    }}>
      {/* ═══ HEADER: ADN Digital ═══ */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        style={{ textAlign: 'center', paddingTop: 20, marginBottom: 8 }}
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

      {/* ═══ DOTS INDICATOR ═══ */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 12 }}>
        {CARD_LABELS.map((label, i) => (
          <button
            key={label}
            onClick={() => goToSlide(i)}
            aria-label={`Ir a ${label}`}
            style={{
              padding: 0, border: 'none', cursor: 'pointer', background: 'transparent',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <div style={{
              width: i === currentSlide ? 22 : 6,
              height: 6,
              borderRadius: 3,
              background: i === currentSlide ? C.cyan : `${C.cyan}44`,
              transition: 'width 0.3s cubic-bezier(0.32,0.72,0,1), background 0.3s ease',
              boxShadow: i === currentSlide ? `0 0 8px ${C.cyan}66` : 'none',
            }} />
            {i === currentSlide && (
              <span style={{
                fontFamily: FONT.mono, fontSize: 8, color: C.cyan,
                letterSpacing: 0.8, textTransform: 'uppercase',
                opacity: 0.9,
              }}>
                {label}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ═══ SWIPEABLE CARDS CONTAINER ═══ */}
      <div
        style={{
          width: '100%',
          maxWidth: CARD_WIDTH + 40,
          overflow: 'hidden',
          position: 'relative',
          minHeight: 380,
          marginBottom: 16,
        }}
      >
        <motion.div
          drag="x"
          dragConstraints={{ left: -(CARD_WIDTH * 2), right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
          animate={{ x: -currentSlide * CARD_WIDTH }}
          transition={SPRING.default}
          style={{
            display: 'flex',
            width: CARD_WIDTH * 3,
            cursor: 'grab',
            touchAction: 'pan-y',
          }}
        >
          {/* ─── CARD 1: MI IDENTIDAD ─── */}
          <div style={{ width: CARD_WIDTH, flexShrink: 0, padding: '0 10px' }}>
            <div style={{
              borderRadius: 22,
              padding: '20px 16px',
              background: `linear-gradient(145deg, ${C.surface}, ${C.glass})`,
              border: `1px solid ${C.line}`,
              backdropFilter: 'blur(16px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${C.cyanFaint}`,
              minHeight: 340,
              display: 'flex', flexDirection: 'column', alignItems: 'center',
            }}>
              {/* Orbital Visualization */}
              <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 16px', flexShrink: 0 }}>
                {/* Outer ring (skill #3) */}
                {hasThree && (
                  <div aria-hidden="true" style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    border: `1px solid ${SKILL_COLORS[2]}33`,
                    animation: 'cp-spin 25s linear infinite',
                  }}>
                    <motion.div
                      animate={{ boxShadow: [`0 0 6px ${SKILL_COLORS[2]}`, `0 0 16px ${SKILL_COLORS[2]}`, `0 0 6px ${SKILL_COLORS[2]}`] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      style={{
                        position: 'absolute', top: -5, left: '50%', transform: 'translateX(-50%)',
                        width: 10, height: 10, borderRadius: '50%', background: SKILL_COLORS[2],
                      }}
                    />
                  </div>
                )}
                {/* Middle ring (skill #2) */}
                {hasTwo && (
                  <div aria-hidden="true" style={{
                    position: 'absolute', inset: 30, borderRadius: '50%',
                    border: `1.5px solid ${SKILL_COLORS[1]}44`,
                    animation: 'cp-spin 18s linear infinite reverse',
                  }}>
                    <motion.div
                      animate={{ boxShadow: [`0 0 6px ${SKILL_COLORS[1]}`, `0 0 18px ${SKILL_COLORS[1]}`, `0 0 6px ${SKILL_COLORS[1]}`] }}
                      transition={{ duration: 1.8, repeat: Infinity }}
                      style={{
                        position: 'absolute', bottom: -6, left: '50%', transform: 'translateX(-50%)',
                        width: 12, height: 12, borderRadius: '50%', background: SKILL_COLORS[1],
                      }}
                    />
                  </div>
                )}
                {/* Nucleus (skill #1) */}
                {nucleus && (
                  <motion.div
                    animate={{ boxShadow: [
                      `0 0 20px ${SKILL_COLORS[0]}66, inset 0 0 15px ${SKILL_COLORS[0]}33`,
                      `0 0 40px ${SKILL_COLORS[0]}99, inset 0 0 25px ${SKILL_COLORS[0]}55`,
                      `0 0 20px ${SKILL_COLORS[0]}66, inset 0 0 15px ${SKILL_COLORS[0]}33`,
                    ] }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                    style={{
                      position: 'absolute', inset: 60, borderRadius: '50%',
                      background: `radial-gradient(circle at 35% 35%, ${SKILL_COLORS[0]}44, ${C.bg} 70%)`,
                      border: `2px solid ${SKILL_COLORS[0]}88`,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
                    }}
                  >
                    <span style={{ fontFamily: FONT.display, fontSize: 24, fontWeight: 800, color: SKILL_COLORS[0] }}>
                      {nucleus.pct}%
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 7, letterSpacing: 1, color: C.ink, textTransform: 'uppercase', textAlign: 'center', padding: '0 6px', lineHeight: 1.2 }}>
                      {nucleus.name}
                    </span>
                  </motion.div>
                )}
                {/* Synergy lines */}
                {hasTwo && (
                  <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
                    <line x1="50%" y1="20%" x2="50%" y2="38%" stroke={C.cyan} strokeWidth="0.5" opacity="0.3" strokeDasharray="3 3">
                      <animate attributeName="opacity" values="0.2;0.6;0.2" dur="2.5s" repeatCount="indefinite" />
                    </line>
                  </svg>
                )}
              </div>

              {/* Skill labels */}
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                {top3.map((skill: { name: string; pct: number }, i: number) => (
                  <div key={skill.name} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '5px 10px', borderRadius: 999,
                    background: `${SKILL_COLORS[i]}14`, border: `1px solid ${SKILL_COLORS[i]}44`,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: SKILL_COLORS[i], boxShadow: `0 0 4px ${SKILL_COLORS[i]}` }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.ink }}>{skill.name}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: SKILL_COLORS[i], fontWeight: 700 }}>{skill.pct}%</span>
                  </div>
                ))}
              </div>

              {/* Reputación pill */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 999,
                background: `linear-gradient(135deg, ${C.cyanGhost}, ${C.purpleFaint})`,
                border: `1px solid ${C.line}`,
              }}>
                <Sparkles size={12} color={C.gold} />
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.ink }}>Reputación</span>
                <span style={{ fontFamily: FONT.display, fontSize: 18, fontWeight: 800, color: C.cyan }}>{Math.round(reputation)}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.mut }}>/100</span>
              </div>
            </div>
          </div>

          {/* ─── CARD 2: MIS COMPETENCIAS ─── */}
          <div style={{ width: CARD_WIDTH, flexShrink: 0, padding: '0 10px' }}>
            <div style={{
              borderRadius: 22,
              padding: '20px 16px',
              background: `linear-gradient(145deg, ${C.surface}, ${C.glass})`,
              border: `1px solid ${C.line}`,
              backdropFilter: 'blur(16px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${C.purpleFaint}`,
              minHeight: 340,
              overflow: 'hidden',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <FileText size={13} color={C.cyan} />
                <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' }}>CV Convalidado</span>
                <CheckCircle2 size={11} color={C.green} />
              </div>

              {/* Skills progress bars */}
              <div style={{
                borderRadius: 14, padding: '12px 12px 8px',
                background: `linear-gradient(135deg, ${C.glass}, ${C.cyanGhost})`,
                border: `1px solid ${C.line}`, marginBottom: cvSummary ? 12 : 0,
              }}>
                {skillsDetail.slice(0, 6).map((skill: { name: string; pct: number }, i: number) => (
                  <div key={skill.name} style={{ marginBottom: i < Math.min(skillsDetail.length, 6) - 1 ? 7 : 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 11, color: C.ink }}>{skill.name}</span>
                      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: SKILL_COLORS[i % SKILL_COLORS.length], fontWeight: 700 }}>{skill.pct}%</span>
                    </div>
                    <div style={{ height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.pct}%` }}
                        transition={{ delay: 0.3 + i * 0.06, duration: 0.6, ease: 'easeOut' }}
                        style={{
                          height: '100%', borderRadius: 2,
                          background: `linear-gradient(90deg, ${SKILL_COLORS[i % SKILL_COLORS.length]}cc, ${SKILL_COLORS[(i + 1) % SKILL_COLORS.length]}88)`,
                          boxShadow: `0 0 4px ${SKILL_COLORS[i % SKILL_COLORS.length]}44`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* CV Summary */}
              {cvSummary && (
                <div style={{
                  borderRadius: 12, padding: '10px 12px',
                  background: C.glass, border: `1px solid ${C.line}`,
                  position: 'relative', overflow: 'hidden',
                }}>
                  <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 2, borderRadius: 1, background: `linear-gradient(to bottom, ${C.cyan}, ${C.purple}, ${C.gold})`, opacity: 0.6 }} />
                  <div style={{ paddingLeft: 10 }}>
                    <div style={{ fontFamily: FONT.mono, fontSize: 7, letterSpacing: 1.5, color: C.mut, textTransform: 'uppercase', marginBottom: 5 }}>Resumen IA</div>
                    <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 11.5, lineHeight: 1.5, color: C.ink, whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'hidden' }}>
                      {cvSummary.slice(0, 280)}{cvSummary.length > 280 ? '…' : ''}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── CARD 3: MI IMPACTO ─── */}
          <div style={{ width: CARD_WIDTH, flexShrink: 0, padding: '0 10px' }}>
            <div style={{
              borderRadius: 22,
              padding: '20px 16px',
              background: `linear-gradient(145deg, ${C.surface}, ${C.glass})`,
              border: `1px solid ${C.line}`,
              backdropFilter: 'blur(16px)',
              boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 20px ${C.greenFaint}`,
              minHeight: 340,
              display: 'flex', flexDirection: 'column',
            }}>
              {/* Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Globe size={13} color={C.gold} />
                <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase' }}>4 Ejes del Gemelo</span>
              </div>

              {/* 4 Axes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
                {AXIS_META.map(({ key, label, color, Icon }) => {
                  const val = axes[key as keyof typeof axes] ?? 0;
                  return (
                    <div key={key} style={{ padding: '10px 10px', borderRadius: 14, background: `${color}08`, border: `1px solid ${color}33` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                        <Icon size={11} color={color} />
                        <span style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 0.8, color: C.mut, textTransform: 'uppercase' }}>{label}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ flex: 1, height: 4, borderRadius: 2, background: `${color}22` }}>
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${val}%` }}
                            transition={{ delay: 0.4 + 0.1 * AXIS_META.findIndex(a => a.key === key), duration: 0.7, ease: 'easeOut' }}
                            style={{ height: '100%', borderRadius: 2, background: color, boxShadow: `0 0 4px ${color}66` }}
                          />
                        </div>
                        <span style={{ fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, color, minWidth: 24, textAlign: 'right' }}>{val}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Accesos directos */}
              <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                <button onClick={() => setActiveTab('maxskill')} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
                  background: C.glass, border: `1px solid ${C.cyanFaint}`, color: C.cyan,
                  fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <Zap size={11} /> Habilidades
                </button>
                <button onClick={() => setActiveTab('academia')} style={{
                  flex: 1, padding: '10px 0', borderRadius: 12, cursor: 'pointer',
                  background: C.glass, border: `1px solid ${C.purpleFaint}`, color: C.purple,
                  fontFamily: FONT.mono, fontSize: 9, fontWeight: 700, letterSpacing: 0.5,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                }}>
                  <TrendingUp size={11} /> Academia
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* ═══ SWIPE HINT (primera vez) ═══ */}
      <AnimatePresence>
        {currentSlide === 0 && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.5 }}
            style={{
              fontFamily: FONT.mono, fontSize: 9, color: C.mut,
              textAlign: 'center', marginBottom: 12, letterSpacing: 0.5,
            }}
          >
            ← desliza para ver más →
          </motion.p>
        )}
      </AnimatePresence>

      {/* ═══ RETENCIÓN: Streak + Dashboard + Challenge + Push ═══ */}
      <div style={{ width: '100%', maxWidth: 340, padding: '0 16px', marginTop: 4 }}>
        <StreakBanner />
        <DashboardVivo />
        <DailyChallengeCard onNavigate={(tab) => setActiveTab(tab as Parameters<typeof setActiveTab>[0])} />
        <PushPermissionBanner />
      </div>
    </div>
  );
}
