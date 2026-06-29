// components/tabs/MarketTab.tsx
// Mercado — tema "Industria 5.0": acero oscuro, rejilla blueprint, HUD,
// azul eléctrico + ámbar de energía. Look tecnológico/industrial de alto impacto.

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Star, Plus, Zap, Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { EmptyState } from '../shared/EmptyState';
import { ContractModal } from '../contracts/ContractModal';
import { PublishServiceModal } from '../market/PublishServiceModal';
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

const DEMO_SERVICES: MarketService[] = [
  {
    id: 'demo-1', seller_id: null, title: 'Desarrollo App React',
    description: 'Aplicación React completa con PWA', price: 350,
    category: 'dev', tags: ['React', 'PWA'], rating: 4.8, total_reviews: 24,
    is_active: true, created_at: new Date().toISOString(),
    seller: { id: 'demo-s1', username: 'marco_v', full_name: 'Marco V', avatar_url: null, node_type: 'Nodo Core', node_level: 2, token_balance: 0, pe_points: 520, is_pioneer: true, bio: null, skills: null, location: null, created_at: '' },
  },
  {
    id: 'demo-2', seller_id: null, title: 'Diseño UI/UX Completo',
    description: 'Sistema de diseño en Figma completo', price: 180,
    category: 'diseño', tags: ['Figma', 'Sistema'], rating: 4.9, total_reviews: 31,
    is_active: true, created_at: new Date().toISOString(),
    seller: { id: 'demo-s2', username: 'ana_design', full_name: 'Ana Design', avatar_url: null, node_type: 'Nodo Arquitecto', node_level: 1, token_balance: 0, pe_points: 280, is_pioneer: false, bio: null, skills: null, location: null, created_at: '' },
  },
  {
    id: 'demo-3', seller_id: null, title: 'Consultoría Técnica Cloud',
    description: 'Asesoría en arquitectura y AWS', price: 120,
    category: 'consulta', tags: ['AWS', 'Arquitectura'], rating: 4.7, total_reviews: 18,
    is_active: true, created_at: new Date().toISOString(),
    seller: { id: 'demo-s3', username: 'carlos_arch', full_name: 'Carlos Arch', avatar_url: null, node_type: 'Nodo Fundador', node_level: 1, token_balance: 0, pe_points: 890, is_pioneer: true, bio: null, skills: null, location: null, created_at: '' },
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

  const loadServices = useCallback(() => {
    setLoading(true);
    supabase
      .from('market_services')
      .select('*, seller:profiles!market_services_seller_id_fkey(*)')
      .eq('is_active', true)
      .order('rating', { ascending: false })
      .then(({ data }) => {
        const fetched = data as MarketService[] ?? [];
        setServices(fetched.length > 0 ? fetched : DEMO_SERVICES);
        setLoading(false);
      });
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  const filtered = services.filter(s => {
    if (category === 'todos') return true;
    const cat = s.category.toLowerCase();
    if (category === 'diseño') return cat === 'diseño' || cat === 'design';
    if (category === 'consulta') return cat === 'consulta' || cat === 'consulting';
    return cat === category;
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

      {/* Lista */}
      <div style={styles.scroll}>
        {loading ? (
          <p style={styles.muted}>// CARGANDO CATÁLOGO...</p>
        ) : filtered.length === 0 ? (
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
          filtered.map((svc, i) => (
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
    </div>
  );
}

function ServiceCard({ service, index, canHire, onHire }: { service: MarketService; index: number; canHire: boolean; onHire: () => void }) {
  const pe = service.seller?.pe_points ?? 0;
  return (
    <div style={styles.card}>
      <Corners color={C.line} />
      <div style={styles.cardTopBar} />

      {/* ID técnico */}
      <div style={styles.idTag}>UNIT-{String(index + 1).padStart(3, '0')}</div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0, paddingRight: 50 }}>
          <div style={styles.cardTitle}>{service.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 5 }}>
            <span style={styles.seller}>@{service.seller?.username ?? 'vendedor'}</span>
            {pe > 0 && (
              <span style={styles.peBadge}><Zap size={9} style={{ color: C.blueHi }} /> {pe} PE</span>
            )}
          </div>
        </div>
      </div>

      {/* Línea técnica precio/rating */}
      <div style={styles.statRow}>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>COSTO</div>
          <div style={styles.price}>🪙 {service.price}</div>
        </div>
        <div style={styles.statBox}>
          <div style={styles.statLabel}>RATING</div>
          <div style={styles.rating}><Star size={12} style={{ fill: C.amber, color: C.amber }} /> {service.rating.toFixed(1)}</div>
        </div>
      </div>

      {service.tags && service.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          {service.tags.map(tag => (<span key={tag} style={styles.tag}>{tag}</span>))}
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
  catPill: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 1, whiteSpace: 'nowrap', transition: 'all .2s', textTransform: 'uppercase' },
  scroll: { position: 'relative', zIndex: 2, flex: 1, overflowY: 'auto', padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 14 },
  muted: { fontFamily: FONT_MONO, fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 12, letterSpacing: 1 },
  card: { position: 'relative', background: `linear-gradient(145deg, ${C.panelA}, ${C.panelB})`, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: `1px solid ${C.line}`, borderRadius: 10, padding: '16px', overflow: 'hidden', boxShadow: '0 6px 24px rgba(0,0,0,0.55), inset 0 1px 1px rgba(255,255,255,0.04)' },
  cardTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, transparent, ${C.steelHi}, ${C.blue}, transparent)` },
  idTag: { position: 'absolute', top: 12, right: 14, fontFamily: FONT_MONO, fontSize: 8, color: C.muted, letterSpacing: 1, border: `1px solid ${C.lineSoft}`, padding: '2px 6px', borderRadius: 3 },
  cardTitle: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 18, color: C.ink, lineHeight: 1.15, textTransform: 'uppercase', letterSpacing: 0.5 },
  seller: { fontFamily: FONT_MONO, fontSize: 11, color: C.muted },
  peBadge: { display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: FONT_MONO, fontSize: 9, color: C.blueHi, background: 'rgba(0,240,255,0.10)', border: '1px solid rgba(0,240,255,0.30)', padding: '1px 7px', borderRadius: 3 },
  statRow: { display: 'flex', gap: 10, marginTop: 12 },
  statBox: { flex: 1, background: 'rgba(0,0,0,0.25)', border: `1px solid ${C.lineSoft}`, borderRadius: 4, padding: '7px 10px' },
  statLabel: { fontFamily: FONT_MONO, fontSize: 8, color: C.muted, letterSpacing: 1.5 },
  price: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 20, color: C.amberHi, marginTop: 1 },
  rating: { display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 18, color: C.ink, marginTop: 1 },
  tag: { fontFamily: FONT_MONO, fontSize: 10, color: C.blueHi, background: 'rgba(0,240,255,0.08)', border: `1px solid ${C.lineSoft}`, padding: '3px 9px', borderRadius: 3, letterSpacing: 0.5 },
  hireBtn: { width: '100%', marginTop: 6, padding: '12px 0', borderRadius: 5, fontFamily: FONT_MONO, fontWeight: 700, fontSize: 13, letterSpacing: 1.5, transition: 'all .15s' },
};
