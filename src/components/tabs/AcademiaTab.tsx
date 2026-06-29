import { useState, useEffect, useCallback } from 'react';
import { GraduationCap, ArrowLeft, BookOpen, CheckCircle2, Lock, Play, Award, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT, BASE, cx } from '../../theme';
import { ScanlineOverlay, CyberHeader, CyberCard, SectionLabel, LoadingScreen } from '../shared/CyberComponents';
import { EmptyState } from '../shared/EmptyState';
import { useToast } from '../shared/Toast';

interface Course {
  id: string; node_id: string | null; title: string; description: string;
  cover_emoji: string; difficulty: number; passing_score: number; order_index: number;
}
interface Lesson { id: string; title: string; content: string; video_url: string | null; order_index: number; }
interface QuizQ { id: string; question: string; options: string[]; order_index: number; }
interface Prog { course_id: string; status: string; quiz_passed: boolean; }

export function AcademiaTab() {
  const { profile, refreshProfile, setActiveTab } = useApp();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [prog, setProg] = useState<Map<string, Prog>>(new Map());
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [doneLessons, setDoneLessons] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'list' | 'course' | 'quiz'>('list');

  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const loadCourses = useCallback(async () => {
    if (!profile) return;
    const { data: cs } = await supabase
      .from('academy_courses').select('*').eq('is_published', true).order('order_index');
    setCourses((cs as Course[]) ?? []);
    const { data: ps } = await supabase
      .from('user_course_progress').select('course_id,status,quiz_passed').eq('user_id', profile.id);
    setProg(new Map(((ps as Prog[]) ?? []).map(p => [p.course_id, p])));
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  async function openCourse(c: Course) {
    setCourse(c); setView('course'); setResult(null); setAnswers({});
    const { data: ls } = await supabase
      .from('course_lessons').select('*').eq('course_id', c.id).order('order_index');
    const lessonList = (ls as Lesson[]) ?? [];
    setLessons(lessonList);
    if (profile && lessonList.length) {
      const { data: done } = await supabase
        .from('user_lesson_progress').select('lesson_id')
        .in('lesson_id', lessonList.map(l => l.id));
      setDoneLessons(new Set(((done as { lesson_id: string }[]) ?? []).map(d => d.lesson_id)));
    } else {
      setDoneLessons(new Set());
    }
  }

  async function completeLesson(lessonId: string) {
    await supabase.rpc('mark_lesson_complete', { p_lesson_id: lessonId });
    setDoneLessons(prev => new Set(prev).add(lessonId));
  }

  async function startQuiz() {
    if (!course) return;
    const { data } = await supabase.rpc('get_course_quiz', { p_course_id: course.id });
    setQuestions((data as QuizQ[]) ?? []);
    setAnswers({});
    setResult(null);
    setView('quiz');
  }

  async function submit() {
    if (!course || submitting) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('submit_quiz', { p_course_id: course.id, p_answers: answers });
      if (error) throw error;
      const r = Array.isArray(data) ? data[0] : data;
      setResult({ score: r.score, passed: r.passed });
      await loadCourses();
      if (r.passed) await refreshProfile(); // el nodo validado sube tu Fundamento
    } catch (e) {
      toast('No se pudo enviar el quiz: ' + ((e as Error).message ?? e), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function backToList() {
    setView('list'); setCourse(null); setLessons([]); setQuestions([]); setResult(null); setAnswers({});
  }

  if (loading) return <LoadingScreen message="CARGANDO ACADEMIA..." />;

  // ─── VISTA: lista de cursos ──────────────────────────────────────────
  if (view === 'list') {
    return (
      <div style={BASE.root}>
        <ScanlineOverlay />
        <CyberHeader title="ACADEMIA" subtitle="ENTRENAMIENTO // REFUERZA TUS NODOS" dotColor={C.cyan}
          badge={<GraduationCap size={16} style={{ color: C.cyan }} />} />
        <div style={cx(BASE.scrollArea, { padding: '10px 14px 20px' })}>
          <SectionLabel>◆ CURSOS DISPONIBLES ({courses.length})</SectionLabel>
          {courses.length === 0 ? (
            <EmptyState
              icon={<BookOpen size={30} />}
              title="Aún no hay cursos"
              hint="Pronto los docentes publicarán cursos aquí. Mientras tanto, gana Fundamento validando nodos en el Árbol de Habilidades."
              ctaLabel="Ir al Árbol de Habilidades"
              onCta={() => setActiveTab('maxskill')}
            />
          ) : courses.map(c => {
            const p = prog.get(c.id);
            const done = p?.status === 'COMPLETED';
            return (
              <CyberCard key={c.id} color={done ? C.green : C.cyan} margin="0 0 10px" onClick={() => openCourse(c)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ fontSize: 26 }}>{c.cover_emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe' }}>{c.title}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginTop: 2 }}>
                      Dificultad {c.difficulty}/5 · aprobar {c.passing_score}%
                    </div>
                  </div>
                  {done
                    ? <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT.mono, fontSize: 9, color: C.green }}><CheckCircle2 size={13} /> COMPLETADO</span>
                    : <Play size={16} style={{ color: C.cyan }} />}
                </div>
              </CyberCard>
            );
          })}
        </div>
      </div>
    );
  }

  // ─── VISTA: detalle del curso (lecciones) ───────────────────────────
  if (view === 'course' && course) {
    const allDone = lessons.length > 0 && lessons.every(l => doneLessons.has(l.id));
    return (
      <div style={BASE.root}>
        <ScanlineOverlay />
        <div style={cx(BASE.header, { gap: 10 })}>
          <button onClick={backToList} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: C.cyan, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.cover_emoji} {course.title}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim }}>{doneLessons.size}/{lessons.length} lecciones</div>
          </div>
        </div>

        <div style={cx(BASE.scrollArea, { padding: '12px 14px' })}>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginBottom: 16 }}>{course.description}</p>

          {lessons.map((l, i) => {
            const done = doneLessons.has(l.id);
            return (
              <div key={l.id} style={{
                borderRadius: 12, padding: 14, marginBottom: 10,
                background: 'rgba(10,17,32,0.9)', border: `1px solid ${done ? C.green + '55' : C.cyanFaint}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: done ? C.green : C.cyan }}>LECCIÓN {i + 1}</span>
                  {done && <CheckCircle2 size={13} style={{ color: C.green }} />}
                </div>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe', marginBottom: 6 }}>{l.title}</div>
                <p style={{ fontFamily: FONT.body, fontSize: 13, color: '#b9d4e6', lineHeight: 1.5, margin: 0 }}>{l.content}</p>
                {!done && (
                  <button onClick={() => completeLesson(l.id)} style={{
                    marginTop: 10, fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1,
                    color: '#04110a', background: C.cyan, border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700,
                  }}>MARCAR LEÍDA ▸</button>
                )}
              </div>
            );
          })}

          {/* Botón al quiz */}
          <button onClick={startQuiz} disabled={!allDone} style={{
            width: '100%', marginTop: 8, padding: '13px', borderRadius: 12, cursor: allDone ? 'pointer' : 'not-allowed',
            background: allDone ? `${C.gold}1a` : 'transparent', border: `1px solid ${allDone ? C.gold : C.cyanFaint}`,
            color: allDone ? C.gold : C.cyanDim, fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}>
            {allDone ? <><Award size={15} /> RENDIR QUIZ FINAL</> : <><Lock size={14} /> COMPLETA LAS LECCIONES PARA EL QUIZ</>}
          </button>
        </div>
      </div>
    );
  }

  // ─── VISTA: quiz ─────────────────────────────────────────────────────
  return (
    <div style={BASE.root}>
      <ScanlineOverlay />
      <div style={cx(BASE.header, { gap: 10 })}>
        <button onClick={() => setView('course')} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: C.gold, textTransform: 'uppercase' }}>
          QUIZ · {course?.title}
        </div>
      </div>

      <div style={cx(BASE.scrollArea, { padding: '12px 14px' })}>
        {result ? (
          // Resultado
          <div style={{ textAlign: 'center', padding: '30px 16px' }}>
            <div style={{
              width: 80, height: 80, borderRadius: '50%', margin: '0 auto 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: result.passed ? `${C.green}1a` : `${C.red}1a`,
              border: `2px solid ${result.passed ? C.green : C.red}`,
            }}>
              {result.passed ? <CheckCircle2 size={40} style={{ color: C.green }} /> : <Lock size={36} style={{ color: C.red }} />}
            </div>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 32, color: result.passed ? C.green : C.red }}>{result.score}%</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 12, color: result.passed ? C.green : C.red, letterSpacing: 1, marginTop: 4 }}>
              {result.passed ? '¡APROBADO!' : 'NO APROBADO'}
            </div>
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginTop: 12, maxWidth: 280, marginInline: 'auto' }}>
              {result.passed
                ? '🔓 Nodo validado en tu árbol. Tu Fundamento (Gemelo Digital) subió. ¡Bien hecho!'
                : `Necesitas ${course?.passing_score}% para aprobar. Repasa las lecciones e inténtalo de nuevo.`}
            </p>
            <button onClick={result.passed ? backToList : () => setView('course')} style={{
              marginTop: 20, padding: '11px 22px', borderRadius: 10, cursor: 'pointer',
              background: `${C.cyan}18`, border: `1px solid ${C.cyan}`, color: C.cyan,
              fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, fontWeight: 700,
            }}>{result.passed ? 'VOLVER A CURSOS' : 'REINTENTAR'}</button>
          </div>
        ) : (
          <>
            {questions.map((q, qi) => (
              <div key={q.id} style={{ marginBottom: 18 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe', marginBottom: 10 }}>
                  {qi + 1}. {q.question}
                </div>
                {q.options.map((opt, oi) => {
                  const sel = answers[q.id] === oi;
                  return (
                    <button key={oi} onClick={() => setAnswers({ ...answers, [q.id]: oi })} style={{
                      width: '100%', textAlign: 'left', marginBottom: 7, padding: '11px 13px', borderRadius: 10, cursor: 'pointer',
                      background: sel ? `${C.cyan}18` : 'rgba(10,17,32,0.8)',
                      border: `1px solid ${sel ? C.cyan : C.cyanFaint}`,
                      color: sel ? '#e2f3ff' : '#b9d4e6', fontFamily: FONT.body, fontSize: 14,
                      display: 'flex', alignItems: 'center', gap: 10,
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%', flexShrink: 0,
                        border: `2px solid ${sel ? C.cyan : C.cyanDim}`, background: sel ? C.cyan : 'transparent',
                      }} />
                      {opt}
                    </button>
                  );
                })}
              </div>
            ))}

            <button onClick={submit} disabled={submitting || Object.keys(answers).length < questions.length} style={{
              width: '100%', marginTop: 8, padding: '13px', borderRadius: 12,
              cursor: (submitting || Object.keys(answers).length < questions.length) ? 'not-allowed' : 'pointer',
              background: C.gold, border: 'none', color: '#1a1205', fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, fontWeight: 700,
              opacity: (submitting || Object.keys(answers).length < questions.length) ? 0.5 : 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {submitting ? <><Loader2 size={15} className="animate-spin" /> CALIFICANDO…</> : 'ENVIAR RESPUESTAS'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
