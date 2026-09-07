// features/redviva/components/NodoFicha.tsx
// LA FICHA DEL NODO — qué es, cuánto vale probarlo y qué te abre.
//
// Es la pantalla donde el CV deja de ser un documento y se vuelve una tarea con
// plata encima. Se muestra debajo del mapa (no encima) a propósito: mientras leés
// la ficha, seguís viendo el nodo resaltado en la red.
//
// REGLAS QUE CUMPLE:
//   • Cero jerga: se explica QUÉ hacer + POR QUÉ + QUÉ GANÁS.
//   • Todo número con su escala ("88/100", nunca "88").
//   • No promete un examen que el backend no puede dar (ver useExamenDisponible).
//   • Si el Fondo está en 0, lo dice; no muestra una recompensa que no existe.

import { forwardRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';
import { C, EASING, FONT, SIZE, RADIUS, BORDER, TIMING } from '@/theme';
import { normalizeSkill } from '../services/gapEngine';
import { textoEstado, type NodoRed, type RedVivaModel } from '../services/redViva';
import { useCotizacion, useExamenDisponible } from '../hooks/useNodoDetalle';
import { useProbarHabilidad } from '../hooks/useProbarHabilidad';
import { ESTADO_NODO_LABEL, NodoEstadoMarca } from './NodoEstadoMarca';

export interface NodoFichaProps {
  id: string;
  nodo: NodoRed;
  model: RedVivaModel;
  userColor: string;
  /** Saldo del Fondo. null = no se pudo leer (distinto de 0 = vacío). */
  fondoSaldo: number | null;
  /** false = migración 10001 sin aplicar: no se puede saber qué está probado. */
  pruebasDisponibles: boolean;
  /** Se llama cuando el examen ya arrancó, para navegar al simulador. */
  onExamenAbierto?: () => void;
  /** Lleva al detalle del empleo. */
  onVerEmpleo?: (jobId: string) => void;
  onCerrar?: () => void;
}

export const NodoFicha = forwardRef<HTMLElement, NodoFichaProps>(function NodoFicha({
  id,
  nodo,
  model,
  userColor,
  fondoSaldo,
  pruebasDisponibles,
  onExamenAbierto,
  onVerEmpleo,
  onCerrar,
}: NodoFichaProps, ref) {
  const esMercado = nodo.estado === 'ausente';
  const acento = esMercado ? C.gold : userColor;
  const yaProbada = nodo.estado === 'solido';
  const reduceMotion = useReducedMotion();

  // Solo se cotiza lo que todavía no está probado: pedir precio de algo ya
  // cobrado sería ruido.
  const { data: cotizacion } = useCotizacion(nodo.label, !yaProbada);
  // El nodo del catálogo ya no decide SI se puede probar (desde la migración
  // 10002 se puede probar cualquier habilidad). Se sigue consultando solo como
  // respaldo para el caso de que esa migración no esté aplicada.
  const { data: examen } = useExamenDisponible(!yaProbada ? nodo.label : null);
  const { probar, preparando, error: errorExamen } = useProbarHabilidad(onExamenAbierto);

  /** Oportunidades reales que dependen de esta habilidad. */
  const oportunidades = model.oportunidades.filter((op) =>
    op.missing.some((missing) => normalizeSkill(missing) === normalizeSkill(nodo.label)),
  );

  /** El texto de la recompensa, siempre honesto. */
  const textoRecompensa = (): string => {
    if (yaProbada) {
      return nodo.tokensEarned > 0
        ? `Esta habilidad ya te pagó ${nodo.tokensEarned.toLocaleString('es-CL')} tokens del Fondo de Conocimiento.`
        : 'Ya está probada. La recompensa del Fondo se cobra una sola vez por habilidad.';
    }
    // El motivo lo escribe la base de datos (omicron_fund_quote) para que la app
    // no tenga que adivinar la razón.
    if (cotizacion?.ok && cotizacion.motivo) return cotizacion.motivo;
    if (fondoSaldo === 0) {
      return 'El Fondo de Conocimiento tiene 0 tokens por ahora, así que probarla paga 0 tokens. Si aprobás, la prueba queda registrada y puede mejorar tus puntajes según el resultado.';
    }
    if (fondoSaldo === null) {
      return 'No pudimos consultar cuánto paga el Fondo en este momento.';
    }
    return `Probarla paga del Fondo de Conocimiento, que hoy tiene ${fondoSaldo.toLocaleString('es-CL')} tokens.`;
  };

  return (
    <motion.section
      ref={ref}
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && onCerrar) {
          event.preventDefault();
          onCerrar();
        }
      }}
      initial={reduceMotion ? false : { opacity: 0, transform: 'translateY(8px)' }}
      animate={{ opacity: 1, transform: 'translateY(0)' }}
      transition={reduceMotion ? { duration: 0 } : { duration: Number.parseInt(TIMING.exit, 10) / 1000, ease: EASING.standard }}
      style={{
        borderRadius: RADIUS.lg,
        border: BORDER.default,
        background: C.surface,
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        padding: '14px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <NodoEstadoMarca estado={nodo.estado} color={acento} size={18} style={{ marginTop: 2 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            id={`${id}-title`}
            style={{
              margin: 0,
              fontFamily: FONT.display,
              fontSize: SIZE.lg,
              fontWeight: 700,
              color: C.ink,
              lineHeight: 1.25,
            }}
          >
            {nodo.label}
          </h3>
          <p
            style={{
              margin: '3px 0 0',
              fontFamily: FONT.mono,
              fontSize: SIZE.xs,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: acento,
            }}
          >
            {ESTADO_NODO_LABEL[nodo.estado]}
          </p>
        </div>
        {onCerrar ? (
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar detalle"
            style={{
              background: 'transparent',
              border: 'none',
              color: C.mut,
              cursor: 'pointer',
              padding: 0,
              width: 44,
              height: 44,
              display: 'grid',
              placeItems: 'center',
              flexShrink: 0,
            }}
          >
            <X size={20} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {/* ── Qué significa este estado ──────────────────────────────────── */}
      <p
        style={{
          margin: 0,
          fontFamily: FONT.body,
          fontSize: SIZE.sm,
          color: C.ink,
          lineHeight: 1.5,
        }}
      >
        {pruebasDisponibles
          ? textoEstado(nodo)
          : 'Esta habilidad está registrada. No pudimos consultar si ya tiene una prueba en esta cuenta.'}
      </p>

      {/* ── La plata ───────────────────────────────────────────────────── */}
      <div
        style={{
          borderRadius: RADIUS.md,
          background: C.goldFaint,
          border: BORDER.gold,
          padding: '10px 12px',
        }}
      >
        <p
          style={{
            margin: 0,
            fontFamily: FONT.body,
            fontSize: SIZE.sm,
            color: C.ink,
            lineHeight: 1.5,
          }}
        >
          {textoRecompensa()}
        </p>
        {!yaProbada && cotizacion?.ok && (cotizacion.estimado_max ?? 0) > 0 ? (
          <p
            style={{
              margin: '6px 0 0',
              fontFamily: FONT.mono,
              fontSize: SIZE.xs,
              color: C.mut,
            }}
          >
            El Fondo se alimenta del 30 % de cada comisión cobrada en la red.
          </p>
        ) : null}
      </div>

      {/* ── Qué te abre ────────────────────────────────────────────────── */}
      {oportunidades.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <p
            style={{
              margin: 0,
              fontFamily: FONT.mono,
              fontSize: SIZE.xs,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: C.mut,
            }}
          >
            {nodo.unlocks > 0 ? 'Es lo único que te falta para' : 'Te acerca a'}
          </p>
          {oportunidades.map((op) => (
            <button
              key={op.id}
              type="button"
              onClick={() => onVerEmpleo?.(op.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                width: '100%',
                minHeight: 44,
                padding: '9px 11px',
                borderRadius: RADIUS.md,
                border: BORDER.faint,
                background: C.glass,
                cursor: onVerEmpleo ? 'pointer' : 'default',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontFamily: FONT.body,
                  fontSize: SIZE.sm,
                  color: C.ink,
                  fontWeight: 600,
                }}
              >
                {op.label}
              </span>
              <span
                style={{
                  fontFamily: FONT.mono,
                  fontSize: SIZE.xs,
                  color: C.gold,
                  flexShrink: 0,
                }}
              >
                {op.payLabel ?? 'Sin pago informado'}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {/* ── La acción ──────────────────────────────────────────────────────
          Cualquier habilidad se puede probar. Si no existe en el catálogo, el
          examen se prepara en el momento (migración 10002). Antes acá había una
          disculpa: "todavía no hay un examen para esta habilidad". */}
      {!yaProbada ? (
        <>
          <button
            type="button"
            disabled={preparando}
            onClick={() => void probar(nodo.label, examen?.nodeId ?? null)}
            style={{
              width: '100%',
              minHeight: 46,
              padding: '12px 0',
              borderRadius: RADIUS.md,
              border: 'none',
              background: preparando ? C.glass2 : acento,
              color: preparando ? C.mut : C.bg,
              fontFamily: FONT.body,
              fontSize: SIZE.md,
              fontWeight: 700,
              cursor: preparando ? 'progress' : 'pointer',
            }}
          >
            {preparando ? 'Preparando tu examen…' : 'Probarla ahora'}
          </button>
          {errorExamen ? (
            <p
              role="alert"
              style={{
                margin: 0,
                fontFamily: FONT.body,
                fontSize: SIZE.xs,
                color: C.red,
                lineHeight: 1.45,
              }}
            >
              {errorExamen}
            </p>
          ) : (
            <p
              style={{
                margin: 0,
                fontFamily: FONT.body,
                fontSize: SIZE.xs,
                color: C.mut,
                lineHeight: 1.45,
                textAlign: 'center',
              }}
            >
              Un caso práctico de tu área. Si lo aprobás, esta habilidad queda probada.
            </p>
          )}
        </>
      ) : nodo.demand > 0 ? (
        <p
          style={{
            margin: 0,
            fontFamily: FONT.body,
            fontSize: SIZE.xs,
            color: C.mut,
            lineHeight: 1.45,
          }}
        >
          La piden en {nodo.demand} {nodo.demand === 1 ? 'empleo abierto' : 'empleos abiertos'}.
        </p>
      ) : null}
    </motion.section>
  );
});
