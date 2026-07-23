// components/tabs/VaultTab.tsx
// Bóveda de Conocimiento — publicar, explorar, CONSULTAR y BUSCAR por significado
// (pgvector + Edge Function embed). Regalías encadenadas. Estilo Industria 5.0.

import { useState, useEffect, useCallback } from 'react';
import { BookOpen, Plus, Lock, Unlock, X, Coins, GitBranch, Search, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { C as T, FONT as TF } from '../../theme';
import { useApp } from '../../store/AppContext';
import { useToast } from '../shared/Toast';
import { usePremium, PremiumLock, PremiumBadge } from '../shared/Premium';
import { oc, OmicronHeader, OmicronAction } from '../omicron/OmicronChrome';

// Paleta v5.0 "Neo-Académico Holográfico" — Bóveda = Cajas Negras (azul acero industrial)
// Paleta DERIVADA del tema (theme.ts) → un cambio de tema se propaga solo.
const C = {
  bg: T.bg, panelA: 'rgba(8,16,38,0.60)', panelB: 'rgba(2,6,19,0.78)',
  blue: T.cyan, blueHi: '#8bd4ff', amber: T.gold, amberHi: '#ffd27a',
  steel: T.purple, steelHi: '#8a88f0',
  line: T.line, lineSoft: T.cyanFaint,
  ink: T.ink, muted: T.mut, green: T.green,
} as const;
const FM = TF.mono;
const FR = TF.display;

// Detalle real del error que devuelve la Edge Function.
async function vaultServerError(error: unknown, data: unknown, fallback: string): Promise<string> {
  const d = data as { error?: string; detail?: string } | null;
  if (d?.error) return d.detail ? `${d.error} — ${d.detail}` : d.error;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const b = await ctx.json(); if (b?.error) return b.detail ? `${b.error} — ${b.detail}` : b.error; } catch { /* */ }
  }
  return (error as { message?: string } | null)?.message || fallback;
}

