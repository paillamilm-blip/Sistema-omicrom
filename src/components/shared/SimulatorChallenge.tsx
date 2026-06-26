// components/shared/SimulatorChallenge.tsx
// Editor de código + cronómetro + tests + historial.
// VERSIÓN SIN EDGE FUNCTION: ejecuta en el navegador y guarda el intento
// (+ reputación) con el RPC handle_skill_attempt. No requiere desplegar nada.

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Play, Square, Clock, CheckCircle, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Trophy,
  RotateCcw, History, Zap, Code2,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
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

// Ejecuta el código del usuario en el navegador contra los casos de prueba.
function runCodeLocally(code: string, testCases: SkillTest['test_cases']): TestCaseResult[] {
  let solution: (input: string) => unknown;
  try {
    const factory = new Function(`
      "use strict";
      ${code}
      if (typeof solution !== 'function') {
        throw new Error('Define una función llamada "solution".');
      }
      return solution;
    `);
    solution = factory() as (input: string) => unknown;
  } catch (err) {
    return testCases.map(tc => ({
      input: tc.input, expected: String(tc.expected_output), actual: '',
      passed: false, error: String((err as Error)?.message ?? err),
    }));
  }

  return testCases.map(tc => {
    const expected = String(tc.expected_output);
    try {
      const actual = String(solution(tc.input));
      return { input: tc.input, expected, actual, passed: actual.trim() === expected.trim() };
    } catch (err) {
      return { input: tc.input, expected, actual: '', passed: false, error: String((err as Error)?.message ?? err) };
    }
  });
}

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

  const handleRun = useCallback(async () => {
    if (!profile?.id || phase === 'running') return;
    setPhase('running');
    setIsSaving(true);
    startTimer();

    // Ejecuta en el navegador
    const testCaseResults = runCodeLocally(code, test.test_cases);
    stopTimer();
    const elapsedSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    const passedCount = testCaseResults.filter(r => r.passed).length;
    const score = test.test_cases.length ? Math.round((passedCount / test.test_cases.length) * 100) : 0;
    const hasError = testCaseResults.some(r => r.error);
    const result: RunResult['result'] = score >= test.passing_score ? 'PASS' : hasError ? 'ERROR' : 'FAIL';

    const rr: RunResult = { result, score, testCaseResults, timeTakenSeconds: elapsedSec };
    setRunResult(rr);
    setPhase('result');

    // Guarda intento + reputación (autoritativo en el servidor)
    let pe = 0;
    try {
      const { data } = await supabase.rpc('handle_skill_attempt', {
        p_user_id: profile.id,
        p_test_id: test.id,
        p_node_id: nodeId,
        p_score: score,
        p_time_sec: elapsedSec,
        p_code: code,
        p_result: result,
        p_tc_results: testCaseResults,
      });
      pe = (data as { pe_awarded?: number } | null)?.pe_awarded ?? 0;
    } catch (e) {
      console.error('Error guardando intento:', e);
    }

    setPeAwarded(pe);
    if (result === 'PASS') onSuccess(pe);
    await refreshHistory();
    setIsSaving(false);
  }, [profile?.id, phase, code, test, nodeId, startTimer, stopTimer, onSuccess, refreshHistory]);

  const handleReset = () => {
    stopTimer();
    setElapsed(0);
    setRemaining(test.time_limit_seconds);
    setPhase('ready');
    setRunResult(null);
    setPeAwarded(0);
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

  const timerColor = remaining < 30 ? 'text-red-500' : remaining < 60 ? 'text-amber-500' : 'text-emerald-500';
  const bestAttempt = attempts.find(a => a.result === 'PASS');

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col">
      <header className="flex-none flex items-center justify-between px-4 py-3 bg-omicron-surface border-b border-omicron-border">
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-omicron-accent/20 border border-omicron-accent/40">
            <Zap size={16} className="text-omicron-accent" />
          </div>
          <div>
            <p className="text-sm font-bold text-omicron-text leading-none">{test.test_name}</p>
            <p className="text-[10px] text-omicron-subtle mt-0.5">
              Aprobación: {test.passing_score}% · {test.test_cases.length} casos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {phase !== 'ready' && (
            <div className={`flex items-center gap-1.5 font-mono text-sm font-bold ${timerColor}`}>
              <Clock size={14} />
              {formatTime(phase === 'result' ? elapsed : remaining)}
            </div>
          )}
          {bestAttempt && (
            <div className="flex items-center gap-1 text-xs text-emerald-500">
              <Trophy size={12} />
              <span>{formatTime(bestAttempt.time_taken_seconds)}</span>
            </div>
          )}
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-omicron-card border border-omicron-border flex items-center justify-center text-omicron-subtle hover:text-omicron-text text-sm">×</button>
        </div>
      </header>

      <div className="flex-none flex border-b border-omicron-border bg-omicron-surface">
        {(['problem', 'editor'] as const).map(v => (
          <button key={v} onClick={() => setActiveView(v)}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${activeView === v ? 'text-omicron-accent border-b-2 border-omicron-accent' : 'text-omicron-subtle'}`}>
            {v === 'problem' ? '📋 Problema' : '💻 Editor'}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeView === 'problem' && (
          <div className="p-4 space-y-4">
            <div className="p-4 rounded-xl bg-omicron-card border border-omicron-border">
              <p className="text-xs text-omicron-subtle uppercase tracking-wide mb-2">Enunciado</p>
              <p className="text-sm text-omicron-text leading-relaxed whitespace-pre-wrap">{test.problem_statement}</p>
            </div>

            <div className="rounded-xl border border-omicron-border overflow-hidden">
              <button onClick={() => setShowTests(v => !v)} className="w-full flex items-center justify-between p-3 bg-omicron-card text-sm font-semibold text-omicron-text">
                <span className="flex items-center gap-2"><Code2 size={14} className="text-omicron-accent" /> Casos de prueba ({test.test_cases.length})</span>
                {showTests ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>
              {showTests && (
                <div className="divide-y divide-omicron-border">
                  {test.test_cases.map((tc, i) => (
                    <div key={i} className="p-3 bg-omicron-bg text-xs font-mono space-y-1">
                      <div className="flex gap-2"><span className="text-omicron-subtle w-20 flex-shrink-0">Input:</span><span className="text-blue-400">{tc.input}</span></div>
                      <div className="flex gap-2"><span className="text-omicron-subtle w-20 flex-shrink-0">Esperado:</span><span className="text-emerald-400">{tc.expected_output}</span></div>
                      {tc.explanation && <p className="text-omicron-subtle italic mt-1">{tc.explanation}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {attempts.length > 0 && (
              <div className="rounded-xl border border-omicron-border overflow-hidden">
                <button onClick={() => setShowHistory(v => !v)} className="w-full flex items-center justify-between p-3 bg-omicron-card text-sm font-semibold text-omicron-text">
                  <span className="flex items-center gap-2"><History size={14} className="text-omicron-accent" /> Mis intentos anteriores ({attempts.length})</span>
                  {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                {showHistory && (
                  <div className="divide-y divide-omicron-border">
                    {attempts.map((a, i) => <AttemptRow key={a.id} attempt={a} index={i} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeView === 'editor' && (
          <div className="flex flex-col h-full p-4 gap-3">
            <div className="relative rounded-xl border border-omicron-border overflow-hidden bg-[#0d1117]">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-omicron-border/50 bg-[#161b22]">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-amber-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-[10px] text-omicron-subtle ml-1">solution.js</span>
              </div>
              <textarea ref={textareaRef} value={code} onChange={e => setCode(e.target.value)} onKeyDown={handleKeyDown}
                spellCheck={false} disabled={phase === 'running'}
                className="w-full min-h-[260px] p-4 bg-transparent text-[13px] font-mono text-slate-200 resize-none outline-none leading-relaxed"
                placeholder="// Escribe tu solución aquí..." />
            </div>
            {runResult && phase === 'result' && (
              <ResultPanel result={runResult} passingScore={test.passing_score} peAwarded={peAwarded} />
            )}
          </div>
        )}
      </div>

      <footer className="flex-none p-4 border-t border-omicron-border bg-omicron-surface flex gap-3">
        {phase === 'result' ? (
          <>
            <button onClick={handleReset} className="flex-1 py-3 rounded-xl border border-omicron-border text-omicron-subtle hover:text-omicron-text text-sm font-semibold flex items-center justify-center gap-2 transition active:scale-95">
              <RotateCcw size={15} /> Reintentar
            </button>
            <button onClick={() => setActiveView('editor')} className="flex-1 py-3 rounded-xl bg-omicron-accent text-omicron-bg text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95">
              Ver código
            </button>
          </>
        ) : (
          <>
            <button onClick={onClose} className="py-3 px-5 rounded-xl border border-omicron-border text-omicron-subtle text-sm font-semibold transition active:scale-95">Cancelar</button>
            <button onClick={() => { setActiveView('editor'); handleRun(); }} disabled={phase === 'running' || isSaving}
              className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition active:scale-95 ${phase === 'running' ? 'bg-omicron-card text-omicron-subtle cursor-not-allowed' : 'bg-omicron-accent hover:bg-omicron-accent/90 text-omicron-bg'}`}>
              {phase === 'running' ? (<><Square size={15} fill="currentColor" /> Ejecutando...</>) : (<><Play size={15} fill="currentColor" /> Ejecutar solución</>)}
            </button>
          </>
        )}
      </footer>
    </div>
  );
}

