// components/shared/SimulatorChallenge.tsx
// Simulador Neuronal — terminal robotica con Copiloto IA en vivo.
// El codigo se ejecuta de forma SEGURA en la Edge Function `run-code`
// (scoring autoritativo del servidor; el navegador no calcula la nota).

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, Clock, CheckCircle, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Trophy,
  RotateCcw, History, Zap, Code2,
  // 🧪 MVP PILOTO: Sparkles, Bot y Loader2 eran usados solo por el
  // Copiloto IA (AIPanel, comentado más abajo).
  // Sparkles, Bot, Loader2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C as T } from '../../theme';
import { useApp } from '../../store/AppContext';
import type { SkillTest, SkillTestAttempt } from '../../types';

interface TestCaseResult { input: string; expected: string; actual: string; passed: boolean; error?: string; }
interface RunResult {
  result: 'PASS' | 'FAIL' | 'TIMEOUT' | 'ERROR';
  score: number;
  testCaseResults: TestCaseResult[];
  timeTakenSeconds: number;
  errorMessage?: string;
}
interface SimulatorChallengeProps {
  test: SkillTest;
  nodeId: string;
  onClose: () => void;
  onSuccess: (peAwarded: number) => void;
}

// DERIVADO del tema (theme.ts) → un cambio de tema se propaga solo.
const C = {
  cyan: T.cyan, cyanDim: T.cyanDim, cyanFaint: T.cyanFaint,
  gold: T.gold, goldFaint: T.goldFaint,
  green: T.green, greenFaint: T.greenFaint,
  red: T.red, redFaint: T.redFaint,
  bg: T.bg, panel: 'rgba(8,16,38,0.72)', card: 'rgba(13,22,46,0.85)',
  text: T.ink, sub: 'rgba(92,200,255,0.5)', line: T.line,
} as const;
const MONO = "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace";
const DISP = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif";

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

const DEFAULT_CODE_TEMPLATE = `// Define tu función como "solution"
// Recibe un parámetro "input" (string) y debe retornar un string

function solution(input) {
  // Tu código aquí
  
}`;

