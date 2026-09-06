// src/features/contratos/components/ContratosTab.tsx
// ═══════════════════════════════════════════════════════════════════════
// MIS CONTRATOS — la puerta que faltaba para que el dinero se mueva.
//
// PROBLEMA QUE RESUELVE (bug crítico encontrado en producción): el comprador
// podía contratar (ContractModal crea el contrato y el trigger
// lock_escrow_on_contract le BLOQUEA los tokens en escrow), pero después NO
// existía ninguna pantalla alcanzable para declarar la entrega ni para liberar
// el pago. El dinero entraba al escrow y no podía salir nunca.
//
// La lógica ya estaba escrita en features/chat/components/ChatTab.tsx, pero ese
// componente NO SE RENDERIZA: en OrbShell, renderTab('chat') devuelve
// RedSocialTab, que no maneja contratos. Era código inalcanzable.
//
// Esta pantalla expone ese flujo con su propio nodo, SIN reimplementar nada del
// manejo de dinero: usa las MISMAS RPC del servidor, que son la única fuente de
// verdad y ya están probadas:
//   • declare_delivery(p_contract_id, p_note)   -> el vendedor entregó
//   • release_escrow(p_contract_id)             -> el comprador aprueba y paga
//   • object_delivery(p_contract_id, p_reason)  -> el comprador objeta -> disputa
//
// El cliente NUNCA escribe token_balance ni token_escrow (está protegido por
// 0007_protect_profile.sql). Acá solo se invocan RPC y se lee.
// ═══════════════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { Briefcase, CheckCircle2, Clock, Coins, Scale, Loader2 } from 'lucide-react';
import { supabase } from '@/infrastructure/supabase/client';
import { C as T, FONT as TF } from '@/theme';
import { useApp } from '@/store/AppContext';
import { useToast } from '@/shared/components/Toast';
import { oc, OmicronHeader } from '@/shared/components/OmicronChrome';
import { commissionQuote } from '@/features/omicron/utils/commissionQuote';

// Paleta DERIVADA del tema (un cambio de tema se propaga solo).
const C = {
  gold: T.gold, green: T.green, red: T.red, blue: T.cyan,
  line: T.line, lineSoft: T.cyanFaint,
  ink: T.ink, mut: T.mut,
} as const;
const FONT = { mono: TF.mono, display: TF.display, body: TF.body } as const;

/** Minutos de Ghost Approval: si el comprador no responde, se libera solo. */
const GHOST_MINUTES = 15;

interface Contrato {
  id: string;
  title: string;
  amount: number;
  buyer_id: string;
  seller_id: string;
  status: string | null;
  delivery_declared_at: string | null;
}

interface Contraparte {
  username: string | null;
  reputation_score: number | null;
  commission_floor_locked_at: string | null;
}

/** Estado en lenguaje humano, sin jerga técnica de base de datos. */
function estadoHumano(status: string | null, soyVendedor: boolean): { texto: string; color: string } {
  switch (status) {
    case 'LOCKED':
      return {
        texto: soyVendedor ? 'El pago está reservado — te toca entregar' : 'Pago reservado — esperando la entrega',
        color: C.gold,
      };
    case 'DELIVERED':
      return {
        texto: soyVendedor ? 'Entregaste — esperando que aprueben' : 'Ya entregó — te toca revisar y aprobar',
        color: C.blue,
      };
    case 'RELEASED':
      return { texto: 'Pago liberado', color: C.green };
    case 'DISPUTED':
      return { texto: 'En disputa', color: C.red };
    case 'REFUNDED':
      return { texto: 'Reembolsado', color: C.mut };
    default:
      return { texto: status ?? 'Sin estado', color: C.mut };
  }
}

