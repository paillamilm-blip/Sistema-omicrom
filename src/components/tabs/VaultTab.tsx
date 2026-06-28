// components/tabs/VaultTab.tsx
// Bóveda de Conocimiento — publicar, explorar, CONSULTAR y BUSCAR por significado
// (pgvector + Edge Function embed). Regalías encadenadas. Estilo Industria 5.0.

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Lock, Unlock, X, Coins, GitBranch, Search, Sparkles } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';

const C = {
  bg: '#06090f', panelA: '#131b28', panelB: '#0b1119',
  blue: '#2e9bff', blueHi: '#6fc3ff', amber: '#ff9d2e', amberHi: '#ffc266',
  line: 'rgba(110,150,200,0.14)', lineSoft: 'rgba(110,150,200,0.07)',
  ink: '#eaf2ff', muted: '#7d93b0', green: '#2bd97c',
} as const;
const FM = "'Share Tech Mono', 'Courier New', monospace";
const FR = "'Rajdhani', sans-serif";

interface Doc {
  id: string; author_id: string | null; title: string; description: string | null;
  current_token_cost: number; competency_tags: string | null;
  parent_document_id: string | null; total_royalties: number; is_validated: boolean;
}

// Llama a la Edge Function "embed" y devuelve el vector (o null si falla)
async function embedText(text: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('embed', { body: { text } });
    if (error || !data?.embedding) return null;
    return `[${(data.embedding as number[]).join(',')}]`;
  } catch {
    return null;
  }
}

