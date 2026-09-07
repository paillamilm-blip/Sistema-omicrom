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

import { C, FONT, SIZE, RADIUS, BORDER } from '@/theme';
import { textoEstado, type NodoRed, type RedVivaModel } from '../services/redViva';
import { useCotizacion, useExamenDisponible } from '../hooks/useNodoDetalle';
import { useProbarHabilidad } from '../hooks/useProbarHabilidad';

export interface NodoFichaProps {
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

const ETIQUETA_ESTADO: Record<NodoRed['estado'], string> = {
  solido: 'Probada',
  latiendo: 'Probándola ahora',
  hueco: 'Solo declarada',
  ausente: 'No la tenés',
};

export function NodoFicha({
  nodo,
  model,
  userColor,
  fondoSaldo,
  pruebasDisponibles,
  onExamenAbierto,
  onVerEmpleo,
  onCerrar,
}: NodoFichaProps) {
  const esMercado = nodo.estado === 'ausente';
  const acento = esMercado ? C.gold : userColor;
  const yaProbada = nodo.estado === 'solido';

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
    op.missing.some((m) => m.toLowerCase() === nodo.label.toLowerCase()),
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
      return 'El Fondo de Conocimiento está en 0 por ahora, así que probarla paga 0. Tus puntajes suben igual.';
    }
    if (fondoSaldo === null) {
      return 'No pudimos consultar cuánto paga el Fondo en este momento.';
    }
    return `Probarla paga del Fondo de Conocimiento, que hoy tiene ${fondoSaldo.toLocaleString('es-CL')} tokens.`;
  };

  return (
    <section
      aria-label={`Detalle de ${nodo.label}`}
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
        <span
          aria-hidden="true"
          style={{
            width: 12,
            height: 12,
            marginTop: 4,
            flexShrink: 0,
            borderRadius: '50%',
            background: yaProbada ? acento : 'transparent',
            border: `1.5px ${esMercado ? 'dashed' : 'solid'} ${acento}`,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
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
              fontSize: SIZE.xxs,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: acento,
            }}
          >
            {ETIQUETA_ESTADO[nodo.estado]}
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
              fontSize: SIZE.lg,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 4,
              minWidth: 32,
              minHeight: 32,
            }}
          >
            ✕
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
        {textoEstado(nodo)}
      </p>

      {/* Aviso honesto si no se puede distinguir probado de declarado */}
      {!pruebasDisponibles ? (
        <p
          style={{
            margin: 0,
            fontFamily: FONT.body,
            fontSize: SIZE.xs,
            color: C.mut,
            lineHeight: 1.45,
          }}
        >
          Todavía no podemos confirmar qué habilidades tenés probadas en esta cuenta.
        </p>
      ) : null}

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
              fontSize: SIZE.xxs,
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
              fontSize: SIZE.xxs,
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
                fontSize: SIZE.xxs,
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
    </section>
  );
}
