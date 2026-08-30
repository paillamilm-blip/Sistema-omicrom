// features/omicron/components/CloudSavedBadge.tsx
// ═══════════════════════════════════════════════════════════════════════
// <CloudSavedBadge /> — Indicador discreto "Guardado en tu cuenta".
//
// Tranquiliza al usuario: su perfil vive en su cuenta, no solo en este
// dispositivo. Es puramente informativo (no interactivo) y usa el mismo
// lenguaje visual de acento suave (borde + glow con el color del usuario)
// que AuthOverlay y el resto de la app.
//
// Copy neutro latinoamericano, sin jerga técnica.
// ═══════════════════════════════════════════════════════════════════════

import { Check } from 'lucide-react';
import { useUserColor } from '@/shared/hooks/useUserColor';
import { C, FONT, SIZE, RADIUS } from '@/theme';

/**
 * Pill/chip sutil con un check + el texto "Guardado en tu cuenta".
 * No recibe props: se auto-estiliza con el color de acento del usuario.
 * La visibilidad la controla quien lo renderiza (solo para usuarios
 * autenticados con onboarding confirmado en su cuenta).
 */
export function CloudSavedBadge() {
  const uc = useUserColor();

  return (
    <div
      role="status"
      aria-label="Tu perfil está guardado en tu cuenta"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 11px',
        borderRadius: RADIUS.pill,
        border: `1px solid ${uc}33`,
        background: `${uc}14`,
        boxShadow: `0 0 14px ${uc}22, inset 0 0 10px ${uc}0d`,
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        fontFamily: FONT.mono,
        fontSize: SIZE.xs,
        letterSpacing: 0.4,
        color: C.ink,
        whiteSpace: 'nowrap',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'grid',
          placeItems: 'center',
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: `${uc}26`,
          color: uc,
          flexShrink: 0,
        }}
      >
        <Check size={11} strokeWidth={3} />
      </span>
      Guardado en tu cuenta
    </div>
  );
}
