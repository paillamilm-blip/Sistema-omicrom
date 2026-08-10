// components/empleos/FreelanceNeeds.tsx
// ═══════════════════════════════════════════════════════════════════════
// NECESIDADES FREELANCE — Cualquier persona publica lo que necesita,
// cualquier freelancer postula. Alumno, docente, pyme, experto — todos.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Plus, Clock, Users, MapPin, Wifi, Send, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

interface FreelanceNeed {
  id: string;
  publisher_id: string;
  title: string;
  description: string;
  category: string;
  budget_min: number;
  budget_max: number;
  currency: string;
  deadline_days: number;
  required_skills: string[];
  is_remote: boolean;
  urgency: string;
  status: string;
  applicants_count: number;
  published_at: string;
}

const CATEGORIES = [
  { value: 'desarrollo', label: 'Desarrollo Web/App', emoji: '💻' },
  { value: 'diseño', label: 'Diseño Gráfico/UX', emoji: '🎨' },
  { value: 'marketing', label: 'Marketing/Social Media', emoji: '📣' },
  { value: 'datos', label: 'Datos/Automatización', emoji: '📊' },
  { value: 'educación', label: 'Clases/Tutorías', emoji: '📚' },
  { value: 'video', label: 'Video/Fotografía', emoji: '🎬' },
  { value: 'redacción', label: 'Redacción/Traducción', emoji: '✍️' },
  { value: 'contabilidad', label: 'Contabilidad/Finanzas', emoji: '🧾' },
  { value: 'legal', label: 'Legal/Contratos', emoji: '⚖️' },
  { value: 'técnico', label: 'Soporte Técnico', emoji: '🔧' },
  { value: 'otro', label: 'Otro', emoji: '🔹' },
];

const URGENCY_LABEL: Record<string, { label: string; color: string }> = {
  baja: { label: 'Sin apuro', color: C.green },
  normal: { label: 'Normal', color: C.cyan },
  urgente: { label: 'Urgente', color: '#ff5c7a' },
};