export function VaultTab() {
  const { profile, refreshProfile } = useApp();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [access, setAccess] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Búsqueda semántica
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [resultIds, setResultIds] = useState<{ id: string; similarity: number }[] | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data: ds } = await supabase
      .from('knowledge_vault_documents').select('*')
      .eq('is_validated', true).order('created_at', { ascending: false });
    const list = (ds as Doc[]) ?? [];
    setDocs(list);

    const ids = [...new Set(list.map(d => d.author_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id,username').in('id', ids);
      setNames(new Map(((p as { id: string; username: string }[]) ?? []).map(x => [x.id, x.username])));
    }
    const { data: q } = await supabase.from('vault_queries').select('document_id').eq('reader_id', profile.id);
    setAccess(new Set(((q as { document_id: string }[]) ?? []).map(x => x.document_id)));
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function runSearch() {
    if (!query.trim()) { setResultIds(null); return; }
    setSearching(true);
    try {
      const vec = await embedText(query.trim());
      if (!vec) { alert('Buscador no disponible (¿desplegaste la función embed?)'); return; }
      const { data, error } = await supabase.rpc('match_vault_documents', { query_embedding: vec, match_count: 12 });
      if (error) throw error;
      setResultIds((data as { id: string; similarity: number }[] ?? []).map(r => ({ id: r.id, similarity: r.similarity })));
    } catch (e) {
      alert('Error en la búsqueda: ' + ((e as Error).message ?? e));
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() { setQuery(''); setResultIds(null); }

  async function consult(d: Doc) {
    setBusy(d.id);
    try {
      const { error } = await supabase.rpc('consult_vault_document', { p_doc_id: d.id });
      if (error) throw error;
      setAccess(prev => new Set(prev).add(d.id));
      await refreshProfile();
      await load();
    } catch (e) {
      alert('Error: ' + ((e as Error).message ?? e));
    } finally {
      setBusy(null);
    }
  }

  // Lista a mostrar: resultados de búsqueda (mapeados a docs) o todos
  const simMap = new Map((resultIds ?? []).map(r => [r.id, r.similarity]));
  const display: Doc[] = resultIds
    ? resultIds.map(r => docs.find(d => d.id === r.id)).filter(Boolean) as Doc[]
    : docs;

  return (
    <div style={styles.root}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={styles.iconBadge}><BookOpen size={15} style={{ color: C.bg }} /></div>
          <div>
            <div style={styles.hTitle}>BÓVEDA DE CONOCIMIENTO</div>
            <div style={styles.hSub}>BÚSQUEDA SEMÁNTICA · REGALÍAS</div>
          </div>
        </div>
        <button style={styles.pubBtn} onClick={() => setShowPublish(true)}><Plus size={14} /> PUBLICAR</button>
      </div>

      {/* Buscador semántico */}
      <div style={styles.searchRow}>
        <div style={styles.searchBox}>
          <Search size={14} style={{ color: C.muted, flexShrink: 0 }} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && runSearch()}
            placeholder="Busca por idea, no por palabra exacta…"
            style={styles.searchInput}
          />
          {query && <button onClick={clearSearch} style={{ background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex' }}><X size={14} /></button>}
        </div>
        <button onClick={runSearch} disabled={searching} style={styles.searchBtn}>
          {searching ? '...' : <Sparkles size={14} />}
        </button>
      </div>

      <div style={styles.scroll}>
        {resultIds && (
          <div style={{ fontFamily: FM, fontSize: 9, color: C.blueHi, letterSpacing: 1, marginBottom: 4 }}>
            ◢ {display.length} RESULTADOS SEMÁNTICOS · <span onClick={clearSearch} style={{ color: C.muted, cursor: 'pointer', textDecoration: 'underline' }}>limpiar</span>
          </div>
        )}

        {loading ? (
          <p style={styles.muted}>// CARGANDO BÓVEDA...</p>
        ) : display.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <BookOpen size={28} style={{ color: C.line }} />
            <p style={styles.muted}>{resultIds ? 'Sin coincidencias.' : 'Bóveda vacía. ¡Publica la primera solución!'}</p>
          </div>
        ) : display.map(d => {
          const unlocked = access.has(d.id) || d.author_id === profile?.id;
          const mine = d.author_id === profile?.id;
          const sim = simMap.get(d.id);
          return (
            <div key={d.id} style={styles.card}>
              <div style={styles.cardTop} />
              {sim != null && (
                <div style={styles.simBadge}>{Math.round(sim * 100)}% afín</div>
              )}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={styles.title}>{d.title}</div>
                  <div style={styles.author}>
                    @{d.author_id ? names.get(d.author_id) ?? 'autor' : 'sistema'}
                    {d.parent_document_id && <span style={{ color: C.blueHi }}> · <GitBranch size={9} style={{ verticalAlign: 'middle' }} /> derivado</span>}
                  </div>
                </div>
                {unlocked ? <Unlock size={16} style={{ color: C.green, flexShrink: 0 }} /> : <Lock size={16} style={{ color: C.amber, flexShrink: 0 }} />}
              </div>

              {d.competency_tags && <div style={{ marginTop: 8 }}><span style={styles.tag}>{d.competency_tags}</span></div>}

              {unlocked ? (
                <div style={styles.content}>{d.description || 'Sin contenido.'}</div>
              ) : (
                <div style={styles.locked}>🔒 Contenido bloqueado · consulta para desbloquear</div>
              )}

              <div style={styles.footer}>
                <span style={styles.royalties}><Coins size={11} /> {d.total_royalties ?? 0} T en regalías</span>
                {mine ? (
                  <span style={{ fontFamily: FM, fontSize: 10, color: C.muted }}>TU DOCUMENTO</span>
                ) : unlocked ? (
                  <span style={{ fontFamily: FM, fontSize: 10, color: C.green }}>✓ ACCESO</span>
                ) : (
                  <button onClick={() => consult(d)} disabled={busy === d.id} style={styles.consultBtn}>
                    {busy === d.id ? '...' : `CONSULTAR · 🪙${d.current_token_cost}`}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showPublish && <PublishDocModal onClose={() => setShowPublish(false)} onDone={() => { setShowPublish(false); load(); refreshProfile(); }} />}
    </div>
  );
}

function PublishDocModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { profile } = useApp();
  const [f, setF] = useState({ title: '', description: '', cost: '50', tags: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit() {
    if (!profile) return;
    if (!f.title.trim()) { setErr('Pon un título'); return; }
    if (!f.description.trim()) { setErr('Escribe la solución'); return; }
    setSaving(true); setErr(null);
    try {
      const cost = Number(f.cost) || 0;
      // Embedding del contenido para búsqueda semántica (si la función está disponible)
      const vec = await embedText(`${f.title}. ${f.description} ${f.tags}`);
      const { error } = await supabase.from('knowledge_vault_documents').insert({
        author_id: profile.id, title: f.title.trim(), description: f.description.trim(),
        initial_token_cost: cost, current_token_cost: cost,
        competency_tags: f.tags.trim() || null, is_validated: true,
        ...(vec ? { embedding: vec } : {}),
      });
      if (error) throw error;
      onDone();
    } catch (e) { setErr((e as Error).message ?? 'Error'); }
    finally { setSaving(false); }
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(46,155,255,0.05)', border: `1px solid ${C.line}`, borderRadius: 6, padding: '9px 11px', color: C.ink, fontFamily: FM, fontSize: 12, outline: 'none', marginBottom: 10 };
  const lbl: React.CSSProperties = { fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4, display: 'block' };

  return (
    <div style={styles.modalBg}>
      <div style={styles.modal}>
        <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.muted, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        <div style={{ fontFamily: FM, fontSize: 11, color: C.blueHi, letterSpacing: 2, marginBottom: 14 }}>PUBLICAR EN LA BÓVEDA</div>

        <label style={lbl}>Título de la solución</label>
        <input style={inp} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="Ej: Optimización de consultas SQL" />
        <label style={lbl}>Contenido / solución técnica</label>
        <textarea style={{ ...inp, resize: 'none' }} rows={5} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="Explica la solución, pasos, código..." />
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1 }}><label style={lbl}>Costo de consulta 🪙</label><input style={inp} type="number" value={f.cost} onChange={e => setF({ ...f, cost: e.target.value })} /></div>
          <div style={{ flex: 1 }}><label style={lbl}>Etiqueta</label><input style={inp} value={f.tags} onChange={e => setF({ ...f, tags: e.target.value })} placeholder="SQL" /></div>
        </div>

        {err && <div style={{ fontFamily: FM, fontSize: 10, color: '#ff5066', marginBottom: 10 }}>{err}</div>}

        <button onClick={submit} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: 8, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #0077cc)`, border: 'none', color: '#04121f', fontFamily: FM, fontSize: 12, letterSpacing: 1, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'PUBLICANDO…' : 'PUBLICAR'}
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(8,11,18,0.7)', flexShrink: 0 },
  iconBadge: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.blueHi}, ${C.blue})`, boxShadow: '0 0 14px rgba(46,155,255,0.5)' },
  hTitle: { fontFamily: FM, fontSize: 12, color: C.blueHi, letterSpacing: 1.5, fontWeight: 700 },
  hSub: { fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1, marginTop: 2 },
  pubBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(46,155,255,0.12)', border: `1px solid ${C.blue}`, color: C.blueHi, cursor: 'pointer', fontFamily: FM, fontSize: 10, letterSpacing: 1 },
  searchRow: { display: 'flex', gap: 8, padding: '12px 14px', flexShrink: 0 },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRadius: 8, background: 'rgba(46,155,255,0.05)', border: `1px solid ${C.line}` },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', color: C.ink, fontFamily: FR, fontSize: 14, padding: '10px 0' },
  searchBtn: { width: 44, borderRadius: 8, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #0077cc)`, border: 'none', color: '#04121f', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, overflowY: 'auto', padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  muted: { fontFamily: FM, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  card: { position: 'relative', background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, border: `1px solid ${C.line}`, borderRadius: 4, padding: '16px', overflow: 'hidden', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' },
  cardTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.blue}, transparent)` },
  simBadge: { position: 'absolute', top: 12, right: 14, fontFamily: FM, fontSize: 8, color: C.blueHi, background: 'rgba(46,155,255,0.12)', border: `1px solid ${C.blue}`, padding: '2px 7px', borderRadius: 3 },
  title: { fontFamily: FR, fontWeight: 700, fontSize: 17, color: C.ink, lineHeight: 1.15, paddingRight: 60 },
  author: { fontFamily: FM, fontSize: 10, color: C.muted, marginTop: 3 },
  tag: { fontFamily: FM, fontSize: 10, color: C.blueHi, background: 'rgba(46,155,255,0.08)', border: `1px solid ${C.lineSoft}`, padding: '3px 9px', borderRadius: 3 },
  content: { fontFamily: FR, fontSize: 14, color: '#b9d4e6', lineHeight: 1.5, marginTop: 10, whiteSpace: 'pre-wrap', background: 'rgba(43,217,124,0.05)', border: '1px solid rgba(43,217,124,0.2)', borderRadius: 6, padding: '10px 12px' },
  locked: { fontFamily: FM, fontSize: 11, color: C.amber, marginTop: 10, background: 'rgba(255,157,46,0.06)', border: '1px solid rgba(255,157,46,0.25)', borderRadius: 6, padding: '12px', textAlign: 'center' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  royalties: { display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FM, fontSize: 10, color: C.amberHi },
  consultBtn: { padding: '8px 14px', borderRadius: 6, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #0077cc)`, border: 'none', color: '#04121f', fontFamily: FM, fontSize: 11, letterSpacing: 0.5, fontWeight: 700 },
  modalBg: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,5,11,0.8)', backdropFilter: 'blur(4px)', padding: 20 },
  modal: { width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto', borderRadius: 10, padding: 20, background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, border: `1px solid ${C.blue}`, boxShadow: '0 0 30px rgba(46,155,255,0.3)', position: 'relative' },
};
