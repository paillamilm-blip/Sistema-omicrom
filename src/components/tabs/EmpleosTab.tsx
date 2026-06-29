// components/tabs/EmpleosTab.tsx
// Empleos — estilo Industria 5.0. Publicar oferta + matchmaking (terna) + aplicar.

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Flame, Clock, CheckCircle2, X, Star, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';

const C = {
  bg: '#020613', panelA: 'rgba(8,16,38,0.60)', panelB: 'rgba(2,6,19,0.78)',
  blue: '#00F0FF', blueHi: '#7df9ff', amber: '#F59E0B', amberHi: '#ffcf6b',
  steel: '#005F73', steelHi: '#0a8ba3',
  line: 'rgba(0,95,115,0.30)', lineSoft: 'rgba(0,240,255,0.08)',
  ink: '#eaf2ff', muted: '#7d93b0', green: '#39FF14',
} as const;
const FM = "'Share Tech Mono', 'Courier New', monospace";
const FR = "'Rajdhani', sans-serif";

interface Job {
  id: string; company_id: string; title: string; description: string; category: string;
  tags: string[]; required_node_level: number; budget_usd: number; time_limit_hours: number;
  status: string; published_at: string;
}

const LEVEL_LABEL = ['', 'N1 Operativo', 'N2 Core', 'N3 Arquitecto'];

