// components/tabs/EmpleosTab.tsx
// Empleos — estilo Industria 5.0. Publicar oferta + matchmaking (terna) + aplicar.

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, Plus, Flame, Clock, CheckCircle2, X, Star, Send, Radar, MapPin, Navigation, Wifi, LocateFixed } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { EmptyState } from '../shared/EmptyState';
import { useToast } from '../shared/Toast';

// ♿ Accesibilidad: tonos oscurecidos respecto a la versión original y
// "muted" con más contraste para no forzar la vista.
const C = {
  bg: '#020613', panelA: 'rgba(8,16,38,0.60)', panelB: 'rgba(2,6,19,0.78)',
  blue: '#00D6E6', blueHi: '#5ad6e6', amber: '#E08A00', amberHi: '#f0b23d',
  steel: '#045A68', steelHi: '#0977a3',
  line: 'rgba(4,90,104,0.35)', lineSoft: 'rgba(0,214,230,0.10)',
  ink: '#eaf2ff', muted: '#93a8c0', green: '#2FE014',
} as const;
const FM = "'Share Tech Mono', 'Courier New', monospace";
const FR = "'Rajdhani', sans-serif";

interface Job {
  id: string; company_id: string; title: string; description: string; category: string;
  tags: string[]; required_node_level: number; budget_usd: number; time_limit_hours: number;
  status: string; published_at: string;
  lat?: number | null; lng?: number | null; location?: string | null; is_remote?: boolean | null;
}

const LEVEL_LABEL = ['', 'N1 Operativo', 'N2 Core', 'N3 Arquitecto'];

