// components/omicron/ConvalidaOmicron.tsx
// ═══════════════════════════════════════════════════════════════════════
// ÓMICRON · Convalidación REAL del Gemelo — AUTOMATIZACIÓN MÁXIMA.
// Componente de presentación: toda la lógica vive en useGemeloActivation.
// Al completar la carga, muestra la NUEVA vista PerfilSkillVisual
// (sistema orbital basado en los top 3 skills del usuario).
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, GraduationCap, Clock, BookOpen, Check, Loader2, Sparkles, Upload, ArrowRight, TrendingUp, Zap } from 'lucide-react';
import { useGemeloActivation } from '../../hooks/useGemeloActivation';
import { PerfilSkillVisual } from '../perfil/PerfilSkillVisual';
import { C, FONT, RADIUS } from '../../theme';
import { computeSteps } from '../../lib/omicronCoach';
import ParticleOrb from './ParticleOrb';

type Kind = 'cv' | 'title' | 'year' | 'vault';

const STEPS: { kind: Kind; label: string; hint: string; Icon: typeof FileText; color: string }[] = [
  { kind: 'cv', label: 'Analizando CV', hint: 'Extrayendo skills y experiencia', Icon: FileText, color: C.cyan },
  { kind: 'title', label: 'Validando título', hint: 'Grado / certificación', Icon: GraduationCap, color: C.purple },
  { kind: 'year', label: 'Años de experiencia', hint: 'Trayectoria reconocida', Icon: Clock, color: C.gold },
  { kind: 'vault', label: 'Aporte a la Bóveda', hint: 'Conocimiento integrado', Icon: BookOpen, color: C.green },
];

