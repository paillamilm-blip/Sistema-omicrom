// components/tabs/MarketTab.tsx
// Mercado — tema "Industria 5.0": acero oscuro, rejilla blueprint, HUD,
// azul eléctrico + ámbar de energía. Look tecnológico/industrial de alto impacto.

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Star, Plus, Cpu, ShieldCheck, TrendingUp, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { EmptyState } from '../shared/EmptyState';
import { ContractModal } from '../contracts/ContractModal';
import { PublishServiceModal } from '../market/PublishServiceModal';
import { usePremium, PremiumLock } from '../shared/Premium';
import type { MarketService } from '../../types';

type Category = 'todos' | 'dev' | 'diseño' | 'consulta';

// ── Paleta v5.0 "Neo-Académico Holográfico" — cyan eléctrico + ámbar energía ──
const C = {
  bg: '#020613', bg2: '#030a1a',
  panelA: 'rgba(8,16,38,0.60)', panelB: 'rgba(2,6,19,0.78)',
  blue: '#00F0FF', blueHi: '#7df9ff',
  amber: '#F59E0B', amberHi: '#ffcf6b',
  steel: '#005F73', steelHi: '#0a8ba3',
  line: 'rgba(0,95,115,0.30)', lineSoft: 'rgba(0,240,255,0.08)',
  ink: '#eaf2ff', muted: '#7d93b0',
} as const;
const FONT_MONO = "'Share Tech Mono', 'Courier New', monospace";
const FONT_RAJ  = "'Rajdhani', sans-serif";

// Extrae el detalle real del error que devuelve la Edge Function.
async function marketServerError(error: unknown, data: unknown, fallback: string): Promise<string> {
  const d = data as { error?: string; detail?: string } | null;
  if (d?.error) return d.detail ? `${d.error} — ${d.detail}` : d.error;
  const ctx = (error as { context?: Response } | null)?.context;
  if (ctx && typeof ctx.json === 'function') {
    try { const b = await ctx.json(); if (b?.error) return b.detail ? `${b.error} — ${b.detail}` : b.error; } catch { /* */ }
  }
  return (error as { message?: string } | null)?.message || fallback;
}

const DEMO_SERVICES: MarketService[] = [
  {
    id: 'demo-1', seller_id: null, title: 'Desarrollo App React',
    description: 'Aplicación React completa con PWA', price: 350,
    category: 'dev', tags: ['React', 'PWA'], rating: 4.8, total_reviews: 24,
    is_active: true, created_at: new Date().toISOString(),
    seller: { id: 'demo-s1', username: 'marco_v', full_name: 'Marco V', avatar_url: null, node_type: 'Nodo Core', node_level: 2, token_balance: 0, pe_points: 520, is_pioneer: true, bio: null, skills: null, location: null, created_at: '', reputation_score: 78, competencias_validadas: 4 },
  },
  {
    id: 'demo-2', seller_id: null, title: 'Diseño UI/UX Completo',
    description: 'Sistema de diseño en Figma completo', price: 180,
    category: 'diseño', tags: ['Figma', 'Sistema'], rating: 4.9, total_reviews: 31,
    is_active: true, created_at: new Date().toISOString(),
    seller: { id: 'demo-s2', username: 'ana_design', full_name: 'Ana Design', avatar_url: null, node_type: 'Nodo Arquitecto', node_level: 1, token_balance: 0, pe_points: 280, is_pioneer: false, bio: null, skills: null, location: null, created_at: '', reputation_score: 85, competencias_validadas: 6 },
  },
  {
    id: 'demo-3', seller_id: null, title: 'Consultoría Técnica Cloud',
    description: 'Asesoría en arquitectura y AWS', price: 120,
    category: 'consulta', tags: ['AWS', 'Arquitectura'], rating: 4.7, total_reviews: 18,
    is_active: true, created_at: new Date().toISOString(),
    seller: { id: 'demo-s3', username: 'carlos_arch', full_name: 'Carlos Arch', avatar_url: null, node_type: 'Nodo Fundador', node_level: 1, token_balance: 0, pe_points: 890, is_pioneer: true, bio: null, skills: null, location: null, created_at: '', reputation_score: 92, competencias_validadas: 9 },
  },
];

const CAT_MAP: { key: Category; label: string; icon: string }[] = [
  { key: 'todos',   label: 'Todos',  icon: '' },
  { key: 'dev',     label: 'Dev',    icon: '💻' },
  { key: 'diseño',  label: 'Diseño', icon: '🎨' },
  { key: 'consulta',label: 'Consul', icon: '🛰️' },
];