interface Doc {
  id: string; author_id: string | null; title: string;
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
  const { profile, refreshProfile, setActiveTab } = useApp();
  const { toast } = useToast();
  const { isPremium } = usePremium();
  const [premiumLock, setPremiumLock] = useState(false);
  const [docs, setDocs] = useState<Doc[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [access, setAccess] = useState<Set<string>>(new Set());
  const [contents, setContents] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  // Búsqueda semántica
  const [query, setQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [resultIds, setResultIds] = useState<{ id: string; similarity: number }[] | null>(null);

  // Oráculo IA
  const [oracleOpen, setOracleOpen] = useState(false);
  const [oracleQuery, setOracleQuery] = useState('');
  const [oracleLoading, setOracleLoading] = useState(false);
  const [oracleResult, setOracleResult] = useState<string | null>(null);
  const [oracleErr, setOracleErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data: ds } = await supabase
      .from('knowledge_vault_documents')
      .select('id,author_id,title,initial_token_cost,current_token_cost,competency_tags,parent_document_id,total_royalties,is_validated,created_at')
      .eq('is_validated', true).order('created_at', { ascending: false });
    const list = (ds as Doc[]) ?? [];
    setDocs(list);

    const ids = [...new Set(list.map(d => d.author_id).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id,username').in('id', ids);
      setNames(new Map(((p as { id: string; username: string }[]) ?? []).map(x => [x.id, x.username])));
    }
    const { data: q } = await supabase.from('vault_queries').select('document_id').eq('reader_id', profile.id);
    const acc = new Set(((q as { document_id: string }[]) ?? []).map(x => x.document_id));
    setAccess(acc);

    // Contenido SOLO de los docs a los que tienes acceso (o eres autor)
    const unlocked = list.filter(d => acc.has(d.id) || d.author_id === profile.id);
    const pairs = await Promise.all(unlocked.map(async d => {
      const { data } = await supabase.rpc('get_vault_content', { p_doc_id: d.id });
      return [d.id, (data as string) ?? ''] as [string, string];
    }));
    setContents(new Map(pairs.filter(p => p[1])));

    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function runSearch() {
    if (!query.trim()) { setResultIds(null); return; }
    setSearching(true);
    try {
      const vec = await embedText(query.trim());
      if (!vec) { toast('Buscador no disponible (¿desplegaste la función embed?)', 'error'); return; }
      const { data, error } = await supabase.rpc('match_vault_documents', { query_embedding: vec, match_count: 12 });
      if (error) throw error;
      setResultIds((data as { id: string; similarity: number }[] ?? []).map(r => ({ id: r.id, similarity: r.similarity })));
    } catch (e) {
      toast('Error en la búsqueda: ' + ((e as Error).message ?? e), 'error');
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() { setQuery(''); setResultIds(null); }

  async function askOracle() {
    if (!oracleQuery.trim() || oracleLoading) return;
    if (!isPremium) { setPremiumLock(true); return; }
    setOracleLoading(true); setOracleErr(null); setOracleResult(null);
    try {
      const vec = await embedText(oracleQuery.trim());
      if (!vec) { setOracleErr('El buscador no está disponible (¿desplegaste la función "embed"?).'); return; }
      const { data: matches, error: me } = await supabase.rpc('match_vault_documents', { query_embedding: vec, match_count: 6 });
      if (me) { setOracleErr('Error buscando en la Bóveda: ' + me.message); return; }
      const rows = (matches as { id: string; similarity: number }[]) ?? [];
      const candidates = rows.flatMap(r => {
        const d = docs.find(x => x.id === r.id);
        return d ? [{
          titulo: d.title,
          etiquetas: d.competency_tags ?? '',
          costo: d.current_token_cost,
          autor: d.author_id ? (names.get(d.author_id) ?? 'autor') : 'sistema',
          afinidad: r.similarity,
        }] : [];
      });
      const { data, error } = await supabase.functions.invoke('vault-oracle', { body: { query: oracleQuery.trim(), candidates } });
      const dd = data as { recomendacion?: string; error?: string };
      if (error || dd?.error || !dd?.recomendacion) {
        setOracleErr(await vaultServerError(error, data, 'No se pudo consultar el Oráculo. ¿Está desplegada la función "vault-oracle"?'));
        return;
      }
      setOracleResult(dd.recomendacion);
    } catch {
      setOracleErr('Error de conexión con el Oráculo.');
    } finally {
      setOracleLoading(false);
    }
  }

  async function consult(d: Doc) {
    setBusy(d.id);
    try {
      const { error } = await supabase.rpc('consult_vault_document', { p_doc_id: d.id });
      if (error) throw error;
      setAccess(prev => new Set(prev).add(d.id));
      await refreshProfile();
      await load();
    } catch (e) {
      toast('Error: ' + ((e as Error).message ?? e), 'error');
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
    <div style={oc.root}>
      <OmicronHeader
        onBack={() => setActiveTab('perfil')}
        icon={<BookOpen size={17} />}
        title="Bóveda"
        subtitle="Búsqueda semántica · Regalías"
        action={<OmicronAction onClick={() => setShowPublish(true)}><Plus size={14} /> Publicar</OmicronAction>}
      />

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
        {/* Oráculo IA de la Bóveda — pregunta natural → qué consultar y por qué */}
        <div style={styles.oracleWrap}>
          <button onClick={() => setOracleOpen(o => !o)} style={styles.oracleToggle}>
            <Sparkles size={14} style={{ color: C.amberHi }} />
            <span style={{ flex: 1, textAlign: 'left' }}>🔮 ORÁCULO DE LA BÓVEDA</span>
            {!isPremium && <PremiumBadge />}
            <span style={{ color: C.muted }}>{oracleOpen ? '▲' : '▼'}</span>
          </button>
          {oracleOpen && (
            <div style={styles.oracleBody}>
              <p style={styles.oracleHint}>Pregunta en lenguaje natural y la IA te dice qué conocimiento consultar para resolverlo (y por qué). Consultar paga regalías al autor.</p>
              <textarea value={oracleQuery} onChange={e => setOracleQuery(e.target.value)}
                placeholder="Ej: cómo mejorar el rendimiento de una consulta SQL lenta..."
                style={styles.oracleInput} />
              <button onClick={askOracle} disabled={oracleLoading || !oracleQuery.trim()} style={{
                ...styles.oracleBtn,
                opacity: (oracleLoading || !oracleQuery.trim()) ? 0.5 : 1,
                cursor: (oracleLoading || !oracleQuery.trim()) ? 'not-allowed' : 'pointer',
              }}>
                {oracleLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Consultando el Oráculo...</>
                  : <><Sparkles size={14} /> Preguntar al Oráculo</>}
              </button>
              {oracleErr && <div style={styles.oracleErr}>{oracleErr}</div>}
              {oracleResult && (
                <div style={styles.oracleResult}>
                  <div style={styles.oracleResultHead}><BookOpen size={12} style={{ color: C.blueHi }} /> RECOMENDACIÓN DEL ORÁCULO</div>
                  <p style={{ margin: 0, fontFamily: FR, fontSize: 14, color: C.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{oracleResult}</p>
                </div>
              )}
            </div>
          )}
        </div>

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
                {unlocked
                  ? <Unlock size={16} style={{ color: C.green, flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(63, 208, 201,0.8))' }} />
                  : <Lock size={16} style={{ color: C.amber, flexShrink: 0, filter: 'drop-shadow(0 0 6px rgba(255, 176, 46,0.8))', animation: 'lockPulse 2.2s ease-in-out infinite' }} />}
              </div>

              {d.competency_tags && <div style={{ marginTop: 8 }}><span style={styles.tag}>{d.competency_tags}</span></div>}

              {unlocked ? (
                <div style={styles.content}>{contents.get(d.id) ?? 'Cargando contenido…'}</div>
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
      {premiumLock && <PremiumLock feature="El Oráculo de la Bóveda" onClose={() => setPremiumLock(false)} />}
    </div>
  );
}

function PublishDocModal({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const { profile } = useApp();
  const [f, setF] = useState({ title: '', description: '', cost: '50', tags: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [similar, setSimilar] = useState<{ id: string; title: string; similarity: number; vec: string } | null>(null);

  async function insertDoc(vec: string | null, parentId: string | null) {
    if (!profile) return;
    setSaving(true); setErr(null);
    try {
      const cost = Number(f.cost) || 0;
      const { error } = await supabase.from('knowledge_vault_documents').insert({
        author_id: profile.id, title: f.title.trim(), description: f.description.trim(),
        initial_token_cost: cost, current_token_cost: cost,
        competency_tags: f.tags.trim() || null, is_validated: true,
        ...(parentId ? { parent_document_id: parentId } : {}),
        ...(vec ? { embedding: vec } : {}),
      });
      if (error) throw error;
      onDone();
    } catch (e) { setErr((e as Error).message ?? 'Error'); }
    finally { setSaving(false); }
  }

  async function submit() {
    if (!profile) return;
    if (!f.title.trim()) { setErr('Pon un título'); return; }
    if (!f.description.trim()) { setErr('Escribe la solución'); return; }
    setSaving(true); setErr(null);
    const vec = await embedText(`${f.title}. ${f.description} ${f.tags}`);
    // Anti-plagio / Linaje H-07: ¿hay algo muy parecido de otro autor?
    if (vec) {
      const { data: sim } = await supabase.rpc('find_similar_documents', { query_embedding: vec, p_threshold: 0.85, p_exclude_author: profile.id });
      const top = (sim as { id: string; title: string; similarity: number }[] ?? [])[0];
      if (top) { setSimilar({ id: top.id, title: top.title, similarity: top.similarity, vec }); setSaving(false); return; }
    }
    await insertDoc(vec, null);
  }

  const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', background: 'rgba(92, 200, 255,0.05)', border: `1px solid ${C.line}`, borderRadius: 6, padding: '9px 11px', color: C.ink, fontFamily: FM, fontSize: 12, outline: 'none', marginBottom: 10 };
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

        {similar ? (
          <>
            <div style={{ fontFamily: FM, fontSize: 10, color: C.amber, background: 'rgba(255, 176, 46,0.08)', border: '1px solid rgba(255, 176, 46,0.3)', borderRadius: 6, padding: '10px 12px', lineHeight: 1.5, marginBottom: 10 }}>
              ⚠️ Esto es <b>{Math.round(similar.similarity * 100)}%</b> parecido a <b>"{similar.title}"</b>. Se publicará como <b>DERIVADO</b> (Linaje H-07): el <b>20%</b> de las regalías irá al autor original.
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setSimilar(null)} style={{ flex: 1, padding: '11px', borderRadius: 8, cursor: 'pointer', background: 'transparent', border: `1px solid ${C.line}`, color: C.muted, fontFamily: FM, fontSize: 11, letterSpacing: 1 }}>VOLVER</button>
              <button onClick={() => insertDoc(similar.vec, similar.id)} disabled={saving} style={{ flex: 1, padding: '11px', borderRadius: 8, cursor: 'pointer', background: C.amber, border: 'none', color: '#1a1205', fontFamily: FM, fontSize: 11, letterSpacing: 1, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>PUBLICAR DERIVADO</button>
            </div>
          </>
        ) : (
          <button onClick={submit} disabled={saving} style={{ width: '100%', padding: '12px', borderRadius: 8, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #008b9e)`, border: 'none', color: '#04121f', fontFamily: FM, fontSize: 12, letterSpacing: 1, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
            {saving ? 'ANALIZANDO…' : 'PUBLICAR'}
          </button>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(8,11,18,0.7)', flexShrink: 0 },
  iconBadge: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.blueHi}, ${C.blue})`, boxShadow: '0 0 14px rgba(92, 200, 255,0.5)' },
  hTitle: { fontFamily: FM, fontSize: 12, color: C.blueHi, letterSpacing: 1.5, fontWeight: 700 },
  hSub: { fontFamily: FM, fontSize: 9, color: C.muted, letterSpacing: 1, marginTop: 2 },
  pubBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(92, 200, 255,0.12)', border: `1px solid ${C.blue}`, color: C.blueHi, cursor: 'pointer', fontFamily: FM, fontSize: 10, letterSpacing: 1 },
  searchRow: { display: 'flex', gap: 8, padding: '12px 0', flexShrink: 0 },
  searchBox: { flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '0 12px', borderRadius: 8, background: 'rgba(92, 200, 255,0.05)', border: `1px solid ${C.line}` },
  searchInput: { flex: 1, background: 'none', border: 'none', outline: 'none', color: C.ink, fontFamily: FR, fontSize: 14, padding: '10px 0' },
  searchBtn: { width: 44, borderRadius: 8, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #008b9e)`, border: 'none', color: '#04121f', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, overflowY: 'auto', padding: '4px 0 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  oracleWrap: { flexShrink: 0, borderRadius: 10, border: `1px solid rgba(255, 176, 46,0.35)`, background: 'linear-gradient(135deg, rgba(255, 176, 46,0.08), rgba(2,6,19,0.5))', overflow: 'hidden' },
  oracleToggle: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FM, fontSize: 11, letterSpacing: 1, color: '#ffd27a', fontWeight: 700 },
  oracleBody: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  oracleHint: { margin: 0, fontFamily: FM, fontSize: 10, color: C.muted, lineHeight: 1.45 },
  oracleInput: { width: '100%', minHeight: 62, boxSizing: 'border-box', padding: 10, borderRadius: 8, background: '#040a18', border: `1px solid ${C.lineSoft}`, color: C.ink, fontFamily: FR, fontSize: 14, lineHeight: 1.4, resize: 'vertical', outline: 'none' },
  oracleBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.amberHi}, ${C.amber})`, color: '#04121f', fontFamily: FR, fontWeight: 700, fontSize: 14, letterSpacing: 0.5 },
  oracleErr: { padding: 10, borderRadius: 8, background: 'rgba(255, 92, 122,0.10)', border: '1px solid rgba(255, 92, 122,0.3)', fontFamily: FR, fontSize: 12.5, color: '#ffb3bf', lineHeight: 1.4 },
  oracleResult: { padding: 12, borderRadius: 8, background: 'rgba(92, 200, 255,0.06)', border: `1px solid rgba(92, 200, 255,0.25)` },
  oracleResultHead: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: FM, fontSize: 9, letterSpacing: 1.5, color: C.blueHi, marginBottom: 8 },
  muted: { fontFamily: FM, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  card: { position: 'relative', background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${C.line}`, borderRadius: 18, padding: '16px', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.04)' },
  cardTop: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.steelHi}, ${C.blue}, transparent)` },
  simBadge: { position: 'absolute', top: 12, right: 14, fontFamily: FM, fontSize: 8, color: C.blueHi, background: 'rgba(92, 200, 255,0.12)', border: `1px solid ${C.blue}`, padding: '2px 7px', borderRadius: 3 },
  title: { fontFamily: FR, fontWeight: 700, fontSize: 17, color: C.ink, lineHeight: 1.15, paddingRight: 60 },
  author: { fontFamily: FM, fontSize: 10, color: C.muted, marginTop: 3 },
  tag: { fontFamily: FM, fontSize: 10, color: C.blueHi, background: 'rgba(92, 200, 255,0.08)', border: `1px solid ${C.lineSoft}`, padding: '3px 9px', borderRadius: 3 },
  content: { fontFamily: FR, fontSize: 14, color: '#b9d4e6', lineHeight: 1.5, marginTop: 10, whiteSpace: 'pre-wrap', background: 'rgba(63, 208, 201,0.05)', border: '1px solid rgba(63, 208, 201,0.2)', borderRadius: 6, padding: '10px 12px' },
  locked: { fontFamily: FM, fontSize: 11, color: C.amber, marginTop: 10, background: 'rgba(255, 176, 46,0.06)', border: '1px solid rgba(255, 176, 46,0.25)', borderRadius: 6, padding: '12px', textAlign: 'center' },
  footer: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  royalties: { display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: FM, fontSize: 10, color: C.amberHi },
  consultBtn: { padding: '8px 14px', borderRadius: 6, cursor: 'pointer', background: `linear-gradient(135deg, ${C.blue}, #008b9e)`, border: 'none', color: '#04121f', fontFamily: FM, fontSize: 11, letterSpacing: 0.5, fontWeight: 700 },
  modalBg: { position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,5,11,0.8)', backdropFilter: 'blur(4px)', padding: 20 },
  modal: { width: '100%', maxWidth: 400, maxHeight: '85vh', overflowY: 'auto', borderRadius: 10, padding: 20, background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, border: `1px solid ${C.blue}`, boxShadow: '0 0 30px rgba(92, 200, 255,0.3)', position: 'relative' },
};
