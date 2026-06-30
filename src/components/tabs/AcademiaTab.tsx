import { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap, ArrowLeft, BookOpen, CheckCircle2, Lock, Award, Loader2,
  ChevronDown, Sparkles, Trophy, Target,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT, BASE, RADIUS, GLOW, cx } from '../../theme';
import { ScanlineOverlay, CyberHeader, SectionLabel, LoadingScreen } from '../shared/CyberComponents';
import { EmptyState } from '../shared/EmptyState';
import { useToast } from '../shared/Toast';

interface Course {
  id: string; node_id: string | null; title: string; description: string;
  cover_emoji: string; difficulty: number; passing_score: number; order_index: number;
}
interface Lesson { id: string; title: string; content: string; video_url: string | null; order_index: number; }
interface QuizQ { id: string; question: string; options: string[]; order_index: number; }
interface Prog { course_id: string; status: string; quiz_passed: boolean; }

const DIFF_LABEL = ['', 'Inicial', 'Básico', 'Intermedio', 'Avanzado', 'Experto'];

// ─── Barra de progreso reutilizable ───────────────────────────────────────────
function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 6, borderRadius: 4, background: 'rgba(255,255,255,0.07)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: `linear-gradient(90deg, ${color}, ${C.cyan})`, boxShadow: GLOW.cyan, borderRadius: 4, transition: 'width 0.5s ease' }} />
    </div>
  );
}

