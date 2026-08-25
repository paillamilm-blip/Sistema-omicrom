// hooks/useGemeloActivation.ts
// ═══════════════════════════════════════════════════════════════════════
// Custom hook: encapsula toda la lógica de negocio del flujo de
// activación del Gemelo Digital (análisis de CV + cadena automática de
// convalidación + detección de sinergias). El componente solo renderiza.
// ═══════════════════════════════════════════════════════════════════════
import { useState, useRef, useCallback, useEffect } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '../store/AppContext';
import { useToast } from '@/shared/components/Toast';
import { speak } from '@/infrastructure/voice/engine';
import { analyzeCV, type AnalyzedProfile } from '@/features/gemelo/services/cvAnalyzer';
import { extractCVText } from '@/features/gemelo/services/cvExtract';
import { C } from '../theme';

type Kind = 'cv' | 'title' | 'year' | 'vault';
export type Phase = 'upload' | 'syncing' | 'dossier';
export interface Push { id: number; label: string; delta: number; color: string }

/** Safety timeout (ms) — if AI doesn't respond within this, forcibly reset. */
const SAFETY_TIMEOUT_MS = 30_000;

/** Progress messages shown during AI wait to keep the user informed. */
const PROGRESS_MESSAGES = [
  'Conectando con la IA…',
  'Analizando habilidades y experiencia…',
  'Calculando ejes del Gemelo Digital…',
  'Casi listo, procesando resultados…',
];

