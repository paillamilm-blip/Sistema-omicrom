import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, Lock, Zap, Wallet, Award, Layers, CreditCard, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { EmptyState } from '../shared/EmptyState';
import { TokenTransferModal } from '../wallet/TokenTransferModal';
import { TokenPurchaseModal } from '../wallet/TokenPurchaseModal';

// Compra de tokens (Stripe): visible por defecto. Solo se oculta si se pone
// VITE_STRIPE_ENABLED="false" a propósito. Así el botón aparece sin depender de
// que la variable se haya horneado en el build (evita el típico "no aparece").
// Si Stripe no está configurado en el backend, el modal muestra un aviso amable.
const STRIPE_ENABLED = import.meta.env.VITE_STRIPE_ENABLED !== 'false';
import { C, FONT } from '../../theme';
import { oc, OmicronHeader, OmicronCard, ProgressBar, Chip } from '../omicron/OmicronChrome';
import type { WalletTransaction } from '../../types';

// ── Niveles de nodo (Bitácora V4: 0-499 / 500-1999 / 2000+) ─────────────────
const NODES = [
  { name: 'Nodo Operativo',  minPE: 0,    maxPE: 499 as number | null,  commission: 15, accent: '#9aa7bd' },
  { name: 'Nodo Core',       minPE: 500,  maxPE: 1999 as number | null, commission: 10, accent: C.cyan },
  { name: 'Nodo Arquitecto', minPE: 2000, maxPE: null as number | null, commission: 5,  accent: C.gold },
];

function getNode(pe: number) {
  if (pe >= 2000) return NODES[2];
  if (pe >= 500)  return NODES[1];
  return NODES[0];
}

// ── Config de visualización de transacciones ────────────────────────────────
const TX_META: Record<WalletTransaction['type'], { label: string; sign: '+' | '−'; color: string; incoming: boolean }> = {
  deposit:        { label: 'Depósito',            sign: '+', color: C.green, incoming: true  },
  escrow_lock:    { label: 'Garantía bloqueada',  sign: '−', color: C.gold,  incoming: false },
  escrow_release: { label: 'Pago recibido',       sign: '+', color: C.green, incoming: true  },
  refund:         { label: 'Reembolso',           sign: '+', color: C.cyan,  incoming: true  },
  commission:     { label: 'Comisión de red',     sign: '−', color: C.red,   incoming: false },
  withdrawal:     { label: 'Retiro',              sign: '−', color: C.gold,  incoming: false },
  purchase:       { label: 'Recarga con tarjeta',  sign: '+', color: C.green, incoming: true  },
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' }) +
    ' · ' + d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
}

