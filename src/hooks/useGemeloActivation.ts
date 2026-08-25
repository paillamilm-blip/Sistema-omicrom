// hooks/useGemeloActivation.ts
// ═══════════════════════════════════════════════════════════════════════
// Custom hook: encapsula toda la lógica de negocio del flujo de
// activación del Gemelo Digital.
//
// FLUJO NUEVO (Experience-First):
//   1. Upload CV (cualquier usuario, guest o autenticado)
//   2. Análisis (IA o local — NO requiere auth)
//   3. GemeloReveal (muestra resultados impactantes — NO requiere auth)
//   4. Persistir (SOLO cuando el usuario decide "Activar" — requiere auth)
//
// Si el usuario no está autenticado al persistir, se abre el modal de
// login. Al volver autenticado, se persiste automáticamente.
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
export type Phase = 'upload' | 'syncing' | 'reveal';
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
  const [pendingPersist, setPendingPersist] = useState(false);
  const [persisted, setPersisted] = useState(false);
  const dossierRef = useRef<AnalyzedProfile | null>(null);
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

  // Keep dossierRef in sync (avoids stale closure in pendingPersist effect)
  useEffect(() => { dossierRef.current = dossier; }, [dossier]);

  // ── Auto-persist when user authenticates after reveal ────────────
  useEffect(() => {
    if (pendingPersist && profile?.id && dossierRef.current) {
      void persistAnalysis(dossierRef.current);
      setPendingPersist(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, pendingPersist]);

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

  // ── Auto-convalidation chain (requires auth) ─────────────────────
  const runAutoChain = useCallback(async () => {
    setCurrentStep(1);
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'title' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'title']);
        emitPush('Calidad', 5, C.purple);
      }
    } catch (err) { console.warn('[Omicron] convalidar title failed:', err); }
    await new Promise((r) => setTimeout(r, 400));

    setCurrentStep(2);
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'year' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'year']);
        emitPush('Ejecución', 8, C.cyan);
        emitPush('Fundamento', 4, C.green);
      }
    } catch (err) { console.warn('[Omicron] convalidar year failed:', err); }
    await new Promise((r) => setTimeout(r, 400));

    setCurrentStep(3);
    try {
      const { data } = await supabase.rpc('convalidar_credencial', { p_kind: 'vault' });
      const res = data as { ok?: boolean } | null;
      if (res?.ok) {
        setCompletedSteps((p) => [...p, 'vault']);
        emitPush('Trascendencia', 12, C.gold);
      }
    } catch (err) { console.warn('[Omicron] convalidar vault failed:', err); }

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

  // ══════════════════════════════════════════════════════════════════
  // ANALYZE CV — NO requiere auth. Cualquier usuario puede analizar.
  // Al terminar, muestra GemeloReveal (phase = 'reveal').
  // ══════════════════════════════════════════════════════════════════
  const activateGemeloCompleto = useCallback(async () => {
    const text = cvText.trim();
    if (!text) return;
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    cancelledRef.current = false;

    setPhase('syncing');
    setCurrentStep(0);
    setMsg('Ómicron está analizando TODO tu CV con IA…');
    setLastError(null);

    // ── Safety timeout ───────────────────────────────────────────────
    safetyTimerRef.current = setTimeout(() => {
      if (!isProcessingRef.current || cancelledRef.current) return;
      console.warn('[Omicron] Safety timeout reached (30s). Using local fallback.');
      isProcessingRef.current = false;
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      // Don't error — use local fallback on timeout
      const localResult = analyzeCV(text);
      setSynergies(detectSynergies(localResult));
      setDossier(localResult);
      setAi({ loading: false, text: localResult.summary });
      setPhase('reveal');
      toast('IA tardó demasiado — se usó análisis local', 'info');
    }, SAFETY_TIMEOUT_MS);

    // ── Progress messages ────────────────────────────────────────────
    let msgIndex = 0;
    setMsg(PROGRESS_MESSAGES[0]);
    progressTimerRef.current = setInterval(() => {
      if (cancelledRef.current) return;
      msgIndex = Math.min(msgIndex + 1, PROGRESS_MESSAGES.length - 1);
      setMsg(PROGRESS_MESSAGES[msgIndex]);
      if (msgIndex >= PROGRESS_MESSAGES.length - 1 && progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
    }, 6000);

    try {
      // ── 1) Analyze CV (IA o local — siempre termina) ───────────────
      let analyzed: AnalyzedProfile | null = null;

      try {
        const { analyzeCVWithGemini } = await import('@/infrastructure/ai/gemini');
        const geminiResult = await analyzeCVWithGemini(text);

        if (cancelledRef.current || !isProcessingRef.current) return;

        if (geminiResult.ok && geminiResult.analysis?.axes) {
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
        } else {
          // IA failed or incomplete — use local
          console.warn('[Omicron] AI result incomplete, using local fallback');
          analyzed = analyzeCV(text);
        }
      } catch (err) {
        // Any error from IA → fallback local (never block)
        console.warn('[Omicron] AI threw, using local fallback:', err);
        analyzed = analyzeCV(text);
      }

      // Clear timers
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }

      if (cancelledRef.current) return;

      if (!analyzed) {
        setMsg('No se obtuvo un análisis. Intentá de nuevo.');
        setPhase('upload');
        isProcessingRef.current = false;
        return;
      }

      // ── 2) Show GemeloReveal (NO persist yet) ──────────────────────
      setSynergies(detectSynergies(analyzed));
      setDossier(analyzed);
      setAi({ loading: false, text: analyzed.summary });
      setPhase('reveal');
      isProcessingRef.current = false;

      // Analytics
      try {
        import('@/shared/utils/analytics').then(({ track }) => track('cv_analyzed')).catch(() => {});
      } catch { /* silent */ }

    } catch (err) {
      if (safetyTimerRef.current) { clearTimeout(safetyTimerRef.current); safetyTimerRef.current = null; }
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      if (cancelledRef.current) return;
      console.error('[Omicron] activateGemeloCompleto failed:', err);
      // Even on catastrophic failure, try local fallback safely
      try {
        const localResult = analyzeCV(cvText.trim());
        setDossier(localResult);
        setSynergies(detectSynergies(localResult));
        setPhase('reveal');
      } catch (fallbackErr) {
        console.error('[Omicron] Local fallback also failed:', fallbackErr);
        setMsg('Error al procesar. Intentá de nuevo.');
        setPhase('upload');
      }
      isProcessingRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cvText, detectSynergies, toast]);

  // ══════════════════════════════════════════════════════════════════
  // PERSIST — Called from GemeloReveal CTA. Requires auth.
  // If not authenticated, opens login and auto-persists on return.
  // ══════════════════════════════════════════════════════════════════
  const persistAnalysis = useCallback(async (analyzed?: AnalyzedProfile | null) => {
    const data = analyzed || dossier;
    if (!data) return;

    // If not authenticated → open auth modal, mark pending
    if (!profile?.id) {
      setPendingPersist(true);
      window.dispatchEvent(new Event('omicron:request-auth'));
      toast('Registrate para guardar tu Gemelo Digital', 'info');
      return;
    }

    // ── Persist to database ──────────────────────────────────────────
    setMsg('Guardando tu Gemelo Digital…');

    try {
      const cleanSkills = (data.labels ?? []).filter((s: string) => typeof s === 'string' && s.trim());
      const cleanDetail = (data.skillsDetail ?? [])
        .filter((s: { name: string; pct: number }) => s?.name)
        .map((s: { name: string; pct: number }) => ({ name: String(s.name), pct: Number(s.pct) || 0 }));

      const { data: rpcData, error } = await supabase.rpc('aplicar_analisis_cv', {
        p_name: String(data.name || ''),
        p_skills: cleanSkills.length > 0 ? cleanSkills : ['general'],
        p_exec: Math.round(Number(data.axes.exec) || 0),
        p_qual: Math.round(Number(data.axes.qual) || 0),
        p_trans: Math.round(Number(data.axes.trans) || 0),
        p_fund: Math.round(Number(data.axes.fund) || 0),
        p_years: data.years ? Math.round(Number(data.years)) : 0,
        p_summary: data.summary ? String(data.summary) : '',
        p_skills_detail: cleanDetail.length > 0 ? cleanDetail : [],
      });

      const res = rpcData as { ok?: boolean; error?: string } | null;
      if (error || !res?.ok) {
        const errMsg = error?.message || res?.error || 'Error desconocido';
        // Provide actionable messages based on common errors
        if (errMsg.includes('Could not find') || errMsg.includes('function') || errMsg.includes('does not exist')) {
          toast('La base de datos necesita actualizarse. Ejecutá: supabase db push', 'error');
          console.error('[Omicron] RPC not found — migrations not applied?', errMsg);
        } else if (errMsg.includes('sin sesión') || errMsg.includes('JWT')) {
          toast('Tu sesión expiró. Refrescá la página e intentá de nuevo.', 'error');
        } else {
          toast(`No se pudo guardar: ${errMsg}`, 'error');
        }
        console.error('[Omicron] persistAnalysis RPC failed:', { error, rpcData });
        return;
      }

      // Success!
      setPersisted(true);
      setCompletedSteps(['cv']);
      emitPush('Ejecución', data.axes.exec > 50 ? 12 : 8, C.cyan);
      emitPush('Calidad', data.axes.qual > 50 ? 10 : 6, C.purple);
      toast('¡Gemelo Digital activado!', 'success');
      speak(`Gemelo Digital activado. Perfil: ${data.seniorLabel}.`);

      // Broadcast to network
      try {
        supabase.channel('omicron-live').send({ type: 'broadcast', event: 'activity', payload: { text: `${profile?.username ?? 'Un nodo'} activó su Gemelo Digital`, kind: 'action' } });
        import('@/shared/utils/analytics').then(({ track }) => track('cv_uploaded')).catch(() => {});
      } catch { /* silent */ }

      // Run auto-convalidation chain
      await runAutoChain();

      // Clear phantom timer (they saved — no more countdown)
      localStorage.removeItem('omicron_gemelo_phantom_expire');

    } catch (err) {
      console.error('[Omicron] persistAnalysis failed:', err);
      toast('Error al guardar. Intentá de nuevo.', 'error');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dossier, profile?.id, emitPush, runAutoChain, toast]);

  return {
    // State
    phase, currentStep, completedSteps, dossier, ai,
    cvText, setCvText, cvFileName, msg, pushes, synergies,
    rep, hasExistingCV, gemelo, profile, lastError,
    isProcessing: isProcessingRef.current,
    pendingPersist, persisted,
    // Actions
    onCVFile, activateGemeloCompleto, cancelActivation, persistAnalysis,
  };
}