export function useGemeloActivation() {
  const { gemelo, refreshProfile, profile } = useApp();
  const { toast } = useToast();

  const [phase, setPhase] = useState<Phase>('upload');
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Kind[]>([]);
  const [dossier, setDossier] = useState<AnalyzedProfile | null>(null);
  const [ai, setAi] = useState<{ loading: boolean; text: string }>({ loading: false, text: '' });
  const [cvText, setCvText] = useState('');
  const [cvFileName, setCvFileName] = useState('');
  const [msg, setMsg] = useState('Subí tu CV y Ómicron activa todo automáticamente.');
  const [pushes, setPushes] = useState<Push[]>([]);
  const [synergies, setSynergies] = useState<string[]>([]);
  const [lastError, setLastError] = useState<string | null>(null);
  const pushIdRef = useRef(0);
  const isProcessingRef = useRef(false);
  const safetyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  const rep = gemelo ? Math.round(gemelo.overallReputation) : 0;
  const hasExistingCV = (profile?.skills?.length ?? 0) > 0;

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (safetyTimerRef.current) clearTimeout(safetyTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  // ── Cancel activation (user-triggered) ───────────────────────────
  const cancelActivation = useCallback(() => {
    cancelledRef.current = true;
    isProcessingRef.current = false;
    if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
    if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
    setLastError(null);
    setPhase('upload');
    setMsg('Cancelado. Podés reintentar cuando quieras.');
    toast('Análisis cancelado', 'info');
  }, [toast]);

  // ── Push notification helper ─────────────────────────────────────
  const emitPush = useCallback((label: string, delta: number, color: string) => {
    const id = ++pushIdRef.current;
    setPushes((prev) => [...prev, { id, label, delta, color }]);
    setTimeout(() => setPushes((prev) => prev.filter((p) => p.id !== id)), 2400);
  }, []);

  // ── Auto-convalidation chain ─────────────────────────────────────
  const runAutoChain = useCallback(async () => {
    setCurrentStep(1);
    setMsg('Validando título y certificaciones…');
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'title' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'title']);
        emitPush('Calidad', 5, C.purple);
      }
    } catch (err) { console.warn('[Omicron] convalidar title failed:', err); }
    await new Promise((r) => setTimeout(r, 600));

    setCurrentStep(2);
    setMsg('Reconociendo trayectoria profesional…');
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'year' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'year']);
        emitPush('Ejecución', 8, C.cyan);
        emitPush('Fundamento', 4, C.green);
      }
    } catch (err) { console.warn('[Omicron] convalidar year failed:', err); }
    await new Promise((r) => setTimeout(r, 600));

    setCurrentStep(3);
    setMsg('Integrando conocimiento a la Bóveda…');
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'vault' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'vault']);
        emitPush('Trascendencia', 12, C.gold);
      }
    } catch (err) { console.warn('[Omicron] convalidar vault failed:', err); }
    await new Promise((r) => setTimeout(r, 400));
    setCurrentStep(4);

    await refreshProfile();
  }, [emitPush, refreshProfile]);

  // ── Detect synergies from analyzed profile ───────────────────────
  const detectSynergies = useCallback((analyzed: AnalyzedProfile): string[] => {
    const results: string[] = [];
    if (analyzed.years >= 5 && analyzed.skills.length >= 4) {
      results.push(`${analyzed.skills.slice(0, 3).join(' + ')} + ${analyzed.years} años → 3 empleos potenciales`);
    }
    if (analyzed.skills.includes('react') || analyzed.skills.includes('typescript')) {
      results.push('Stack moderno detectado → acceso a proyectos premium en Servicios');
    }
    if (analyzed.axes.trans > 40) {
      results.push('Alta trascendencia → publicá en la Bóveda para generar regalías');
    }
    return results;
  }, []);

  // ── Read CV file ─────────────────────────────────────────────────
  const onCVFile = useCallback(async (file: File) => {
    setCvFileName(file.name);
    setMsg('Leyendo tu documento…');
    try {
      const text = await extractCVText(file);
      if (text.length >= 30) {
        setCvText(text);
        setMsg(`"${file.name}" leído. Tocá "Activar Gemelo Completo".`);
      } else {
        setMsg('No pude extraer texto. Pegá tu experiencia abajo.');
      }
    } catch (err) {
      console.warn('[Omicron] CV file read failed:', err);
      setMsg('No pude leer el archivo. Pegá tu experiencia abajo.');
    }
  }, []);

  // ── Full activation: analyze CV → persist → auto-chain → synergies
  const activateGemeloCompleto = useCallback(async () => {
    const text = cvText.trim();
    if (!text) return;
    // Protección doble-click: si ya estamos procesando, ignorar
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    cancelledRef.current = false;

    setPhase('syncing');
    setCurrentStep(0);
    setMsg('Ómicron está analizando TODO tu CV con IA…');
    setLastError(null);

    // ── Safety timeout: forcibly reset if AI hangs ────────────────────
    safetyTimerRef.current = setTimeout(() => {
      if (!isProcessingRef.current || cancelledRef.current) return; // already handled
      console.warn('[Omicron] Safety timeout reached (30s). Resetting.');
      isProcessingRef.current = false;
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      setLastError('timeout');
      setMsg('La IA tardó demasiado. Reintentá — a veces los modelos están ocupados.');
      setPhase('upload');
      toast('Timeout: la IA no respondió a tiempo. Reintentá.', 'error');
    }, SAFETY_TIMEOUT_MS);

    // ── Animated progress messages (rotate every 6s) ─────────────────
    let msgIndex = 0;
    setMsg(PROGRESS_MESSAGES[0]);
    progressTimerRef.current = setInterval(() => {
      if (cancelledRef.current) return;
      msgIndex = Math.min(msgIndex + 1, PROGRESS_MESSAGES.length - 1);
      setMsg(PROGRESS_MESSAGES[msgIndex]);
      // Self-clear once all messages shown (avoids wasteful ticks)
      if (msgIndex >= PROGRESS_MESSAGES.length - 1 && progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }, 6000);

    try {
      // 1) Analyze CV — SOLO con IA. Si la IA falla, no proceder con datos imprecisos.
      let analyzed: AnalyzedProfile | null = null;
      let usedAI = false;

      try {
        const { analyzeCVWithGemini } = await import('@/infrastructure/ai/gemini');
        const geminiResult = await analyzeCVWithGemini(text);

        // Check if cancelled during await
        if (cancelledRef.current) return;

        if (!geminiResult.ok || !geminiResult.analysis?.axes) {
          throw new Error(geminiResult.error || 'La IA no pudo analizar el CV');
        }
        const ia = geminiResult.analysis;
        const clamp = (n?: number) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));
        const skills = (ia.skills ?? []).filter(Boolean).slice(0, 12);
        const skillsDetail = (ia.skillsDetail ?? [])
          .filter((s: { name?: string }) => s?.name).slice(0, 12)
          .map((s: { name?: string; pct?: number }) => ({ name: s.name!, pct: clamp(s.pct) }));
        const base = analyzeCV(text);
        analyzed = {
          ...base,
          name: ia.name || base.name,
          seniorLabel: ia.seniorLabel || base.seniorLabel,
          seniorLevel: (ia.seniorLevel as AnalyzedProfile['seniorLevel']) || base.seniorLevel,
          years: typeof ia.years === 'number' ? ia.years : base.years,
          skills: skills.length ? skills : base.skills,
          labels: skills.length ? skills : base.labels,
          skillsDetail: skillsDetail.length ? skillsDetail : base.skillsDetail,
          summary: ia.summary || base.summary,
          arch: (ia.arch as AnalyzedProfile['arch']) || base.arch,
          axes: { exec: clamp(ia.axes!.exec), qual: clamp(ia.axes!.qual), trans: clamp(ia.axes!.trans), fund: clamp(ia.axes!.fund) },
        };
        usedAI = true;
      } catch (err) {
        // Clear timers on error
        if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
        if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
        if (cancelledRef.current) return;

        console.error('[Omicron] AI analysis failed:', err);
        setLastError('ai_failed');
        setMsg('No se pudo analizar tu CV con IA. Verificá tu conexión e intentá de nuevo.');
        setPhase('upload');
        toast('Error de IA al analizar CV — reintentá en unos segundos', 'error');
        isProcessingRef.current = false;
        return; // NO proceder con datos imprecisos
      }

      // Clear timers — AI responded successfully
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }

      if (cancelledRef.current) return;

      if (!analyzed || !usedAI) {
        setMsg('No se obtuvo un análisis confiable. Intentá de nuevo.');
        setPhase('upload');
        isProcessingRef.current = false;
        return;
      }

      setMsg('¡CV analizado! Aplicando al Gemelo Digital…');

      // 2) Persist server-side via supabase.rpc (GRANT already applied to authenticator)
      const cleanSkills = (analyzed.labels ?? []).filter((s: string) => typeof s === 'string' && s.trim());
      const cleanDetail = (analyzed.skillsDetail ?? [])
        .filter((s: { name: string; pct: number }) => s?.name)
        .map((s: { name: string; pct: number }) => ({ name: String(s.name), pct: Number(s.pct) || 0 }));

      const { data: rpcData, error } = await supabase.rpc('aplicar_analisis_cv', {
        p_name: String(analyzed.name || ''),
        p_skills: cleanSkills.length > 0 ? cleanSkills : ['general'],
        p_exec: Math.round(Number(analyzed.axes.exec) || 0),
        p_qual: Math.round(Number(analyzed.axes.qual) || 0),
        p_trans: Math.round(Number(analyzed.axes.trans) || 0),
        p_fund: Math.round(Number(analyzed.axes.fund) || 0),
        p_years: analyzed.years ? Math.round(Number(analyzed.years)) : 0,
        p_summary: analyzed.summary ? String(analyzed.summary) : '',
        p_skills_detail: cleanDetail.length > 0 ? cleanDetail : [],
      });
      const res = rpcData as { ok?: boolean; error?: string } | null;
      if (error || !res?.ok) {
        const errMsg = error?.message || res?.error || 'Error desconocido';
        setMsg(`No se pudo aplicar: ${errMsg}`);
        setPhase('upload');
        isProcessingRef.current = false;
        return;
      }

      setCompletedSteps(['cv']);
      emitPush('Ejecución', analyzed.axes.exec > 50 ? 12 : 8, C.cyan);
      emitPush('Calidad', analyzed.axes.qual > 50 ? 10 : 6, C.purple);
      toast('CV analizado y aplicado', 'success');
      speak(`CV analizado. Perfil: ${analyzed.seniorLabel}.`);
      // Broadcast logro a la red + analytics
      try {
        const { supabase: sb } = await import('@/infrastructure/supabase/client');
        sb.channel('omicron-live').send({ type: 'broadcast', event: 'activity', payload: { text: `${profile?.username ?? 'Un nodo'} activó su Gemelo Digital con CV`, kind: 'action' } });
        import('@/shared/utils/analytics').then(({ track }) => track('cv_uploaded')).catch(() => {});
      } catch { /* silencioso */ }
      await new Promise((r) => setTimeout(r, 800));

      // 3) Auto-chain remaining convalidations
      await runAutoChain();

      // 4) Detect synergies + show dossier
      setSynergies(detectSynergies(analyzed));
      setDossier(analyzed);
      setAi({ loading: false, text: analyzed.summary });
      setPhase('dossier');
      isProcessingRef.current = false;
    } catch (err) {
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      if (cancelledRef.current) return;
      console.error('[Omicron] activateGemeloCompleto failed:', err);
      setMsg('Error al procesar. Intentá de nuevo.');
      setPhase('upload');
      isProcessingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvText, emitPush, runAutoChain, detectSynergies, toast]);

  return {
    // State
    phase, currentStep, completedSteps, dossier, ai,
    cvText, setCvText, cvFileName, msg, pushes, synergies,
    rep, hasExistingCV, gemelo, profile, lastError,
    isProcessing: isProcessingRef.current,
    // Actions
    onCVFile, activateGemeloCompleto, cancelActivation,
  };
}