function ResultPanel({ result, passingScore, peAwarded }: { result: RunResult; passingScore: number; peAwarded: number; }) {
  const passed = result.result === 'PASS';
  const [expanded, setExpanded] = useState(false);
  return (
    <div className={`rounded-xl border overflow-hidden ${passed ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-red-500/40 bg-red-500/5'}`}>
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {passed ? <CheckCircle size={20} className="text-emerald-500" /> : result.result === 'TIMEOUT' ? <AlertTriangle size={20} className="text-amber-500" /> : <XCircle size={20} className="text-red-500" />}
          <div>
            <p className={`font-bold text-sm ${passed ? 'text-emerald-500' : 'text-red-500'}`}>
              {passed ? '¡Solución correcta!' : result.result === 'TIMEOUT' ? 'Tiempo agotado' : 'Solución incorrecta'}
            </p>
            <p className="text-xs text-omicron-subtle">
              {result.score}% · {result.testCaseResults.filter(r => r.passed).length}/{result.testCaseResults.length} casos · {formatTime(result.timeTakenSeconds)}
            </p>
            {result.errorMessage && <p className="text-[11px] text-red-400 mt-1 font-mono">{result.errorMessage}</p>}
          </div>
        </div>
        {peAwarded > 0 && (
          <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
            <Trophy size={14} className="text-yellow-400" />
            <span className="text-xs font-bold text-yellow-400">+{peAwarded} PE</span>
          </div>
        )}
      </div>
      <div className="px-4 pb-3">
        <div className="w-full h-2 bg-omicron-border rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${passed ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${result.score}%` }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-omicron-subtle">0%</span>
          <span className="text-[10px] text-omicron-subtle">Aprobación: {passingScore}%</span>
          <span className="text-[10px] text-omicron-subtle">100%</span>
        </div>
      </div>
      {result.testCaseResults.length > 0 && (
        <>
          <button onClick={() => setExpanded(v => !v)} className="w-full flex items-center justify-between px-4 py-2 border-t border-omicron-border/40 text-xs text-omicron-subtle">
            <span>Ver detalle de casos</span>
            {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>
          {expanded && (
            <div className="divide-y divide-omicron-border/30">
              {result.testCaseResults.map((tc, i) => (
                <div key={i} className="px-4 py-2.5 flex items-start gap-3">
                  {tc.passed ? <CheckCircle size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" /> : <XCircle size={13} className="text-red-500 flex-shrink-0 mt-0.5" />}
                  <div className="text-xs font-mono space-y-0.5 min-w-0">
                    <p className="text-omicron-subtle truncate">Input: <span className="text-blue-400">{tc.input}</span></p>
                    <p className="text-omicron-subtle truncate">Esperado: <span className="text-emerald-400">{tc.expected}</span></p>
                    {!tc.passed && <p className="text-omicron-subtle truncate">Obtenido: <span className="text-red-400">{tc.error || tc.actual || '—'}</span></p>}
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
    <div className="flex items-center justify-between px-4 py-3 bg-omicron-bg">
      <div className="flex items-center gap-3">
        <span className="text-xs text-omicron-subtle w-4">#{index + 1}</span>
        {passed ? <CheckCircle size={14} className="text-emerald-500" /> : attempt.result === 'TIMEOUT' ? <AlertTriangle size={14} className="text-amber-500" /> : <XCircle size={14} className="text-red-500" />}
        <div>
          <p className={`text-xs font-semibold ${passed ? 'text-emerald-500' : 'text-omicron-subtle'}`}>{attempt.score}% — {attempt.result}</p>
          <p className="text-[10px] text-omicron-subtle">{new Date(attempt.attempted_at).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })}</p>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs text-omicron-subtle font-mono">
        <Clock size={11} />
        {formatTime(attempt.time_taken_seconds)}
      </div>
    </div>
  );
}

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