export function EmpleosTab() {
  const { profile } = useApp();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [myMatches, setMyMatches] = useState<Map<string, number>>(new Map()); // job_id -> rank
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'matched' | 'applied'>('all');
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data: js } = await supabase
      .from('job_postings').select('*').eq('status', 'OPEN').order('published_at', { ascending: false });
    const list = (js as Job[]) ?? [];
    setJobs(list);

    const ids = [...new Set(list.map(j => j.company_id))];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id,username').in('id', ids);
      setNames(new Map(((p as { id: string; username: string }[]) ?? []).map(x => [x.id, x.username])));
    }
    const { data: m } = await supabase.from('job_matches').select('job_id,rank').eq('user_id', profile.id);
    setMyMatches(new Map(((m as { job_id: string; rank: number }[]) ?? []).map(x => [x.job_id, x.rank])));

    const { data: a } = await supabase.from('job_applications').select('job_id').eq('applicant_id', profile.id);
    setApplied(new Set(((a as { job_id: string }[]) ?? []).map(x => x.job_id)));

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function apply(jobId: string) {
    setBusy(jobId);
    try {
      const { error } = await supabase.rpc('apply_to_job', { p_job_id: jobId, p_cover_note: null });
      if (error) throw error;
      setApplied(prev => new Set(prev).add(jobId));
    } catch (e) {
      alert('Error al aplicar: ' + ((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  const filtered = jobs.filter(j => {
    if (filter === 'matched') return myMatches.has(j.id);
    if (filter === 'applied') return applied.has(j.id);
    return true;
  });

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.iconBadge}><Briefcase size={15} style={{ color: C.bg }} /></div>
          <div>
            <div style={styles.hTitle}>EMPLEOS · OPORTUNIDADES</div>
            <div style={styles.hSub}>MATCHMAKING 80/20 · TERNA EXPRESS</div>
          </div>
        </div>
        <button style={styles.pubBtn} onClick={() => setShowPublish(true)}><Plus size={14} /> PUBLICAR</button>
      </div>

      {/* Filtros */}
      <div style={styles.filterRow}>
        {([['all', `Todos (${jobs.length})`], ['matched', `Match (${myMatches.size})`], ['applied', `Aplicados (${applied.size})`]] as const).map(([k, label]) => {
          const active = filter === k;
          return (
            <button key={k} onClick={() => setFilter(k)} style={{
              ...styles.fPill,
              background: active ? 'rgba(0,240,255,0.16)' : 'transparent',
              border: `1px solid ${active ? C.blue : C.lineSoft}`,
              color: active ? C.blueHi : C.muted,
            }}>{k === 'matched' && <Flame size={11} />}{label}</button>
          );
        })}
      </div>

      {/* Lista */}
      <div style={styles.scroll}>
        {loading ? (
          <p style={styles.muted}>// CARGANDO OFERTAS...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Briefcase size={28} style={{ color: C.line }} />
            <p style={styles.muted}>{filter === 'all' ? 'Aún no hay ofertas. ¡Publica la primera!' : 'Nada por aquí todavía.'}</p>
          </div>
        ) : filtered.map(j => {
          const rank = myMatches.get(j.id);
          const isApplied = applied.has(j.id);
          const mine = j.company_id === profile?.id;
          return (
            <div key={j.id} style={styles.card}>
              <div style={styles.cardTop} />
              {rank && (
                <div style={styles.matchBadge}><Star size={9} style={{ fill: C.amber, color: C.amber }} /> MATCH #{rank}</div>
              )}
              <div style={styles.title}>{j.title}</div>
              <div style={styles.company}>@{names.get(j.company_id) ?? 'empresa'} · {LEVEL_LABEL[j.required_node_level] ?? 'N1'}</div>
              {j.description && <p style={styles.desc}>{j.description}</p>}

              <div style={styles.statRow}>
                <div style={styles.statBox}><div style={styles.statLabel}>PRESUPUESTO</div><div style={styles.budget}>🪙 {j.budget_usd}</div></div>
                <div style={styles.statBox}><div style={styles.statLabel}>PLAZO</div><div style={styles.tlimit}><Clock size={12} /> {j.time_limit_hours}h</div></div>
              </div>

              {j.tags?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0 0' }}>
                  {j.tags.map(t => <span key={t} style={styles.tag}>{t}</span>)}
                </div>
              )}

              <button
                onClick={() => !isApplied && !mine && apply(j.id)}
                disabled={isApplied || mine || busy === j.id}
                style={{
                  ...styles.applyBtn,
                  background: isApplied ? 'transparent' : mine ? 'transparent' : `linear-gradient(135deg, ${C.blue}, #008b9e)`,
                  border: `1px solid ${isApplied ? C.green : mine ? C.lineSoft : C.blue}`,
                  color: isApplied ? C.green : mine ? C.muted : '#04121f',
                  boxShadow: (isApplied || mine) ? 'none' : '0 0 16px rgba(0,240,255,0.35)',
                  cursor: (isApplied || mine) ? 'default' : 'pointer',
                }}>
                {isApplied ? <><CheckCircle2 size={14} /> APLICADO</> : mine ? 'TU OFERTA' : <><Send size={13} /> APLICAR</>}
              </button>
            </div>
          );
        })}
      </div>

      {showPublish && <PublishJobModal onClose={() => setShowPublish(false)} onDone={() => { setShowPublish(false); load(); }} />}
    </div>
  );
}

function PublishJobModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { profile } = useApp();
  const [f, setF] = useState({ title: '', description: '', category: 'dev', budget: '', hours: '48', level: 1, tags: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!profile) return;
    if (!f.title.trim()) { setErr('Pon un título'); return; }
    if (!(Number(f.budget) > 0)) { setErr('Pon un presupuesto'); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from('job_postings').insert({
        company_id: profile.id, title: f.title.trim(), description: f.description.trim(),
        category: f.category, budget_usd: Number(f.budget), time_limit_hours: Number(f.hours) || 48,
        required_node_level: f.level,
        tags: f.tags.split(',').map(t => t.trim()).filter(Boolean),
      });
      if (error) throw error;
      onDone();
    } catch (e) { setErr((e as Error).message ?? 'Error'); }
    finally { setSaving(false); }
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(0,240,255,0.05)', border: `1px solid ${C.line}`, borderRadius: 6, padding: '9px 11px', color: C.ink, fontFamily: FM, fontSize: 12, outline: 'none', marginBottom: 10 };
  const lbl: React.CSSProperties = { fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <div style={styles.modalBg}>
      <div style={styles.modal}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        <div style={{ fontFamily: FM, fontSize: 11, color: C.blueHi, letterSpacing: 2, marginBottom: 14 }}>PUBLICAR OFERTA</div>

        <label style={lbl}>Título</label>
        <input style={inp} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Ej: Desarrollo de dashboard" />
        <label style={lbl}>Descripción</label>
        <textarea style={{ ...inp, resize: 'none' }} rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Detalle del trabajo..." />
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Presupuesto 🪙</label><input style={inp} type="number" value={f.budget} onChange={e => setF({ ...f, budget: e.target.value })} placeholder="300" /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Plazo (h)</label><input style={inp} type="number" value={f.hours} onChange={e => setF({ ...f, hours: e.target.value })} /></div>
        </div>
        <label style={lbl}>Nivel requerido</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          {[1, 2, 3].map(lv => (
            <button key={lv} onClick={() => setF({ ...f, level: lv })} style={{
              flex: 1, padding: '8px', borderRadius: 6, cursor: 'pointer', fontFamily: FM, fontSize: 10,
              background: f.level === lv ? 'rgba(0,240,255,0.16)' : 'transparent',
              border: `1px solid ${f.level === lv ? C.blue : C.lineSoft}`, color: f.level === lv ? C.blueHi : C.muted,
            }}>{LEVEL_LABEL[lv]}</button>
          ))}
        </div>
        <label style={lbl}>Tags (separados por coma)</label>
        <input style={inp} value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="React, Node, Figma" />

        {err && <div style={{ fontFamily: FM, fontSize: 10, color: '#ff5066', marginBottom: 10 }}>{err}</div>}

        <button onClick={submit} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: 8, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #008b9e)`, border: 'none', color: '#04121f', fontFamily: FM, fontSize: 12, letterSpacing: 1, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'PUBLICANDO…' : 'PUBLICAR · GENERAR TERNA'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(8,11,18,0.7)', flexShrink: 0 },
  iconBadge: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.blueHi}, ${C.blue})`, boxShadow: '0 0 14px rgba(0,240,255,0.5)' },
  hTitle: { fontFamily: FM, fontSize: 12, color: C.blueHi, letterSpacing: 1.5, fontWeight: 700 },
  hSub: { fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1, marginTop: 2 },
  pubBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(0,240,255,0.12)', border: `1px solid ${C.blue}`, color: C.blueHi, cursor: 'pointer', fontFamily: FM, fontSize: 10, letterSpacing: 1 },
  filterRow: { display: 'flex', gap: 8, padding: '12px 14px', overflowX: 'auto', flexShrink: 0 },
  fPill: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: FM, fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap', textTransform: 'uppercase' },
  scroll: { flex: 1, overflowY: 'auto', padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  muted: { fontFamily: FM, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  card: { position: 'relative', background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.04)' },
  cardTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.steelHi}, ${C.blue}, transparent)` },
  matchBadge: { position: 'absolute', top: 12, right: 14, display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: FM, fontSize: 8, color: C.amber, background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)', padding: '2px 7px', borderRadius: 3 },
  title: { fontFamily: FR, fontWeight: 700, fontSize: 18, color: C.ink, lineHeight: 1.15, textTransform: 'uppercase', paddingRight: 70 },
  company: { fontFamily: FM, fontSize: 10, color: C.muted, marginTop: 4 },
  desc: { fontFamily: FR, fontSize: 13, color: '#b9d4e6', lineHeight: 1.4, margin: '8px 0 0' },
  statRow: { display: 'flex', gap: 10, marginTop: 12 },
  statBox: { flex: 1, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.lineSoft}`, borderRadius: 4, padding: '7px 10px' },
  statLabel: { fontFamily: FM, fontSize: 8, color: C.muted, letterSpacing: 1.5 },
  budget: { fontFamily: FR, fontWeight: 700, fontSize: 19, color: C.amberHi, marginTop: 1 },
  tlimit: { display: 'flex', alignItems: 'center', gap: 4, fontFamily: FR, fontWeight: 700, fontSize: 17, color: C.ink, marginTop: 1 },
  tag: { fontFamily: FM, fontSize: 10, color: C.blueHi, background: 'rgba(0,240,255,0.08)', border: `1px solid ${C.lineSoft}`, padding: '3px 9px', borderRadius: 3 },
  applyBtn: { width: '100%', marginTop: 12, padding: '11px 0', borderRadius: 6, fontFamily: FM, fontWeight: 700, fontSize: 12, letterSpacing: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  modalBg: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,5,11,0.8)', backdropFilter: 'blur(4px)', padding: 20 },
  modal: { width: '100%', maxWidth: 380, maxHeight: '85vh', overflowY: 'auto', borderRadius: 10, padding: 20, background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, border: `1px solid ${C.blue}`, boxShadow: '0 0 30px rgba(0,240,255,0.3)', position: 'relative' },
};