export function WalletTab() {
  const { profile, refreshProfile, setActiveTab } = useApp();
  const [txs, setTxs]                   = useState<WalletTransaction[]>([]);
  const [loading, setLoading]           = useState(true);
  const [view, setView]                 = useState<'movimientos' | 'niveles'>('movimientos');
  const [transferMode, setTransferMode] = useState<'send' | 'receive' | null>(null);
  const [showPurchase, setShowPurchase]     = useState(false);
  const [purchaseState, setPurchaseState]   = useState<'idle' | 'verifying' | 'ok' | 'pending'>('idle');
  const [creditedTokens, setCreditedTokens] = useState<number | null>(null);

  const loadTxs = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('wallet_transactions')
      .select('id, user_id, type:transaction_type, amount, balance_after, description, reference_id, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setTxs((data as WalletTransaction[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadTxs(); }, [loadTxs]);

  // Al volver de Stripe (?compra=exito&session_id=...) verificamos el pago
  // DIRECTAMENTE con Stripe y acreditamos los tokens (no dependemos del webhook).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const compra = params.get('compra');
    if (!compra) return;
    const sessionId = params.get('session_id');
    // Limpia la URL sin recargar.
    params.delete('compra');
    params.delete('session_id');
    const clean = window.location.pathname + (params.toString() ? `?${params}` : '');
    window.history.replaceState({}, '', clean);

    if (compra !== 'exito') return;

    let cancelled = false;
    (async () => {
      setPurchaseState('verifying');
      if (sessionId) {
        try {
          const { data, error } = await supabase.functions.invoke('verificar-pago', {
            body: { session_id: sessionId },
          });
          if (!cancelled) {
            if (!error && data?.ok && data?.paid) {
              setCreditedTokens(typeof data.credited === 'number' ? data.credited : null);
              setPurchaseState('ok');
            } else if (!error && data?.ok && data?.pending) {
              setPurchaseState('pending');
            } else {
              // El pago se realizó; si algo falló, el webhook lo acreditará.
              setPurchaseState('ok');
            }
          }
        } catch {
          if (!cancelled) setPurchaseState('ok');
        }
      } else {
        setPurchaseState('ok');
      }
      await refreshProfile();
      await loadTxs();
      // Reintento por si la acreditación tardó unos segundos.
      setTimeout(() => { if (!cancelled) { refreshProfile(); loadTxs(); } }, 4000);
    })();

    const hide = setTimeout(() => { if (!cancelled) setPurchaseState('idle'); }, 14000);
    return () => { cancelled = true; clearTimeout(hide); };
  }, [refreshProfile, loadTxs]);

  async function handleTransferClose() {
    setTransferMode(null);
    await refreshProfile();
    await loadTxs();
  }

  const balance = profile?.token_balance ?? 0;
  const escrow  = profile?.token_escrow  ?? 0;
  const pe      = profile?.pe_points      ?? 0;
  const pioneer = profile?.is_pioneer     ?? false;
  const node    = getNode(pe);

  return (
    <div style={oc.root}>
      <OmicronHeader
        onBack={() => setActiveTab('perfil')}
        icon={<Wallet size={17} />}
        accent={C.gold}
        title="Billetera"
        subtitle={`Nivel ${node.name}`}
      />
      <div style={oc.scroll}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 24 }}>

          {/* ── Tarjeta de saldo (hero) ── */}
          <OmicronCard accent={C.gold} glow className="oc-rise" style={{ padding: 20 }}>
            <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13, color: C.mut }}>
              Tu saldo disponible
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 6 }}>
              <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 46, color: C.ink, letterSpacing: -1.5, lineHeight: 0.95, textShadow: `0 0 26px ${C.gold}44` }}>
                {balance.toLocaleString('es-CL')}
              </span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.gold, marginBottom: 6 }}>Tokens</span>
            </div>
            <div style={{ fontFamily: FONT.body, fontSize: 12.5, color: C.mut, marginTop: 6, lineHeight: 1.4 }}>
              Es tu dinero dentro de Ómicron. <strong style={{ color: C.ink }}>1 Token = $1 peso chileno.</strong>
            </div>

            {/* ── Botón principal: Recargar (comprar con tarjeta) ── */}
            {STRIPE_ENABLED && (
              <button onClick={() => setShowPurchase(true)} className="oc-pressable" style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9,
                marginTop: 16, padding: '15px 0', borderRadius: 16, cursor: 'pointer',
                fontFamily: FONT.display, fontWeight: 800, fontSize: 16,
                background: `linear-gradient(135deg, #ffcb52, ${C.gold})`, border: 'none', color: '#1a1204',
                boxShadow: `0 10px 26px ${C.gold}55`,
              }}>
                <CreditCard size={19} /> Recargar tokens
              </button>
            )}
            {STRIPE_ENABLED && (
              <div style={{ textAlign: 'center', fontFamily: FONT.body, fontSize: 11, color: C.mut, marginTop: 6 }}>
                Compra segura con tarjeta · débito o crédito
              </div>
            )}

            {/* ── Acciones secundarias: enviar / recibir entre usuarios ── */}
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => setTransferMode('send')} className="oc-pressable" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0',
                borderRadius: 14, cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 14,
                background: 'linear-gradient(135deg,#5cc8ff,#5e5ce6)', border: 'none', color: '#fff',
                boxShadow: '0 8px 22px rgba(10,132,255,0.34)',
              }}>
                <ArrowUpRight size={16} /> Enviar
              </button>
              <button onClick={() => setTransferMode('receive')} className="oc-pressable" style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px 0',
                borderRadius: 14, cursor: 'pointer', fontFamily: FONT.display, fontWeight: 700, fontSize: 14,
                background: C.glass2, border: `1px solid ${C.line}`, color: C.ink,
              }}>
                <ArrowDownLeft size={16} style={{ color: C.cyan }} /> Recibir
              </button>
            </div>

            {/* ── Detalles con explicación simple ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 14 }}>
              <div style={{ padding: 12, borderRadius: 14, background: C.glass, border: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Lock size={12} style={{ color: C.gold }} />
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 12.5, color: C.ink }}>En garantía</span>
                </div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 18, color: C.gold, marginTop: 4 }}>
                  {escrow.toLocaleString('es-CL')} T
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 10.5, color: C.mut, marginTop: 2, lineHeight: 1.3 }}>
                  Guardado mientras dura un trabajo
                </div>
              </div>
              <div style={{ padding: 12, borderRadius: 14, background: C.glass, border: `1px solid ${C.line}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Zap size={12} style={{ color: node.accent }} />
                  <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 12.5, color: C.ink }}>Puntos PE</span>
                </div>
                <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 18, color: node.accent, marginTop: 4 }}>
                  {pe.toLocaleString('es-CL')}
                </div>
                <div style={{ fontFamily: FONT.body, fontSize: 10.5, color: C.mut, marginTop: 2, lineHeight: 1.3 }}>
                  Tu experiencia en la red
                </div>
              </div>
            </div>
          </OmicronCard>

          {/* ── Estado de la compra al volver de Stripe ── */}
          {purchaseState === 'verifying' && (
            <OmicronCard accent={C.cyan} glow className="oc-rise" style={{ background: `linear-gradient(135deg, ${C.cyan}1e, ${C.cyan}08)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Loader2 size={20} className="animate-spin" style={{ color: C.cyan, flexShrink: 0 }} />
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: C.ink }}>
                  Verificando tu pago…
                </div>
              </div>
            </OmicronCard>
          )}
          {purchaseState === 'ok' && (
            <OmicronCard accent={C.green} glow className="oc-rise" style={{ background: `linear-gradient(135deg, ${C.green}1e, ${C.green}08)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={22} style={{ color: C.green, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 15, color: C.ink }}>¡Pago confirmado!</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.mut, marginTop: 2 }}>
                    {creditedTokens != null
                      ? `Se acreditaron ${creditedTokens.toLocaleString('es-CL')} tokens a tu saldo.`
                      : 'Tus tokens ya están en tu saldo.'}
                  </div>
                </div>
              </div>
            </OmicronCard>
          )}
          {purchaseState === 'pending' && (
            <OmicronCard accent={C.gold} glow className="oc-rise" style={{ background: `linear-gradient(135deg, ${C.gold}1e, ${C.gold}08)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={20} style={{ color: C.gold, flexShrink: 0 }} />
                <div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 15, color: C.ink }}>Pago en proceso</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.mut, marginTop: 2 }}>
                    Estamos confirmando tu pago. Tu saldo se actualizará en breve.
                  </div>
                </div>
              </div>
            </OmicronCard>
          )}

          {/* ── Banner Pionero ── */}
          {pioneer && (
            <OmicronCard accent={C.gold} glow className="oc-rise" style={{ background: `linear-gradient(135deg, ${C.gold}1e, ${C.gold}08)` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${C.gold}22`, border: `1px solid ${C.gold}55` }}>
                  <Award size={20} style={{ color: C.gold }} />
                </div>
                <div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1.4, textTransform: 'uppercase', color: C.gold }}>Programa Pionero</div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 18, color: C.ink, marginTop: 2 }}>Comisión 10% de por vida</div>
                  <div style={{ fontFamily: FONT.body, fontSize: 12, color: C.mut, marginTop: 2 }}>Beneficio garantizado por ser usuario fundador.</div>
                </div>
              </div>
            </OmicronCard>
          )}

          {/* ── Segmentador de vista ── */}
          <div style={{ display: 'flex', gap: 8, padding: 4, borderRadius: 14, background: C.glass, border: `1px solid ${C.line}` }}>
            {([['movimientos', 'Movimientos'], ['niveles', 'Niveles']] as const).map(([v, label]) => {
              const active = view === v;
              return (
                <button key={v} onClick={() => setView(v)} className="oc-pressable" style={{
                  flex: 1, padding: '9px 0', borderRadius: 10, cursor: 'pointer',
                  fontFamily: FONT.display, fontWeight: 700, fontSize: 13,
                  background: active ? 'linear-gradient(135deg,#5cc8ff,#5e5ce6)' : 'transparent',
                  border: 'none', color: active ? '#fff' : C.mut,
                  boxShadow: active ? '0 6px 16px rgba(10,132,255,0.3)' : 'none',
                }}>{label}</button>
              );
            })}
          </div>

          {/* ── Movimientos ── */}
          {view === 'movimientos' && (
            loading ? (
              <div style={{ textAlign: 'center', padding: '30px 0', fontFamily: FONT.mono, fontSize: 12, color: C.mut }}>Cargando…</div>
            ) : txs.length === 0 ? (
              <EmptyState
                icon={<Clock size={28} />}
                title="Aún no tienes movimientos"
                hint="Aquí verás tus recargas, envíos y pagos. Puedes recargar tokens con el botón dorado de arriba, o ganarlos completando trabajos en el Mercado."
                ctaLabel="Explorar Mercado"
                onCta={() => setActiveTab('market')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {txs.map(tx => {
                  const meta = TX_META[tx.type] ?? { label: tx.type, sign: '', color: C.mut, incoming: true };
                  return (
                    <OmicronCard key={tx.id} className="oc-rise" style={{ padding: 13 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 38, height: 38, borderRadius: 12, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${meta.color}1c`, border: `1px solid ${meta.color}44` }}>
                          {meta.incoming ? <ArrowDownLeft size={17} style={{ color: meta.color }} /> : <ArrowUpRight size={17} style={{ color: meta.color }} />}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 13.5, color: C.ink }}>{meta.label}</div>
                          {tx.description && (
                            <div style={{ fontFamily: FONT.body, fontSize: 11, color: C.mut, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{tx.description}</div>
                          )}
                          <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.mut, marginTop: 1 }}>{formatDate(tx.created_at)}</div>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 15, color: meta.color }}>
                            {meta.sign}{Math.abs(tx.amount).toLocaleString('es-CL')} T
                          </div>
                          {tx.balance_after != null && (
                            <div style={{ fontFamily: FONT.mono, fontSize: 9.5, color: C.mut, marginTop: 1 }}>
                              Saldo: {tx.balance_after.toLocaleString('es-CL')} T
                            </div>
                          )}
                        </div>
                      </div>
                    </OmicronCard>
                  );
                })}
              </div>
            )
          )}

          {/* ── Niveles ── */}
          {view === 'niveles' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {NODES.map(n => {
                const active = node.name === n.name;
                const progress = n.maxPE
                  ? Math.min(((pe - n.minPE) / (n.maxPE - n.minPE)) * 100, 100)
                  : 100;
                return (
                  <OmicronCard key={n.name} accent={active ? n.accent : undefined} className="oc-rise" style={{ opacity: active ? 1 : 0.6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Layers size={16} style={{ color: active ? n.accent : C.mut }} />
                        <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: active ? C.ink : C.mut }}>{n.name}</span>
                        {active && <Chip color={n.accent} filled>ACTUAL</Chip>}
                      </div>
                      <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 14, color: active ? n.accent : C.mut }}>{n.commission}% fee</span>
                    </div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 10, color: C.mut, marginBottom: active && n.maxPE ? 8 : 0 }}>
                      {n.maxPE ? `${n.minPE.toLocaleString()} – ${n.maxPE.toLocaleString()} PE` : `${n.minPE.toLocaleString()}+ PE`}
                    </div>
                    {active && n.maxPE && (
                      <>
                        <ProgressBar pct={progress} color={n.accent} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT.mono, fontSize: 9.5, color: C.mut, marginTop: 6 }}>
                          <span>{pe} PE actuales</span>
                          <span>Siguiente: {(n.maxPE + 1).toLocaleString()} PE</span>
                        </div>
                      </>
                    )}
                  </OmicronCard>
                );
              })}
            </div>
          )}

        </div>
      </div>

      {transferMode && (
        <TokenTransferModal mode={transferMode} onClose={handleTransferClose} />
      )}

      {showPurchase && (
        <TokenPurchaseModal onClose={() => setShowPurchase(false)} />
      )}
    </div>
  );
}
