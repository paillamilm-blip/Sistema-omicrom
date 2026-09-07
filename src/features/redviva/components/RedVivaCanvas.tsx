// features/redviva/components/RedVivaCanvas.tsx
// EL MAPA. Dibuja la Red Viva en 2D (SVG), donde cada forma ES un dato.
//
// POR QUÉ 2D Y NO EL ORBE 3D:
// En una esfera la mitad de la información está siempre girando por detrás. El
// orbe anterior además (a) dibujaba vértices de un icosaedro que no eran datos,
// (b) ponía las etiquetas en coordenadas Fibonacci DISTINTAS de los puntos
// dibujados — de ahí la sensación de "no se entiende nada" — y (c) recalculaba
// las posiciones al crecer el perfil, así que el mapa se reordenaba solo.
// Acá: etiqueta y nodo comparten UNA coordenada, y el layout es determinista.
//
// GRAMÁTICA DE COLOR (se aprende en un vistazo, sin leyenda):
//   • TU COLOR  → lo tuyo.      Relleno = probado. Contorno = solo declarado.
//   • ÁMBAR     → el mercado.   Lo que pagan y no tenés, y las oportunidades.
// Nada más. Un nodo relleno con tu color es conocimiento demostrado; un contorno
// es una afirmación; un punteado ámbar es plata esperando.
//
// ACCESIBILIDAD: el mapa es la vista de conjunto, pero NO es el único camino.
// La interacción principal vive en la lista de RedVivaHome (filas de 44px, foco
// de teclado). Acá el SVG se anuncia como imagen con su resumen en aria-label.

import { useEffect, useMemo } from 'react';
import { C, FONT, SIZE } from '@/theme';
import type { NodoRed, RedVivaModel } from '../services/redViva';

const CSS_ID = 'omicron-redviva-css';

/** Escala del modelo (círculo unitario) a unidades del viewBox. */
const K = 100;

/**
 * Inyecta las animaciones una sola vez. Respeta prefers-reduced-motion: con
 * movimiento reducido, el latido se congela en su estado visible (no desaparece
 * la información, solo deja de moverse).
 */
function useRedVivaCss(): void {
  useEffect(() => {
    if (document.getElementById(CSS_ID)) return;
    const style = document.createElement('style');
    style.id = CSS_ID;
    style.textContent = `
@keyframes omi-rv-latido {
  0%, 100% { opacity: 0.42; transform: scale(1); }
  50%      { opacity: 0.95; transform: scale(1.14); }
}
@keyframes omi-rv-puente {
  to { stroke-dashoffset: -18; }
}
.omi-rv-latido { animation: omi-rv-latido 2.1s ease-in-out infinite; transform-origin: center; transform-box: fill-box; }
.omi-rv-puente { animation: omi-rv-puente 1.5s linear infinite; }
@media (prefers-reduced-motion: reduce) {
  .omi-rv-latido, .omi-rv-puente { animation: none; }
  .omi-rv-latido { opacity: 0.8; }
}
`;
    document.head.appendChild(style);
  }, []);
}