// ─── Coach IA: diagnostico del perfil + que estudiar (Edge Function "coach") ──
function CoachModal({ onClose }: { onClose: () => void }) {
  const [advice, setAdvice] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const run = useCallback(async () => {
    setLoading(true); setAdvice(null);
    try {
      const { data, error } = await supabase.functions.invoke('coach', { body: {} });
      setAdvice(error
        ? 'El Coach IA no esta disponible. Avisa a tu equipo que despliegue la funcion coach.'
        : ((data as { advice?: string; error?: string })?.advice ?? (data as { error?: string })?.error ?? 'Sin respuesta.'));
    } catch {
      setAdvice('Error de conexion con el Coach IA.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { run(); }, [run]);

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(2,6,19,0.8)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '100%', maxWidth: 440, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        borderRadius: RADIUS.xl, background: 'linear-gradient(165deg, rgba(22,34,58,0.98), rgba(10,17,32,0.99))',
        border: `1px solid ${C.cyan}55`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.cyan}18`, border: `1px solid ${C.cyan}55` }}>
            <GraduationCap size={18} style={{ color: C.cyan }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Coach IA</div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>Tu diagnostico y proximo paso</div>
          </div>
          <button onClick={onClose} aria-label="Cerrar" style={{ width: 32, height: 32, borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.06)', border: `1px solid ${C.cyanDim}`, color: C.cyan, fontSize: 18, lineHeight: 1 }}>
            ×
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 180, maxHeight: '60vh', overflowY: 'auto', padding: '16px' }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '30px 0' }}>
              <Loader2 size={24} style={{ color: C.cyan }} className="animate-spin" />
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim, letterSpacing: 1 }}>ANALIZANDO TU PERFIL...</span>
            </div>
          ) : (
            <p style={{ margin: 0, fontFamily: FONT.body, fontSize: 14, color: '#e6f1fb', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{advice}</p>
          )}
        </div>

        <div style={{ padding: '12px 16px', borderTop: `1px solid ${C.cyanFaint}` }}>
          <button onClick={run} disabled={loading} style={{
            width: '100%', padding: '12px', borderRadius: RADIUS.lg, cursor: loading ? 'wait' : 'pointer',
            background: C.cyan, border: 'none', color: '#021018', fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: loading ? 0.5 : 1,
          }}><Sparkles size={15} /> VOLVER A ANALIZAR</button>
        </div>
      </div>
    </div>
  );
}

export function AcademiaTab() {
  const { profile, refreshProfile, setActiveTab } = useApp();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [prog, setProg] = useState<Map<string, Prog>>(new Map());
  const [counts, setCounts] = useState<Map<string, { total: number; done: number }>>(new Map());
  const [nodes, setNodes] = useState<Map<string, { title: string; color: string }>>(new Map());
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [doneLessons, setDoneLessons] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [coachOpen, setCoachOpen] = useState(false);
  const [view, setView] = useState<'list' | 'course' | 'quiz'>('list');

  const [questions, setQuestions] = useState<QuizQ[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ score: number; passed: boolean } | null>(null);

  const loadCourses = useCallback(async () => {
    if (!profile) return;
    const { data: cs } = await supabase
      .from('academy_courses').select('*').eq('is_published', true).order('order_index');
    const courseList = (cs as Course[]) ?? [];
    setCourses(courseList);

    const { data: ps } = await supabase
      .from('user_course_progress').select('course_id,status,quiz_passed').eq('user_id', profile.id);
    setProg(new Map(((ps as Prog[]) ?? []).map(p => [p.course_id, p])));

    // Progreso por curso (lecciones leídas / total)
    const { data: allLessons } = await supabase.from('course_lessons').select('id,course_id');
    const { data: doneRows } = await supabase.from('user_lesson_progress').select('lesson_id');
    const doneSet = new Set(((doneRows as { lesson_id: string }[]) ?? []).map(d => d.lesson_id));
    const m = new Map<string, { total: number; done: number }>();
    ((allLessons as { id: string; course_id: string }[]) ?? []).forEach(l => {
      const c = m.get(l.course_id) ?? { total: 0, done: 0 };
      c.total += 1;
      if (doneSet.has(l.id)) c.done += 1;
      m.set(l.course_id, c);
    });
    setCounts(m);

    const nodeIds = [...new Set(courseList.map(c => c.node_id).filter(Boolean))] as string[];
    if (nodeIds.length) {
      const { data: nd } = await supabase.from('skill_tree_nodes').select('id,title,color').in('id', nodeIds);
      setNodes(new Map(((nd as { id: string; title: string; color: string }[]) ?? []).map(n => [n.id, { title: n.title, color: n.color }])));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  async function openCourse(c: Course) {
    setCourse(c); setView('course'); setResult(null); setAnswers({}); setExpanded(null);
    const { data: ls } = await supabase
      .from('course_lessons').select('*').eq('course_id', c.id).order('order_index');
    const lessonList = (ls as Lesson[]) ?? [];
    setLessons(lessonList);
    if (profile && lessonList.length) {
      const { data: done } = await supabase
        .from('user_lesson_progress').select('lesson_id')
        .in('lesson_id', lessonList.map(l => l.id));
      setDoneLessons(new Set(((done as { lesson_id: string }[]) ?? []).map(d => d.lesson_id)));
      const firstPending = lessonList.find(l => !((done as { lesson_id: string }[]) ?? []).some(d => d.lesson_id === l.id));
      setExpanded(firstPending?.id ?? lessonList[0]?.id ?? null);
    } else {
      setDoneLessons(new Set());
      setExpanded(lessonList[0]?.id ?? null);
    }
  }

  async function completeLesson(lessonId: string) {
    await supabase.rpc('mark_lesson_complete', { p_lesson_id: lessonId });
    setDoneLessons(prev => new Set(prev).add(lessonId));
    const idx = lessons.findIndex(l => l.id === lessonId);
    const next = lessons[idx + 1];
    setExpanded(next ? next.id : null);
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
      if (r.passed) await refreshProfile();
    } catch (e) {
      toast('No se pudo enviar el quiz: ' + ((e as Error).message ?? e), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  function backToList() {
    setView('list'); setCourse(null); setLessons([]); setQuestions([]); setResult(null); setAnswers({}); setExpanded(null);
  }

  if (loading) return <LoadingScreen message="CARGANDO ACADEMIA..." />;

  // ─── VISTA: lista de cursos ──────────────────────────────────────────
  if (view === 'list') {
    const totalDone = [...counts.values()].reduce((s, c) => s + c.done, 0);
    const totalAll = [...counts.values()].reduce((s, c) => s + c.total, 0);
    const completed = courses.filter(c => prog.get(c.id)?.status === 'COMPLETED').length;

    return (
      <div style={BASE.root}>
        <ScanlineOverlay />
        <CyberHeader title="ACADEMIA" subtitle="APRENDE Y VALIDA TUS NODOS" dotColor={C.cyan}
          badge={<GraduationCap size={16} style={{ color: C.cyan }} />} />
        <div style={cx(BASE.scrollArea, { padding: '12px 14px 20px' })}>

          <button onClick={() => setCoachOpen(true)} style={{
            width: '100%', textAlign: 'left', cursor: 'pointer',
            borderRadius: RADIUS.xl, padding: 16, marginBottom: 16, position: 'relative', overflow: 'hidden',
            background: `linear-gradient(135deg, ${C.cyan}1a, ${C.gold}12)`,
            border: `1px solid ${C.cyan}55`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 44, height: 44, borderRadius: 13, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.cyan}18`, border: `1px solid ${C.cyan}55` }}>
                <GraduationCap size={22} style={{ color: C.cyan }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Coach IA - Que estudio ahora?</div>
                <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.cyanDim, marginTop: 2, lineHeight: 1.35 }}>
                  Analiza tu Gemelo, tu CV y tus habilidades, y te dice tu brecha y el curso ideal.
                </div>
              </div>
              <Sparkles size={18} style={{ color: C.gold, flexShrink: 0 }} />
            </div>
          </button>

          {/* Resumen de progreso */}
          <div style={{
            borderRadius: RADIUS.xl, padding: 16, marginBottom: 16,
            background: 'linear-gradient(165deg, rgba(22,34,58,0.92), rgba(12,20,38,0.96))',
            border: `1px solid ${C.cyan}33`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trophy size={16} style={{ color: C.gold }} />
                <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff' }}>Tu avance</span>
              </div>
              <span style={{ fontFamily: FONT.mono, fontSize: 11, color: C.cyanDim }}>{completed}/{courses.length} cursos</span>
            </div>
            <Bar pct={totalAll ? Math.round((totalDone / totalAll) * 100) : 0} color={C.gold} />
            <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.cyanDim, marginTop: 8 }}>
              {totalDone} de {totalAll} lecciones leídas · cada curso aprobado sube tu <strong style={{ color: C.cyan }}>Fundamento</strong> 🧬
            </div>
          </div>

          <SectionLabel>◆ CURSOS ({courses.length})</SectionLabel>
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
            const lc = counts.get(c.id) ?? { total: 0, done: 0 };
            const pct = lc.total ? Math.round((lc.done / lc.total) * 100) : 0;
            const done = p?.status === 'COMPLETED';
            const inProgress = !done && lc.done > 0;
            const accent = done ? C.green : inProgress ? C.cyan : C.gold;
            const statusLabel = done ? 'COMPLETADO' : inProgress ? 'EN CURSO' : 'NUEVO';
            return (
              <button key={c.id} onClick={() => openCourse(c)} style={{
                width: '100%', textAlign: 'left', cursor: 'pointer',
                borderRadius: RADIUS.xl, padding: 15, marginBottom: 11, position: 'relative', overflow: 'hidden',
                background: 'linear-gradient(165deg, rgba(20,30,52,0.85), rgba(12,20,38,0.92))',
                border: `1px solid ${accent}40`,
              }}>
                <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 3, background: accent }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: 14, flexShrink: 0, fontSize: 26,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${accent}14`, border: `1px solid ${accent}33`,
                  }}>{c.cover_emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.title}</span>
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginTop: 3 }}>
                      {DIFF_LABEL[c.difficulty] ?? 'Curso'} · {lc.done}/{lc.total} lecciones
                    </div>
                    {c.node_id && nodes.get(c.node_id) && (
                      <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: C.gold, marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Target size={10} /> Desbloquea: {nodes.get(c.node_id)!.title}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: accent,
                    padding: '3px 8px', borderRadius: 20, background: `${accent}14`, border: `1px solid ${accent}44`, flexShrink: 0,
                  }}>{statusLabel}</span>
                </div>
                <div style={{ marginTop: 11 }}>
                  <Bar pct={pct} color={accent} />
                </div>
              </button>
            );
          })}
        </div>
        {coachOpen && <CoachModal onClose={() => setCoachOpen(false)} />}
      </div>
    );
  }

  // ─── VISTA: detalle del curso (lecciones) ───────────────────────────
  if (view === 'course' && course) {
    const allDone = lessons.length > 0 && lessons.every(l => doneLessons.has(l.id));
    const pct = lessons.length ? Math.round((doneLessons.size / lessons.length) * 100) : 0;
    return (
      <div style={BASE.root}>
        <ScanlineOverlay />
        <div style={cx(BASE.header, { gap: 10 })}>
          <button onClick={backToList} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', display: 'flex' }}>
            <ArrowLeft size={18} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#eaf4ff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {course.cover_emoji} {course.title}
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>{doneLessons.size}/{lessons.length} lecciones · {pct}%</div>
          </div>
        </div>

        <div style={{ padding: '10px 14px 0', flexShrink: 0 }}>
          <Bar pct={pct} color={allDone ? C.green : C.cyan} />
        </div>

        <div style={cx(BASE.scrollArea, { padding: '14px' })}>
          <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginBottom: 16, lineHeight: 1.5 }}>{course.description}</p>

          {lessons.map((l, i) => {
            const done = doneLessons.has(l.id);
            const isOpen = expanded === l.id;
            const accent = done ? C.green : C.cyan;
            return (
              <div key={l.id} style={{
                borderRadius: RADIUS.lg, marginBottom: 10, overflow: 'hidden',
                background: 'rgba(20,30,52,0.7)', border: `1px solid ${done ? C.green + '44' : 'rgba(255,255,255,0.08)'}`,
              }}>
                <button onClick={() => setExpanded(isOpen ? null : l.id)} style={{
                  width: '100%', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none',
                  padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11,
                }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `${accent}14`, border: `1px solid ${accent}55`,
                  }}>
                    {done ? <CheckCircle2 size={15} style={{ color: C.green }} /> : <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: accent }}>{i + 1}</span>}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#eaf4ff' }}>{l.title}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 8.5, color: C.cyanDim, marginTop: 1 }}>
                      LECCIÓN {i + 1}{done ? ' · LEÍDA' : ''}
                    </div>
                  </div>
                  <ChevronDown size={17} style={{ color: C.cyanDim, transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s', flexShrink: 0 }} />
                </button>

                {isOpen && (
                  <div style={{ padding: '0 14px 14px', animation: 'acaIn 0.3s ease' }}>
                    <p style={{ fontFamily: FONT.body, fontSize: 14, color: '#cfe2f0', lineHeight: 1.6, margin: '0 0 12px' }}>{l.content}</p>
                    {!done ? (
                      <button onClick={() => completeLesson(l.id)} style={{
                        fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: '#04110a',
                        background: C.cyan, border: 'none', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 6,
                      }}><CheckCircle2 size={14} /> MARCAR LEÍDA</button>
                    ) : (
                      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.green, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <CheckCircle2 size={14} /> Completada
                      </span>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          <div style={{
            marginTop: 14, borderRadius: RADIUS.xl, padding: 16,
            background: allDone ? `${C.gold}10` : 'rgba(255,255,255,0.025)',
            border: `1px solid ${allDone ? C.gold + '55' : 'rgba(255,255,255,0.08)'}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Sparkles size={16} style={{ color: allDone ? C.gold : C.cyanDim }} />
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: allDone ? C.gold : C.cyanDim }}>Quiz final</span>
            </div>
            <p style={{ margin: '0 0 12px', fontFamily: FONT.body, fontSize: 12, color: C.cyanDim, lineHeight: 1.4 }}>
              Aprueba con {course.passing_score}% para validar {course.node_id && nodes.get(course.node_id)
                ? <strong style={{ color: C.gold }}>la habilidad "{nodes.get(course.node_id)!.title}"</strong>
                : <strong style={{ color: C.cyan }}>el nodo</strong>} en tu Árbol y subir tu <strong style={{ color: C.cyan }}>Fundamento</strong> del Gemelo Digital. 🧬
            </p>
            <button onClick={startQuiz} disabled={!allDone} style={{
              width: '100%', padding: '13px', borderRadius: RADIUS.lg, cursor: allDone ? 'pointer' : 'not-allowed',
              background: allDone ? C.gold : 'transparent', border: `1px solid ${allDone ? C.gold : C.cyanFaint}`,
              color: allDone ? '#1a1205' : C.cyanDim, fontFamily: FONT.mono, fontSize: 12, letterSpacing: 1, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {allDone ? <><Award size={15} /> RENDIR QUIZ FINAL</> : <><Lock size={14} /> COMPLETA LAS LECCIONES</>}
            </button>
          </div>
        </div>

        <style>{`@keyframes acaIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }`}</style>
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

      <div style={cx(BASE.scrollArea, { padding: '14px' })}>
        {result ? (
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
            <p style={{ fontFamily: FONT.body, fontSize: 13, color: C.cyanDim, marginTop: 12, maxWidth: 280, marginInline: 'auto', lineHeight: 1.5 }}>
              {result.passed
                ? '🔓 Nodo validado en tu árbol. Tu Fundamento (Gemelo Digital) subió. ¡Bien hecho!'
                : `Necesitas ${course?.passing_score}% para aprobar. Repasa las lecciones e inténtalo de nuevo.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center', marginTop: 20 }}>
              {result.passed && (
                <button onClick={() => setActiveTab('maxskill')} style={{
                  padding: '11px 22px', borderRadius: 10, cursor: 'pointer',
                  background: C.gold, border: 'none', color: '#1a1205',
                  fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, fontWeight: 700,
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                }}><Target size={14} /> VER EN EL ÁRBOL</button>
              )}
              <button onClick={result.passed ? backToList : () => setView('course')} style={{
                padding: '11px 22px', borderRadius: 10, cursor: 'pointer',
                background: `${C.cyan}18`, border: `1px solid ${C.cyan}`, color: C.cyan,
                fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, fontWeight: 700,
              }}>{result.passed ? 'VOLVER A CURSOS' : 'REINTENTAR'}</button>
            </div>
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
                      background: sel ? `${C.cyan}18` : 'rgba(20,30,52,0.7)',
                      border: `1px solid ${sel ? C.cyan : 'rgba(255,255,255,0.08)'}`,
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