// ── Geo helpers (sin librerías): distancia haversine + rumbo ──────────────
const toRad = (d: number) => (d * Math.PI) / 180;
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function bearingDeg(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const y = Math.sin(toRad(lng2 - lng1)) * Math.cos(toRad(lat2));
  const x = Math.cos(toRad(lat1)) * Math.sin(toRad(lat2)) - Math.sin(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.cos(toRad(lng2 - lng1));
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function fmtDist(km: number): string { return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 1 : 0)} km`; }

export function EmpleosTab() {
  const { profile } = useApp();
  const { toast } = useToast();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [myMatches, setMyMatches] = useState<Map<string, number>>(new Map()); // job_id -> rank
  const [applied, setApplied] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'matched' | 'applied'>('all');
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'radar'>('list');
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<'idle' | 'loading' | 'denied'>('idle');
  const [radarJob, setRadarJob] = useState<Job | null>(null);

  const requestGeo = useCallback(() => {
    if (!navigator.geolocation) { setGeoStatus('denied'); return; }
    setGeoStatus('loading');
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus('idle'); },
      () => { setGeoStatus('denied'); },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, []);

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
      toast('¡Aplicación enviada!', 'success');
    } catch (e) {
      toast('Error al aplicar: ' + ((e as Error).message ?? e), 'error');
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

      {/* Vista: Lista / Radar */}
      <div style={styles.viewRow}>
        {([['list', 'Lista'], ['radar', 'Radar']] as const).map(([k, label]) => {
          const active = view === k;
          return (
            <button key={k} onClick={() => { setView(k); if (k === 'radar' && !userPos && geoStatus !== 'loading') requestGeo(); }}
              style={{ ...styles.viewPill, background: active ? 'rgba(57,255,20,0.14)' : 'transparent', border: `1px solid ${active ? C.green : C.lineSoft}`, color: active ? C.green : C.muted }}>
              {k === 'radar' ? <Radar size={12} /> : null}{label}
            </button>
          );
        })}
        <span style={{ flex: 1 }} />
        <span style={{ fontFamily: FM, fontSize: 8.5, color: C.muted, letterSpacing: 1 }}>OPORTUNIDADES POR CERCANÍA</span>
      </div>

      {/* Lista */}
      <div style={styles.scroll}>
        {view === 'radar' ? (
          <RadarView jobs={jobs} userPos={userPos} geoStatus={geoStatus} onRequestGeo={requestGeo} onPick={setRadarJob} />
        ) : loading ? (
          <p style={styles.muted}>// CARGANDO OFERTAS...</p>
        ) : filtered.length === 0 ? (
          filter === 'all' ? (
            <EmptyState
              icon={<Briefcase size={30} />}
              title="Aún no hay ofertas"
              hint="Sé el primero en publicar una oportunidad. El matchmaking 80/20 conectará tu oferta con el mejor talento."
              ctaLabel="Publicar oferta"
              onCta={() => setShowPublish(true)}
            />
          ) : (
            <EmptyState
              icon={<Briefcase size={30} />}
              title={filter === 'matched' ? 'Sin matches todavía' : 'Sin aplicaciones'}
              hint={filter === 'matched'
                ? 'Sube tu reputación y completa nodos: el sistema te emparejará con ofertas afines.'
                : 'Aún no has aplicado a ninguna oferta. Revisa la pestaña "Todos".'}
              ctaLabel="Ver todas las ofertas"
              onCta={() => setFilter('all')}
            />
          )
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

      {radarJob && (() => {
        const j = radarJob;
        const dist = userPos && typeof j.lat === 'number' && typeof j.lng === 'number' ? haversineKm(userPos.lat, userPos.lng, j.lat, j.lng) : null;
        const isApplied = applied.has(j.id);
        const mine = j.company_id === profile?.id;
        return (
          <div style={styles.modalBg} onClick={() => setRadarJob(null)}>
            <div style={styles.modal} onClick={e => e.stopPropagation()}>
              <button onClick={() => setRadarJob(null)} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
              <div style={{ fontFamily: FR, fontWeight: 700, fontSize: 18, color: C.ink, textTransform: 'uppercase', paddingRight: 24 }}>{j.title}</div>
              <div style={{ fontFamily: FM, fontSize: 10, color: C.muted, marginTop: 4 }}>@{names.get(j.company_id) ?? 'empresa'} · {LEVEL_LABEL[j.required_node_level] ?? 'N1'}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, fontFamily: FM, fontSize: 11, color: j.is_remote ? C.green : C.blueHi }}>
                {j.is_remote ? <><Wifi size={13} /> Remoto</> : <><MapPin size={13} /> {j.location || 'Ubicación'}{dist != null ? ` · a ${fmtDist(dist)}` : ''}</>}
              </div>
              {j.description && <p style={{ fontFamily: FR, fontSize: 13, color: '#b9d4e6', lineHeight: 1.4, margin: '10px 0 0' }}>{j.description}</p>}
              <div style={styles.statRow}>
                <div style={styles.statBox}><div style={styles.statLabel}>PRESUPUESTO</div><div style={styles.budget}>🪙 {j.budget_usd}</div></div>
                <div style={styles.statBox}><div style={styles.statLabel}>PLAZO</div><div style={styles.tlimit}><Clock size={12} /> {j.time_limit_hours}h</div></div>
              </div>
              <button onClick={() => { if (!isApplied && !mine) { apply(j.id); setRadarJob(null); } }} disabled={isApplied || mine || busy === j.id}
                style={{ ...styles.applyBtn, background: (isApplied || mine) ? 'transparent' : `linear-gradient(135deg, ${C.blue}, #008b9e)`, border: `1px solid ${isApplied ? C.green : mine ? C.lineSoft : C.blue}`, color: isApplied ? C.green : mine ? C.muted : '#04121f', cursor: (isApplied || mine) ? 'default' : 'pointer' }}>
                {isApplied ? <><CheckCircle2 size={14} /> APLICADO</> : mine ? 'TU OFERTA' : <><Send size={13} /> APLICAR</>}
              </button>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function RadarView({ jobs, userPos, geoStatus, onRequestGeo, onPick }: {
  jobs: Job[]; userPos: { lat: number; lng: number } | null; geoStatus: 'idle' | 'loading' | 'denied';
  onRequestGeo: () => void; onPick: (j: Job) => void;
}) {
  const remote = jobs.filter(j => j.is_remote);
  const located = jobs.filter(j => !j.is_remote && typeof j.lat === 'number' && typeof j.lng === 'number');

  if (!userPos) {
    return (
      <div style={{ textAlign: 'center', padding: '34px 20px' }}>
        <Radar size={34} style={{ color: C.green }} />
        <p style={{ fontFamily: FR, fontSize: 15, color: '#dbeafe', margin: '12px 0 4px' }}>Activa tu ubicación para ver el radar</p>
        <p style={{ fontFamily: FM, fontSize: 10, color: C.muted, lineHeight: 1.5, marginBottom: 14 }}>Verás las oportunidades cerca tuyo, ordenadas por distancia. Tu ubicación no se guarda.</p>
        {geoStatus === 'denied' && <p style={{ fontFamily: FM, fontSize: 10, color: '#ff5066', marginBottom: 10 }}>Permiso denegado. Actívalo en el navegador y reintenta.</p>}
        <button onClick={onRequestGeo} disabled={geoStatus === 'loading'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '11px 18px', borderRadius: 8, background: `linear-gradient(135deg, ${C.green}, #1fa30a)`, border: 'none', color: '#04110a', fontFamily: FR, fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: geoStatus === 'loading' ? 0.6 : 1 }}>
          <LocateFixed size={15} /> {geoStatus === 'loading' ? 'Localizando...' : 'Activar mi ubicación'}
        </button>
      </div>
    );
  }

  const items = located.map(j => ({
    j, dist: haversineKm(userPos.lat, userPos.lng, j.lat!, j.lng!), brg: bearingDeg(userPos.lat, userPos.lng, j.lat!, j.lng!),
  })).sort((a, b) => a.dist - b.dist);
  const maxD = Math.max(1, ...items.map(i => i.dist));
  const cx = 150, cy = 150, R = 122;

  return (
    <div>
      <svg viewBox="0 0 300 300" width="100%" style={{ maxWidth: 340, display: 'block', margin: '0 auto', overflow: 'visible' }}>
        <defs>
          <radialGradient id="rad-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="rgba(57,255,20,0.10)" /><stop offset="100%" stopColor="rgba(57,255,20,0)" />
          </radialGradient>
          <linearGradient id="rad-sweep" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(57,255,20,0)" /><stop offset="100%" stopColor="rgba(57,255,20,0.30)" />
          </linearGradient>
        </defs>
        <circle cx={cx} cy={cy} r={R} fill="url(#rad-glow)" />
        {[R / 3, (2 * R) / 3, R].map((r, i) => (
          <g key={i}>
            <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(57,255,20,0.18)" strokeWidth={1} />
            <text x={cx + 4} y={cy - r + 11} fontFamily={FM} fontSize="7" fill={C.muted}>{fmtDist(maxD * ((i + 1) / 3))}</text>
          </g>
        ))}
        <line x1={cx} y1={cy - R} x2={cx} y2={cy + R} stroke="rgba(57,255,20,0.12)" />
        <line x1={cx - R} y1={cy} x2={cx + R} y2={cy} stroke="rgba(57,255,20,0.12)" />
        <g>
          <line x1={cx} y1={cy} x2={cx} y2={cy - R} stroke={C.green} strokeWidth={1.5} opacity={0.85} />
          <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="4s" repeatCount="indefinite" />
        </g>
        {items.map(({ j, dist, brg }) => {
          const rr = Math.min(R, (dist / maxD) * R);
          const x = cx + rr * Math.sin(toRad(brg));
          const y = cy - rr * Math.cos(toRad(brg));
          return (
            <g key={j.id} style={{ cursor: 'pointer' }} onClick={() => onPick(j)}>
              <circle cx={x} cy={y} r={7} fill="rgba(0,240,255,0.18)" />
              <circle cx={x} cy={y} r={4} fill={C.blueHi}><animate attributeName="r" values="4;5.5;4" dur="2s" repeatCount="indefinite" /></circle>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={5} fill={C.green} />
        <text x={cx} y={cy + 16} textAnchor="middle" fontFamily={FM} fontSize="7" fill={C.green}>TÚ</text>
      </svg>

      <div style={{ fontFamily: FM, fontSize: 9, color: C.muted, textAlign: 'center', margin: '6px 0 12px' }}>
        {items.length} oferta(s) con ubicación · toca un punto para ver
      </div>

      {items.slice(0, 5).map(({ j, dist }) => (
        <button key={j.id} onClick={() => onPick(j)} style={{ width: '100%', textAlign: 'left', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '9px 11px', marginBottom: 8, borderRadius: 8, cursor: 'pointer', background: C.panelA, border: `1px solid ${C.lineSoft}` }}>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'block', fontFamily: FR, fontWeight: 700, fontSize: 14, color: '#dbeafe', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{j.title}</span>
            <span style={{ fontFamily: FM, fontSize: 9, color: C.muted }}>🪙 {j.budget_usd}</span>
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FM, fontSize: 10, color: C.green, flexShrink: 0 }}><Navigation size={11} /> {fmtDist(dist)}</span>
        </button>
      ))}

      {remote.length > 0 && (
        <div style={{ marginTop: 6 }}>
          <div style={{ fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1, margin: '6px 0' }}>🛰️ REMOTAS ({remote.length})</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {remote.map(j => (
              <button key={j.id} onClick={() => onPick(j)} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 10px', borderRadius: 20, cursor: 'pointer', background: 'rgba(57,255,20,0.08)', border: `1px solid ${C.green}44`, color: '#dbeafe', fontFamily: FR, fontSize: 12 }}>
                <Wifi size={11} style={{ color: C.green }} /> {j.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {items.length === 0 && remote.length === 0 && (
        <p style={styles.muted}>Aún no hay ofertas con ubicación. Publica una con ubicación para verla acá.</p>
      )}
    </div>
  );
}

function PublishJobModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { profile } = useApp();
  const [f, setF] = useState({ title: '', description: '', category: 'dev', budget: '', hours: '48', level: 1, tags: '', location: '', is_remote: false });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);

  function captureLocation() {
    if (!navigator.geolocation) { setErr('Tu navegador no soporta geolocalización'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      () => { setLocating(false); setErr('No se pudo obtener tu ubicación'); },
      { timeout: 8000 },
    );
  }

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
        is_remote: f.is_remote,
        location: f.is_remote ? null : (f.location.trim() || null),
        lat: f.is_remote ? null : (coords?.lat ?? null),
        lng: f.is_remote ? null : (coords?.lng ?? null),
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

        <label style={lbl}>Ubicación (para el Radar)</label>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input style={{ ...inp, marginBottom: 0, flex: 1, opacity: f.is_remote ? 0.4 : 1 }} value={f.location} disabled={f.is_remote}
            onChange={e => setF({ ...f, location: e.target.value })} placeholder="Ej: Santiago, Maipú" />
          <button type="button" onClick={captureLocation} disabled={f.is_remote || locating}
            title="Usar mi ubicación"
            style={{ flexShrink: 0, width: 42, borderRadius: 6, cursor: f.is_remote ? 'default' : 'pointer', background: coords ? 'rgba(57,255,20,0.14)' : 'rgba(0,240,255,0.08)', border: `1px solid ${coords ? C.green : C.line}`, color: coords ? C.green : C.blueHi, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: f.is_remote ? 0.4 : 1 }}>
            {locating ? '…' : <LocateFixed size={16} />}
          </button>
        </div>
        {coords && !f.is_remote && <div style={{ fontFamily: FM, fontSize: 9, color: C.green, marginBottom: 8 }}>📍 Ubicación capturada</div>}
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: FM, fontSize: 11, color: C.muted, marginBottom: 12, cursor: 'pointer' }}>
          <input type="checkbox" checked={f.is_remote} onChange={e => setF({ ...f, is_remote: e.target.checked })} /> Trabajo remoto (sin ubicación)
        </label>

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
  viewRow: { display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 10px', flexShrink: 0 },
  viewPill: { display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 13px', borderRadius: 6, cursor: 'pointer', fontFamily: FM, fontSize: 10, letterSpacing: 1, whiteSpace: 'nowrap', textTransform: 'uppercase' },
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