export function FreelanceNeeds() {
  const { profile } = useApp();
  const [needs, setNeeds] = useState<FreelanceNeed[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [applyingTo, setApplyingTo] = useState<FreelanceNeed | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [names, setNames] = useState<Map<string, string>>(new Map());

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('freelance_needs')
      .select('*')
      .eq('status', 'OPEN')
      .order('published_at', { ascending: false });
    const list = (data as FreelanceNeed[]) ?? [];
    setNeeds(list);

    // Cargar nombres de publicadores
    const ids = [...new Set(list.map(n => n.publisher_id))];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id,username').in('id', ids);
      setNames(new Map(((p as any[]) ?? []).map(x => [x.id, x.username])));
    }

    // Mis postulaciones
    if (profile?.id) {
      const { data: apps } = await supabase
        .from('freelance_applications')
        .select('need_id')
        .eq('applicant_id', profile.id);
      setApplied(new Set(((apps as any[]) ?? []).map(a => a.need_id)));
    }

    setLoading(false);
  }, [profile?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? needs : needs.filter(n => n.category === filter);

  function formatBudget(n: FreelanceNeed): string {
    if (!n.budget_min && !n.budget_max) return 'A convenir';
    const fmt = (v: number) => v >= 1000000 ? `$${(v / 1000000).toFixed(1)}M` : `$${Math.round(v / 1000)}k`;
    if (n.budget_min && n.budget_max) return `${fmt(n.budget_min)} - ${fmt(n.budget_max)} ${n.currency}`;
    if (n.budget_min) return `Desde ${fmt(n.budget_min)} ${n.currency}`;
    return `Hasta ${fmt(n.budget_max)} ${n.currency}`;
  }

  return (
    <div style={{ marginTop: 14 }}>
      {/* Header */}
      <div style={S.header}>
        <div>
          <div style={S.sectionTitle}>📋 Necesidades Freelance</div>
          <div style={S.sectionSub}>Publica lo que necesitas · Postula a lo que puedes hacer</div>
        </div>
        <button onClick={() => setShowPublish(true)} style={S.publishBtn}>
          <Plus size={13} /> Publicar
        </button>
      </div>

      {/* Filtros por categoría */}
      <div style={S.filterRow}>
        <button onClick={() => setFilter('all')} style={{ ...S.filterChip, ...(filter === 'all' ? S.filterActive : {}) }}>
          Todas ({needs.length})
        </button>
        {CATEGORIES.slice(0, 5).map(cat => {
          const count = needs.filter(n => n.category === cat.value).length;
          if (count === 0) return null;
          return (
            <button key={cat.value} onClick={() => setFilter(cat.value)}
              style={{ ...S.filterChip, ...(filter === cat.value ? S.filterActive : {}) }}>
              {cat.emoji} {cat.label.split('/')[0]} ({count})
            </button>
          );
        })}
      </div>

      {/* Lista */}
      {loading ? (
        <p style={S.muted}>Cargando necesidades...</p>
      ) : filtered.length === 0 ? (
        <div style={S.empty}>
          <p style={S.emptyTitle}>No hay necesidades publicadas aún</p>
          <p style={S.emptyHint}>Sé el primero en publicar lo que necesitas. Alguien de la red puede ayudarte.</p>
          <button onClick={() => setShowPublish(true)} style={S.ctaBtn}>Publicar mi necesidad</button>
        </div>
      ) : (
        filtered.map(n => {
          const isOwn = n.publisher_id === profile?.id;
          const hasApplied = applied.has(n.id);
          const urgency = URGENCY_LABEL[n.urgency] ?? URGENCY_LABEL.normal;
          const catInfo = CATEGORIES.find(c => c.value === n.category);

          return (
            <div key={n.id} style={S.card}>
              {/* Urgency bar */}
              <div style={{ ...S.urgencyBar, background: urgency.color }} />

              {/* Category + Urgency */}
              <div style={S.cardTop}>
                <span style={S.catBadge}>{catInfo?.emoji} {catInfo?.label ?? n.category}</span>
                <span style={{ ...S.urgencyBadge, color: urgency.color, borderColor: urgency.color + '44' }}>
                  {urgency.label}
                </span>
              </div>

              {/* Title */}
              <div style={S.cardTitle}>{n.title}</div>
              <div style={S.cardPublisher}>@{names.get(n.publisher_id) ?? 'usuario'}</div>

              {/* Description */}
              {n.description && <p style={S.cardDesc}>{n.description.slice(0, 150)}{n.description.length > 150 ? '...' : ''}</p>}

              {/* Stats */}
              <div style={S.statsRow}>
                <span style={S.stat}>💰 {formatBudget(n)}</span>
                <span style={S.stat}><Clock size={11} /> {n.deadline_days} días</span>
                <span style={S.stat}>{n.is_remote ? <><Wifi size={11} /> Remoto</> : <><MapPin size={11} /> Presencial</>}</span>
                <span style={S.stat}><Users size={11} /> {n.applicants_count} postulantes</span>
              </div>

              {/* Skills */}
              {n.required_skills?.length > 0 && (
                <div style={S.skillsRow}>
                  {n.required_skills.map(s => <span key={s} style={S.skillTag}>{s}</span>)}
                </div>
              )}

              {/* CTA */}
              <button
                onClick={() => !isOwn && !hasApplied && setApplyingTo(n)}
                disabled={isOwn || hasApplied}
                style={{
                  ...S.applyBtn,
                  background: hasApplied ? 'transparent' : isOwn ? 'transparent' : `linear-gradient(135deg, ${C.cyan}, #008b9e)`,
                  border: `1px solid ${hasApplied ? C.green : isOwn ? C.mut + '44' : C.cyan}`,
                  color: hasApplied ? C.green : isOwn ? C.mut : '#04121f',
                  cursor: isOwn || hasApplied ? 'default' : 'pointer',
                }}
              >
                {hasApplied ? <><CheckCircle2 size={13} /> Postulado</> : isOwn ? 'Tu publicación' : <><Send size={13} /> Postular</>}
              </button>
            </div>
          );
        })
      )}

      {/* Modal: Publicar necesidad */}
      {showPublish && <PublishNeedModal onClose={() => setShowPublish(false)} onDone={() => { setShowPublish(false); load(); }} />}

      {/* Modal: Postular a necesidad */}
      {applyingTo && <ApplyModal need={applyingTo} onClose={() => setApplyingTo(null)} onDone={() => { setApplyingTo(null); load(); }} />}
    </div>
  );
}

