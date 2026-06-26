import { useState, useEffect, useCallback } from 'react';
import { Gavel, TrendingUp, Users, ShieldAlert, Scale, Check, Lock, Unlock, ShieldCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT, BASE, cx } from '../../theme';
import {
  CyberHeader, CyberCard, CyberButton, SectionLabel,
  StatGrid, StatCard, ScanlineOverlay, CyberToast, Divider, DetailPanel, LoadingScreen,
} from '../shared/CyberComponents';
import { openBlackbox, type BlackboxResult } from '../../lib/secureChat';

interface Contract { id: string; title: string; buyer_id: string; seller_id: string; status: string | null; amount: number; }
interface Dispute { id: string; reason: string; status: string; created_at: string; }
interface Candidate { id: string; username: string; node_type: string; pe_points: number; }
interface Stake { id: string; target_id: string; amount: number; status: string; return_amount: number | null; }
interface ArbCase { id: string; dispute_id: string; verdict: string | null; dispute: { reason: string; status: string } | null; }

const DISPUTE_COLOR: Record<string, string> = { OPENED: C.gold, IN_REVIEW: C.cyan, RESOLVED: C.green, APPEALED: C.red };

export function GobernanzaTab() {
  const { profile, refreshProfile } = useApp();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [arbCases, setArbCases] = useState<ArbCase[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<'dispute' | 'stake' | null>(null);
  const [selContract, setSelContract] = useState<Contract | null>(null);
  const [reason, setReason] = useState('');
  const [selTarget, setSelTarget] = useState<Candidate | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = useCallback(async () => {
    if (!profile) return;
    const [d, c, s, a] = await Promise.all([
      supabase.from('disputes').select('id,reason,status,created_at').or(`plaintiff_id.eq.${profile.id},defendant_id.eq.${profile.id}`).order('created_at', { ascending: false }),
      supabase.from('contracts').select('id,title,buyer_id,seller_id,status,amount').or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`),
      supabase.from('human_venture_stakes').select('id,target_id,amount,status,return_amount').eq('investor_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('arbitration_cases').select('id, dispute_id, verdict, dispute:disputes(reason,status)').contains('arbiters', [profile.id]),
    ]);
    setDisputes((d.data as Dispute[]) ?? []);
    setContracts((c.data as Contract[]) ?? []);
    setStakes((s.data as Stake[]) ?? []);
    setArbCases((a.data as unknown as ArbCase[]) ?? []);
    setLoading(false);
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function openStakeMarket() {
    if (!profile) return;
    const { data } = await supabase.from('profiles').select('id,username,node_type,pe_points').neq('id', profile.id).order('pe_points', { ascending: true }).limit(12);
    setCandidates((data as Candidate[]) ?? []);
    setPanel('stake');
  }

  async function submitDispute() {
    if (!profile || !selContract || !reason.trim() || busy) return;
    setBusy(true);
    const defendant = selContract.buyer_id === profile.id ? selContract.seller_id : selContract.buyer_id;
    const { error } = await supabase.from('disputes').insert({ contract_id: selContract.id, plaintiff_id: profile.id, defendant_id: defendant, reason: reason.trim(), status: 'OPENED' });
    setBusy(false);
    if (error) return notify('Error: ' + error.message);
    setPanel(null); setSelContract(null); setReason('');
    notify('Disputa abierta · 3 árbitros asignados'); load();
  }

  async function submitStake() {
    if (!profile || !selTarget || busy) return;
    const amt = parseInt(amount);
    if (!amt || amt <= 0) return notify('Monto inválido');
    setBusy(true);
    const { error } = await supabase.rpc('create_stake', { p_target_id: selTarget.id, p_amount: amt });
    setBusy(false);
    if (error) return notify('Error: ' + error.message);
    setPanel(null); setSelTarget(null); setAmount('');
    notify(`Invertiste ${amt} T en @${selTarget.username}`);
    await refreshProfile(); load();
  }

  async function claimStake(s: Stake) {
    setBusy(true);
    const { error } = await supabase.rpc('withdraw_stake', { p_stake_id: s.id });
    setBusy(false);
    if (error) return notify('Error: ' + error.message);
    notify('Retorno reclamado (+15%)');
    await refreshProfile(); load();
  }

  async function castVerdict(disputeId: string, verdict: string) {
    setBusy(true);
    const { error } = await supabase.rpc('resolve_dispute', { p_dispute_id: disputeId, p_verdict: verdict });
    setBusy(false);
    if (error) return notify('Error: ' + error.message);
    notify('Veredicto emitido · reputación ajustada'); load();
  }

  if (loading) return <LoadingScreen message="ACCEDIENDO AL TRIBUNAL..." />;

  const activos = disputes.filter(d => d.status !== 'RESOLVED').length;
  const invertido = stakes.filter(s => s.status === 'ACTIVE').reduce((a, s) => a + s.amount, 0);
  const retornos = stakes.filter(s => s.status === 'RETURNED').reduce((a, s) => a + (s.return_amount ?? 0), 0);
  const pendientesArb = arbCases.filter(a => !a.verdict);

  return (
    <div style={BASE.root}>
      <ScanlineOverlay />
      <CyberHeader title="Gobernanza" subtitle="JUSTICIA DESCENTRALIZADA // STAKING" dotColor={C.red} badge={<Scale size={18} style={{ color: C.red }} />} />

      <div style={cx(BASE.scrollArea, { paddingBottom: 20 })}>
        {/* TRIBUNAL */}
        <SectionLabel>Tribunal de Pares</SectionLabel>
        <CyberCard color={C.red} topBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <Gavel size={18} style={{ color: C.red }} />
            <div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe' }}>Arbitraje de Disputas</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.redDim, letterSpacing: 0.5 }}>3 ÁRBITROS ALEATORIOS · EVIDENCIA CIFRADA</div>
            </div>
          </div>
          <StatGrid cols={3} style={{ marginBottom: 12 }}>
            <StatCard label="Disputas activas" value={String(activos)} color={C.gold} />
            <StatCard label="Como árbitro" value={String(pendientesArb.length)} color={C.purple} />
            <StatCard label="Contratos" value={String(contracts.length)} color={C.cyan} />
          </StatGrid>
          <CyberButton variant="danger" onClick={() => contracts.length ? setPanel('dispute') : notify('No tienes contratos para disputar')}>
            <ShieldAlert size={15} /> ABRIR DISPUTA
          </CyberButton>
        </CyberCard>

        {/* CASOS COMO ÁRBITRO */}
        {pendientesArb.length > 0 && (
          <>
            <SectionLabel>Casos como Árbitro ⚖️</SectionLabel>
            {pendientesArb.map(a => (
              <CyberCard key={a.id} color={C.purple} margin="0 14px 10px">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Gavel size={14} style={{ color: C.purple }} />
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.purple }}>CASO ASIGNADO · EMITE TU FALLO</span>
                </div>
                <p style={{ margin: '0 0 10px', fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: '#dbeafe', lineHeight: 1.4 }}>
                  {a.dispute?.reason ?? 'Disputa sin descripción'}
                </p>

                {/* CAJA NEGRA · revisar evidencia cifrada antes del fallo */}
                <BlackboxPanel disputeId={a.dispute_id} />

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <CyberButton variant="primary" onClick={() => castVerdict(a.dispute_id, 'PLAINTIFF_WINS')} disabled={busy} style={{ borderColor: C.greenDim, color: C.green }}>
                    <Check size={14} /> DEMANDANTE
                  </CyberButton>
                  <CyberButton variant="danger" onClick={() => castVerdict(a.dispute_id, 'DEFENDANT_WINS')} disabled={busy}>
                    DEMANDADO
                  </CyberButton>
                </div>
              </CyberCard>
            ))}
          </>
        )}

        {/* MIS DISPUTAS */}
        {disputes.length > 0 && (
          <>
            <SectionLabel>Mis Disputas</SectionLabel>
            {disputes.map(d => (
              <CyberCard key={d.id} color={DISPUTE_COLOR[d.status] ?? C.cyan} margin="0 14px 10px">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: DISPUTE_COLOR[d.status] ?? C.cyan }}>{d.status}</span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>{new Date(d.created_at).toLocaleDateString('es-CL')}</span>
                </div>
                <p style={{ margin: 0, fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: '#dbeafe' }}>{d.reason}</p>
              </CyberCard>
            ))}
          </>
        )}

        <Divider glow margin="14px 16px" />

        {/* STAKING */}
        <SectionLabel>Staking de Talento</SectionLabel>
        <CyberCard color={C.green} topBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <TrendingUp size={18} style={{ color: C.green }} />
            <div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe' }}>Venture Capital Humano</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.greenDim, letterSpacing: 0.5 }}>FINANCIA NODOS · GANA +15% DE RETORNO</div>
            </div>
          </div>
          <StatGrid cols={2} style={{ marginBottom: 12 }}>
            <StatCard label="Invertido" value={`${invertido} T`} color={C.gold} />
            <StatCard label="Retornos" value={`${retornos} T`} color={C.green} />
          </StatGrid>
          <CyberButton variant="primary" onClick={openStakeMarket} style={{ borderColor: C.greenDim, color: C.green }}>
            <Users size={15} /> MERCADO DE STAKING
          </CyberButton>
        </CyberCard>

        {stakes.length > 0 && (
          <>
            <SectionLabel>Mis Inversiones</SectionLabel>
            {stakes.map(s => (
              <CyberCard key={s.id} color={s.status === 'ACTIVE' ? C.green : C.cyanDim} margin="0 14px 10px">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: s.status === 'ACTIVE' ? 10 : 0 }}>
                  <div>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe' }}>🪙 {s.amount}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: s.status === 'ACTIVE' ? C.green : C.cyanDim }}>
                      {s.status === 'ACTIVE' ? 'ACTIVO' : `RETORNADO · ${s.return_amount} T`}
                    </div>
                  </div>
                  {s.status === 'RETURNED' && <Check size={16} style={{ color: C.cyanDim }} />}
                </div>
                {s.status === 'ACTIVE' && (
                  <CyberButton variant="primary" onClick={() => claimStake(s)} disabled={busy} style={{ borderColor: C.goldDim, color: C.gold }}>
                    RECLAMAR {Math.round(s.amount * 1.15)} T
                  </CyberButton>
                )}
              </CyberCard>
            ))}
          </>
        )}
      </div>

      {/* PANEL: ABRIR DISPUTA */}
      {panel === 'dispute' && (
        <DetailPanel title="Abrir Disputa" subtitle="SELECCIONA EL CONTRATO" accentColor={C.red} onClose={() => { setPanel(null); setSelContract(null); setReason(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {contracts.map(c => (
              <button key={c.id} onClick={() => setSelContract(c)} style={cx(
                { textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: C.surface },
                selContract?.id === c.id ? { border: `1px solid ${C.red}` } : { border: `1px solid ${C.cyanFaint}` }
              )}>
                <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#dbeafe' }}>{c.title}</div>
                <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>{c.status ?? 'LOCKED'} · 🪙 {c.amount}</div>
              </button>
            ))}
          </div>
          <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo de la disputa..." rows={3}
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: 'none', resize: 'none', marginBottom: 12 }} />
          <CyberButton variant="danger" onClick={submitDispute} disabled={!selContract || !reason.trim() || busy}>
            {busy ? 'ABRIENDO...' : 'CONFIRMAR DISPUTA'}
          </CyberButton>
        </DetailPanel>
      )}

      {/* PANEL: MERCADO DE STAKING */}
      {panel === 'stake' && (
        <DetailPanel title="Mercado de Staking" subtitle="INVIERTE EN UN NODO" accentColor={C.green} onClose={() => { setPanel(null); setSelTarget(null); setAmount(''); }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: '30vh', overflowY: 'auto' }}>
            {candidates.map(c => (
              <button key={c.id} onClick={() => setSelTarget(c)} style={cx(
                { textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: C.surface, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
                selTarget?.id === c.id ? { border: `1px solid ${C.green}` } : { border: `1px solid ${C.cyanFaint}` }
              )}>
                <div>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#dbeafe' }}>@{c.username}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>{c.node_type}</div>
                </div>
                <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.gold }}>{c.pe_points} PE</span>
              </button>
            ))}
          </div>
          <input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto a invertir (T)"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: 'none', marginBottom: 12 }} />
          <CyberButton variant="primary" onClick={submitStake} disabled={!selTarget || !amount || busy} style={{ borderColor: C.greenDim, color: C.green }}>
            {busy ? 'INVIRTIENDO...' : 'CONFIRMAR INVERSIÓN'}
          </CyberButton>
        </DetailPanel>
      )}

      {toast && <CyberToast variant="cyan">{toast}</CyberToast>}
    </div>
  );
}


// ── Panel de la Caja Negra: quórum 2-de-3 para abrir la evidencia cifrada ──
function BlackboxPanel({ disputeId }: { disputeId: string }) {
  const [res, setRes] = useState<BlackboxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function vote() {
    setLoading(true); setErr(null);
    try { setRes(await openBlackbox(disputeId)); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ border: `1px solid ${C.cyanFaint}`, borderRadius: 8, padding: 12, background: 'rgba(0,0,0,0.25)', marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {res?.unlocked ? <Unlock size={14} style={{ color: C.green }} /> : <Lock size={14} style={{ color: C.gold }} />}
        <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.cyan }}>CAJA NEGRA · QUÓRUM 2-DE-3</span>
      </div>

      {!res?.unlocked && (
        <>
          <p style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 12, color: C.cyanDim, margin: '0 0 8px' }}>
            La evidencia cifrada solo se abre con el voto de la mayoría de árbitros.
            {res && ` Votos: ${res.votes}/${res.threshold}.`}
          </p>
          <button onClick={vote} disabled={loading}
            style={{ width: '100%', padding: '8px', borderRadius: 6, background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, color: C.cyan, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
            {loading ? 'PROCESANDO…' : 'VOTAR PARA ABRIR ▸'}
          </button>
        </>
      )}

      {res?.unlocked && (
        <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <ShieldCheck size={12} style={{ color: res.integrity_ok ? C.green : C.red }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 8, color: res.integrity_ok ? C.green : C.red }}>
              {res.integrity_ok ? 'CADENA ÍNTEGRA · EVIDENCIA VÁLIDA' : 'CADENA ALTERADA · EVIDENCIA COMPROMETIDA'}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 220, overflowY: 'auto' }}>
            {(res.transcript ?? []).map(m => (
              <div key={m.id} style={{ borderLeft: `2px solid ${C.cyanFaint}`, paddingLeft: 8 }}>
                <div style={{ fontFamily: FONT.mono, fontSize: 8, color: C.cyanDim }}>
                  @{m.sender?.username ?? 'nodo'} · {new Date(m.created_at).toLocaleString('es-CL')}
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 13, color: '#dbeafe' }}>{m.content}</div>
              </div>
            ))}
            {(res.transcript ?? []).length === 0 && (
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>SIN MENSAJES EN ESTE CANAL</div>
            )}
          </div>
        </>
      )}

      {err && <p style={{ fontFamily: FONT.mono, fontSize: 9, color: C.red, marginTop: 8 }}>{err}</p>}
    </div>
  );
}
