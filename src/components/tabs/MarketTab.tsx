// components/tabs/MarketTab.tsx
// Mercado — estilo cyberpunk (variante MaxSkill: estilos inline + paleta propia)

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Star, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { ContractModal } from '../contracts/ContractModal';
import { PublishServiceModal } from '../market/PublishServiceModal';
import type { MarketService } from '../../types';

type Category = 'todos' | 'dev' | 'diseño' | 'consulta';

const C = {
  cyan: '#00f5ff', cyanDim: 'rgba(0,245,255,0.35)', cyanFaint: 'rgba(0,245,255,0.12)',
  gold: '#ffd700', goldDim: 'rgba(255,215,0,0.35)', purple: '#b44fff', green: '#39ff14',
  bg: '#080c14', panel: 'rgba(13,20,33,0.97)', grid: 'rgba(0,245,255,0.04)',
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
  { key: 'consulta',label: 'Consul', icon: '🏳️' },
];

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
    if (!svc.seller_id) return false;
    if (!profile) return false;
    if (svc.seller_id === profile.id) return false;
    return true;
  }

  return (
    <div style={styles.root}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.pulseDot} />
          <div>
            <div style={styles.headerTitle}>MERCADO DE SERVICIOS</div>
            <div style={styles.headerSub}>SISTEMA ÓMICROM // CAPITAL INTELECTUAL</div>
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
              background: active ? 'rgba(0,245,255,0.14)' : 'transparent',
              border: `1px solid ${active ? C.cyan : C.cyanFaint}`,
              color: active ? C.cyan : C.cyanDim,
              boxShadow: active ? `0 0 10px ${C.cyan}33` : 'none',
            }}>
              {c.icon && <span>{c.icon}</span>}{c.label}
            </button>
          );
        })}
      </div>

      {/* Lista */}
      <div style={styles.scroll}>
        {loading ? (
          <p style={styles.muted}>Cargando servicios...</p>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <ShoppingCart size={28} style={{ color: C.cyanDim }} />
            <p style={styles.muted}>No hay servicios en esta categoría.</p>
          </div>
        ) : (
          filtered.map(svc => (
            <ServiceCard key={svc.id} service={svc} canHire={canHire(svc)} onHire={() => setSelectedService(svc)} />
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

function ServiceCard({ service, canHire, onHire }: { service: MarketService; canHire: boolean; onHire: () => void }) {
  const pe = service.seller?.pe_points ?? 0;
  return (
    <div style={styles.card}>
      <div style={styles.cardTopBar} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={styles.cardTitle}>{service.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <span style={styles.seller}>@{service.seller?.username ?? 'vendedor'}</span>
            {pe > 0 && (
              <span style={styles.peBadge}><Star size={9} style={{ fill: C.gold, color: C.gold }} /> {pe} PE</span>
            )}
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={styles.price}>🪙 {service.price}</div>
          <div style={styles.rating}><Star size={11} style={{ fill: C.gold, color: C.gold }} /> {service.rating.toFixed(1)}</div>
        </div>
      </div>

      {service.tags && service.tags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, margin: '10px 0' }}>
          {service.tags.map(tag => (<span key={tag} style={styles.tag}>{tag}</span>))}
        </div>
      )}

      <button onClick={canHire ? onHire : undefined} disabled={!canHire} style={{
        ...styles.hireBtn,
        background: canHire ? 'rgba(0,245,255,0.12)' : 'transparent',
        border: `1px solid ${canHire ? C.cyan : C.cyanFaint}`,
        color: canHire ? C.cyan : C.cyanDim,
        cursor: canHire ? 'pointer' : 'default',
      }}>
        {canHire ? 'CONTRATAR · ESCROW' : service.seller_id ? 'TU SERVICIO' : 'DEMO'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid rgba(0,245,255,0.1)`, background: 'rgba(0,245,255,0.02)', flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  pulseDot: { width: 8, height: 8, borderRadius: '50%', background: C.cyan, boxShadow: `0 0 6px ${C.cyan}`, animation: 'pulse-cp 1.5s ease-in-out infinite' },
  headerTitle: { fontFamily: FONT_MONO, fontSize: 12, color: C.cyan, letterSpacing: 2 },
  headerSub: { fontFamily: FONT_MONO, fontSize: 9, color: C.cyanDim, letterSpacing: 1, marginTop: 2 },
  publishBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(0,245,255,0.1)', border: `1px solid ${C.cyanDim}`, color: C.cyan, cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 10, letterSpacing: 1 },
  catRow: { display: 'flex', gap: 8, padding: '10px 14px', overflowX: 'auto', flexShrink: 0, borderBottom: `1px solid rgba(0,245,255,0.06)` },
  catPill: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 20, cursor: 'pointer', fontFamily: FONT_MONO, fontSize: 11, letterSpacing: 0.5, whiteSpace: 'nowrap', transition: 'all .2s' },
  scroll: { flex: 1, overflowY: 'auto', padding: '12px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  muted: { fontFamily: FONT_MONO, fontSize: 11, color: C.cyanDim, textAlign: 'center', marginTop: 12 },
  card: { position: 'relative', background: C.panel, border: `1px solid ${C.cyanFaint}`, borderRadius: 10, padding: '14px', overflow: 'hidden' },
  cardTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${C.cyan}, transparent)`, opacity: 0.7 },
  cardTitle: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 16, color: '#dbeafe', lineHeight: 1.2 },
  seller: { fontFamily: FONT_MONO, fontSize: 11, color: C.cyanDim },
  peBadge: { display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: FONT_MONO, fontSize: 9, color: C.gold, background: 'rgba(255,215,0,0.1)', border: `1px solid ${C.goldDim}`, padding: '1px 7px', borderRadius: 10 },
  price: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 20, color: C.gold },
  rating: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, fontFamily: FONT_MONO, fontSize: 12, color: C.gold, marginTop: 2 },
  tag: { fontFamily: FONT_MONO, fontSize: 10, color: '#b9d4e6', background: 'rgba(0,245,255,0.05)', border: `1px solid ${C.cyanFaint}`, padding: '3px 9px', borderRadius: 8 },
  hireBtn: { width: '100%', marginTop: 4, padding: '11px 0', borderRadius: 8, fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 14, letterSpacing: 1, transition: 'all .15s' },
};