// ── MODAL: Publicar necesidad ────────────────────────────────────────
function PublishNeedModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { profile } = useApp();
  const [f, setF] = useState({ title: '', description: '', category: 'desarrollo', budgetMin: '', budgetMax: '', days: '7', skills: '', is_remote: true, urgency: 'normal' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!profile) return;
    if (!f.title.trim()) { setErr('Pon un título'); return; }
    if (!f.description.trim()) { setErr('Describe lo que necesitas'); return; }
    setSaving(true); setErr(null);
    try {
      const { error } = await supabase.from('freelance_needs').insert({
        publisher_id: profile.id,
        title: f.title.trim(),
        description: f.description.trim(),
        category: f.category,
        budget_min: Number(f.budgetMin) || 0,
        budget_max: Number(f.budgetMax) || 0,
        deadline_days: Number(f.days) || 7,
        required_skills: f.skills.split(',').map(s => s.trim()).filter(Boolean),
        is_remote: f.is_remote,
        urgency: f.urgency,
      });
      if (error) throw error;
      // Analytics
      import('../../lib/analytics').then(({ track }) => track('service_published', { category: f.category })).catch(() => {});
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setSaving(false); }
  }

  return (
    <div style={S.modalBg} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={S.closeBtn}><X size={18} /></button>
        <div style={S.modalTitle}>📋 ¿Qué necesitas?</div>
        <p style={S.modalSub}>Publica tu necesidad y la red te ayuda. Cualquier profesional puede postular.</p>

        <label style={S.lbl}>Título *</label>
        <input style={S.inp} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Ej: Necesito una página web para mi negocio" />

        <label style={S.lbl}>Descripción *</label>
        <textarea style={{ ...S.inp, resize: 'none' }} rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Detalla lo que necesitas, para qué es, qué esperas recibir..." />

        <label style={S.lbl}>Categoría</label>
        <select style={S.inp} value={f.category} onChange={e => setF({ ...f, category: e.target.value })}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>)}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={S.lbl}>Presupuesto mín ($CLP)</label><input style={S.inp} type="number" value={f.budgetMin} onChange={e => setF({ ...f, budgetMin: e.target.value })} placeholder="50000" /></div>
          <div style={{ flex: 1 }}><label style={S.lbl}>Presupuesto máx</label><input style={S.inp} type="number" value={f.budgetMax} onChange={e => setF({ ...f, budgetMax: e.target.value })} placeholder="200000" /></div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={S.lbl}>Plazo (días)</label><input style={S.inp} type="number" value={f.days} onChange={e => setF({ ...f, days: e.target.value })} /></div>
          <div style={{ flex: 1 }}>
            <label style={S.lbl}>Urgencia</label>
            <select style={S.inp} value={f.urgency} onChange={e => setF({ ...f, urgency: e.target.value })}>
              <option value="baja">Sin apuro</option>
              <option value="normal">Normal</option>
              <option value="urgente">Urgente</option>
            </select>
          </div>
        </div>

        <label style={S.lbl}>Skills deseadas (separadas por coma)</label>
        <input style={S.inp} value={f.skills} onChange={e => setF({ ...f, skills: e.target.value })} placeholder="React, Diseño, Python..." />

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FONT.mono, fontSize: 11, color: C.mut, marginBottom: 14, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.is_remote} onChange={e => setF({ ...f, is_remote: e.target.checked })} /> Se puede hacer remoto
        </label>

        {err && <div style={{ fontFamily: FONT.mono, fontSize: 10, color: '#ff5c7a', marginBottom: 10 }}>{err}</div>}

        <button onClick={submit} disabled={saving} style={S.submitBtn}>
          {saving ? 'Publicando...' : '📋 Publicar necesidad'}
        </button>
      </div>
    </div>
  );
}

