// components/shared/ExamenChallenge.tsx
// Examinador IA — valida una competencia con preguntas tecnicas (opcion
// multiple + caso aplicado + defensa). La IA evalua los 4 ejes del Gemelo
// Digital y emite un Acta de Evidencia. El examen lo genera/evalua la
// Edge Function `examen-ia` (la nota es autoritativa del servidor).

import { useState, useEffect, useCallback } from 'react';
import {
  Brain, Sparkles, ShieldCheck, CheckCircle, XCircle,
  Loader2, ArrowRight, Send, RotateCcw,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { SkillTreeNode, ExamGenerated, ExamResultado } from '../../types';

interface Props {
  node: SkillTreeNode;
  onClose: () => void;
  onFinished: (res: ExamResultado) => void;
}

// ♿ Accesibilidad: tonos oscurecidos respecto a la versión original para
// mejorar el contraste y no forzar la vista.
const C = {
  cyan: '#00D6E6', cyanDim: 'rgba(0,214,230,0.46)', cyanFaint: 'rgba(0,214,230,0.12)',
  gold: '#E08A00', goldFaint: 'rgba(224,138,0,0.14)',
  green: '#2FE014', greenFaint: 'rgba(47,224,20,0.12)',
  red: '#FF3D57', redFaint: 'rgba(255,61,87,0.12)',
  bg: '#020613', panel: 'rgba(8,16,38,0.72)', card: 'rgba(13,22,46,0.85)',
  text: '#e6f1fb', sub: 'rgba(0,214,230,0.62)', line: 'rgba(0,214,230,0.16)',
} as const;
const MONO = "'Share Tech Mono', 'Courier New', monospace";
const DISP = "'Rajdhani', sans-serif";

type Phase = 'cargando' | 'preguntas' | 'defensa' | 'evaluando' | 'resultado' | 'error';

// Extrae el mensaje de error real que devuelve la Edge Function (incluye "detail").
async function serverError(error: unknown, data: unknown, fallback: string): Promise<string> {
  const d = data as { error?: string; detail?: string } | null;
  if (d?.error) return d.detail ? `${d.error} — ${d.detail}` : d.error;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error) return body.detail ? `${body.error} — ${body.detail}` : body.error;
    } catch { /* sin cuerpo legible */ }
  }
  return (error as { message?: string } | null)?.message || fallback;
}

const EJE_LABELS: Record<string, string> = {
  ejecucion: 'Ejecución', calidad: 'Calidad', trascendencia: 'Trascendencia', fundamento: 'Fundamento',
};

