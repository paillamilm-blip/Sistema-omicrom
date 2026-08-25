// components/omicron/ConvalidaOmicron.tsx
// ═══════════════════════════════════════════════════════════════════════
// OMICRON - Convalidacion REAL del Gemelo - AUTOMATIZACION MAXIMA.
// Componente de presentacion: toda la logica vive en useGemeloActivation.
// Al completar la carga, muestra la NUEVA vista PerfilSkillVisual
// (sistema orbital basado en los top 3 skills del usuario).
//
// REDESIGN: Landing Pro + Pixel Perfect design language.
// - Background: solid #000206 (no grid, no radial gradients)
// - Colors: getUserColor() for all accents
// - Cards: OmicronCard glass style
// - Typography: FONT.display / FONT.body / FONT.mono
// - Spacing: multiples of 4px only
// - Border-radius: RADIUS tokens (8/12/16/22/999)
// - Touch targets: min 44px
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, GraduationCap, Clock, BookOpen, Check, Loader2, Sparkles, Upload, ArrowRight, TrendingUp, Zap, RotateCcw } from 'lucide-react';
import { useGemeloActivation } from '@/hooks/useGemeloActivation';
import { PerfilSkillVisual } from '@/features/gemelo/components/PerfilSkillVisual';
import { C, FONT, RADIUS, SIZE } from '@/theme';
import { getUserColor } from '@/shared/components/ColorPicker';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { OmicronCard, ProgressBar, Chip } from '@/shared/components/OmicronChrome';
import { computeSteps } from '@/features/omicron/services/coach';

type Kind = 'cv' | 'title' | 'year' | 'vault';

const STEPS: { kind: Kind; label: string; hint: string; Icon: typeof FileText; color: string }[] = [
  { kind: 'cv', label: 'Analizando CV', hint: 'Extrayendo skills y experiencia', Icon: FileText, color: '#5cc8ff' },
  { kind: 'title', label: 'Validando titulo', hint: 'Grado / certificacion', Icon: GraduationCap, color: '#5e5ce6' },
  { kind: 'year', label: 'Anos de experiencia', hint: 'Trayectoria reconocida', Icon: Clock, color: '#ffb02e' },
  { kind: 'vault', label: 'Aporte a la Boveda', hint: 'Conocimiento integrado', Icon: BookOpen, color: '#3fd0c9' },
];

