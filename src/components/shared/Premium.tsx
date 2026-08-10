// components/shared/Premium.tsx
// Candado Premium: las funciones de IA son parte de Ómicrom Premium (de pago).
// usePremium() lee el flag del perfil; <PremiumLock/> muestra el upsell.

import { useState } from 'react';
import { X, Lock } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

export function usePremium(): { isPremium: boolean } {
  const { profile } = useApp();
  return { isPremium: !!profile?.is_premium };
}

// Candado visual: chip tecnológico "PREMIUM" con glow ámbar para marcar funciones de IA.
export function PremiumBadge({ style }: { style?: React.CSSProperties }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 20,
      background: 'linear-gradient(135deg, rgba(255, 176, 46,0.28), rgba(255, 176, 46,0.08))',
      border: '1px solid rgba(255, 176, 46,0.65)', color: '#ffd27a',
      fontFamily: "'SF Mono', monospace", fontSize: 8.5, letterSpacing: 1, fontWeight: 700,
      boxShadow: '0 0 10px rgba(255, 176, 46,0.35)', whiteSpace: 'nowrap', verticalAlign: 'middle',
      ...style,
    }}>
      <Lock size={9} /> PREMIUM
    </span>
  );
}

export function PremiumLock({ feature, onClose }: { feature: string; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  async function handleUpgrade() {
    setLoading(true);
    try {
      // Importar supabase dinámicamente
      const { supabase } = await import('../../lib/supabase');
      const { data, error } = await supabase.functions.invoke('crear-checkout', {
        body: { tokens: 5000 }, // Pack básico: $5.000 CLP
      });
      if (error || !data?.url) {
        // Si Stripe no está habilitado, mostrar mensaje
        alert(data?.error || 'Pagos aún no habilitados. Próximamente.');
        setLoading(false);
        return;
      }
      // Redirigir a Stripe Checkout
      window.location.href = data.url;
    } catch {
      alert('Error al iniciar el pago. Intenta de nuevo.');
      setLoading(false);
    }
  }

  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2,6,19,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, borderRadius: 16, padding: 24, textAlign: 'center', position: 'relative', background: 'linear-gradient(165deg, rgba(30,23,8,0.98), rgba(10,17,32,0.99))', border: `1px solid ${C.gold}66`, boxShadow: `0 0 44px ${C.gold}33` }}>
        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.gold, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        <div style={{ fontSize: 40, filter: 'drop-shadow(0 0 10px rgba(255, 176, 46,0.6))' }}>💎</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: '#ffe6a8', margin: '8px 0 4px' }}>Función Premium</div>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: '#eadfc4', lineHeight: 1.5, margin: '0 0 4px' }}>
          <b style={{ color: C.gold }}>{feature}</b> requiere créditos Ómicron.
        </p>
        <p style={{ fontFamily: FONT.mono, fontSize: 10, color: 'rgba(255, 176, 46,0.75)', letterSpacing: 0.5, margin: '0 0 20px' }}>
          5.000 tokens = $5.000 CLP · Coach IA ilimitado por 1 día.
        </p>
        <button onClick={handleUpgrade} disabled={loading}
          style={{ width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer', background: `linear-gradient(135deg, #ffd27a, ${C.gold})`, border: 'none', color: '#1a1205', fontFamily: FONT.display, fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Redirigiendo a pago...' : '💎 Comprar tokens'}
        </button>
        <button onClick={onClose}
          style={{ width: '100%', padding: '11px', borderRadius: 10, cursor: 'pointer', background: 'transparent', border: '1px solid rgba(255, 176, 46,0.3)', color: 'rgba(255, 176, 46,0.7)', fontFamily: FONT.mono, fontSize: 11, marginTop: 8 }}>
          Mañana tengo más gratis
        </button>
      </div>
    </div>
  );
}