export function ContratosTab() {
  const { profile, setActiveTab } = useApp();
  const { toast } = useToast();

  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [partes, setPartes] = useState<Map<string, Contraparte>>(new Map());
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [ahora, setAhora] = useState(Date.now());

  const load = useCallback(async () => {
    if (!profile) return;
    const { data, error } = await supabase
      .from('contracts')
      .select('id,title,amount,buyer_id,seller_id,status,delivery_declared_at')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    if (error) {
      toast('No se pudieron cargar tus contratos: ' + error.message, 'error');
      setLoading(false);
      return;
    }

    const lista = (data as Contrato[]) ?? [];
    setContratos(lista);

    // Se traen reputación y piso ganado de las contrapartes para poder mostrar
    // la comisión REAL antes de liberar (no una tasa supuesta).
    const ids = [...new Set(lista.flatMap(c => [c.buyer_id, c.seller_id]))];
    if (ids.length) {
      const { data: p } = await supabase
        .from('profiles')
        .select('id,username,reputation_score,commission_floor_locked_at')
        .in('id', ids);
      const m = new Map<string, Contraparte>();
      for (const row of (p as ({ id: string } & Contraparte)[]) ?? []) {
        m.set(row.id, {
          username: row.username,
          reputation_score: row.reputation_score,
          commission_floor_locked_at: row.commission_floor_locked_at,
        });
      }
      setPartes(m);
    }
    setLoading(false);
  }, [profile, toast]);

  useEffect(() => { load(); }, [load]);

  // Reloj solo para la cuenta regresiva del Ghost Approval. Se detiene si no
  // hay ninguna entrega esperando aprobación (no gasta batería de gusto).
  const hayEsperando = contratos.some(c => c.status === 'DELIVERED');
  useEffect(() => {
    if (!hayEsperando) return;
    const t = setInterval(() => setAhora(Date.now()), 1000);
    return () => clearInterval(t);
  }, [hayEsperando]);

  function segundosRestantes(c: Contrato): number | null {
    if (c.status !== 'DELIVERED' || !c.delivery_declared_at) return null;
    const fin = new Date(c.delivery_declared_at).getTime() + GHOST_MINUTES * 60000;
    return Math.max(0, Math.floor((fin - ahora) / 1000));
  }

  async function correrRpc(nombre: string, args: Record<string, unknown>, id: string, exito: string) {
    setBusy(id);
    try {
      const { error } = await supabase.rpc(nombre, args);
      if (error) throw error;
      toast(exito, 'success');
      await load();
    } catch (e) {
      toast('No se pudo completar: ' + ((e as Error).message ?? e), 'error');
    } finally {
      setBusy(null);
    }
  }

  function marcarEntregado(c: Contrato) {
    void correrRpc('declare_delivery', { p_contract_id: c.id, p_note: null }, c.id,
      'Marcaste la entrega. Ahora el comprador tiene que aprobar.');
  }

  function liberarPago(c: Contrato) {
    const q = cotizar(c);
    const detalle = q
      ? `El vendedor va a recibir ${q.net} tokens (comisión Ómicrom ${q.ratePct} %: ${q.commission}).`
      : `Se van a liberar ${c.amount} tokens.`;
    if (!window.confirm(`¿Aprobar la entrega y liberar el pago?\n\n${detalle}\n\nEsta acción no se puede deshacer.`)) return;
    void correrRpc('release_escrow', { p_contract_id: c.id }, c.id, 'Pago liberado. El vendedor ya lo tiene.');
  }

  function objetar(c: Contrato) {
    const motivo = window.prompt('¿Qué problema hubo con la entrega?', 'No cumple lo acordado');
    if (motivo === null) return;
    void correrRpc('object_delivery',
      { p_contract_id: c.id, p_reason: motivo || 'Objeción a la entrega' }, c.id,
      'Objeción registrada. El caso pasa a disputa.');
  }

  /** Comisión real del VENDEDOR de este contrato (para mostrar el reparto). */
  function cotizar(c: Contrato) {
    const v = partes.get(c.seller_id);
    if (!v || typeof v.reputation_score !== 'number') return null;
    return commissionQuote(c.amount, v.reputation_score, {
      floorEarned: !!v.commission_floor_locked_at,
    });
  }

  const pendientes = contratos.filter(c => c.status === 'LOCKED' || c.status === 'DELIVERED').length;

  return (
    <div style={oc.root}>
      <OmicronHeader
        onBack={() => setActiveTab('perfil')}
        icon={<Briefcase size={17} />}
        accent={C.gold}
        title="Mis contratos"
        subtitle={
          loading ? 'Cargando…'
            : pendientes > 0
              ? `${pendientes} ${pendientes === 1 ? 'contrato necesita' : 'contratos necesitan'} tu atención`
              : 'Acá se entrega y se libera el pago'
        }
      />

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 32, color: C.mut }}>
          <Loader2 size={20} className="animate-spin" />
        </div>
      )}

      {/* Vacío HONESTO: no se inventan contratos de ejemplo. */}
      {!loading && contratos.length === 0 && (
        <div style={{
          padding: '22px 18px', borderRadius: 14, textAlign: 'center',
          background: 'rgba(255,255,255,0.03)', border: `1px solid ${C.line}`,
        }}>
          <Coins size={22} style={{ color: C.mut, marginBottom: 8 }} />
          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: C.ink }}>
            Todavía no tienes contratos
          </div>
          <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.mut, marginTop: 5, lineHeight: 1.5 }}>
            Cuando contrates un servicio del Mercado, o alguien contrate el tuyo, aparece acá.
            Este es el lugar donde se marca la entrega y se libera el pago.
          </div>
        </div>
      )}

      {!loading && contratos.map(c => {
        const soyVendedor = c.seller_id === profile?.id;
        const otroId = soyVendedor ? c.buyer_id : c.seller_id;
        const otro = partes.get(otroId)?.username ?? 'la contraparte';
        const est = estadoHumano(c.status, soyVendedor);
        const q = cotizar(c);
        const seg = segundosRestantes(c);
        const trabajando = busy === c.id;

        return (
          <div key={c.id} style={{
            padding: '13px 14px', marginBottom: 10, borderRadius: 14,
            background: 'rgba(255,255,255,0.03)',
            border: `1px solid ${est.color}33`, borderLeft: `2px solid ${est.color}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14.5, color: C.ink }}>
                  {c.title}
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.mut, marginTop: 2 }}>
                  {soyVendedor ? `Vendes a @${otro}` : `Contrataste a @${otro}`}
                </div>
              </div>
              <div style={{ fontFamily: FONT.mono, fontSize: 13, color: C.gold, whiteSpace: 'nowrap' }}>
                🪙 {c.amount}
              </div>
            </div>

            <div style={{
              marginTop: 8, fontFamily: FONT.mono, fontSize: 10,
              letterSpacing: 1.1, textTransform: 'uppercase', color: est.color,
            }}>
              {est.texto}
            </div>

            {/* Reparto real del pago: se dice ANTES de liberar, no después. */}
            {q && (c.status === 'LOCKED' || c.status === 'DELIVERED') && (
              <div style={{ marginTop: 6, fontFamily: FONT.body, fontSize: 11.5, color: C.mut, lineHeight: 1.45 }}>
                {soyVendedor
                  ? `Vas a recibir ${q.net} tokens. Comisión Ómicrom ${q.ratePct} % (${q.commission}).`
                  : `@${otro} va a recibir ${q.net} tokens. Comisión Ómicrom ${q.ratePct} % (${q.commission}). A ti no te cuesta nada extra.`}
              </div>
            )}

            {/* Ghost Approval: se avisa que se libera solo, con el tiempo real. */}
            {seg !== null && (
              <div style={{ marginTop: 6, display: 'flex', alignItems: 'center', gap: 5, fontFamily: FONT.body, fontSize: 11.5, color: C.blue }}>
                <Clock size={12} />
                {seg > 0
                  ? `Si nadie responde, el pago se libera solo en ${Math.floor(seg / 60)} min ${seg % 60} s.`
                  : 'El plazo terminó: el pago se libera automáticamente.'}
              </div>
            )}

            {/* ── Acciones, según rol y estado ── */}
            <div style={{ marginTop: 10, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
              {soyVendedor && c.status === 'LOCKED' && (
                <button onClick={() => marcarEntregado(c)} disabled={trabajando} className="oc-pressable" style={{
                  padding: '8px 13px', borderRadius: 10, cursor: trabajando ? 'wait' : 'pointer',
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 12.5,
                  background: C.gold, color: '#1a1206', border: 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                  <CheckCircle2 size={14} /> Marcar como entregado
                </button>
              )}

              {!soyVendedor && c.status === 'DELIVERED' && (
                <>
                  <button onClick={() => liberarPago(c)} disabled={trabajando} className="oc-pressable" style={{
                    padding: '8px 13px', borderRadius: 10, cursor: trabajando ? 'wait' : 'pointer',
                    fontFamily: FONT.display, fontWeight: 700, fontSize: 12.5,
                    background: C.green, color: '#04110a', border: 'none',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <CheckCircle2 size={14} /> Aprobar y liberar el pago
                  </button>
                  <button onClick={() => objetar(c)} disabled={trabajando} className="oc-pressable" style={{
                    padding: '8px 13px', borderRadius: 10, cursor: trabajando ? 'wait' : 'pointer',
                    fontFamily: FONT.display, fontWeight: 700, fontSize: 12.5,
                    background: 'transparent', color: C.red, border: `1px solid ${C.red}66`,
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                  }}>
                    <Scale size={14} /> Hubo un problema
                  </button>
                </>
              )}

              {/* Al vendedor se le dice explícitamente que no puede autoaprobarse. */}
              {soyVendedor && c.status === 'DELIVERED' && (
                <div style={{ fontFamily: FONT.body, fontSize: 11.5, color: C.mut }}>
                  Solo el comprador puede aprobar. Si no responde, se libera solo.
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default ContratosTab;