/** Convierte un hex (#rrggbb) a rgba con el alfa pedido. */
function alpha(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return hex;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

/** Recorta una etiqueta larga sin cortar a la mitad de una palabra corta. */
function corto(text: string, max = 16): string {
  const t = String(text ?? '').trim();
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`;
}

export interface RedVivaCanvasProps {
  model: RedVivaModel;
  /** Color elegido por el usuario para su Gemelo Digital. */
  userColor: string;
  /** Reputación 0-100 que se muestra en el centro. */
  reputacion: number;
  /** id del nodo seleccionado (se resalta y muestra su etiqueta). */
  seleccionado?: string | null;
  onSelect?: (nodo: NodoRed) => void;
  /** Lado del cuadrado en px. El SVG es responsivo dentro de eso. */
  size?: number;
}

export function RedVivaCanvas({
  model,
  userColor,
  reputacion,
  seleccionado,
  onSelect,
  size = 320,
}: RedVivaCanvasProps) {
  useRedVivaCss();

  const uc = userColor;
  const porNodo = useMemo(
    () => new Map(model.nodos.map((n) => [n.id, n])),
    [model.nodos],
  );
  const porOportunidad = useMemo(
    () => new Map(model.oportunidades.map((o) => [`empleo:${o.id}`, o])),
    [model.oportunidades],
  );

  /** La jugada recomendada, para que su etiqueta esté SIEMPRE visible. */
  const jugadaId = model.jugada
    ? model.nodos.find(
        (n) => n.label.toLowerCase() === model.jugada!.skill.toLowerCase(),
      )?.id ?? null
    : null;

  const resumenAria =
    model.totales.declaradas === 0
      ? 'Red vacía: todavía no hay habilidades.'
      : `Red de ${model.totales.declaradas} habilidades: ${model.totales.probadas} probadas, ` +
        `${model.totales.declaradas - model.totales.probadas} solo declaradas` +
        (model.totales.ausentes > 0
          ? `, y ${model.totales.ausentes} que el mercado pide y no tenés.`
          : '.');

  return (
    <div
      style={{
        width: size,
        height: size,
        maxWidth: '100%',
        position: 'relative',
        margin: '0 auto',
      }}
    >
      <svg
        viewBox="-168 -152 336 304"
        width="100%"
        height="100%"
        role="img"
        aria-label={resumenAria}
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <radialGradient id="omi-rv-core">
            <stop offset="0%" stopColor={alpha(uc, 0.55)} />
            <stop offset="70%" stopColor={alpha(uc, 0.14)} />
            <stop offset="100%" stopColor={alpha(uc, 0)} />
          </radialGradient>
          <filter id="omi-rv-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Anillos guía: dan a entender que "adentro" es mejor ────────── */}
        {[36, 66, 92].map((r) => (
          <circle
            key={r}
            cx={0}
            cy={0}
            r={r}
            fill="none"
            stroke={r === 92 ? alpha(C.gold, 0.1) : alpha(uc, 0.07)}
            strokeWidth={0.6}
            strokeDasharray={r === 92 ? '2 4' : undefined}
          />
        ))}

        {/* ── Aristas ────────────────────────────────────────────────────── */}
        <g>
          {model.aristas.map((a, i) => {
            // Radios: del centro (vos) a cada cosa tuya.
            if (a.tipo === 'radio') {
              const n = porNodo.get(a.to);
              if (!n || n.estado === 'ausente') return null;
              return (
                <line
                  key={`r${i}`}
                  x1={0}
                  y1={0}
                  x2={n.x * K}
                  y2={n.y * K}
                  stroke={alpha(uc, n.estado === 'solido' ? 0.22 : 0.09)}
                  strokeWidth={n.estado === 'solido' ? 1 : 0.7}
                  strokeDasharray={a.punteada ? '1.5 3' : undefined}
                />
              );
            }

            // Mercado: dos habilidades que un mismo empleo pide juntas.
            if (a.tipo === 'mercado') {
              const from = porNodo.get(a.from);
              const to = porNodo.get(a.to);
              if (!from || !to) return null;
              return (
                <line
                  key={`m${i}`}
                  x1={from.x * K}
                  y1={from.y * K}
                  x2={to.x * K}
                  y2={to.y * K}
                  stroke={alpha(uc, 0.06)}
                  strokeWidth={0.6}
                />
              );
            }

            // Puente: de la pieza que falta a la plata que desbloquea.
            const from = porNodo.get(a.from);
            const op = porOportunidad.get(a.to);
            if (!from || !op) return null;
            return (
              <line
                key={`p${i}`}
                className="omi-rv-puente"
                x1={from.x * K}
                y1={from.y * K}
                x2={op.x * K}
                y2={op.y * K}
                stroke={alpha(C.gold, 0.34)}
                strokeWidth={0.9}
                strokeDasharray="3 5"
              />
            );
          })}
        </g>

        {/* ── El centro sos vos ──────────────────────────────────────────── */}
        <circle cx={0} cy={0} r={30} fill="url(#omi-rv-core)" />
        <circle cx={0} cy={0} r={17} fill={alpha(uc, 0.1)} stroke={alpha(uc, 0.5)} strokeWidth={1} />
        <text
          x={0}
          y={1.5}
          textAnchor="middle"
          style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: 700, fill: C.ink }}
        >
          {Math.round(reputacion)}
        </text>
        <text
          x={0}
          y={9}
          textAnchor="middle"
          style={{ fontFamily: FONT.mono, fontSize: 6, fill: C.mut, letterSpacing: 0.4 }}
        >
          /100
        </text>

        {/* ── Oportunidades: la plata, en ámbar ──────────────────────────── */}
        {model.oportunidades.map((op) => {
          const x = op.x * K;
          const y = op.y * K;
          const derecha = x >= 0;
          return (
            <g key={op.id}>
              <rect
                x={x - 4}
                y={y - 4}
                width={8}
                height={8}
                transform={`rotate(45 ${x} ${y})`}
                fill={alpha(C.gold, 0.18)}
                stroke={C.gold}
                strokeWidth={1}
              />
              <text
                x={derecha ? x + 8 : x - 8}
                y={y - 1}
                textAnchor={derecha ? 'start' : 'end'}
                style={{ fontFamily: FONT.body, fontSize: 8, fontWeight: 600, fill: C.gold }}
              >
                {corto(op.label, 15)}
              </text>
              {op.payLabel ? (
                <text
                  x={derecha ? x + 8 : x - 8}
                  y={y + 7}
                  textAnchor={derecha ? 'start' : 'end'}
                  style={{ fontFamily: FONT.mono, fontSize: 7, fill: alpha(C.gold, 0.72) }}
                >
                  {corto(op.payLabel, 14)}
                </text>
              ) : null}
            </g>
          );
        })}

        {/* ── Los nodos ──────────────────────────────────────────────────── */}
        {model.nodos.map((n) => {
          const x = n.x * K;
          const y = n.y * K;
          const r = 4.6 + n.r * 5.4;
          const activo = seleccionado === n.id;
          const mostrarEtiqueta = activo || n.id === jugadaId;
          const esMercado = n.estado === 'ausente';
          const base = esMercado ? C.gold : uc;
          const derecha = x >= 0;

          return (
            <g
              key={n.id}
              onClick={() => onSelect?.(n)}
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
            >
              {/* Área de toque generosa e invisible */}
              <circle cx={x} cy={y} r={Math.max(r + 8, 13)} fill="transparent" />

              {activo ? (
                <circle cx={x} cy={y} r={r + 5} fill="none" stroke={alpha(base, 0.5)} strokeWidth={1} />
              ) : null}

              {n.estado === 'solido' ? (
                // PROBADO: relleno, con tu color. Lo único que se ve "macizo".
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={base}
                  stroke={alpha(base, 0.9)}
                  strokeWidth={0.8}
                  filter="url(#omi-rv-glow)"
                />
              ) : n.estado === 'latiendo' ? (
                // EN PRUEBA AHORA: relleno parcial que respira.
                <>
                  <circle cx={x} cy={y} r={r} fill="none" stroke={base} strokeWidth={1.4} />
                  <circle className="omi-rv-latido" cx={x} cy={y} r={r * 0.55} fill={base} />
                </>
              ) : n.estado === 'ausente' ? (
                // LO PIDE EL MERCADO Y NO LO TENÉS: punteado ámbar.
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill={alpha(C.gold, 0.07)}
                  stroke={alpha(C.gold, 0.8)}
                  strokeWidth={1.1}
                  strokeDasharray="2.5 2.5"
                />
              ) : (
                // DECLARADO SIN PROBAR: contorno fino, hueco. Es una afirmación.
                <circle
                  cx={x}
                  cy={y}
                  r={r}
                  fill="none"
                  stroke={alpha(base, 0.46)}
                  strokeWidth={1}
                />
              )}

              {mostrarEtiqueta ? (
                <text
                  x={derecha ? x + r + 4 : x - r - 4}
                  y={y + 3}
                  textAnchor={derecha ? 'start' : 'end'}
                  style={{
                    fontFamily: FONT.body,
                    fontSize: 8.5,
                    fontWeight: 600,
                    fill: esMercado ? C.gold : C.ink,
                    paintOrder: 'stroke',
                    stroke: C.bg,
                    strokeWidth: 2.4,
                    strokeLinejoin: 'round',
                  }}
                >
                  {corto(n.label)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>

      {/* Estado vacío: la pantalla dice qué hacer, no se queda muda. */}
      {model.vacia ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: 24,
            pointerEvents: 'none',
          }}
        >
          <p
            style={{
              fontFamily: FONT.body,
              fontSize: SIZE.sm,
              color: C.mut,
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            Subí tu CV y tus habilidades
            <br />
            aparecen acá.
          </p>
        </div>
      ) : null}
    </div>
  );
}
