// features/redviva/components/RedVivaHome.tsx
// LA PANTALLA. Compone la Red Viva completa: el mapa, la jugada y la lista.
//
// ESTRUCTURA (y por qué):
//   1. UNA FRASE      → qué estado tiene tu red, en lenguaje humano.
//   2. EL MAPA        → la vista de conjunto. Se entiende de un vistazo si sos
//                       mayormente hueco (declaré) o mayormente sólido (probé).
//   3. LA JUGADA      → la única acción recomendada. Un producto que te dice
//                       "hacé esto" vale más que uno que te muestra 10 opciones.
//   4. LA LISTA       → el mapa en palabras. Es el camino accesible de verdad
//                       (filas de 44px, foco de teclado); el SVG es el resumen.
//   5. LA FICHA       → al elegir un nodo: cuánto paga probarlo y qué te abre.
//
// El mapa y la lista son EL MISMO objeto con dos representaciones: tocar en
// cualquiera de los dos resalta en ambos. Nada de información escondida.

import { useMemo, useState } from 'react';
import { C, FONT, SIZE, RADIUS, BORDER } from '@/theme';
import { useApp } from '@/store/AppContext';
import { useUserColor } from '@/shared/hooks/useUserColor';
import type { TabId } from '@/types/common';
import { useRedViva } from '../hooks/useRedViva';
import { resumenRed, type EstadoNodo, type NodoRed } from '../services/redViva';
import { RedVivaCanvas } from './RedVivaCanvas';
import { NodoFicha } from './NodoFicha';

const ORDEN_ESTADOS: EstadoNodo[] = ['ausente', 'hueco', 'latiendo', 'solido'];

const TITULO_GRUPO: Record<EstadoNodo, string> = {
  ausente: 'Te falta y lo están pagando',
  hueco: 'Lo declaraste — sin comprobar',
  latiendo: 'Lo estás probando ahora',
  solido: 'Probado',
};

export interface RedVivaHomeProps {
  /** Navega a una sección de la app (se usa para abrir el examen y los empleos). */
  onAbrirTab?: (tab: TabId) => void;
}

