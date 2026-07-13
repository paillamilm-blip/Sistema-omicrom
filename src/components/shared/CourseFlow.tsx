// components/shared/CourseFlow.tsx
// Flujo de curso que vive DENTRO de un nodo del árbol (Fase 2 — pestaña única "Aprender").
// Lecciones + Tutor IA + quiz, como overlay. Al aprobar valida el nodo y avisa (onValidated).

import { useState, useEffect, useCallback, useRef } from 'react';
import { X, ChevronDown, CheckCircle2, Lock, Award, Loader2, Sparkles, Bot, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C, FONT, RADIUS } from '../../theme';

interface Course { id: string; title: string; description: string; passing_score: number; }
interface Lesson { id: string; title: string; content: string; }
interface QuizQ { id: string; question: string; options: string[]; }

function TutorPanel({ lesson, onClose }: { lesson: { title: string; content: string }; onClose: () => void }) {
  const [msgs, setMsgs] = useState<{ role: 'user' | 'model'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  async function ask(q?: string) {
    const question = (q ?? input).trim();
    if (!question || loading) return;
    setInput('');
    const base = [...msgs, { role: 'user' as const, text: question }];
    setMsgs(base);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('tutor', {
        body: { question, lessonTitle: lesson.title, lessonContent: lesson.content, history: msgs },
      });
      const answer = error
        ? 'El Tutor IA no está disponible (falta desplegar la función tutor).'
        : (data?.answer ?? data?.error ?? 'Sin respuesta.');
      setMsgs([...base, { role: 'model', text: answer }]);
    } catch {
      setMsgs([...base, { role: 'model', text: 'Error de conexión con el Tutor.' }]);
    } finally {
      setLoading(false);
    }
  }

  const chips = ['Explícamelo más simple', 'Dame un ejemplo', 'Hazme un ejercicio'];

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1100, background: 'rgba(2,6,19,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: RADIUS.xl, background: 'linear-gradient(165deg, rgba(22,34,58,0.98), rgba(10,17,32,0.99))', border: `1px solid ${C.gold}55`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.gold}18`, border: `1px solid ${C.gold}55` }}>
            <Bot size={18} style={{ color: C.gold }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Tutor IA</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lesson.title}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cyanDim}`, color: C.cyan }}>
            <X size={16} />
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 200, maxHeight: '54vh', overflowY: 'auto', padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {msgs.length === 0 && (
            <div style={{ textAlign: 'center', padding: '10px 0', fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, lineHeight: 1.5 }}>
              👋 Pregúntame lo que no entiendas de <strong style={{ color: '#eaf4ff' }}>{lesson.title}</strong>.
            </div>
          )}
          {msgs.map((m, msgIdx) => {
            const own = m.role === 'user';
            const msgKey = `msg-${msgIdx}-${m.role}-${m.text.slice(0, 20)}`;
            return (
              <div key={msgKey} style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '10px 13px', borderRadius: 12, background: own ? 'rgba(92, 200, 255,0.12)' : `${C.gold}12`, border: `1px solid ${own ? C.cyanDim : C.gold + '40'}`, borderTopRightRadius: own ? 3 : 12, borderTopLeftRadius: own ? 12 : 3 }}>
                  <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 14, color: '#e6f1fb', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{m.text}</p>
                </div>
              </div>
            );
          })}
          {loading && <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: C.gold, fontFamily: FONT.mono, fontSize: 11 }}><Loader2 size={14} className="animate-spin" /> El tutor está pensando...</div>}
        </div>
        {msgs.length === 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', padding: '0 16px 8px' }}>
            {chips.map(ch => (
              <button key={ch} onClick={() => ask(ch)} style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyan, cursor: 'pointer', background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, borderRadius: 16, padding: '6px 11px' }}>{ch}</button>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, padding: '12px 16px', borderTop: `1px solid ${C.cyanFaint}` }}>
          <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) ask(); }} placeholder="Escribe tu duda..." style={{ flex: 1, padding: '11px 14px', borderRadius: 11, background: 'rgba(255,255,255,0.04)', border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: FONT.body, fontSize: 14, outline: 'none' }} />
          <button onClick={() => ask()} disabled={!input.trim() || loading} style={{ width: 44, height: 44, borderRadius: 11, background: C.gold, border: 'none', color: '#1a1205', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || loading ? 0.4 : 1 }}>
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function CourseFlowModal({ nodeId, onClose, onValidated }: { nodeId: string; onClose: () => void; onValidated: () => void }) {
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [doneLessons, setDoneLessons] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'lessons' | 'quiz'>('lessons');
  const [tutorLesson, setTutorLesson] = useState<Lesson | null>(null);
  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    const { data: cs } = await supabase
      .from('academy_courses').select('id,title,description,passing_score')
      .eq('node_id', nodeId).eq('is_published', true).limit(1).maybeSingle();
    const c = (cs as Course) ?? null;
    setCourse(c);
    if (c) {
      const { data: ls } = await supabase
        .from('course_lessons').select('id,title,content').eq('course_id', c.id).order('order_index');
      const list = (ls as Lesson[]) ?? [];
      setLessons(list);
      if (list.length) {
        const { data: done } = await supabase
          .from('user_lesson_progress').select('lesson_id').in('lesson_id', list.map(l => l.id));
        const ds = new Set(((done as { lesson_id: string }[]) ?? []).map(d => d.lesson_id));
        setDoneLessons(ds);
        setExpanded(list.find(l => !ds.has(l.id))?.id ?? list[0]?.id ?? null);
      }
    }
    setLoading(false);
  }, [nodeId]);

  useEffect(() => { if (!loadedRef.current) { loadedRef.current = true; load(); } }, [load]);

  async function completeLesson(id: string) {
    await supabase.rpc('mark_lesson_complete', { p_lesson_id: id });
    setDoneLessons(prev => new Set(prev).add(id));
    const idx = lessons.findIndex(l => l.id === id);
    setExpanded(lessons[idx + 1]?.id ?? null);
  }

  async function startQuiz() {
    if (!course) return;
    const { data } = await supabase.rpc('get_course_quiz', { p_course_id: course.id });
    setQuestions((data as QuizQ[]) ?? []);
    setAnswers({}); setResult(null); setView('quiz');
  }

  async function submit() {
    if (!course || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_quiz', { p_course_id: course.id, p_answers: answers });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      setResult({ score: r.score, passed: r.passed });
      if (r.passed) onValidated();
    } catch {
      setResult({ score: 0, passed: false });
    } finally {
      setSubmitting(false);
    }
  }

  const allDone = lessons.length > 0 && lessons.every(l => doneLessons.has(l.id));
  const pct = lessons.length ? Math.round((doneLessons.size / lessons.length) * 100) : 0;

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 1050, background: 'rgba(2,6,19,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 460, maxHeight: '92vh', display: 'flex', flexDirection: 'column', borderRadius: RADIUS.xl, background: 'linear-gradient(165deg, rgba(22,34,58,0.98), rgba(10,17,32,0.99))', border: `1px solid ${C.cyan}55`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyan, letterSpacing: 1.5 }}>APRENDER</div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{course?.title ?? 'Curso'}</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cyanDim}`, color: C.cyan }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}>
              <Loader2 size={24} style={{ color: C.cyan }} className="animate-spin" />
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: 1 }}>CARGANDO CURSO...</span>
            </div>
          ) : !course ? (
            <div style={{ textAlign: 'center', padding: '36px 12px', fontFamily: FONT.body, fontSize: 13.5, color: C.cyanDim, lineHeight: 1.5 }}>
              Este nodo aún no tiene un curso publicado. Puedes validarlo directo con el <strong style={{ color: C.gold }}>Desafío (Simulador)</strong>. →
            </div>
          ) : result ? (
            <div style={{ textAlign: 'center', padding: '24px 12px' }}>
              <div style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 14px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: result.passed ? `${C.green}1a` : `${C.red}1a`, border: `2px solid ${result.passed ? C.green : C.red}` }}>
                {result.passed ? <CheckCircle2 size={38} style={{ color: C.green }} /> : <Lock size={34} style={{ color: C.red }} />}
              </div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 30, color: result.passed ? C.green : C.red }}>{result.score}%</div>
              <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginTop: 10, lineHeight: 1.5 }}>
                {result.passed ? '🔓 ¡Nodo validado! Tu Fundamento subió en el Gemelo Digital.' : `Necesitas ${course.passing_score}%. Repasa e inténtalo de nuevo.`}
              </p>
              <button onClick={result.passed ? onClose : () => setView('lessons')} style={{ marginTop: 18, padding: '11px 22px', borderRadius: 10, cursor: 'pointer', background: `${C.cyan}18`, border: `1px solid ${C.cyan}`, color: C.cyan, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, fontWeight: 700 }}>
                {result.passed ? 'CERRAR' : 'REINTENTAR'}
              </button>
            </div>
          ) : view === 'quiz' ? (
            <>
              {questions.map((q, qi) => (
                <div key={q.id} style={{ marginBottom: 18 }}>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe', marginBottom: 10 }}>{qi + 1}. {q.question}</div>
                  {q.options.map((opt, oi) => {
                    const sel = answers[q.id] === oi;
                    return (
                      <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: oi })} style={{ width: '100%', textAlign: 'left', marginBottom: 7, padding: '11px 13px', borderRadius: 10, cursor: 'pointer', background: sel ? `${C.cyan}18` : 'rgba(20,30,52,0.7)', border: `1px solid ${sel ? C.cyan : 'rgba(255,255,255,0.08)'}`, color: sel ? '#e2f3ff' : '#b9d4e6', fontFamily: FONT.body, fontSize: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ width: 18, height: 18, borderRadius: '50%', flexShrink: 0, border: `2px solid ${sel ? C.cyan : C.cyanDim}`, background: sel ? C.cyan : 'transparent' }} />
                        {opt}
                      </button>
                    );
                  })}
                </div>
              ))}
              <button onClick={submit} disabled={submitting || Object.keys(answers).length < questions.length} style={{ width: '100%', padding: '13px', borderRadius: 12, cursor: (submitting || Object.keys(answers).length < questions.length) ? 'not-allowed' : 'pointer', background: C.gold, border: 'none', color: '#1a1205', fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, fontWeight: 700, opacity: (submitting || Object.keys(answers).length < questions.length) ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {submitting ? <><Loader2 size={15} className="animate-spin" /> CALIFICANDO…</> : 'ENVIAR RESPUESTAS'}
              </button>
            </>
          ) : (
            <>
              <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.08)', overflow: 'hidden', marginBottom: 14 }}>
                <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${allDone ? C.green : C.cyan}, ${C.cyan})`, borderRadius: 4, transition: 'width 0.4s ease' }} />
              </div>
              {lessons.map((l, i) => {
                const done = doneLessons.has(l.id);
                const isOpen = expanded === l.id;
                const accent = done ? C.green : C.cyan;
                return (
                  <div key={l.id} style={{ borderRadius: RADIUS.lg, marginBottom: 10, overflow: 'hidden', background: 'rgba(20,30,52,0.7)', border: `1px solid ${done ? C.green + '44' : 'rgba(255,255,255,0.08)'}` }}>
                    <button onClick={() => setExpanded(isOpen ? null : l.id)} style={{ width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${accent}14`, border: `1px solid ${accent}55` }}>
                        {done ? <CheckCircle2 size={15} style={{ color: C.green }} /> : <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: accent }}>{i + 1}</span>}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>{l.title}</div>
                        <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: C.cyanDim, marginTop: 1 }}>LECCIÓN {i + 1}{done ? ' · LEÍDA' : ''}</div>
                      </div>
                      <ChevronDown size={17} style={{ color: C.cyanDim, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
                    </button>
                    {isOpen && (
                      <div style={{ padding: '0 14px 14px' }}>
                        <p style={{ fontFamily: FONT.body, fontSize: 14, color: '#cfe2f0', lineHeight: 1.6, margin: '0 0 12px' }}>{l.content}</p>
                        {!done ? (
                          <button onClick={() => completeLesson(l.id)} style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: '#04110a', background: C.cyan, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> MARCAR LEÍDA</button>
                        ) : (
                          <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.green, display: 'inline-flex', alignItems: 'center', gap: 6 }}><CheckCircle2 size={14} /> Completada</span>
                        )}
                        <div style={{ marginTop: 10 }}>
                          <button onClick={() => setTutorLesson(l)} style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: C.gold, background: `${C.gold}14`, border: `1px solid ${C.gold}55`, borderRadius: 8, padding: '8px 14px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}><Sparkles size={14} /> PREGÚNTALE AL TUTOR IA</button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={startQuiz} disabled={!allDone} style={{ width: '100%', marginTop: 6, padding: '13px', borderRadius: RADIUS.lg, cursor: allDone ? 'pointer' : 'not-allowed', background: allDone ? C.gold : 'transparent', border: `1px solid ${allDone ? C.gold : C.cyanFaint}`, color: allDone ? '#1a1205' : C.cyanDim, fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                {allDone ? <><Award size={15} /> RENDIR QUIZ Y VALIDAR NODO</> : <><Lock size={14} /> COMPLETA LAS LECCIONES</>}
              </button>
            </>
          )}
        </div>
      </div>

      {tutorLesson && <TutorPanel lesson={{ title: tutorLesson.title, content: tutorLesson.content }} onClose={() => setTutorLesson(null)} />}
    </div>
  );
}
