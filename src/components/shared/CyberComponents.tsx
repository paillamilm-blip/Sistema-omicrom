// src/components/shared/CyberComponents.tsx
// Sistema Ómicron — Shared Cyberpunk Components · Industrial 5.0
//
// Componentes reutilizables para todos los tabs.
// Todos importan tokens desde '../../theme'.
//
// Exports:
//   <ScanlineOverlay />       — efecto scanline animado (posición absolute)
//   <PulseDot />              — punto pulsante de estado
//   <CyberHeader />           — header estándar de tab con título, subtítulo y badge
//   <PeBar />                 — barra de progreso de PE con porcentaje
//   <CyberCard />             — card genérica con borde de color
//   <StatGrid />              — grid 2×N de stats
//   <StatCard />              — celda individual de stat
//   <SectionLabel />          — etiqueta de sección en monospace
//   <CyberButton />           — botón primario/secundario/danger
//   <NodeBadge />             — badge de tier/categoría (N1/N2/N3, FOUNDATION…)
//   <ProgressBar />           — barra de progreso horizontal
//   <CyberToast />            — toast de notificación (PE ganados, etc.)
//   <LoadingScreen />         — pantalla de carga estándar
//   <DetailPanel />           — panel deslizable de detalle (bottom sheet)
//   <Divider />               — separador horizontal con glow

import { ReactNode, CSSProperties } from 'react';
import { C, FONT, ANIM, RADIUS, BORDER, GLOW, BASE, cx } from '../../theme';