export function ExamenChallenge({ node, onClose, onFinished }: Props) {
  const [phase, setPhase] = useState<Phase>('cargando');
  const [errMsg, setErrMsg] = useState('');

  const [exam, setExam] = useState<ExamGenerated | null>(null);
  const [mcRespuestas, setMcRespuestas] = useState<number[]>([]);
  const [casoRespuesta, setCasoRespuesta] = useState('');

  const [defensa, setDefensa] = useState('');
  const [defensaRespuesta, setDefensaRespuesta] = useState('');

  const [resultado, setResultado] = useState<ExamResultado | null>(null);

  const generar = useCallback(async () => {
    setPhase('cargando');
    setErrMsg('');
    try {
      const { data, error } = await supabase.functions.invoke('examen-ia', {
        body: { action: 'generar', node_id: node.id },
      });
      const d = data as ExamGenerated & { error?: string };
      if (error || !d || d.error || !d.multiple_choice) {
        setErrMsg(await serverError(error, data, 'No se pudo generar el examen. ¿Está desplegada la función "examen-ia"?'));
        setPhase('error');
        return;
      }
      setExam(d);
      setMcRespuestas(new Array(d.multiple_choice.length).fill(-1));
      setPhase('preguntas');
    } catch {
      setErrMsg('Error de conexión con el Examinador IA.');
      setPhase('error');
    }
  }, [node.id]);

  useEffect(() => { generar(); }, [generar]);

  const irADefensa = useCallback(async () => {
    if (!exam) return;
    setPhase('cargando');
    try {
      const { data, error } = await supabase.functions.invoke('examen-ia', {
        body: { action: 'defensa', session_id: exam.session_id, caso_respuesta: casoRespuesta },
      });
      const d = data as { defensa?: string; error?: string };
      if (error || d?.error) {
        setErrMsg(await serverError(error, data, 'No se pudo cargar la defensa.'));
        setPhase('error');
        return;
      }
      setDefensa(d?.defensa || 'Explica por qué tu enfoque es el correcto.');
      setPhase('defensa');
    } catch {
      setErrMsg('Error de conexión con el Examinador IA.');
      setPhase('error');
    }
  }, [exam, casoRespuesta]);

  const evaluar = useCallback(async () => {
    if (!exam) return;
    setPhase('evaluando');
    try {
      const { data, error } = await supabase.functions.invoke('examen-ia', {
        body: {
          action: 'evaluar',
          session_id: exam.session_id,
          mcq_respuestas: mcRespuestas,
          caso_respuesta: casoRespuesta,
          defensa_respuesta: defensaRespuesta,
        },
      });
      const d = data as ExamResultado & { error?: string };
      if (error || d?.error || !d?.ejes) {
        setErrMsg(await serverError(error, data, 'No se pudo evaluar el examen.'));
        setPhase('error');
        return;
      }
      setResultado(d);
      setPhase('resultado');
      onFinished(d);
    } catch {
      setErrMsg('Error de conexión con el Examinador IA.');
      setPhase('error');
    }
  }, [exam, mcRespuestas, casoRespuesta, defensaRespuesta, onFinished]);

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape' && phase !== 'evaluando' && phase !== 'cargando') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [phase, onClose]);

  const todasContestadas = mcRespuestas.length > 0 && mcRespuestas.every(r => r >= 0) && casoRespuesta.trim().length > 0;

  return (
    <div role="dialog" aria-modal="true" aria-label={`Examen: ${node.title}`}
      style={{ position: 'fixed', inset: 0, zIndex: 1200, background: 'rgba(2,6,19,0.92)', backdropFilter: 'blur(8px)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <header style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: C.panel, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, boxShadow: `0 0 14px ${C.cyan}44` }}>
            <Brain size={18} style={{ color: C.cyan }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontFamily: DISP, fontWeight: 700, fontSize: 15, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{node.title}</p>
            <p style={{ margin: '2px 0 0', fontFamily: MONO, fontSize: 9.5, color: C.sub, letterSpacing: 0.5 }}>EXAMINADOR IA · VALIDACIÓN DE COMPETENCIA</p>
          </div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{ width: 30, height: 30, borderRadius: 9, background: C.card, border: `1px solid ${C.line}`, color: C.sub, cursor: 'pointer', fontSize: 16 }}>×</button>
      </header>

      {/* Pasos */}
      <div style={{ flex: '0 0 auto', display: 'flex', gap: 6, padding: '10px 16px', background: C.panel, borderBottom: `1px solid ${C.line}`, fontFamily: MONO, fontSize: 9, letterSpacing: 0.5 }}>
        {[['preguntas', 'PREGUNTAS'], ['defensa', 'DEFENSA'], ['resultado', 'ACTA']].map(([key, label], i) => {
          const order = ['preguntas', 'defensa', 'resultado'];
          const cur = phase === 'cargando' ? 0 : phase === 'evaluando' ? 2 : order.indexOf(phase);
          const on = order.indexOf(key) <= cur;
          return (
            <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: on ? C.cyan : 'rgba(255,255,255,0.25)' }}>
              {i + 1}. {label}{i < 2 && <ArrowRight size={9} style={{ color: 'rgba(255,255,255,0.2)' }} />}
            </span>
          );
        })}
      </div>

      {/* Cuerpo */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', background: C.bg, padding: 16 }}>

        {(phase === 'cargando' || phase === 'evaluando') && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, minHeight: 280 }}>
            <Loader2 size={30} className="animate-spin" style={{ color: C.cyan }} />
            <p style={{ fontFamily: MONO, fontSize: 12, color: C.sub, letterSpacing: 1, textAlign: 'center' }}>
              {phase === 'evaluando' ? 'La IA está evaluando tu desempeño...' : 'Generando tu examen adaptativo...'}
            </p>
          </div>
        )}

        {phase === 'error' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 14, minHeight: 280, textAlign: 'center' }}>
            <XCircle size={30} style={{ color: C.red }} />
            <p style={{ fontFamily: DISP, fontSize: 15, color: C.text, maxWidth: 420 }}>{errMsg}</p>
            <button onClick={generar} style={btn(C.cyan)}><RotateCcw size={15} /> Reintentar</button>
          </div>
        )}

        {phase === 'preguntas' && exam && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {exam.multiple_choice.map((q, qi) => (
              <div key={qi} style={cardStyle}>
                <p style={{ margin: '0 0 10px', fontFamily: DISP, fontSize: 14.5, fontWeight: 700, color: C.text, lineHeight: 1.5 }}>{qi + 1}. {q.pregunta}</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {q.opciones.map((op, oi) => {
                    const sel = mcRespuestas[qi] === oi;
                    return (
                      <button key={oi} onClick={() => setMcRespuestas(p => p.map((v, i) => i === qi ? oi : v))}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, cursor: 'pointer', textAlign: 'left',
                          background: sel ? C.cyanFaint : 'transparent', border: `1px solid ${sel ? C.cyan : C.line}`, color: sel ? C.text : 'rgba(230,241,251,0.8)', fontFamily: DISP, fontSize: 13.5 }}>
                        <span style={{ width: 18, height: 18, flexShrink: 0, borderRadius: '50%', border: `2px solid ${sel ? C.cyan : C.sub}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {sel && <span style={{ width: 9, height: 9, borderRadius: '50%', background: C.cyan }} />}
                        </span>
                        {op}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={{ ...cardStyle, borderColor: C.goldFaint }}>
              <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase' }}>⬡ Caso aplicado</p>
              <p style={{ margin: '0 0 10px', fontFamily: DISP, fontSize: 14.5, color: C.text, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{exam.caso.enunciado}</p>
              <textarea value={casoRespuesta} onChange={e => setCasoRespuesta(e.target.value)}
                placeholder="Desarrolla tu respuesta con criterio técnico..."
                style={textareaStyle} />
            </div>
          </div>
        )}

        {phase === 'defensa' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...cardStyle, borderColor: C.cyanDim }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Sparkles size={15} style={{ color: C.cyan }} />
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' }}>Defensa · la IA te repregunta</span>
              </div>
              <p style={{ margin: '0 0 12px', fontFamily: DISP, fontSize: 15, color: C.text, lineHeight: 1.6 }}>{defensa}</p>
              <textarea value={defensaRespuesta} onChange={e => setDefensaRespuesta(e.target.value)}
                placeholder="Responde con tus palabras (esto valida tu Fundamento)..."
                style={textareaStyle} autoFocus />
            </div>
            <p style={{ fontFamily: MONO, fontSize: 10.5, color: C.sub, textAlign: 'center', lineHeight: 1.5 }}>
              Responder de memoria no basta: la IA evalúa si entiendes de verdad.
            </p>
          </div>
        )}

        {phase === 'resultado' && resultado && (
          <ResultadoPanel res={resultado} />
        )}
      </div>

      {/* Footer */}
      <footer style={{ flex: '0 0 auto', padding: 14, borderTop: `1px solid ${C.line}`, background: C.panel, display: 'flex', gap: 12 }}>
        {phase === 'preguntas' && (
          <>
            <button onClick={onClose} style={btnGhost}>Cancelar</button>
            <button onClick={irADefensa} disabled={!todasContestadas} style={{ ...btn(C.cyan), flex: 1, opacity: todasContestadas ? 1 : 0.45, cursor: todasContestadas ? 'pointer' : 'not-allowed' }}>
              Continuar a la defensa <ArrowRight size={15} />
            </button>
          </>
        )}
        {phase === 'defensa' && (
          <>
            <button onClick={onClose} style={btnGhost}>Cancelar</button>
            <button onClick={evaluar} disabled={defensaRespuesta.trim().length === 0} style={{ ...btn(C.green), flex: 1, opacity: defensaRespuesta.trim() ? 1 : 0.45, cursor: defensaRespuesta.trim() ? 'pointer' : 'not-allowed' }}>
              <Send size={15} /> Enviar examen
            </button>
          </>
        )}
        {phase === 'resultado' && (
          <button onClick={onClose} style={{ ...btn(C.cyan), flex: 1 }}><ShieldCheck size={15} /> Cerrar</button>
        )}
        {(phase === 'error') && (
          <button onClick={onClose} style={{ ...btnGhost, flex: 1 }}>Cerrar</button>
        )}
      </footer>
    </div>
  );
}

function ResultadoPanel({ res }: { res: ExamResultado }) {
  const aprob = res.veredicto === 'APROBADO';
  const accent = aprob ? C.green : C.red;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ borderRadius: 12, border: `1px solid ${accent}66`, background: aprob ? C.greenFaint : C.redFaint, padding: 16, textAlign: 'center' }}>
        {aprob ? <CheckCircle size={30} style={{ color: C.green }} /> : <XCircle size={30} style={{ color: C.red }} />}
        <p style={{ margin: '8px 0 2px', fontFamily: DISP, fontWeight: 700, fontSize: 18, color: accent }}>
          {aprob ? 'Competencia validada' : 'Aún no validada'}
        </p>
        <p style={{ margin: 0, fontFamily: MONO, fontSize: 12, color: C.sub }}>Puntaje global: {res.puntaje_global}% {aprob ? '· Acta emitida ✓' : '· requiere 70%'}</p>
      </div>

      <div style={cardStyle}>
        <p style={{ margin: '0 0 12px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' }}>🧬 Gemelo Digital · tus 4 ejes</p>
        {(['ejecucion', 'calidad', 'trascendencia', 'fundamento'] as const).map(k => {
          const v = res.ejes[k];
          return (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: MONO, fontSize: 11, color: C.text, marginBottom: 4 }}>
                <span>{EJE_LABELS[k]}</span><span style={{ color: C.cyan }}>{v}</span>
              </div>
              <div style={{ height: 6, background: 'rgba(255,255,255,0.08)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.cyan})`, borderRadius: 4, transition: 'width 0.6s ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {res.resumen && (
        <div style={cardStyle}>
          <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.cyan, textTransform: 'uppercase' }}>📜 Acta de evidencia</p>
          <p style={{ margin: 0, fontFamily: DISP, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{res.resumen}</p>
        </div>
      )}
      {res.feedback && (
        <div style={{ ...cardStyle, borderColor: `${C.gold}55`, background: C.goldFaint }}>
          <p style={{ margin: '0 0 6px', fontFamily: MONO, fontSize: 9, letterSpacing: 1.5, color: C.gold, textTransform: 'uppercase' }}>💡 Para mejorar</p>
          <p style={{ margin: 0, fontFamily: DISP, fontSize: 14, color: C.text, lineHeight: 1.6 }}>{res.feedback}</p>
        </div>
      )}
    </div>
  );
}

const cardStyle: React.CSSProperties = { padding: 16, borderRadius: 12, background: C.card, border: `1px solid ${C.line}` };
const textareaStyle: React.CSSProperties = {
  width: '100%', minHeight: 110, padding: 12, boxSizing: 'border-box', background: '#040a18', color: '#c9f6ff',
  fontFamily: DISP, fontSize: 14, lineHeight: 1.5, resize: 'vertical', outline: 'none', borderRadius: 9, border: `1px solid ${C.line}`,
};
function btn(color: string): React.CSSProperties {
  return { padding: '13px 18px', borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 14, color: C.bg, background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, boxShadow: `0 0 16px ${color}55` };
}
const btnGhost: React.CSSProperties = { padding: '13px 20px', borderRadius: 12, background: 'transparent', border: `1px solid ${C.line}`, color: C.sub, cursor: 'pointer', fontFamily: DISP, fontWeight: 700, fontSize: 14 };
