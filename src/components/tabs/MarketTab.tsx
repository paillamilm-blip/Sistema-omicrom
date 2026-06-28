// components/tabs/MarketTab.tsx
// Mercado — tema "Energía Limpia": fondo blanco, azul eléctrico, futurista.

import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Star, Plus, Zap } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { ContractModal } from '../contracts/ContractModal';
import { PublishServiceModal } from '../market/PublishServiceModal';
import type { MarketService } from '../../types';

type Category = 'todos' | 'dev' | 'diseño' | 'consulta';

// ── Paleta "Energía Limpia" ──────────────────────────────────────────
const C = {
  bg: '#f4f8ff', surface: '#ffffff',
  blue: '#0062ff', blueBright: '#00aaff',
  blueSoft: 'rgba(0,98,255,0.10)', blueLine: 'rgba(0,98,255,0.18)',
  teal: '#06d6a0', gold: '#f5a623',
  ink: '#0a1f44', muted: '#5b6b8c',
  glow: '0 8px 24px rgba(0,98,255,0.12)',
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
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.headerLeft}>
          <div style={styles.iconBadge}><Zap size={15} style={{ color: '#fff' }} /></div>
          <div>
            <div style={styles.headerTitle}>MERCADO DE SERVICIOS</div>
            <div style={styles.headerSub}>Capital intelectual · energía limpia</div>
          </div>
        </div>
        <button style={styles.publishBtn} onClick={() => setShowPublish(true)}>
          <Plus size={14} /> Publicar
        </button>
      </div>

      {/* Categorías */}
      <div style={styles.catRow}>
        {CAT_MAP.map(c => {
          const active = category === c.key;
          return (
            <button key={c.key} onClick={() => setCategory(c.key)} style={{
              ...styles.catPill,
              background: active ? C.blue : C.surface,
              border: `1px solid ${active ? C.blue : C.blueLine}`,
              color: active ? '#fff' : C.muted,
              boxShadow: active ? '0 4px 14px rgba(0,98,255,0.35)' : 'none',
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
            <ShoppingCart size={28} style={{ color: C.blueLine }} />
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
              <span style={styles.peBadge}><Zap size={9} style={{ color: C.teal }} /> {pe} PE</span>
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
        background: canHire ? C.blue : C.surface,
        border: `1px solid ${canHire ? C.blue : C.blueLine}`,
        color: canHire ? '#fff' : C.muted,
        boxShadow: canHire ? '0 4px 14px rgba(0,98,255,0.30)' : 'none',
        cursor: canHire ? 'pointer' : 'default',
      }}>
        {canHire ? 'CONTRATAR · ESCROW' : service.seller_id ? 'TU SERVICIO' : 'DEMO'}
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  root: { display: 'flex', flexDirection: 'column', height: '100%', background: C.bg, overflow: 'hidden' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', borderBottom: `1px solid ${C.blueLine}`, background: C.surface, flexShrink: 0 },
  headerLeft: { display: 'flex', alignItems: 'center', gap: 10 },
  iconBadge: { width: 30, height: 30, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `linear-gradient(135deg, ${C.blue}, ${C.blueBright})`, boxShadow: '0 4px 12px rgba(0,98,255,0.35)' },
  headerTitle: { fontFamily: FONT_MONO, fontSize: 12, color: C.ink, letterSpacing: 1.5, fontWeight: 700 },
  headerSub: { fontFamily: FONT_RAJ, fontSize: 11, color: C.muted, marginTop: 1 },
  publishBtn: { display: 'flex', alignItems: 'center', gap: 5, padding: '7px 13px', borderRadius: 9, background: C.blue, border: 'none', color: '#fff', cursor: 'pointer', fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 13, boxShadow: '0 4px 14px rgba(0,98,255,0.35)' },
  catRow: { display: 'flex', gap: 8, padding: '12px 14px', overflowX: 'auto', flexShrink: 0, background: C.bg },
  catPill: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, padding: '8px 16px', borderRadius: 22, cursor: 'pointer', fontFamily: FONT_RAJ, fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', transition: 'all .2s' },
  scroll: { flex: 1, overflowY: 'auto', padding: '4px 14px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  muted: { fontFamily: FONT_RAJ, fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 12 },
  card: { position: 'relative', background: C.surface, border: `1px solid ${C.blueLine}`, borderRadius: 16, padding: '16px', overflow: 'hidden', boxShadow: C.glow },
  cardTopBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.blue}, ${C.blueBright}, ${C.teal})` },
  cardTitle: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 17, color: C.ink, lineHeight: 1.2 },
  seller: { fontFamily: FONT_MONO, fontSize: 11, color: C.muted },
  peBadge: { display: 'inline-flex', alignItems: 'center', gap: 3, fontFamily: FONT_MONO, fontSize: 9, color: C.teal, background: 'rgba(6,214,160,0.10)', border: '1px solid rgba(6,214,160,0.30)', padding: '1px 7px', borderRadius: 10 },
  price: { fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 21, color: C.blue },
  rating: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 3, fontFamily: FONT_MONO, fontSize: 12, color: C.gold, marginTop: 2 },
  tag: { fontFamily: FONT_RAJ, fontWeight: 600, fontSize: 12, color: C.blue, background: C.blueSoft, border: `1px solid ${C.blueLine}`, padding: '3px 10px', borderRadius: 8 },
  hireBtn: { width: '100%', marginTop: 4, padding: '12px 0', borderRadius: 10, fontFamily: FONT_RAJ, fontWeight: 700, fontSize: 14, letterSpacing: 0.5, transition: 'all .15s' },
};