// ── MODAL: Postular a necesidad ──────────────────────────────────────
function ApplyModal({ need, onClose, onDone }: { need: FreelanceNeed; onClose: () => void; onDone: () => void }) {
  const [message, setMessage] = useState('');
  const [budget, setBudget] = useState('');
  const [days, setDays] = useState('');
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    setSending(true); setErr(null);
    try {
      const { error } = await supabase.rpc('apply_to_need', {
        p_need_id: need.id,
        p_message: message.trim(),
        p_budget: Number(budget) || null,
        p_days: Number(days) || null,
      });
      if (error) throw error;
      import('../../lib/analytics').then(({ track }) => track('job_applied', { type: 'freelance', category: need.category })).catch(() => {});
      onDone();
    } catch (e) { setErr((e as Error).message); }
    finally { setSending(false); }
  }

  return (
    <div style={S.modalBg} onClick={onClose}>
      <div style={S.modal} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} style={S.closeBtn}><X size={18} /></button>
        <div style={S.modalTitle}>✋ Postular a: {need.title}</div>

        <label style={S.lbl}>¿Por qué eres la persona indicada?</label>
        <textarea style={{ ...S.inp, resize: 'none' }} rows={3} value={message} onChange={e => setMessage(e.target.value)} placeholder="Cuéntale al publicador tu experiencia relevante..." />

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={S.lbl}>Tu presupuesto ($CLP)</label><input style={S.inp} type="number" value={budget} onChange={e => setBudget(e.target.value)} placeholder="Opcional" /></div>
          <div style={{ flex: 1 }}><label style={S.lbl}>Plazo propuesto (días)</label><input style={S.inp} type="number" value={days} onChange={e => setDays(e.target.value)} placeholder="Opcional" /></div>
        </div>

        {err && <div style={{ fontFamily: FONT.mono, fontSize: 10, color: '#ff5c7a', marginBottom: 10 }}>{err}</div>}

        <button onClick={submit} disabled={sending} style={S.submitBtn}>
          {sending ? 'Enviando...' : '🚀 Enviar postulación'}
        </button>
      </div>
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────
const S: Record<string, React.CSSProperties> = {
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.ink },
  sectionSub: { fontFamily: FONT.mono, fontSize: 9, color: C.mut, letterSpacing: 0.5 },
  publishBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '8px 13px', borderRadius: 8, background: 'rgba(63,208,201,0.1)', border: `1px solid ${C.green}44`, color: C.green, cursor: 'pointer', fontFamily: FONT.mono, fontSize: 10, fontWeight: 700 },
  filterRow: { display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 12, paddingBottom: 4 },
  filterChip: { flexShrink: 0, padding: '6px 11px', borderRadius: 6, border: '1px solid rgba(92,200,255,0.15)', background: 'transparent', color: C.mut, fontFamily: FONT.mono, fontSize: 9, cursor: 'pointer', whiteSpace: 'nowrap' },
  filterActive: { background: 'rgba(92,200,255,0.1)', borderColor: C.cyan, color: C.cyan },
  card: { position: 'relative', background: 'rgba(8,16,38,0.6)', border: `1px solid rgba(92,200,255,0.1)`, borderRadius: 14, padding: '14px', marginBottom: 12, overflow: 'hidden' },
  urgencyBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  cardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catBadge: { fontFamily: FONT.mono, fontSize: 9, color: C.mut },
  urgencyBadge: { fontFamily: FONT.mono, fontSize: 8, padding: '2px 7px', borderRadius: 4, border: '1px solid' },
  cardTitle: { fontFamily: FONT.display, fontSize: 15, fontWeight: 700, color: C.ink, marginBottom: 3 },
  cardPublisher: { fontFamily: FONT.mono, fontSize: 10, color: C.mut, marginBottom: 8 },
  cardDesc: { fontFamily: FONT.body, fontSize: 12, color: '#b9d4e6', lineHeight: 1.4, margin: '0 0 10px' },
  statsRow: { display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  stat: { display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT.mono, fontSize: 10, color: C.mut },
  skillsRow: { display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 },
  skillTag: { padding: '3px 8px', borderRadius: 4, background: 'rgba(92,200,255,0.06)', border: '1px solid rgba(92,200,255,0.15)', fontFamily: FONT.mono, fontSize: 9, color: '#c8ddf0' },
  applyBtn: { width: '100%', padding: '11px', borderRadius: 8, fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  muted: { fontFamily: FONT.mono, fontSize: 10, color: C.mut, textAlign: 'center' },
  empty: { textAlign: 'center', padding: '24px 16px' },
  emptyTitle: { fontFamily: FONT.display, fontSize: 14, fontWeight: 700, color: C.ink, margin: '0 0 6px' },
  emptyHint: { fontFamily: FONT.body, fontSize: 12, color: C.mut, lineHeight: 1.4, margin: '0 0 14px' },
  ctaBtn: { padding: '11px 20px', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.green}, #1fa30a)`, color: '#04121f', fontFamily: FONT.mono, fontSize: 11, fontWeight: 700, cursor: 'pointer' },
  modalBg: { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,2,6,0.85)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modal: { position: 'relative', width: '100%', maxWidth: 420, maxHeight: '85vh', overflowY: 'auto', background: 'rgba(8,16,38,0.97)', border: `1px solid ${C.line}`, borderRadius: 18, padding: '20px' },
  closeBtn: { position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.mut, cursor: 'pointer', display: 'flex' },
  modalTitle: { fontFamily: FONT.display, fontSize: 16, fontWeight: 700, color: C.ink, marginBottom: 6 },
  modalSub: { fontFamily: FONT.body, fontSize: 12, color: C.mut, marginBottom: 16, lineHeight: 1.4 },
  lbl: { fontFamily: FONT.mono, fontSize: 9, color: C.mut, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' },
  inp: { width: '100%', boxSizing: 'border-box', background: 'rgba(92,200,255,0.04)', border: `1px solid ${C.line}`, borderRadius: 6, padding: '10px 12px', color: C.ink, fontFamily: FONT.mono, fontSize: 12, outline: 'none', marginBottom: 10 },
  submitBtn: { width: '100%', padding: '13px', borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${C.cyan}, #008b9e)`, color: '#04121f', fontFamily: FONT.mono, fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: 0.5 },
};
