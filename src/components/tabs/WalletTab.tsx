import { useState, useEffect, useCallback } from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, Lock, Zap, Wallet, Award, Layers } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { EmptyState } from '../shared/EmptyState';
import { TokenTransferModal } from '../wallet/TokenTransferModal';
import { C, FONT } from '../../theme';
import { oc, OmicronHeader, OmicronCard, Stat, ProgressBar, Chip } from '../omicron/OmicronChrome';
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
            <div style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1.6, textTransform: 'uppercase', color: C.mut }}>
              Saldo disponible
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 8 }}>
              <span style={{ fontFamily: FONT.display, fontWeight: 800, fontSize: 46, color: C.ink, letterSpacing: -1.5, lineHeight: 0.95, textShadow: `0 0 26px ${C.gold}44` }}>
                {balance.toLocaleString('es-CL')}
              </span>
              <span style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 20, color: C.gold, marginBottom: 6 }}>T</span>
            </div>
            <div style={{ fontFamily: FONT.mono, fontSize: 11, color: C.mut, marginTop: 4 }}>1 Token = 1 CLP</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 16 }}>
              <Stat label="En garantía" value={`${escrow.toLocaleString('es-CL')} T`} color={C.gold} icon={<Lock size={11} />} />
              <Stat label="Puntos PE" value={pe.toLocaleString('es-CL')} color={node.accent} icon={<Zap size={11} />} />
            </div>

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
          </OmicronCard>

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
                title="Sin movimientos aún"
                hint="Tus transacciones aparecerán aquí. Gana tokens completando contratos o vendiendo en el Mercado."
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
    </div>
  );
}