// ─────────────────────────────────────────────────────────────────────────────
// ScanlineOverlay
// Efecto de línea de escaneo animada — va encima de todo el contenido.
// Colocar como primer hijo de un contenedor con position:relative.
// ─────────────────────────────────────────────────────────────────────────────
export function ScanlineOverlay() {
  return (
    <div
      aria-hidden
      style={{
        position:      'absolute',
        top:           0, left: 0, right: 0, bottom: 0,
        pointerEvents: 'none',
        overflow:      'hidden',
        zIndex:        1,
      }}
    >
      <div
        style={{
          position:   'absolute',
          left:       0, top: 0,
          width:      '100%',
          height:     3,
          background: 'linear-gradient(transparent, rgba(0,245,255,0.05), transparent)',
          animation:  ANIM.scanline,
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PulseDot
// ─────────────────────────────────────────────────────────────────────────────
interface PulseDotProps {
  color?: string;
  size?: number;
}
export function PulseDot({ color = C.cyan, size = 8 }: PulseDotProps) {
  return (
    <div
      style={{
        width:        size,
        height:       size,
        borderRadius: '50%',
        background:   color,
        boxShadow:    `0 0 6px ${color}`,
        animation:    ANIM.pulse,
        flexShrink:   0,
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CyberHeader
// Header estándar de tab: dot + título + subtítulo + badge derecho
// ─────────────────────────────────────────────────────────────────────────────
interface CyberHeaderProps {
  title:      string;
  subtitle?:  string;
  badge?:     ReactNode;
  dotColor?:  string;
  style?:     CSSProperties;
}
export function CyberHeader({
  title, subtitle, badge, dotColor = C.cyan, style,
}: CyberHeaderProps) {
  return (
    <div style={cx(BASE.header, style)}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <PulseDot color={dotColor} />
        <div>
          <div style={{
            fontFamily:    FONT.mono,
            fontSize:      12,
            color:         dotColor,
            letterSpacing: 2,
            textTransform: 'uppercase',
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{
              fontFamily:    FONT.mono,
              fontSize:      9,
              color:         'rgba(0,245,255,0.3)',
              letterSpacing: 1.5,
              marginTop:     2,
            }}>
              {subtitle}
            </div>
          )}
        </div>
      </div>
      {badge && (
        <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.gold }}>
          {badge}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PeBar
// Barra de progreso global de PE con etiqueta de porcentaje
// ─────────────────────────────────────────────────────────────────────────────
interface PeBarProps {
  current:  number;
  max:      number;
  label?:   string;
  color?:   string;
  style?:   CSSProperties;
}
export function PeBar({
  current, max, label, color = C.cyan, style,
}: PeBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  return (
    <div style={cx({
      display:      'flex',
      alignItems:   'center',
      gap:          8,
      padding:      '5px 16px',
      flexShrink:   0,
      borderBottom: BORDER.faint,
      position:     'relative',
      zIndex:       2,
    }, style)}>
      <div style={{ flex: 1, height: 2, background: 'rgba(0,245,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{
          height:     '100%',
          width:      `${pct}%`,
          background: color,
          boxShadow:  `0 0 6px ${color}`,
          borderRadius: 2,
          transition: 'width 0.4s ease',
        }} />
      </div>
      <span style={{
        fontFamily:    FONT.mono,
        fontSize:      9,
        color:         'rgba(0,245,255,0.3)',
        letterSpacing: 1,
        whiteSpace:    'nowrap',
      }}>
        {label ?? `${pct}% COMPLETADO`}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CyberCard
// Card genérica con borde de acento y barra superior de color
// ─────────────────────────────────────────────────────────────────────────────
interface CyberCardProps {
  children:    ReactNode;
  color?:      string;
  margin?:     string | number;
  padding?:    string | number;
  style?:      CSSProperties;
  onClick?:    () => void;
  topBar?:     boolean;  // muestra barra superior del color del acento
}
export function CyberCard({
  children, color = C.cyan, margin = '10px 14px 6px',
  padding = '12px 14px', style, onClick, topBar = false,
}: CyberCardProps) {
  return (
    <div
      onClick={onClick}
      style={cx({
        margin,
        padding,
        borderRadius: RADIUS.lg,
        border:       `1px solid ${color}22`,
        background:   `${color}06`,
        position:     'relative',
        overflow:     'hidden',
        cursor:       onClick ? 'pointer' : undefined,
        flexShrink:   0,
        zIndex:       2,
      }, style)}
    >
      {topBar && (
        <div style={{
          position:   'absolute',
          top: 0, left: 0, right: 0,
          height:     1,
          background: `linear-gradient(90deg, transparent, ${color}, transparent)`,
          animation:  ANIM.breathe,
        }} />
      )}
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// StatGrid + StatCard
// ─────────────────────────────────────────────────────────────────────────────
interface StatGridProps {
  children: ReactNode;
  cols?:    2 | 3 | 4;
  style?:   CSSProperties;
}
export function StatGrid({ children, cols = 2, style }: StatGridProps) {
  return (
    <div style={cx({
      display:             'grid',
      gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap:                 8,
    }, style)}>
      {children}
    </div>
  );
}

interface StatCardProps {
  label:    string;
  value:    ReactNode;
  color?:   string;
  style?:   CSSProperties;
}
export function StatCard({ label, value, color = C.cyan, style }: StatCardProps) {
  return (
    <div style={cx(BASE.statCard, style)}>
      <div style={{
        fontFamily:    FONT.mono,
        fontSize:      8,
        color:         'rgba(0,245,255,0.35)',
        letterSpacing: 1,
        marginBottom:  4,
        textTransform: 'uppercase',
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: FONT.display,
        fontWeight: 700,
        fontSize:   15,
        color,
      }}>
        {value}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SectionLabel
// Etiqueta de sección en monospace (ej: "RUTAS DE COMPETENCIA")
// ─────────────────────────────────────────────────────────────────────────────
interface SectionLabelProps {
  children: ReactNode;
  style?:   CSSProperties;
}
export function SectionLabel({ children, style }: SectionLabelProps) {
  return (
    <div style={cx({
      fontFamily:    FONT.mono,
      fontSize:      9,
      color:         'rgba(0,245,255,0.25)',
      letterSpacing: 2,
      textTransform: 'uppercase',
      padding:       '6px 16px 2px',
      flexShrink:    0,
      position:      'relative',
      zIndex:        2,
    }, style)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CyberButton
// ─────────────────────────────────────────────────────────────────────────────
interface CyberButtonProps {
  children:   ReactNode;
  variant?:   'primary' | 'secondary' | 'danger' | 'gold';
  onClick?:   () => void;
  disabled?:  boolean;
  style?:     CSSProperties;
  type?:      'button' | 'submit';
}
export function CyberButton({
  children, variant = 'secondary', onClick, disabled, style, type = 'button',
}: CyberButtonProps) {
  const variantStyle: CSSProperties = (() => {
    switch (variant) {
      case 'primary':
        return BASE.btnSecondary;
      case 'gold':
        return BASE.btnPrimary;
      case 'danger':
        return BASE.btnDanger;
      default:
        return BASE.btnSecondary;
    }
  })();
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={cx(variantStyle, disabled ? { opacity: 0.4, cursor: 'not-allowed' } : {}, style)}
    >
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NodeBadge
// Badge de tier: N1 / N2 / N3 o categoría con color automático
// ─────────────────────────────────────────────────────────────────────────────
const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  N1: { bg: 'rgba(0,245,255,0.1)',   text: C.cyan,   border: C.cyanDim },
  N2: { bg: 'rgba(255,215,0,0.1)',   text: C.gold,   border: C.goldDim },
  N3: { bg: 'rgba(180,79,255,0.1)', text: C.purple, border: C.purpleDim },
  FOUNDATION:     { bg: 'rgba(0,245,255,0.08)',  text: C.cyan,   border: C.cyanDim },
  SPECIALIZATION: { bg: 'rgba(255,215,0,0.08)',  text: C.gold,   border: C.goldDim },
  MAESTRÍA:       { bg: 'rgba(180,79,255,0.08)', text: C.purple, border: C.purpleDim },
  VALIDATED:      { bg: 'rgba(63, 208, 201,0.08)',  text: C.green,  border: C.greenDim },
  LOCKED:         { bg: 'rgba(255,255,255,0.04)', text: 'rgba(255,255,255,0.3)', border: 'rgba(255,255,255,0.1)' },
};

interface NodeBadgeProps {
  label:   string;
  style?:  CSSProperties;
}
export function NodeBadge({ label, style }: NodeBadgeProps) {
  const colors = TIER_COLORS[label.toUpperCase()] ?? TIER_COLORS.FOUNDATION;
  return (
    <span style={cx({
      display:       'inline-flex',
      alignItems:    'center',
      padding:       '2px 8px',
      borderRadius:  RADIUS.pill,
      background:    colors.bg,
      border:        `1px solid ${colors.border}`,
      fontFamily:    FONT.mono,
      fontSize:      9,
      color:         colors.text,
      letterSpacing: 1,
      whiteSpace:    'nowrap',
    }, style)}>
      {label}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ProgressBar
// ─────────────────────────────────────────────────────────────────────────────
interface ProgressBarProps {
  value:    number;  // 0-100
  color?:   string;
  height?:  number;
  style?:   CSSProperties;
  showPct?: boolean;
}
export function ProgressBar({
  value, color = C.cyan, height = 3, style, showPct = false,
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div style={cx({ display: 'flex', alignItems: 'center', gap: 6 }, style)}>
      <div style={{
        flex:         1,
        height,
        background:   'rgba(0,245,255,0.1)',
        borderRadius: 2,
        overflow:     'hidden',
      }}>
        <div style={{
          width:        `${pct}%`,
          height:       '100%',
          background:   `linear-gradient(90deg, ${color}, ${C.purple})`,
          borderRadius: 2,
          transition:   'width 0.3s ease',
        }} />
      </div>
      {showPct && (
        <span style={{ fontFamily: FONT.mono, fontSize: 9, color: 'rgba(0,245,255,0.4)', minWidth: 28 }}>
          {pct}%
        </span>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CyberToast
// Toast de notificación flotante (PE, éxito, error)
// ─────────────────────────────────────────────────────────────────────────────
interface CyberToastProps {
  children: ReactNode;
  variant?: 'gold' | 'cyan' | 'green' | 'red';
  style?:   CSSProperties;
}
export function CyberToast({ children, variant = 'gold', style }: CyberToastProps) {
  const colors = {
    gold:  { bg: C.gold,   text: C.bg, shadow: GLOW.gold },
    cyan:  { bg: C.cyan,   text: C.bg, shadow: GLOW.cyan },
    green: { bg: C.green,  text: C.bg, shadow: GLOW.green },
    red:   { bg: C.red,    text: '#fff', shadow: GLOW.red },
  }[variant];

  return (
    <div style={cx({
      position:        'absolute',
      bottom:          80,
      left:            '50%',
      transform:       'translateX(-50%)',
      display:         'flex',
      alignItems:      'center',
      gap:             8,
      padding:         '10px 18px',
      borderRadius:    RADIUS.xl,
      background:      colors.bg,
      color:           colors.text,
      fontFamily:      FONT.display,
      fontWeight:      700,
      fontSize:        14,
      boxShadow:       colors.shadow,
      whiteSpace:      'nowrap',
      zIndex:          50,
      animation:       ANIM.toastIn,
      letterSpacing:   0.5,
    }, style)}>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// LoadingScreen
// Pantalla de carga estándar para todos los tabs
// ─────────────────────────────────────────────────────────────────────────────
interface LoadingScreenProps {
  message?: string;
}
export function LoadingScreen({ message = 'INICIALIZANDO PROTOCOLO...' }: LoadingScreenProps) {
  return (
    <div style={cx(BASE.root, {
      alignItems:     'center',
      justifyContent: 'center',
      gap:            12,
    })}>
      <div style={{
        width:        44,
        height:       44,
        borderRadius: RADIUS.md,
        background:   'rgba(0,245,255,0.06)',
        border:       '1px solid rgba(0,245,255,0.25)',
        display:      'flex',
        alignItems:   'center',
        justifyContent: 'center',
      }}>
        <div style={{
          width:           20,
          height:          20,
          borderRadius:    '50%',
          border:          `2px solid ${C.cyan}`,
          borderTopColor:  'transparent',
          animation:       ANIM.spin,
        }} />
      </div>
      <p style={{
        fontFamily:    FONT.mono,
        fontSize:      11,
        color:         C.cyanDim,
        letterSpacing: 2,
        textTransform: 'uppercase',
      }}>
        {message}
      </p>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DetailPanel
// Panel de detalle deslizable — bottom sheet genérico
// ─────────────────────────────────────────────────────────────────────────────
interface DetailPanelProps {
  title:       string;
  subtitle?:   string;
  onClose:     () => void;
  children:    ReactNode;
  accentColor?: string;
  style?:      CSSProperties;
}
export function DetailPanel({
  title, subtitle, onClose, children, accentColor = C.cyan, style,
}: DetailPanelProps) {
  return (
    <div style={cx(BASE.detailPanel, style)}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{
            fontFamily: FONT.display,
            fontWeight: 700,
            fontSize:   17,
            color:      accentColor,
          }}>
            {title}
          </div>
          {subtitle && (
            <div style={{
              fontFamily:    FONT.mono,
              fontSize:      9,
              color:         'rgba(0,245,255,0.35)',
              marginTop:     3,
              letterSpacing: 0.5,
            }}>
              {subtitle}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background:  'none',
            border:      'none',
            fontSize:    22,
            color:       'rgba(0,245,255,0.3)',
            cursor:      'pointer',
            lineHeight:  1,
            padding:     0,
          }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Divider
// Separador horizontal con glow opcional
// ─────────────────────────────────────────────────────────────────────────────
interface DividerProps {
  color?:  string;
  margin?: string | number;
  glow?:   boolean;
}
export function Divider({ color = 'rgba(0,245,255,0.1)', margin = '0', glow = false }: DividerProps) {
  return (
    <div style={{
      height:     1,
      margin,
      background: glow
        ? `linear-gradient(90deg, transparent, ${color}, transparent)`
        : color,
    }} />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RetoCard
// Card especial para el Simulador de Rango — reutilizable en cualquier tab
// ─────────────────────────────────────────────────────────────────────────────
interface RetoCardProps {
  title:     string;
  subtitle:  string;
  btnLabel:  string;
  onPress:   () => void;
  icon?:     string;
  style?:    CSSProperties;
}
export function RetoCard({
  title, subtitle, btnLabel, onPress, icon = '⚡', style,
}: RetoCardProps) {
  return (
    <CyberCard color={C.gold} topBar style={style}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ fontSize: 20 }}>{icon}</span>
        <div>
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.gold }}>
            {title}
          </div>
          <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.goldDim, marginTop: 2, letterSpacing: 0.5 }}>
            {subtitle}
          </div>
        </div>
      </div>
      <CyberButton variant="gold" onClick={onPress}>
        {btnLabel}
      </CyberButton>
    </CyberCard>
  );
}
