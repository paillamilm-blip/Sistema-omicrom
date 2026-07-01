// components/shared/Premium.tsx
// Candado Premium: las funciones de IA son parte de Ómicrom Premium (de pago).
// usePremium() lee el flag del perfil; <PremiumLock/> muestra el upsell.

import { X } from 'lucide-react';
import { useApp } from '../../store/AppContext';
import { C, FONT } from '../../theme';

export function usePremium(): { isPremium: boolean } {
  const { profile } = useApp();
  return { isPremium: !!profile?.is_premium };
}

export function PremiumLock({ feature, onClose }: { feature: string; onClose: () => void }) {
  return (
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2,6,19,0.82)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 360, borderRadius: 16, padding: 24, textAlign: 'center', position: 'relative', background: 'linear-gradient(165deg, rgba(30,23,8,0.98), rgba(10,17,32,0.99))', border: `1px solid ${C.gold}66`, boxShadow: `0 0 44px ${C.gold}33` }}>
        <button onClick={onClose} aria-label="Cerrar" style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none', color: C.gold, cursor: 'pointer', display: 'flex' }}><X size={18} /></button>
        <div style={{ fontSize: 40, filter: 'drop-shadow(0 0 10px rgba(245,158,11,0.6))' }}>💎</div>
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: '#ffe6a8', margin: '8px 0 4px' }}>Función Premium</div>
        <p style={{ fontFamily: FONT.body, fontSize: 14, color: '#eadfc4', lineHeight: 1.5, margin: '0 0 4px' }}>
          <b style={{ color: C.gold }}>{feature}</b> es parte de <b>Ómicrom Premium</b>.
        </p>
        <p style={{ fontFamily: FONT.mono, fontSize: 10, color: 'rgba(245,158,11,0.75)', letterSpacing: 0.5, margin: '0 0 20px' }}>
          Potencia tu Gemelo con inteligencia artificial.
        </p>
        <button onClick={onClose}
          style={{ width: '100%', padding: '13px', borderRadius: 10, cursor: 'pointer', background: `linear-gradient(135deg, #ffcf6b, ${C.gold})`, border: 'none', color: '#1a1205', fontFamily: FONT.display, fontWeight: 700, fontSize: 14 }}>
          Quiero Premium
        </button>
        <p style={{ fontFamily: FONT.mono, fontSize: 9, color: 'rgba(245,158,11,0.55)', marginTop: 10, letterSpacing: 0.5 }}>Próximamente · activación de pago</p>
      </div>
    </div>
  );
}