export default function ConvalidaOmicron({ onClose, onViewProfile }: { onClose: () => void; onViewProfile?: () => void }) {
  const {
    phase, currentStep, completedSteps, dossier, ai,
    cvText, setCvText, cvFileName, msg, pushes, synergies,
    rep, hasExistingCV, gemelo,
    onCVFile, activateGemeloCompleto,
  } = useGemeloActivation();

  // Estado para la nueva vista PerfilSkillVisual (post-dossier)
  const [showSkillVisual, setShowSkillVisual] = useState(false);

  // ── PHASE: SYNCING ──────────────────────────────────────────────────
  if (phase === 'syncing') {
    const progress = (completedSteps.length / STEPS.length) * 100;
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: 'radial-gradient(130% 100% at 50% 10%, rgba(8,14,30,0.98), #000 70%)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 22%, #000, transparent 74%)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.cyan }}>SINCRONIZANDO GEMELO</span>
          <Loader2 size={18} color={C.cyan} style={{ animation: 'cp-spin 0.8s linear infinite' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 2, height: 160, flexShrink: 0 }}>
          <ParticleOrb />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
            <motion.div key={rep} initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 36, color: '#fff', textShadow: `0 0 24px ${C.cyan}` }}>
              {rep}
            </motion.div>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: C.mut, textTransform: 'uppercase' }}>Reputación</span>
          </div>
        </div>

        {/* Push notifications */}
        <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', top: 80, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <AnimatePresence>
            {pushes.map((p) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: 40, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 999, background: `${p.color}22`, border: `1px solid ${p.color}66`, backdropFilter: 'blur(8px)' }}>
                <TrendingUp size={12} color={p.color} />
                <span style={{ fontFamily: FONT.mono, fontSize: 11, color: p.color, fontWeight: 700 }}>+{p.delta}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.ink }}>{p.label}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 20px', marginBottom: 16 }}
          role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}
          aria-label={`Sincronizando Gemelo Digital: ${Math.round(progress)}% completado`}>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${C.cyan}, ${C.purple}, ${C.gold})`, boxShadow: `0 0 12px ${C.cyan}66` }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.mut }}>{Math.round(progress)}% completado</span>
            <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyan }}>{completedSteps.length}/{STEPS.length}</span>
          </div>
        </div>

        {/* Steps list */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '0 18px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {STEPS.map((step, i) => {
              const isDone = completedSteps.includes(step.kind);
              const isActive = currentStep === i && !isDone;
              const Icon = step.Icon;
              return (
                <motion.div key={step.kind}
                  initial={{ opacity: 0.5 }}
                  animate={{ opacity: isDone || isActive ? 1 : 0.4 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: RADIUS.lg, background: isActive ? `${step.color}14` : isDone ? `${C.green}0a` : C.glass, border: `1px solid ${isActive ? step.color : isDone ? C.green : C.line}44` }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${isDone ? C.green : step.color}18` }}>
                    {isDone ? <Check size={16} color={C.green} /> : isActive ? <Loader2 size={16} color={step.color} style={{ animation: 'cp-spin 0.8s linear infinite' }} /> : <Icon size={16} color={step.color} />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: isDone ? C.green : isActive ? '#fff' : C.mut }}>{step.label}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.mut, marginTop: 2 }}>{isDone ? '✓ Completado' : step.hint}</div>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', margin: '16px 0', fontFamily: FONT.body, fontSize: 13.5, color: C.ink, lineHeight: 1.5 }}>{msg}</p>
        </div>
      </div>
    );
  }

  // ── PHASE: DOSSIER ──────────────────────────────────────────────────
  if (phase === 'dossier' && dossier) {
    const ARCH: Record<string, string> = { estudiante: 'Aprendiz', junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead · Arquitecto', pro: 'Profesional' };
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: 'radial-gradient(130% 100% at 50% 6%, rgba(8,16,34,0.98), #000 70%)' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 22%, #000, transparent 74%)' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.gold }}>DOSSIER DE EXPERTICIA</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        <div style={{ position: 'relative', zIndex: 2, height: 130, flexShrink: 0 }}>
          <ParticleOrb glowIntensity={0.6} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, color: C.mut, textTransform: 'uppercase' }}>Ómicron te reconoce como</div>
          <h2 style={{ margin: '6px 0 4px', fontFamily: FONT.display, fontWeight: 800, fontSize: 26, color: '#fff', letterSpacing: -0.4 }}>{dossier.seniorLabel}</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyan, padding: '4px 10px', borderRadius: 999, background: C.cyanGhost, border: `1px solid ${C.cyanFaint}` }}>{ARCH[dossier.arch] ?? dossier.arch}</span>
            {dossier.years > 0 && <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.gold, padding: '4px 10px', borderRadius: 999, background: C.goldFaint, border: `1px solid ${C.goldDim}` }}>{dossier.years} {dossier.years === 1 ? 'año' : 'años'}</span>}
          </div>

          {/* Skills with % bars */}
          <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.2, color: C.mut, textTransform: 'uppercase', marginBottom: 8 }}>Skills · % de dominio</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, textAlign: 'left' }}>
            {(dossier.skillsDetail?.length ? dossier.skillsDetail : dossier.labels.map((name) => ({ name, pct: 60 }))).map((s) => (
              <div key={s.name}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: 12.5, color: '#eaf4ff' }}>{s.name}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyan }}>{s.pct}%</span>
                </div>
                <div style={{ height: 5, borderRadius: 3, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <motion.div initial={{ width: 0 }} animate={{ width: `${s.pct}%` }} transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ height: '100%', borderRadius: 3, background: `linear-gradient(90deg, ${C.purple}, ${C.cyan})`, boxShadow: `0 0 8px ${C.cyan}66` }} />
                </div>
              </div>
            ))}
          </div>

          {/* 4 Axes */}
          {gemelo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
              {([['Ejecución', gemelo.execution, C.cyan], ['Calidad', gemelo.quality, C.purple], ['Trasc.', gemelo.transcendence, C.gold], ['Fund.', gemelo.foundation, C.green]] as [string, number, string][]).map(([lbl, val, col]) => (
                <div key={lbl} style={{ padding: '8px', borderRadius: 12, background: C.glass, border: `1px solid ${C.line}` }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: 8.5, textTransform: 'uppercase', color: C.mut }}>{lbl}</div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 16, color: col }}>{Math.round(val)}</div>
                </div>
              ))}
            </div>
          )}

          {/* Synergies */}
          {synergies.length > 0 && (
            <div style={{ textAlign: 'left', borderRadius: RADIUS.lg, padding: '13px 14px', marginBottom: 14, background: `linear-gradient(135deg, ${C.gold}14, rgba(255,255,255,0.03))`, border: `1px solid ${C.goldDim}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Zap size={14} color={C.gold} />
                <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.gold }}>Sinergias detectadas</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {synergies.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.ink, lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Summary */}
          {(ai.loading || ai.text) && (
            <div style={{ textAlign: 'left', borderRadius: RADIUS.lg, padding: '13px 14px', marginTop: 4, background: `linear-gradient(135deg, ${C.cyan}14, rgba(255,255,255,0.03))`, border: `1px solid ${C.cyanFaint}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                <Sparkles size={14} color={C.cyan} />
                <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.4, textTransform: 'uppercase', color: C.cyan }}>Análisis de Ómicron</span>
              </div>
              {ai.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.mut, fontFamily: FONT.body, fontSize: 13 }}>
                  <Loader2 size={14} style={{ animation: 'cp-spin 0.8s linear infinite' }} /> Leyendo tu perfil…
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 13.5, lineHeight: 1.55, color: C.ink, whiteSpace: 'pre-wrap' }}>{ai.text}</p>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, padding: '0 18px', position: 'relative', zIndex: 2, marginBottom: 10 }}>
          <button onClick={() => setShowSkillVisual(true)} style={{ flex: 1, padding: '13px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Ver mi perfil completo</button>
          <button onClick={onClose} style={{ padding: '13px 20px', borderRadius: 14, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}`, color: C.ink, fontFamily: FONT.display, fontWeight: 700, fontSize: 15 }}>Listo</button>
        </div>

        {/* ═══ OPORTUNIDADES DE MEJORA (post-CV) ═══ */}
        <div style={{ padding: '0 18px 16px', position: 'relative', zIndex: 2 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase', marginBottom: 10 }}>
            ⬡ Tu ruta de mejora
          </div>
          {(() => {
            const gemelo = {
              execution: dossier.axes?.exec ?? 0, quality: dossier.axes?.qual ?? 0,
              transcendence: dossier.axes?.trans ?? 0, foundation: dossier.axes?.fund ?? 0,
              overallReputation: rep,
            };
            const fakeProfile = { skills: dossier.labels ?? [], pe_points: 0, traditional_score: 30 } as any;
            const steps = computeSteps(fakeProfile, gemelo).slice(0, 3);
            return steps.map((s: { id: string; title: string; why: string; accent: string; actionLabel: string }) => (
              <div key={s.id} style={{
                padding: '10px 12px', borderRadius: 12, marginBottom: 8,
                background: `${s.accent}08`, border: `1px solid ${s.accent}33`,
              }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.ink, marginBottom: 4 }}>{s.title}</div>
                <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.mut, lineHeight: 1.4 }}>{s.why.slice(0, 120)}</div>
              </div>
            ));
          })()}
        </div>

        {/* ═══ NUEVA VISTA: Perfil Skill Visual (top 3 skills orbital) ═══ */}
        <PerfilSkillVisual
          isOpen={showSkillVisual}
          onClose={() => setShowSkillVisual(false)}
          name={dossier.name || 'Tu Gemelo Digital'}
          seniorLabel={dossier.seniorLabel}
          years={dossier.years}
          skillsDetail={dossier.skillsDetail?.length ? dossier.skillsDetail : dossier.labels.map((name) => ({ name, pct: 60 }))}
          axes={dossier.axes}
          reputation={rep}
          synergies={synergies}
          cvSummary={dossier.summary || ai.text}
          onExplore={() => { setShowSkillVisual(false); onClose(); }}
        />
      </div>
    );
  }

  // ── PHASE: UPLOAD ───────────────────────────────────────────────────
  const canActivate = !!cvText.trim();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: 'radial-gradient(130% 100% at 50% 10%, rgba(8,14,30,0.98), rgba(2,3,10,0.99) 60%, #000 100%)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' }}>
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.grid} 1px, transparent 1px), linear-gradient(90deg, ${C.grid} 1px, transparent 1px)`, backgroundSize: '44px 44px', maskImage: 'radial-gradient(circle at 50% 26%, #000, transparent 74%)' }} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 18px', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>{hasExistingCV ? 'ACTUALIZAR CV' : 'ACTIVAR GEMELO'}</span>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 36, height: 36, borderRadius: 12, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </div>

      <div style={{ position: 'relative', zIndex: 2, height: 150, flexShrink: 0 }}>
        <ParticleOrb />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
          <motion.div key={rep} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 38, color: '#fff', textShadow: '0 0 24px rgba(92,200,255,0.6)' }}>
            {rep}
          </motion.div>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 2, color: C.mut, textTransform: 'uppercase' }}>Reputación real</span>
        </div>
      </div>

      <p style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '6px 20px 10px', fontFamily: FONT.body, fontSize: 13.5, lineHeight: 1.5, color: C.ink, minHeight: 40 }}>{msg}</p>

      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 18px' }}>
        {hasExistingCV && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: RADIUS.md, background: C.greenFaint, border: `1px solid ${C.greenDim}`, marginBottom: 12 }}>
            <Check size={14} color={C.green} />
            <span style={{ fontFamily: FONT.body, fontSize: 12, color: C.green }}>CV anterior detectado — subí uno nuevo para actualizar tu Gemelo</span>
          </div>
        )}

        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '26px 16px', borderRadius: RADIUS.lg, border: `1.5px dashed ${C.cyanDim}`, background: C.cyanGhost, cursor: 'pointer', marginBottom: 14, textAlign: 'center' }}>
          <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCVFile(f); e.currentTarget.value = ''; }} />
          <Upload size={26} color={C.cyan} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>{cvFileName || 'Subir CV (PDF · Word · TXT)'}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut }}>Lee cualquier PDF o Word — sube uno nuevo cuando quieras</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut }}>o pegá tu experiencia</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        <label htmlFor="cv-textarea" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Experiencia profesional</label>
        <textarea id="cv-textarea" value={cvText} onChange={(e) => setCvText(e.target.value)}
          placeholder="Rol actual, años de experiencia, tecnologías, contratos, certificaciones, empresas donde trabajaste (dependiente o freelance)…"
          style={{ width: '100%', minHeight: 120, borderRadius: RADIUS.md, border: `1px solid ${C.line}`, background: 'rgba(8,12,22,0.8)', color: C.ink, fontFamily: FONT.body, fontSize: 14, padding: 13, outline: 'none', resize: 'vertical' }} />
      </div>

      <div style={{ padding: '10px 18px calc(env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', zIndex: 2 }}>
        <motion.button
          onClick={() => void activateGemeloCompleto()}
          disabled={!canActivate}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '15px 0', borderRadius: 14, border: 'none', cursor: canActivate ? 'pointer' : 'default', opacity: canActivate ? 1 : 0.5, background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canActivate ? '0 8px 32px rgba(92,200,255,0.4)' : 'none' }}>
          <Zap size={18} /> Activar Gemelo Completo <ArrowRight size={17} />
        </motion.button>
        <p style={{ textAlign: 'center', margin: '8px 0 0', fontFamily: FONT.mono, fontSize: 9.5, color: C.mut }}>
          Analiza CV + valida título + años + aportes — todo automático
        </p>
      </div>
    </div>
  );
}