export function RedVivaHome({ onAbrirTab }: RedVivaHomeProps) {
  const { profile, gemelo } = useApp();
  const uc = useUserColor();
  const { model, isLoading, fondoSaldo, pruebasDisponibles } = useRedViva();
  const [seleccionado, setSeleccionado] = useState<string | null>(null);

  const reputacion = gemelo?.overallReputation ?? profile?.reputation_score ?? 0;

  const nodoActivo = useMemo(
    () => model.nodos.find((n) => n.id === seleccionado) ?? null,
    [model.nodos, seleccionado],
  );

  /** El nodo de la jugada recomendada, para poder resaltarlo desde la tarjeta. */
  const nodoJugada = useMemo(() => {
    if (!model.jugada) return null;
    const objetivo = model.jugada.skill.toLowerCase();
    return model.nodos.find((n) => n.label.toLowerCase() === objetivo) ?? null;
  }, [model.jugada, model.nodos]);

  const grupos = useMemo(() => {
    return ORDEN_ESTADOS.map((estado) => ({
      estado,
      nodos: model.nodos.filter((n) => n.estado === estado),
    })).filter((g) => g.nodos.length > 0);
  }, [model.nodos]);

  /** Abre el examen REAL de una habilidad (el uuid ya fue verificado). */
  const probar = (nodeId: string, titulo: string) => {
    window.dispatchEvent(
      new CustomEvent('omicron:probar-skill', { detail: { nodeId, titulo } }),
    );
    onAbrirTab?.('maxskill');
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        padding: '4px 2px 20px',
      }}
    >
      {/* ── 1. Una frase ─────────────────────────────────────────────── */}
      <header style={{ textAlign: 'center', padding: '0 8px' }}>
        {!model.vacia ? (
          <p
            style={{
              margin: '0 0 4px',
              fontFamily: FONT.mono,
              fontSize: SIZE.xxs,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: C.mut,
            }}
          >
            {model.totales.probadas}/{model.totales.declaradas} habilidades probadas
          </p>
        ) : null}
        <p
          style={{
            margin: 0,
            fontFamily: FONT.body,
            fontSize: SIZE.sm,
            color: C.ink,
            lineHeight: 1.5,
          }}
        >
          {isLoading ? 'Armando tu red…' : resumenRed(model)}
        </p>
      </header>

      {/* ── 2. El mapa ───────────────────────────────────────────────── */}
      <RedVivaCanvas
        model={model}
        userColor={uc}
        reputacion={reputacion}
        seleccionado={seleccionado}
        onSelect={(n) => setSeleccionado(n.id === seleccionado ? null : n.id)}
      />

      {/* ── 3. La jugada ─────────────────────────────────────────────── */}
      {model.jugada && nodoJugada ? (
        <button
          type="button"
          onClick={() => setSeleccionado(nodoJugada.id)}
          style={{
            display: 'block',
            width: '100%',
            textAlign: 'left',
            padding: '13px 15px',
            borderRadius: RADIUS.lg,
            border: BORDER.gold,
            background: C.goldFaint,
            cursor: 'pointer',
          }}
        >
          <span
            style={{
              display: 'block',
              fontFamily: FONT.mono,
              fontSize: SIZE.xxs,
              letterSpacing: 1,
              textTransform: 'uppercase',
              color: C.gold,
              marginBottom: 5,
            }}
          >
            Tu próxima jugada
          </span>
          <span
            style={{
              display: 'block',
              fontFamily: FONT.display,
              fontSize: SIZE.lg,
              fontWeight: 700,
              color: C.ink,
              marginBottom: 4,
            }}
          >
            Probá {model.jugada.skill}
          </span>
          <span
            style={{
              display: 'block',
              fontFamily: FONT.body,
              fontSize: SIZE.xs,
              color: C.mut,
              lineHeight: 1.45,
            }}
          >
            {model.jugada.isOneStep
              ? `Es lo único que te falta para ${model.jugada.bestJob.job.title}`
              : `La piden en ${model.jugada.mentions} ${model.jugada.mentions === 1 ? 'empleo abierto' : 'empleos abiertos'}`}
            {model.jugada.bestJob.payLabel ? ` — ${model.jugada.bestJob.payLabel}` : ''}
          </span>
        </button>
      ) : null}

      {/* ── 5. La ficha del nodo elegido ─────────────────────────────── */}
      {nodoActivo ? (
        <NodoFicha
          nodo={nodoActivo}
          model={model}
          userColor={uc}
          fondoSaldo={fondoSaldo}
          pruebasDisponibles={pruebasDisponibles}
          onProbar={probar}
          onVerEmpleo={() => onAbrirTab?.('empleos')}
          onCerrar={() => setSeleccionado(null)}
        />
      ) : null}

      {/* ── 4. La lista: el mapa en palabras ─────────────────────────── */}
      {grupos.map((grupo) => (
        <section key={grupo.estado} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h3
            style={{
              margin: 0,
              fontFamily: FONT.mono,
              fontSize: SIZE.xxs,
              letterSpacing: 0.8,
              textTransform: 'uppercase',
              color: grupo.estado === 'ausente' ? C.gold : C.mut,
              fontWeight: 600,
            }}
          >
            {TITULO_GRUPO[grupo.estado]} · {grupo.nodos.length}
          </h3>
          {grupo.nodos.map((n) => (
            <FilaNodo
              key={n.id}
              nodo={n}
              userColor={uc}
              activo={n.id === seleccionado}
              onClick={() => setSeleccionado(n.id === seleccionado ? null : n.id)}
            />
          ))}
        </section>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════
// Fila de la lista — 44px de alto real, tocable y navegable con teclado
// ══════════════════════════════════════════════════════════════════════
function FilaNodo({
  nodo,
  userColor,
  activo,
  onClick,
}: {
  nodo: NodoRed;
  userColor: string;
  activo: boolean;
  onClick: () => void;
}) {
  const esMercado = nodo.estado === 'ausente';
  const acento = esMercado ? C.gold : userColor;

  /** El número que corresponde a este estado, con su escala. Nunca pelado. */
  const cifra = (): string | null => {
    if (nodo.estado === 'solido') {
      return nodo.provenScore === null ? 'probada' : `${nodo.provenScore}/100`;
    }
    if (esMercado) {
      return nodo.unlocks > 0
        ? `abre ${nodo.unlocks}`
        : nodo.demand > 0
          ? `en ${nodo.demand}`
          : null;
    }
    return nodo.declaredPct !== null && nodo.declaredPct > 0
      ? `dice ${nodo.declaredPct}/100`
      : null;
  };

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        minHeight: 44,
        padding: '8px 12px',
        borderRadius: RADIUS.md,
        border: activo ? `1px solid ${acento}` : BORDER.faint,
        background: activo ? C.glass2 : C.glass,
        cursor: 'pointer',
        textAlign: 'left',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 10,
          height: 10,
          flexShrink: 0,
          borderRadius: '50%',
          background: nodo.estado === 'solido' ? acento : 'transparent',
          border: `1.5px ${esMercado ? 'dashed' : 'solid'} ${acento}`,
          opacity: nodo.estado === 'hueco' ? 0.6 : 1,
        }}
      />
      <span
        style={{
          flex: 1,
          minWidth: 0,
          fontFamily: FONT.body,
          fontSize: SIZE.sm,
          color: C.ink,
          fontWeight: nodo.estado === 'solido' ? 600 : 500,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {nodo.label}
      </span>
      {cifra() ? (
        <span
          style={{
            fontFamily: FONT.mono,
            fontSize: SIZE.xxs,
            color: esMercado ? C.gold : C.mut,
            flexShrink: 0,
          }}
        >
          {cifra()}
        </span>
      ) : null}
    </button>
  );
}
