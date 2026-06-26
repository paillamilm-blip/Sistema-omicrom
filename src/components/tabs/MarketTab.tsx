import { useState, useEffect, useCallback } from 'react';
import { ShoppingCart, Star, Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { ContractModal } from '../contracts/ContractModal';
import { PublishServiceModal } from '../market/PublishServiceModal';
import type { MarketService } from '../../types';

type Category = 'todos' | 'dev' | 'diseño' | 'consulta';

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

  // Only allow contratar on real services (not demo), or own services
  function canHire(svc: MarketService) {
    if (!svc.seller_id) return false; // demo data
    if (!profile) return false;
    if (svc.seller_id === profile.id) return false; // own service
    return true;
  }


  return (
    <>
      <div className="flex-1 scroll-area bg-omicron-bg pb-4">
        <div className="px-4 pt-5 space-y-4">

          {/* Header + Filters */}
          <div className="bg-omicron-card border border-omicron-border rounded-2xl p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShoppingCart size={16} className="text-omicron-accent" />
                <h2 className="text-omicron-accent text-sm font-bold uppercase tracking-widest">Market</h2>
              </div>
              <button
                onClick={() => setShowPublish(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-omicron-accent/20 border border-omicron-accent/40 text-omicron-accent text-xs font-semibold hover:bg-omicron-accent/30 transition active:scale-95"
              >
                <Plus size={14} />
                Publicar
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {CAT_MAP.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCategory(c.key)}
                  className={`flex-none flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition whitespace-nowrap ${
                    category === c.key
                      ? 'bg-omicron-accent text-white'
                      : 'bg-omicron-surface border border-omicron-border text-omicron-subtle hover:text-omicron-text'
                  }`}
                >
                  {c.icon && <span>{c.icon}</span>}
                  {c.label}
                </button>
              ))}
            </div>
          </div>


          {loading ? (
            <div className="text-center py-8 text-omicron-subtle">Cargando servicios...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-omicron-subtle">No hay servicios en esa categoría.</div>
          ) : (
            filtered.map(svc => (
              <ServiceCard
                key={svc.id}
                service={svc}
                canHire={canHire(svc)}
                onHire={() => setSelectedService(svc)}
              />
            ))
          )}
        </div>
      </div>

      {selectedService && (
        <ContractModal
          service={selectedService}
          onClose={() => setSelectedService(null)}
        />
      )}

      {showPublish && (
        <PublishServiceModal
          onClose={() => setShowPublish(false)}
          onPublished={loadServices}
        />
      )}
    </>
  );
}


function ServiceCard({
  service,
  canHire,
  onHire,
}: {
  service: MarketService;
  canHire: boolean;
  onHire: () => void;
}) {
  const pe = service.seller?.pe_points ?? 0;

  return (
    <div className="bg-omicron-card border border-omicron-border rounded-2xl p-4 card-hover">
      <div className="flex items-start justify-between gap-2 mb-2">
        <h3 className="text-omicron-text font-bold text-base leading-tight">{service.title}</h3>
        <div className="flex flex-col items-end shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-base">🪙</span>
            <span className="text-omicron-gold text-xl font-bold">{service.price}</span>
          </div>
          <div className="flex items-center gap-1 mt-0.5">
            <Star size={12} className="text-yellow-400 fill-yellow-400" />
            <span className="text-yellow-400 text-sm font-semibold">{service.rating.toFixed(1)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-3">
        <span className="text-omicron-subtle text-sm">@{service.seller?.username ?? 'vendedor'}</span>
        {pe > 0 && (
          <span className="pe-badge inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold text-omicron-gold">
            <Star size={10} className="fill-omicron-gold" />
            {pe} PE
          </span>
        )}
      </div>


      {service.tags && service.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {service.tags.map(tag => (
            <span key={tag} className="bg-omicron-surface border border-omicron-border rounded-lg px-2.5 py-1 text-omicron-text text-xs font-medium">
              {tag}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={canHire ? onHire : undefined}
        disabled={!canHire}
        className={`w-full rounded-xl py-3 text-sm font-semibold transition active:scale-95 ${
          canHire
            ? 'bg-omicron-surface border border-omicron-accent/50 hover:bg-omicron-accent/10 text-omicron-accent'
            : 'bg-omicron-surface border border-omicron-border text-omicron-muted cursor-default'
        }`}
      >
        {canHire ? 'Contratar · Escrow' : service.seller_id ? 'Tu servicio' : 'Demo'}
      </button>
    </div>
  );
}
