// components/omicron/ConvalidaOmicron.tsx
// ═══════════════════════════════════════════════════════════════════════
// OMICRON - Activación del Gemelo Digital — Experience-First.
//
// FLUJO NUEVO:
//   1. Upload (cualquier usuario) → sube CV o pega texto
//   2. Syncing (análisis IA o local, sin auth)
//   3. GemeloReveal (experiencia WOW de 5 actos — sin auth)
//      → Al final el usuario elige "Activar" → persiste (pide auth si falta)
//
// Ya no existe la fase "dossier" vieja. GemeloReveal la reemplaza completamente.
// ═══════════════════════════════════════════════════════════════════════
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Upload, ArrowRight, TrendingUp, Zap, RotateCcw } from 'lucide-react';
import { useGemeloActivation } from '@/hooks/useGemeloActivation';
import { GemeloReveal } from './GemeloReveal';
import { C, FONT, RADIUS, SIZE } from '@/theme';
import { getUserColor } from '@/shared/components/ColorPicker';
import { GeodesicOrb } from '@/shared/components/GeodesicOrb';
import { ProgressBar } from '@/shared/components/OmicronChrome';

export default function ConvalidaOmicron({ onClose }: { onClose: () => void }) {
  const uc = getUserColor();

  const {
    phase, currentStep, completedSteps, dossier,
    cvText, setCvText, cvFileName, msg, pushes, lastError,
    hasExistingCV, profile,
    onCVFile, activateGemeloCompleto, cancelActivation, persistAnalysis,
  } = useGemeloActivation();

  const [retryCount, setRetryCount] = useState(0);
  const [retryCooldown, setRetryCooldown] = useState(false);

  // Detect error state
  const isError = phase === 'upload' && lastError !== null;

  // Retry with cooldown
  const handleRetry = () => {
    if (retryCooldown) return;
    setRetryCount((c) => c + 1);
    const delay = Math.min(8000, 2000 * Math.pow(2, retryCount));
    setRetryCooldown(true);
    setTimeout(() => setRetryCooldown(false), delay);
    void activateGemeloCompleto();
  };

  // ══════════════════════════════════════════════════════════════════════
  // PHASE: REVEAL — GemeloReveal (5 actos WOW)
  // ══════════════════════════════════════════════════════════════════════
  if (phase === 'reveal' && dossier) {
    return (
      <GemeloReveal
        analyzed={dossier}
        isAuthenticated={!!profile?.id}
        onActivate={() => void persistAnalysis()}
      />
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE: SYNCING — La orbe crece mientras analiza
  // ══════════════════════════════════════════════════════════════════════
  if (phase === 'syncing') {
    const orbNodes = 5 + Math.round((currentStep / 4) * 12);
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: uc }}>ANALIZANDO TU CV</span>
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

        {/* GeodesicOrb (grows during analysis) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 2 }}>
          <GeodesicOrb size={160} nodes={orbNodes} color={uc} spinning={18} intensity={0.75} breathing />

          {/* Progress message */}
          <p style={{ textAlign: 'center', margin: '24px 20px 0', fontFamily: FONT.body, fontSize: SIZE.sm, color: C.ink, lineHeight: 1.5 }}>
            {msg}
          </p>

          {/* Pulsing dots */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 }}>
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} style={{ width: 8, height: 8, borderRadius: '50%', background: uc }} />
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }} style={{ width: 8, height: 8, borderRadius: '50%', background: uc }} />
            <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }} style={{ width: 8, height: 8, borderRadius: '50%', background: uc }} />
          </div>
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
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  // PHASE: UPLOAD — Subir CV o pegar texto
  // ══════════════════════════════════════════════════════════════════════
  const canActivate = !!cvText.trim();
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column', background: C.bg }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', position: 'relative', zIndex: 2 }}>
        <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, letterSpacing: 2, textTransform: 'uppercase', color: C.ink }}>ACTIVAR GEMELO</span>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 44, height: 44, borderRadius: RADIUS.md, border: `1px solid ${C.line}`, background: C.glass, color: C.ink, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><X size={18} /></button>
      </div>

      {/* GeodesicOrb (small, breathing) */}
      <div style={{ position: 'relative', zIndex: 2, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 0 12px' }}>
        <GeodesicOrb size={80} nodes={5} color={uc} spinning={25} intensity={0.6} breathing />
      </div>

      {/* Message */}
      <p style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '4px 20px 12px', fontFamily: FONT.body, fontSize: SIZE.sm, lineHeight: 1.5, color: isError ? C.red : C.ink, minHeight: 40 }}>{msg}</p>

      {/* Error retry button */}
      {isError && lastError !== 'credits' && (
        <div style={{ position: 'relative', zIndex: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <motion.button
            onClick={handleRetry}
            disabled={retryCooldown}
            whileTap={{ scale: 0.95 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: RADIUS.lg, border: `1px solid ${retryCooldown ? C.mut : C.red}44`, background: `${retryCooldown ? C.mut : C.red}14`, color: retryCooldown ? C.mut : C.red, fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.sm, cursor: retryCooldown ? 'default' : 'pointer', minHeight: 44, opacity: retryCooldown ? 0.6 : 1 }}>
            <RotateCcw size={16} style={retryCooldown ? { animation: 'cp-spin 0.8s linear infinite' } : undefined} />
            {retryCooldown ? 'Esperando…' : retryCount > 0 ? `Reintentar (${retryCount + 1}º intento)` : 'Reintentar'}
          </motion.button>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', position: 'relative', zIndex: 2, padding: '4px 20px' }}>
        {hasExistingCV && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', borderRadius: RADIUS.md, background: C.greenFaint, border: `1px solid ${C.greenDim}`, marginBottom: 12 }}>
            <Check size={14} color={C.green} />
            <span style={{ fontFamily: FONT.body, fontSize: SIZE.sm, color: C.green }}>CV anterior detectado — subí uno nuevo para actualizar</span>
          </div>
        )}

        {/* Upload area */}
        <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '28px 16px', borderRadius: RADIUS.xl, border: `1.5px dashed ${uc}55`, background: C.glass, cursor: 'pointer', marginBottom: 16, textAlign: 'center', backdropFilter: 'blur(14px)' }}>
          <input type="file" accept=".pdf,.doc,.docx,.txt" style={{ display: 'none' }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void onCVFile(f); e.currentTarget.value = ''; }} />
          <Upload size={24} color={uc} />
          <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, color: C.ink }}>{cvFileName || 'Subir CV (PDF · Word · TXT)'}</span>
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>Lee cualquier PDF o Word</span>
        </label>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: C.line }} />
          <span style={{ fontFamily: FONT.mono, fontSize: SIZE.xs, color: C.mut }}>o pegá tu experiencia</span>
          <div style={{ flex: 1, height: 1, background: C.line }} />
        </div>

        {/* Textarea */}
        <textarea
          value={cvText}
          onChange={(e) => setCvText(e.target.value)}
          placeholder="Rol actual, años de experiencia, tecnologías, certificaciones, empresas donde trabajaste..."
          style={{ width: '100%', minHeight: 120, borderRadius: RADIUS.md, border: `1px solid ${uc}4d`, background: 'rgba(12,16,30,0.8)', color: C.ink, fontFamily: FONT.body, fontSize: SIZE.sm, padding: 16, outline: 'none', resize: 'vertical' }}
        />
      </div>

      {/* CTA Button */}
      <div style={{ padding: '12px 20px calc(env(safe-area-inset-bottom, 0px) + 16px)', position: 'relative', zIndex: 2 }}>
        <motion.button
          onClick={() => void activateGemeloCompleto()}
          disabled={!canActivate}
          whileTap={{ scale: 0.97 }}
          style={{ width: '100%', padding: '16px 0', borderRadius: RADIUS.lg, border: 'none', cursor: canActivate ? 'pointer' : 'default', opacity: canActivate ? 1 : 0.5, background: `linear-gradient(135deg, ${uc}, ${C.purple})`, color: '#fff', fontFamily: FONT.display, fontWeight: 700, fontSize: SIZE.md, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: canActivate ? `0 8px 32px ${uc}44` : 'none', minHeight: 52 }}
        >
          <Zap size={18} /> Activar Gemelo Completo <ArrowRight size={17} />
        </motion.button>
        <p style={{ textAlign: 'center', margin: '8px 0 0', fontFamily: FONT.mono, fontSize: SIZE.xxs, color: C.mut }}>
          Analiza CV + valida titulo + años + aportes — todo automático
        </p>
      </div>
    </div>
  );
}