export default function ConvalidaOmicron({ onClose, onViewProfile: _onViewProfile }: { onClose: () => void; onViewProfile?: () => void }) {
  const uc = getUserColor();

  const {
    phase, currentStep, completedSteps, dossier, ai,
    cvText, setCvText, cvFileName, msg, pushes, synergies,
    rep, hasExistingCV, gemelo,
    onCVFile, activateGemeloCompleto, cancelActivation,
  } = useGemeloActivation();

  // State for PerfilSkillVisual (post-dossier)
  const [showSkillVisual, setShowSkillVisual] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(false);

  // Detect error state (AI failed, returned to upload with error message)
  const isError = phase === 'upload' && (msg.toLowerCase().includes('no se pudo') || msg.toLowerCase().includes('tardó demasiado') || msg.toLowerCase().includes('timeout'));

  // Darker variant of user color for gradient
  const ucDark = uc + 'cc';

  // Retry with cooldown (exponential: 2s, 4s, 8s)
  const handleRetry = () => {
    if (retryCooldown) return;
    setRetryCount((c) => c + 1);
    const delay = Math.min(8000, 2000 * Math.pow(2, retryCount));
    setRetryCooldown(true);
    setTimeout(() => setRetryCooldown(false), delay);
    void activateGemeloCompleto();
  };

  // ── PHASE: SYNCING ──────────────────────────────────────────────────
  if (phase === 'syncing') {
    const progress = (completedSteps.length / STEPS.length) * 100;
    const orbNodes = 5 + Math.round((completedSteps.length / STEPS.length) * 15);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: uc }}>SINCRONIZANDO GEMELO</span>
          <button
            onClick={cancelActivation}
            aria-label="Cancelar análisis"
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 12px', borderRadius: RADIUS.pill,
              background: `${C.red}14`, border: `1px solid ${C.red}44`,
              color: C.red, fontFamily: FONT.mono, fontSize: SIZE.xxs,
              cursor: 'pointer', minHeight: 36,
            }}
          >
            <X size={14} />
            Cancelar
          </button>
        </div>

        {/* GeodesicOrb (grows as steps complete) */}
        <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0 16px' }}>
          <GeodesicOrb size={120} nodes={orbNodes} color={uc} spinning={20} intensity={0.7} breathing />
        </div>

        {/* Push notifications */}
        <div aria-live="polite" aria-atomic="false" style={{ position: 'fixed', top: 80, right: 16, zIndex: 100, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <AnimatePresence>
            {pushes.map((p) => (
              <motion.div key={p.id}
                initial={{ opacity: 0, x: 40, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 40, scale: 0.8 }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: RADIUS.pill, background: `${p.color}18`, border: `1px solid ${p.color}44`, backdropFilter: 'blur(8px)' }}>
                <TrendingUp size={12} color={p.color} />
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: p.color, fontWeight: 700 }}>+{p.delta}</span>
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>{p.label}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Progress bar */}
        <div style={{ position: 'relative', zIndex: 2, padding: '0 20px', marginBottom: 16 }}
          role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100}
          aria-label={`Sincronizando Gemelo Digital: ${Math.round(progress)}% completado`}>
          <ProgressBar pct={progress} color={uc} height={6} />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>{Math.round(progress)}% completado</span>
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: uc }}>{completedSteps.length}/{STEPS.length}</span>
          </div>
        </div>

        {/* Steps list */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '0 20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {STEPS.map((step, i) => {
              const isDone = completedSteps.includes(step.kind);
              const isActive = currentStep === i && !isDone;
              const Icon = step.Icon;
              return (
                <OmicronCard key={step.kind}
                  accent={isActive ? uc : undefined}
                  glow={isActive}
                  style={{
                    padding: 12,
                    opacity: isDone || isActive ? 1 : 0.5,
                    border: isDone ? `1px solid ${C.green}44` : isActive ? `1px solid ${uc}66` : `1px solid ${C.line}`,
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: RADIUS.md, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${isDone ? C.green : step.color}18`, flexShrink: 0 }}>
                      {isDone ? <Check size={18} color={C.green} /> : isActive ? <Loader2 size={18} color={step.color} style={{ animation: 'cp-spin 0.8s linear infinite' }} /> : <Icon size={18} color={step.color} />}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, color: isDone ? C.green : isActive ? C.ink : C.mut }}>{step.label}</div>
                      <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, marginTop: 4 }}>{isDone ? '✓ Completado' : step.hint}</div>
                    </div>
                  </div>
                </OmicronCard>
              );
            })}
          </div>
          <p style={{ textAlign: 'center', margin: '16px 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.5 }}>
            {msg}
          </p>
          {/* Pulsing indicator during AI wait (step 0, no completions yet) */}
          {completedSteps.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 8 }}>
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: uc }}
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: uc }}
              />
              <motion.div
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
                style={{ width: 8, height: 8, borderRadius: '50%', background: uc }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── PHASE: DOSSIER ──────────────────────────────────────────────────
  if (phase === 'dossier' && dossier) {
    const ARCH: Record<string, string> = { estudiante: 'Aprendiz', junior: 'Junior', mid: 'Mid', senior: 'Senior', lead: 'Lead - Arquitecto', pro: 'Profesional' };
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: C.gold }}>DOSSIER DE EXPERTICIA</span>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 44, height: 44, borderRadius: RADIUS.md, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', textAlign: 'center' }}>
          <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1.4, color: C.mut, textTransform: 'uppercase' }}>Omicron te reconoce como</div>
          <h2 style={{ margin: '8px 0 8px', fontFamily: FONT.display, fontWeight: 800, fontSize: SIZE.xxl, color: '#fff', letterSpacing: -0.4 }}>{dossier.seniorLabel}</h2>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
            <Chip color={uc}>{ARCH[dossier.arch] ?? dossier.arch}</Chip>
            {dossier.years > 0 && <Chip color={C.gold}>{dossier.years} {dossier.years === 1 ? 'ano' : 'anos'}</Chip>}
          </div>

          {/* Skills with ProgressBar */}
          <OmicronCard style={{ marginBottom: 16, textAlign: 'left' }}>
            <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1.2, color: C.mut, textTransform: 'uppercase', marginBottom: 12 }}>Skills - % de dominio</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {(dossier.skillsDetail?.length ? dossier.skillsDetail : dossier.labels.map((name) => ({ name, pct: 60 }))).map((s) => (
                <div key={s.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontFamily: FONT.display, fontWeight: 600, fontSize: SIZE.sm, color: C.ink }}>{s.name}</span>
                    <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: uc }}>{s.pct}%</span>
                  </div>
                  <ProgressBar pct={s.pct} color={uc} height={5} />
                </div>
              ))}
            </div>
          </OmicronCard>

          {/* 4 Axes */}
          {gemelo && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginBottom: 16 }}>
              {([['Ejecucion', gemelo.execution, uc], ['Calidad', gemelo.quality, C.purple], ['Trasc.', gemelo.transcendence, C.gold], ['Fund.', gemelo.foundation, C.green]] as [string, number, string][]).map(([lbl, val, col]) => (
                <OmicronCard key={lbl} style={{ padding: 8, textAlign: 'center' }}>
                  <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, textTransform: 'uppercase', color: C.mut }}>{lbl}</div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.lg, color: col, marginTop: 4 }}>{Math.round(val)}</div>
                </OmicronCard>
              ))}
            </div>
          )}

          {/* Synergies */}
          {synergies.length > 0 && (
            <OmicronCard accent={C.gold} style={{ textAlign: 'left', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Zap size={14} color={C.gold} />
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1.4, textTransform: 'uppercase', color: C.gold }}>Sinergias detectadas</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {synergies.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.gold, flexShrink: 0 }} />
                    <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.4 }}>{s}</span>
                  </div>
                ))}
              </div>
            </OmicronCard>
          )}

          {/* AI Summary */}
          {(ai.loading || ai.text) && (
            <OmicronCard accent={uc} style={{ textAlign: 'left', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={14} color={uc} />
                <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 1.4, textTransform: 'uppercase', color: uc }}>Analisis de Omicron</span>
              </div>
              {ai.loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.mut, fontFamily: FONT.body, fontSize: SIZE.sm }}>
                  <Loader2 size={14} style={{ animation: 'cp-spin 0.8s linear infinite' }} /> Leyendo tu perfil...
                </div>
              ) : (
                <p style={{ margin: 0, fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.55, color: C.ink, whiteSpace: 'pre-wrap' }}>{ai.text}</p>
              )}
            </OmicronCard>
          )}

          {/* Opportunities / Coach recommendations */}
          <OmicronCard accent={uc} style={{ textAlign: 'left', marginBottom: 16 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, letterSpacing: 1.5, color: uc, textTransform: 'uppercase', marginBottom: 12 }}>
              Tu ruta de mejora
            </div>
            {(() => {
              const gData = {
                execution: dossier.axes?.exec ?? 0, quality: dossier.axes?.qual ?? 0,
                transcendence: dossier.axes?.trans ?? 0, foundation: dossier.axes?.fund ?? 0,
                overallReputation: rep,
              };
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const fakeProfile = { skills: dossier.labels ?? [], pe_points: 0, traditional_score: 30 } as any;
              const steps = computeSteps(fakeProfile, gData).slice(0, 3);
              return steps.map((s: { id: string; title: string; why: string; accent: string; actionLabel: string }) => (
                <div key={s.id} style={{
                  padding: '12px', borderRadius: RADIUS.md, marginBottom: 8,
                  background: `${s.accent}08`, border: `1px solid ${s.accent}33`,
                }}>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, color: C.ink, marginBottom: 4 }}>{s.title}</div>
                  <div style={{ fontFamily: FONT.body, fontSize: SIZE.xs, color: C.mut, lineHeight: 1.4 }}>{s.why.slice(0, 120)}</div>
                </div>
              ));
            })()}
          </OmicronCard>
        </div>

        {/* Bottom CTA */}
        <div style={{ display: 'flex', gap: 8, padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 12px)', position: 'relative', zIndex: 2 }}>
          <motion.button onClick={() => setShowSkillVisual(true)} whileTap={{ scale: 0.97 }}
            style={{ flex: 1, padding: '14px 0', borderRadius: RADIUS.lg, border: 'none', cursor: 'pointer', background: `linear-gradient(135deg, ${uc}, ${ucDark})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, minHeight: 52 }}>
            Ver mi perfil completo
          </motion.button>
          <button onClick={onClose} style={{ padding: '14px 20px', borderRadius: RADIUS.lg, cursor: 'pointer', background: C.glass, border: `1px solid ${C.line}`, color: C.ink, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, minHeight: 52 }}>Listo</button>
        </div>

        {/* Perfil Skill Visual (orbital view) */}
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
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>{hasExistingCV ? 'ACTUALIZAR CV' : 'ACTIVAR GEMELO'}</span>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 44, height: 44, borderRadius: RADIUS.md, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </div>

      {/* GeodesicOrb (small, breathing) */}
      <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0 12px' }}>
        <GeodesicOrb size={80} nodes={5} color={uc} spinning={25} intensity={0.6} breathing />
      </div>

      {/* Message */}
      <p style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '4px 20px 12px', fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.5, color: isError ? C.red : C.ink, minHeight: 40 }}>{msg}</p>

      {/* Error retry button */}
      {isError && (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <motion.button
            onClick={handleRetry}
            disabled={retryCooldown}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: RADIUS.lg, border: `1px solid ${retryCooldown ? C.mut : C.red}44`, background: `${retryCooldown ? C.mut : C.red}14`, color: retryCooldown ? C.mut : C.red, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, cursor: retryCooldown ? 'default' : 'pointer', minHeight: 44, opacity: retryCooldown ? 0.6 : 1 }}>
            <RotateCcw size={16} style={retryCooldown ? { animation: 'cp-spin 0.8s linear infinite' } : undefined} />
            {retryCooldown ? 'Esperando…' : retryCount > 0 ? `Reintentar (${retryCount + 1}º intento)` : 'Reintentar'}
          </motion.button>
          {retryCount >= 2 && (
            <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut, textAlign: 'center' }}>
              Si el problema persiste, verificá tu conexión o intentá más tarde.
            </span>
          )}
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 20px' }}>
        {hasExistingCV && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: RADIUS.md, background: C.greenFaint, border: `1px solid ${C.greenDim}`, marginBottom: 12 }}>
            <Check size={14} color={C.green} />
            <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.green }}>CV anterior detectado - subi uno nuevo para actualizar tu Gemelo</span>
          </div>
        )}

        {/* Upload area - OmicronCard style with dashed border */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', borderRadius: RADIUS.xl, border: `1.5px dashed ${uc}55`, background: C.glass, cursor: 'pointer', marginBottom: 16, textAlign: 'center', backdropFilter: 'blur(14px)' }}>
          <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCVFile(f); e.currentTarget.value = ''; }} />
          <Upload size={24} color={uc} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, color: C.ink }}>{cvFileName || 'Subir CV (PDF - Word - TXT)'}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Lee cualquier PDF o Word</span>
        </label>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>o pega tu experiencia</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        {/* Textarea */}
        <label htmlFor="cv-textarea" className="sr-only" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>Experiencia profesional</label>
        <textarea id="cv-textarea" value={cvText} onChange={(e) => setCvText(e.target.value)}
          placeholder="Rol actual, anos de experiencia, tecnologias, contratos, certificaciones, empresas donde trabajaste..."
          style={{ width: '100%', minHeight: 120, borderRadius: RADIUS.md, border: `1px solid ${uc}4d`, background: 'rgba(12,16,30,0.8)', color: C.ink, fontFamily: FONT.body, fontSize: SIZE.sm, padding: 16, outline: 'none', resize: 'vertical' }} />
      </div>

      {/* CTA Button */}
      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', zIndex: 2 }}>
        <motion.button
          onClick={() => void activateGemeloCompleto()}
          disabled={!canActivate}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '16px 0', borderRadius: RADIUS.lg, border: 'none', cursor: canActivate ? 'pointer' : 'default', opacity: canActivate ? 1 : 0.5, background: `linear-gradient(135deg, ${uc}, ${ucDark})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canActivate ? `0 8px 32px ${uc}44` : 'none', minHeight: 52 }}>
          <Zap size={18} /> Activar Gemelo Completo <ArrowRight size={17} />
        </motion.button>
        <p style={{ textAlign: 'center', margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>
          Analiza CV + valida titulo + anos + aportes - todo automatico
        </p>
      </div>
    </div>
  );
}