export function SimulatorChallenge({ test, nodeId, onClose, onSuccess }: SimulatorChallengeProps) {
  const { profile } = useApp();

  const [code, setCode] = useState(DEFAULT_CODE_TEMPLATE);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [phase, setPhase] = useState<'ready' | 'running' | 'result'>('ready');
  const [runResult, setRunResult] = useState<RunResult | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [peAwarded, setPeAwarded] = useState(0);

  const [elapsed, setElapsed] = useState(0);
  const [remaining, setRemaining] = useState(test.time_limit_seconds);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);

  const [attempts, setAttempts] = useState<SkillTestAttempt[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showTests, setShowTests] = useState(false);
  const [activeView, setActiveView] = useState<'editor' | 'problem'>('problem');
  // 🧪 MVP PILOTO CONTROLADO: estado del Copiloto IA deshabilitado.
  // const [aiText, setAiText] = useState<string | null>(null);
  // const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    if (!profile?.id) return;
    supabase
      .from('skill_test_attempts').select('*')
      .eq('user_id', profile.id).eq('test_id', test.id)
      .order('attempted_at', { ascending: false }).limit(10)
      .then(({ data }) => setAttempts((data as SkillTestAttempt[]) || []));
  }, [profile?.id, test.id]);

  const stopTimer = useCallback(() => { if (timerRef.current) clearInterval(timerRef.current); }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const secs = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsed(secs);
      setRemaining(Math.max(0, test.time_limit_seconds - secs));
      if (secs >= test.time_limit_seconds) stopTimer();
    }, 500);
  }, [test.time_limit_seconds, stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const refreshHistory = useCallback(async () => {
    if (!profile?.id) return;
    const { data: hist } = await supabase
      .from('skill_test_attempts').select('*')
      .eq('user_id', profile.id).eq('test_id', test.id)
      .order('attempted_at', { ascending: false }).limit(10);
    setAttempts((hist as SkillTestAttempt[]) || []);
  }, [profile?.id, test.id]);

  // 🧪 MVP PILOTO CONTROLADO: Copiloto IA deshabilitado (comentado
  // completo). No se elimina para poder reactivarlo tras el piloto.
  // const askAI = useCallback(async (failing?: string) => {
  //   setAiLoading(true);
  //   setAiText(null);
  //   try {
  //     const { data, error } = await supabase.functions.invoke('code-tutor', {
  //       body: { problem: test.problem_statement, code, failing: failing || undefined },
  //     });
  //     setAiText(error
  //       ? 'El Copiloto IA no está disponible. Revisa el deploy de la función code-tutor.'
  //       : ((data as { feedback?: string; error?: string })?.feedback ?? (data as { error?: string })?.error ?? 'Sin respuesta.'));
  //   } catch {
  //     setAiText('Error de conexión con el Copiloto IA.');
  //   } finally {
  //     setAiLoading(false);
  //   }
  // }, [test.problem_statement, code]);

  const handleRun = useCallback(async () => {
    if (!profile?.id || phase === 'running') return;
    setPhase('running');
    setIsSaving(true);
    // setAiText(null); // 🧪 MVP PILOTO: Copiloto IA deshabilitado
    startTimer();

    try {
      const { data, error } = await supabase.functions.invoke('run-code', {
        body: { test_id: test.id, node_id: nodeId, code },
      });
      stopTimer();
      const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

      if (error || !data || (data as { error?: string }).error) {
        const msg = (data as { error?: string })?.error || error?.message
          || 'No se pudo ejecutar en el servidor. ¿Está desplegada la función "run-code"?';
        setRunResult({ result: 'ERROR', score: 0, testCaseResults: [], timeTakenSeconds: elapsedSec, errorMessage: msg });
        setPhase('result');
        return;
      }

      const rr: RunResult = {
        result: data.result,
        score: data.score,
        testCaseResults: data.testCaseResults ?? [],
        timeTakenSeconds: data.timeTakenSeconds ?? elapsedSec,
        errorMessage: data.errorMessage,
      };
      setRunResult(rr);
      setPhase('result');
      const pe = data.pe_awarded ?? 0;
      setPeAwarded(pe);
      if (rr.result === 'PASS') {
        onSuccess(pe);
      }
      // 🧪 MVP PILOTO: ya no se invoca al Copiloto IA cuando el intento falla.
      // else {
      //   const failing = rr.testCaseResults.filter(t => !t.passed).slice(0, 3)
      //     .map(t => `input=${t.input} | esperado=${t.expected} | obtenido=${t.error || t.actual || '-'}`).join(' ;; ');
      //   askAI(failing || undefined);
      // }
      await refreshHistory();
    } catch (e) {
      stopTimer();
      setRunResult({
        result: 'ERROR', score: 0, testCaseResults: [],
        timeTakenSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
        errorMessage: String((e as Error)?.message ?? e),
      });
      setPhase('result');
    } finally {
      setIsSaving(false);
    }
  }, [profile?.id, phase, code, test.id, nodeId, startTimer, stopTimer, onSuccess, refreshHistory]);

  const handleReset = () => {
    stopTimer();
    setElapsed(0);
    setRemaining(test.time_limit_seconds);
    setPhase('ready');
    setRunResult(null);
    setPeAwarded(0);
    // setAiText(null); // 🧪 MVP PILOTO: Copiloto IA deshabilitado
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current!;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newVal = code.substring(0, start) + '  ' + code.substring(end);
      setCode(newVal);
      requestAnimationFrame(() => { ta.selectionStart = ta.selectionEnd = start + 2; });
    }
  };

  const timerColor = remaining < 30 ? C.red : remaining < 60 ? C.gold : C.green;
  const bestAttempt = attempts.find(a => a.result === 'PASS');

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase !== 'running') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [phase, onClose]);

  return (
    <div role="dialog" aria-modal="true" aria-label={`Simulador: ${test.test_name}`}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(2,6,19,0.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column' }}>

      <header style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.panel, borderBottom: `1px solid ${C.line}`, boxShadow: '0 4px 24px rgba(92, 200, 255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, boxShadow: `0 0 14px ${C.cyan}44`, animation: 'cp-breathe 1.8s ease-in-out infinite' }}>
            <Zap size={18} style={{ color: C.cyan }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: DISP, fontWeight: 700, fontSize: 15, color: C.text, lineHeight: 1.1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{test.test_name}</p>
            <p style={{ margin: '2px 0 0', fontFamily: MONO, fontSize: 9.5, color: C.sub, letterSpacing: 0.5 }}>SIMULADOR NEURONAL · {test.passing_score}% · {test.test_cases.length} casos</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {phase !== 'ready' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 15, fontWeight: 700, color: timerColor }}>
              <Clock size={14} /> {formatTime(phase === 'result' ? elapsed : remaining)}
            </div>
          )}
          {bestAttempt && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: C.green, fontFamily: MONO }}>
              <Trophy size={12} /> {formatTime(bestAttempt.time_taken_seconds)}
            </div>
          )}
          <button onClick={onClose} aria-label="Cerrar simulador" style={{ width: 30, height: 30, borderRadius: 9, background: C.card, border: `1px solid ${C.line}`, color: C.sub, cursor: 'pointer', fontSize: 16 }}>×</button>
        </div>
      </header>

      <div style={{ flex: '0 0 auto', display: 'flex', background: C.panel, borderBottom: `1px solid ${C.line}` }}>
        {(['problem', 'editor'] as const).map(v => {
          const on = activeView === v;
          return (
            <button key={v} onClick={() => setActiveView(v)}
              style={{ flex: 1, padding: '11px 0', background: 'none', border: 'none', borderBottom: on ? `2px solid ${C.cyan}` : '2px solid transparent', cursor: 'pointer', fontFamily: MONO, fontSize: 11, letterSpacing: 1, fontWeight: 700, color: on ? C.cyan : C.sub }}>
              {v === 'problem' ? '◧ PROBLEMA' : '⌨ CONSOLA'}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: C.bg }}>

        {activeView === 'problem' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.line}` }}>
              <p style={{ margin: '0 0 8px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' }}>⬡ Enunciado</p>
              <p style={{ margin: 0, fontFamily: DISP, fontSize: 14.5, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{test.problem_statement}</p>
            </div>

            <div style={{ borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
              <button onClick={() => setShowTests(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 13, background: C.card, border: 'none', cursor: 'pointer', fontFamily: DISP, fontSize: 13.5, fontWeight: 700, color: C.text }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><Code2 size={14} style={{ color: C.cyan }} /> Casos de prueba ({test.test_cases.length})</span>
                {showTests ? <ChevronUp size={14} style={{ color: C.sub }} /> : <ChevronDown size={14} style={{ color: C.sub }} />}
              </button>
              {showTests && (
                <div>
                  {test.test_cases.map((tc) => (
                    <div key={`${tc.input}-${tc.expected_output}`} style={{ padding: 13, background: C.bg, borderTop: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <div style={{ display: 'flex', gap: 8 }}><span style={{ color: C.sub, width: 72, flexShrink: 0 }}>Input:</span><span style={{ color: '#5ab2ff' }}>{tc.input}</span></div>
                      <div style={{ display: 'flex', gap: 8 }}><span style={{ color: C.sub, width: 72, flexShrink: 0 }}>Esperado:</span><span style={{ color: C.green }}>{tc.expected_output}</span></div>
                      {tc.explanation && <p style={{ margin: '2px 0 0', color: C.sub, fontStyle: 'italic' }}>{tc.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {attempts.length > 0 && (
              <div style={{ borderRadius: 12, border: `1px solid ${C.line}`, overflow: 'hidden' }}>
                <button onClick={() => setShowHistory(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 13, background: C.card, border: 'none', cursor: 'pointer', fontFamily: DISP, fontSize: 13.5, fontWeight: 700, color: C.text }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}><History size={14} style={{ color: C.cyan }} /> Mis intentos ({attempts.length})</span>
                  {showHistory ? <ChevronUp size={14} style={{ color: C.sub }} /> : <ChevronDown size={14} style={{ color: C.sub }} />}
                </button>
                {showHistory && (
                  <div>{attempts.map((a, i) => <AttemptRow key={a.id} attempt={a} index={i} />)}</div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'editor' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ position: 'relative', borderRadius: 12, border: `1px solid ${C.cyanDim}`, overflow: 'hidden', background: '#040a18', boxShadow: `inset 0 0 30px rgba(92, 200, 255,0.06)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderBottom: `1px solid ${C.line}`, background: 'rgba(92, 200, 255,0.04)' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.red, opacity: 0.7 }} />
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.gold, opacity: 0.7 }} />
                  <div style={{ width: 9, height: 9, borderRadius: '50%', background: C.green, opacity: 0.7 }} />
                </div>
                <span style={{ fontFamily: MONO, fontSize: 10, color: C.sub, marginLeft: 4, letterSpacing: 1 }}>solution.js</span>
                {phase === 'running' && <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 9.5, color: C.cyan, letterSpacing: 1, animation: 'cp-breathe 1s ease-in-out infinite' }}>● EJECUTANDO</span>}
              </div>
              <textarea ref={textareaRef} value={code} onChange={e => setCode(e.target.value)} onKeyDown={handleKeyDown}
                spellCheck={false} disabled={phase === 'running'}
                style={{ width: '100%', minHeight: 250, padding: 16, background: 'transparent', color: '#c9f6ff', fontFamily: MONO, fontSize: 13, lineHeight: 1.6, resize: 'none', outline: 'none', border: 'none', boxSizing: 'border-box' }}
                placeholder="// Escribe tu solución aquí..." />
            </div>

            {runResult && phase === 'result' && (
              <ResultPanel result={runResult} passingScore={test.passing_score} peAwarded={peAwarded} />
            )}

            {/* 🧪 MVP PILOTO CONTROLADO: Copiloto IA deshabilitado. */}
            {/* <AIPanel loading={aiLoading} text={aiText} onAsk={() => askAI()} /> */}
          </div>
        )}
      </div>

      <footer style={{ flex: '0 0 auto', padding: 14, borderTop: `1px solid ${C.line}`, background: C.panel, display: 'flex', gap: 12 }}>
        {phase === 'result' ? (
          <>
            <button onClick={handleReset} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: 'transparent', border: `1px solid ${C.line}`, color: C.sub, cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <RotateCcw size={15} /> Reintentar
            </button>
            <button onClick={() => setActiveView('editor')} style={{ flex: 1, padding: '13px 0', borderRadius: 12, background: C.cyan, border: 'none', color: C.bg, cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 14 }}>
              Ver código
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} style={{ padding: '13px 20px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.line}`, color: C.sub, cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 14 }}>Cancelar</button>
            <button onClick={() => { setActiveView('editor'); handleRun(); }} disabled={phase === 'running' || isSaving}
              style={{ flex: 1, padding: '13px 0', borderRadius: 12, border: 'none', cursor: phase === 'running' ? 'not-allowed' : 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: phase === 'running' ? C.card : C.cyan, color: phase === 'running' ? C.sub : C.bg, boxShadow: phase === 'running' ? 'none' : `0 0 18px ${C.cyan}55` }}>
              {phase === 'running' ? (<><Square size={15} fill="currentColor" /> Ejecutando...</>) : (<><Play size={15} fill="currentColor" /> Ejecutar solución</>)}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

// 🧪 MVP PILOTO CONTROLADO: panel del "Copiloto IA" deshabilitado
// (comentado completo). No se elimina para poder reactivarlo tras el piloto.
// function AIPanel({ loading, text, onAsk }: { loading: boolean; text: string | null; onAsk: () => void }) {
//   return (
//     <div style={{ borderRadius: 12, border: `1px solid ${C.gold}55`, overflow: 'hidden', background: C.goldFaint }}>
//       <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 13px', borderBottom: (loading || text) ? `1px solid ${C.gold}33` : 'none' }}>
//         <div style={{ width: 30, height: 30, borderRadius: 9, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255, 176, 46,0.16)', border: `1px solid ${C.gold}55`, animation: loading ? 'cp-breathe 1s ease-in-out infinite' : undefined }}>
//           <Bot size={16} style={{ color: C.gold }} />
//         </div>
//         <div style={{ flex: 1, minWidth: 0 }}>
//           <div style={{ fontFamily: DISP, fontWeight: 700, fontSize: 13.5, color: '#ffd98a' }}>Copiloto IA</div>
//           <div style={{ fontFamily: MONO, fontSize: 9, color: 'rgba(255, 176, 46,0.7)', letterSpacing: 0.5 }}>Análisis neuronal en vivo</div>
//         </div>
//         {!loading && (
//           <button onClick={onAsk} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'rgba(255, 176, 46,0.16)', border: `1px solid ${C.gold}55`, color: '#ffd98a', cursor: 'pointer', fontFamily: MONO, fontSize: 10, fontWeight: 700, letterSpacing: 0.5 }}>
//             <Sparkles size={13} /> {text ? 'RE-ANALIZAR' : 'ANALIZAR'}
//           </button>
//         )}
//       </div>
//       {loading && (
//         <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', fontFamily: MONO, fontSize: 11.5, color: '#ffd98a' }}>
//           <Loader2 size={14} className="animate-spin" /> Escaneando tu código...
//         </div>
//       )}
//       {!loading && text && (
//         <div style={{ padding: '12px 14px' }}>
//           <p style={{ margin: 0, fontFamily: DISP, fontSize: 14, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{text}</p>
//         </div>
//       )}
//     </div>
//   );
// }

function ResultPanel({ result, passingScore, peAwarded }: { result: RunResult; passingScore: number; peAwarded: number; }) {
  const passed = result.result === 'PASS';
  const accent = passed ? C.green : result.result === 'TIMEOUT' ? C.gold : C.red;
  const [expanded, setExpanded] = useState(false);
  return (
    <div style={{ borderRadius: 12, border: `1px solid ${accent}66`, overflow: 'hidden', background: passed ? C.greenFaint : result.result === 'TIMEOUT' ? C.goldFaint : C.redFaint }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          {passed ? <CheckCircle size={20} style={{ color: C.green }} /> : result.result === 'TIMEOUT' ? <AlertTriangle size={20} style={{ color: C.gold }} /> : <XCircle size={20} style={{ color: C.red }} />}
          <div>
            <p style={{ margin: 0, fontFamily: DISP, fontWeight: 700, fontSize: 14, color: accent }}>
              {passed ? '¡Solución correcta!' : result.result === 'TIMEOUT' ? 'Tiempo agotado' : 'Solución incorrecta'}
            </p>
            <p style={{ margin: '2px 0 0', fontFamily: MONO, fontSize: 11, color: C.sub }}>
              {result.score}% · {result.testCaseResults.filter(r => r.passed).length}/{result.testCaseResults.length} casos · {formatTime(result.timeTakenSeconds)}
            </p>
            {result.errorMessage && <p style={{ margin: '4px 0 0', fontFamily: MONO, fontSize: 10.5, color: C.red }}>{result.errorMessage}</p>}
          </div>
        </div>
        {peAwarded > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 9, background: 'rgba(255, 176, 46,0.2)', border: `1px solid ${C.gold}55` }}>
            <Trophy size={14} style={{ color: C.gold }} />
            <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.gold }}>+{peAwarded} PE</span>
          </div>
        )}
      </div>
      <div style={{ padding: '0 14px 12px' }}>
        <div style={{ width: '100%', height: 7, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 4, width: `${result.score}%`, background: accent, transition: 'width 0.7s ease', boxShadow: `0 0 8px ${accent}` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontFamily: MONO, fontSize: 9, color: C.sub }}>
          <span>0%</span><span>Aprobación: {passingScore}%</span><span>100%</span>
        </div>
      </div>
      {result.testCaseResults.length > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 14px', borderTop: `1px solid ${C.line}`, background: 'none', border: 'none', cursor: 'pointer', fontFamily: MONO, fontSize: 11, color: C.sub }}>
            <span>Ver detalle de casos</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div>
              {result.testCaseResults.map((tc) => (
                <div key={`${tc.input}-${tc.passed ? 'pass' : 'fail'}-${tc.actual}`} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px', borderTop: `1px solid ${C.line}` }}>
                  {tc.passed ? <CheckCircle size={13} style={{ color: C.green, flexShrink: 0, marginTop: 2 }} /> : <XCircle size={13} style={{ color: C.red, flexShrink: 0, marginTop: 2 }} />}
                  <div style={{ fontFamily: MONO, fontSize: 11, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <p style={{ margin: 0, color: C.sub }}>Input: <span style={{ color: '#5ab2ff' }}>{tc.input}</span></p>
                    <p style={{ margin: 0, color: C.sub }}>Esperado: <span style={{ color: C.green }}>{tc.expected}</span></p>
                    {!tc.passed && <p style={{ margin: 0, color: C.sub }}>Obtenido: <span style={{ color: C.red }}>{tc.error || tc.actual || '—'}</span></p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AttemptRow({ attempt, index }: { attempt: SkillTestAttempt; index: number }) {
  const passed = attempt.result === 'PASS';
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: C.bg, borderTop: `1px solid ${C.line}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.sub, width: 18 }}>#{index + 1}</span>
        {passed ? <CheckCircle size={14} style={{ color: C.green }} /> : attempt.result === 'TIMEOUT' ? <AlertTriangle size={14} style={{ color: C.gold }} /> : <XCircle size={14} style={{ color: C.red }} />}
        <div>
          <p style={{ margin: 0, fontFamily: MONO, fontSize: 11.5, fontWeight: 700, color: passed ? C.green : C.sub }}>{attempt.score}% — {attempt.result}</p>
          <p style={{ margin: '1px 0 0', fontFamily: MONO, fontSize: 9.5, color: C.sub }}>{new Date(attempt.attempted_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 11, color: C.sub }}>
        <Clock size={11} /> {formatTime(attempt.time_taken_seconds)}
      </div>
    </div>
  );
}