// HUD corner brackets
function Corners({ color }: { color: string }) {
  const b: React.CSSProperties = { position: 'absolute', width: 12, height: 12, pointerEvents: 'none' };
  return (
    <>
      <span style={{ ...b, top: -1, left: -1, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ ...b, top: -1, right: -1, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
      <span style={{ ...b, bottom: -1, left: -1, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }} />
      <span style={{ ...b, bottom: -1, right: -1, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }} />
    </>
  );
}

export function MarketTab() {
  const { profile } = useApp();
  const [category, setCategory] = useState<Category>('todos');
  const [services, setServices] = useState<MarketService[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<MarketService | null>(null);
  const [showPublish, setShowPublish] = useState(false);
  const [sortBy, setSortBy] = useState<'confianza' | 'rating'>('confianza');
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [matchQuery, setMatchQuery] = useState('');
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [matchErr, setMatchErr] = useState<string | null>(null);
  const { isPremium } = usePremium();
  const [premiumLock, setPremiumLock] = useState(false);

  const askAdvisor = useCallback(async () => {
    if (!matchQuery.trim() || matchLoading) return;
    if (!isPremium) { setPremiumLock(true); return; }
    setMatchLoading(true); setMatchErr(null); setMatchResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('market-match', { body: { query: matchQuery } });
      const d = data as { recomendacion?: string; error?: string };
      if (error || d?.error || !d?.recomendacion) {
        setMatchErr(await marketServerError(error, data, 'No se pudo consultar el Asesor IA. ¿Está desplegada la función "market-match"?'));
        return;
      }
      setMatchResult(d.recomendacion);
    } catch {
      setMatchErr('Error de conexión con el Asesor IA.');
    } finally {
      setMatchLoading(false);
    }
  }, [matchQuery, matchLoading, isPremium]);

  const loadServices = useCallback(async () => {
    setLoading(true);
    // Embed desacoplado: traemos servicios y luego los vendedores por separado.
    // (Evita el 400 de PostgREST si la relación FK no se detecta por nombre.)
    const { data } = await supabase
      .from('market_services')
      .select('*')
      .eq('is_active', true)
      .order('rating', { ascending: false });
    let fetched = (data as MarketService[]) ?? [];
    if (fetched.length > 0) {
      const ids = [...new Set(fetched.map(s => s.seller_id).filter(Boolean))] as string[];
      if (ids.length) {
        const { data: sellers } = await supabase.from('profiles').select('*').in('id', ids);
        const map = new Map((sellers ?? []).map((p: { id: string }) => [p.id, p]));
        fetched = fetched.map(s => ({
          ...s,
          seller: s.seller_id ? (map.get(s.seller_id) ?? null) : null,
        })) as MarketService[];
      }
    }
    setServices(fetched.length > 0 ? fetched : DEMO_SERVICES);
    setLoading(false);
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  const filtered = services.filter(s => {
    if (category === 'todos') return true;
    const cat = s.category.toLowerCase();
    if (category === 'diseño') return cat === 'diseño' || cat === 'design';
    if (category === 'consulta') return cat === 'consulta' || cat === 'consulting';
    return cat === category;
  });

  const ordered = [...filtered].sort((a, b) => {
    if (sortBy === 'confianza') {
      const ra = a.seller?.reputation_score ?? 0;
      const rb = b.seller?.reputation_score ?? 0;
      if (rb !== ra) return rb - ra;
      return (b.seller?.competencias_validadas ?? 0) - (a.seller?.competencias_validadas ?? 0);
    }
    return b.rating - a.rating;
  });

  function canHire(svc: MarketService) {
    if (!svc.seller_id || !profile) return false;
    if (svc.seller_id === profile.id) return false;
    return true;
  }

  return (
    <div style={styles.root}>
      <div style={styles.grid} />

      {/* Header HUD */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBadge}><Cpu size={16} style={{ color: C.bg }} /></div>
          <div>
            <div style={styles.headerTitle}>MERCADO · CAPITAL INTELECTUAL</div>
            <div style={styles.headerSub}>◢ INDUSTRIA 5.0 // RED ÓMICROM</div>
          </div>
        </div>
        <button style={styles.publishBtn} onClick={() => setShowPublish(true)}>
          <Plus size={14} /> PUBLICAR
        </button>
      </div>

      {/* Categorías */}
      <div style={styles.catRow}>
        {CAT_MAP.map(c => {
          const active = category === c.key;
          return (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{
              ...styles.catPill,
              background: active ? 'rgba(0,240,255,0.16)' : 'rgba(255,255,255,0.02)',
              border: `1px solid ${active ? C.blue : C.lineSoft}`,
              color: active ? C.blueHi : C.muted,
              boxShadow: active ? `0 0 14px rgba(0,240,255,0.35)` : 'none',
            }}>
              {c.icon && <span>{c.icon}</span>}{c.label}
            </button>
          );
        })}
      </div>

      {/* Orden por confianza (sinergia con el Gemelo) */}
      <div style={styles.sortRow}>
        <span style={styles.sortLabel}>ORDENAR POR</span>
        {([['confianza', '🛡️ Confianza'], ['rating', '⭐ Rating']] as const).map(([key, label]) => {
          const on = sortBy === key;
          return (
            <button key={key} onClick={() => setSortBy(key)} style={{
              ...styles.sortPill,
              background: on ? 'rgba(0,240,255,0.16)' : 'transparent',
              border: `1px solid ${on ? C.blue : C.lineSoft}`,
              color: on ? C.blueHi : C.muted,
            }}>{label}</button>
          );
        })}
      </div>

      {/* Lista */}
      <div style={styles.scroll}>
        {/* Asesor IA de Contratación — match empresa↔talento por evidencia */}
        <div style={styles.advisorWrap}>
          <button onClick={() => setAdvisorOpen(o => !o)} style={styles.advisorToggle}>
            <Sparkles size={14} style={{ color: C.amberHi }} />
            <span style={{ flex: 1, textAlign: 'left' }}>ASESOR IA DE CONTRATACIÓN</span>
            <span style={{ color: C.muted }}>{advisorOpen ? '▲' : '▼'}</span>
          </button>
          {advisorOpen && (
            <div style={styles.advisorBody}>
              <p style={styles.advisorHint}>Describe qué necesitas y la IA te recomienda el mejor talento según su evidencia (reputación + competencias validadas por IA).</p>
              <textarea value={matchQuery} onChange={e => setMatchQuery(e.target.value)}
                placeholder="Ej: necesito optimizar una línea de producción con 3% de defectos..."
                style={styles.advisorInput} />
              <button onClick={askAdvisor} disabled={matchLoading || !matchQuery.trim()} style={{
                ...styles.advisorBtn,
                opacity: (matchLoading || !matchQuery.trim()) ? 0.5 : 1,
                cursor: (matchLoading || !matchQuery.trim()) ? 'not-allowed' : 'pointer',
              }}>
                {matchLoading
                  ? <><Loader2 size={14} className="animate-spin" /> Analizando talento...</>
                  : <><Sparkles size={14} /> Recomendar talento</>}
              </button>
              {matchErr && <div style={styles.advisorErr}>{matchErr}</div>}
              {matchResult && (
                <div style={styles.advisorResult}>
                  <div style={styles.advisorResultHead}><ShieldCheck size={13} style={{ color: C.blueHi }} /> RECOMENDACIÓN IA</div>
                  <p style={{ margin: 0, fontFamily: FONT_RAJ, fontSize: 14, color: C.ink, lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{matchResult}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <p style={styles.muted}>// CARGANDO CATÁLOGO...</p>
        ) : ordered.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={30} />}
            title={category !== 'todos' ? 'Nada en esta categoría' : 'Aún no hay servicios'}
            hint={category !== 'todos'
              ? 'Prueba con otra categoría o explora todo el catálogo disponible.'
              : 'Sé el primero en ofrecer tu talento. Publica un servicio y empieza a generar ingresos.'}
            ctaLabel={category !== 'todos' ? 'Ver todo el catálogo' : 'Publicar servicio'}
            onCta={() => (category !== 'todos' ? setCategory('todos') : setShowPublish(true))}
          />
        ) : (
          ordered.map((svc, i) => (
            <ServiceCard key={svc.id} service={svc} index={i} canHire={canHire(svc)} onHire={() => setSelectedService(svc)} />
          ))
        )}
      </div>

      {selectedService && (
        <ContractModal service={selectedService} onClose={() => setSelectedService(null)} />
      )}
      {showPublish && (
        <PublishServiceModal onClose={() => setShowPublish(false)} onPublished={loadServices} />
      )}
      {premiumLock && <PremiumLock feature="El Asesor IA de contratación" onClose={() => setPremiumLock(false)} />}
    </div>
  );
}

function ServiceCard({ service, index, canHire, onHire }: { service: MarketService; index: number; canHire: boolean; onHire: () => void }) {
  const pe = service.seller?.pe_points ?? 0;
  const rep = Math.round(service.seller?.reputation_score ?? 0);
  const val = service.seller?.competencias_validadas ?? 0;
  const repColor = rep >= 70 ? '#39FF14' : rep >= 50 ? C.amber : C.muted;
  const lvl = String(service.seller?.node_level ?? '1').replace(/^N/i, '');
  return (
    <div style={styles.card}>
      <Corners color={C.line} />
      <div style={styles.cardTopBar} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.cardTitle}>{service.title}</div>
          <div style={styles.metaLine}>
            @{service.seller?.username ?? 'vendedor'}{pe > 0 ? ` · ${pe} PE` : ''} · <Star size={10} style={{ fill: C.amber, color: C.amber }} /> {service.rating.toFixed(1)}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={styles.priceTop}>🪙 {service.price}</div>
          <div style={styles.idTagInline}>UNIT-{String(index + 1).padStart(3, '0')}</div>
        </div>
      </div>

      {/* SELLO DE CONFIANZA (compacto) — Gemelo + Actas */}
      {service.seller && (
        <div style={styles.trustSealCompact}>
          <span style={styles.trustChip}><TrendingUp size={11} style={{ color: repColor }} /> <b style={{ color: repColor }}>{rep}</b> rep</span>
          <span style={styles.trustSep}>·</span>
          <span style={styles.trustChip}><ShieldCheck size={11} style={{ color: C.blueHi }} /> <b style={{ color: C.blueHi }}>{val}</b> validadas</span>
          <span style={styles.trustSep}>·</span>
          <span style={{ color: C.muted }}>{service.seller.node_type.replace('Nodo ', '')} N{lvl}</span>
        </div>
      )}

      <button onClick={canHire ? onHire : undefined} disabled={!canHire} style={{
        ...styles.hireBtn,
        background: canHire ? `linear-gradient(135deg, ${C.blue}, #008b9e)` : 'transparent',
        border: `1px solid ${canHire ? C.blue : C.lineSoft}`,
        color: canHire ? '#04121f' : C.muted,
        boxShadow: canHire ? `0 0 18px rgba(0,240,255,0.4)` : 'none',
        cursor: canHire ? 'pointer' : 'default',
      }}>
        {canHire ? '▸ CONTRATAR · ESCROW' : service.seller_id ? 'TU SERVICIO' : 'DEMO'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { position: 'relative', display: 'flex', flexDirection: 'column', height: '100%', background: `radial-gradient(circle at 50% 0%, ${C.bg2}, ${C.bg})`, overflow: 'hidden' },
  grid: { position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${C.lineSoft} 1px, transparent 1px), linear-gradient(90deg, ${C.lineSoft} 1px, transparent 1px)`, backgroundSize: '28px 28px', maskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 70%)', WebkitMaskImage: 'linear-gradient(180deg, rgba(0,0,0,0.5), transparent 70%)' },
  header: { position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(8,11,18,0.7)', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  iconBadge: { width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.blueHi}, ${C.blue})`, boxShadow: `0 0 14px rgba(0,240,255,0.5)` },
  headerTitle: { fontFamily: FONT_MONO, fontSize: 12, color: C.blueHi, letterSpacing: 1.5, fontWeight: 700 },
  headerSub: { fontFamily: FONT_MONO, fontSize: 9, color: C.muted, letterSpacing: 1, marginTop: 2 },
  publishBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 8, background: 'rgba(0,240,255,0.12)', border: `1px solid ${C.blue}`, color: C.blueHi, cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
  catRow: { position: 'relative', zIndex: 2, display: 'flex', gap: 8, padding: '12px 14px', overflowX: 'auto', flexShrink: 0 },
  sortRow: { position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 8, padding: '0 14px 8px', flexShrink: 0 },
  sortLabel: { fontFamily: FONT_MONO, fontSize: 8.5, color: C.muted, letterSpacing: 1.5 },
  sortPill: { display: 'flex', alignItems: 'center', gap: 4, padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 0.5, whiteSpace: 'nowrap' },
  trustSeal: { display: 'flex', alignItems: 'center', gap: 8, margin: '11px 0 2px', padding: '8px 10px', borderRadius: 6, background: 'rgba(0,240,255,0.05)', border: `1px solid ${C.lineSoft}` },
  trustItem: { flex: 1, display: 'flex', flexDirection: 'column', gap: 3, minWidth: 0 },
  trustLabel: { fontFamily: FONT_MONO, fontSize: 7.5, color: C.muted, letterSpacing: 1 },
  trustVal: { display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 16, lineHeight: 1 },
  trustValSmall: { fontFamily: FONT_MONO, fontSize: 10, color: C.ink, lineHeight: 1.2 },
  trustDivider: { width: 1, height: 26, background: C.lineSoft, flexShrink: 0 },
  advisorWrap: { flexShrink: 0, borderRadius: 10, border: `1px solid rgba(245,158,11,0.35)`, background: 'linear-gradient(135deg, rgba(245,158,11,0.08), rgba(2,6,19,0.5))', overflow: 'hidden' },
  advisorToggle: { width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, color: '#ffcf6b', fontWeight: 700 },
  advisorBody: { padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 10 },
  advisorHint: { margin: 0, fontFamily: FONT_MONO, fontSize: 10, color: C.muted, lineHeight: 1.45 },
  advisorInput: { width: '100%', minHeight: 64, boxSizing: 'border-box', padding: 10, borderRadius: 8, background: '#040a18', border: `1px solid ${C.lineSoft}`, color: C.ink, fontFamily: FONT_RAJ, fontSize: 14, lineHeight: 1.4, resize: 'vertical', outline: 'none' },
  advisorBtn: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '11px 0', borderRadius: 8, border: 'none', background: `linear-gradient(135deg, ${C.amberHi}, ${C.amber})`, color: '#04121f', fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 14, letterSpacing: 0.5 },
  advisorErr: { padding: 10, borderRadius: 8, background: 'rgba(255,80,102,0.10)', border: '1px solid rgba(255,80,102,0.3)', fontFamily: FONT_RAJ, fontSize: 12.5, color: '#ffb3bf', lineHeight: 1.4 },
  advisorResult: { padding: 12, borderRadius: 8, background: 'rgba(0,240,255,0.06)', border: `1px solid rgba(0,240,255,0.25)` },
  advisorResultHead: { display: 'flex', alignItems: 'center', gap: 6, fontFamily: FONT_MONO, fontSize: 9, letterSpacing: 1.5, color: C.blueHi, marginBottom: 8 },
  catPill: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, whiteSpace: 'nowrap', transition: 'all .2s', textTransform: 'uppercase' },
  scroll: { position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 10 },
  muted: { fontFamily: FONT_MONO, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  card: { position: 'relative', flexShrink: 0, background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${C.line}`, borderRadius: 10, padding: '13px', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.04)' },
  cardTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.steelHi}, ${C.blue}, transparent)` },
  idTag: { position: 'absolute', top: 12, right: 14, fontFamily: FONT_MONO, fontSize: 8, color: C.muted, letterSpacing: 1, border: `1px solid ${C.lineSoft}`, padding: '2px 6px', borderRadius: 3 },
  cardTitle: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 15, color: C.ink, lineHeight: 1.15, textTransform: 'uppercase', letterSpacing: 0.5 },
  metaLine: { display: 'flex', alignItems: 'center', gap: 5, marginTop: 4, fontFamily: FONT_MONO, fontSize: 10, color: C.muted },
  priceTop: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 19, color: C.amberHi, lineHeight: 1 },
  idTagInline: { fontFamily: FONT_MONO, fontSize: 7.5, color: C.muted, letterSpacing: 1, marginTop: 3 },
  trustSealCompact: { display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 7, margin: '10px 0', padding: '7px 10px', borderRadius: 6, background: 'rgba(0,240,255,0.05)', border: `1px solid ${C.lineSoft}`, fontFamily: FONT_MONO, fontSize: 10.5, color: C.ink },
  trustChip: { display: 'inline-flex', alignItems: 'center', gap: 3 },
  trustSep: { color: 'rgba(255,255,255,0.2)' },
  seller: { fontFamily: FONT_MONO, fontSize: 11, color: C.muted },
  peBadge: { display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: FONT_MONO, fontSize: 9, color: C.blueHi, background: 'rgba(0,240,255,0.10)', border: '1px solid rgba(0,240,255,0.30)', padding: '1px 7px', borderRadius: 3 },
  statRow: { display: 'flex', gap: 10, marginTop: 12 },
  statBox: { flex: 1, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.lineSoft}`, borderRadius: 4, padding: '7px 10px' },
  statLabel: { fontFamily: FONT_MONO, fontSize: 8, color: C.muted, letterSpacing: 1.5 },
  price: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 20, color: C.amberHi, marginTop: 1 },
  rating: { display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 18, color: C.ink, marginTop: 1 },
  tag: { fontFamily: FONT_MONO, fontSize: 10, color: C.blueHi, background: 'rgba(0,240,255,0.08)', border: `1px solid ${C.lineSoft}`, padding: '3px 9px', borderRadius: 3, letterSpacing: 0.5 },
  hireBtn: { width: '100%', marginTop: 10, padding: '9px 0', borderRadius: 5, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 12, letterSpacing: 1.5, transition: 'all .15s' },
};
