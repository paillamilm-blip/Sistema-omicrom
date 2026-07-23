import { useState, useEffect, useCallback } from 'react';
import { Gavel, TrendingUp, Users, ShieldAlert, Scale, Check, Lock, Unlock, ShieldCheck, Sparkles, Loader2, AlertTriangle, ThumbsUp, ThumbsDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT, BASE, cx } from '../../theme';
import {
  CyberCard, CyberButton, SectionLabel,
  StatGrid, StatCard, ScanlineOverlay, CyberToast, Divider, DetailPanel, LoadingScreen,
} from '../shared/CyberComponents';
import { oc, OmicronHeader } from '../omicron/OmicronChrome';
import { openBlackbox, type BlackboxResult } from '../../lib/secureChat';
import { usePremium, PremiumLock, PremiumBadge } from '../shared/Premium';

interface Contract { id: string; title: string; buyer_id: string; seller_id: string; status: string | null; amount: number; }
interface Dispute { id: string; reason: string; status: string; created_at: string; resolved_at?: string; appeal_status?: string; appeal_opened_at?: string; appeal_arbiters?: string[]; appeal_resolution?: string; plaintiff_id?: string; defendant_id?: string; }
interface Candidate { id: string; username: string; node_type: string; pe_points: number; }
interface Stake { id: string; target_id: string; amount: number; status: string; return_amount: number | null; }
interface ArbCase { id: string; dispute_id: string; verdict: string | null; dispute: { reason: string; status: string } | null; }
interface AppealVote { dispute_id: string; arbiter_id: string; verdict: string; created_at: string; }

const DISPUTE_COLOR: Record<string, string> = { OPENED: C.gold, IN_REVIEW: C.cyan, RESOLVED: C.green, APPEALED: C.red };

export function GobernanzaTab() {
  const { profile, refreshProfile, setActiveTab } = useApp();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [stakes, setStakes] = useState<Stake[]>([]);
  const [arbCases, setArbCases] = useState<ArbCase[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [appealVotes, setAppealVotes] = useState<AppealVote[]>([]);
  const [isSeniorArbiter, setIsSeniorArbiter] = useState(false);
  const [loading, setLoading] = useState(true);
  const [panel, setPanel] = useState<'dispute' | 'stake' | 'appeal' | null>(null);
  const [selContract, setSelContract] = useState<Contract | null>(null);
  const [selDispute, setSelDispute] = useState<Dispute | null>(null);
  const [appealDeposit, setAppealDeposit] = useState('50');
  const [reason, setReason] = useState('');
  const [selTarget, setSelTarget] = useState<Candidate | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const notify = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2600); };

  const load = useCallback(async () => {
    if (!profile) return;
    const [d, c, s, a] = await Promise.all([
      supabase.from('disputes').select('id,reason,status,created_at,resolved_at,appeal_status,appeal_opened_at,appeal_arbiters,appeal_resolution,plaintiff_id,defendant_id').or(`plaintiff_id.eq.${profile.id},defendant_id.eq.${profile.id}`).order('created_at', { ascending: false }),
      supabase.from('contracts').select('id,title,buyer_id,seller_id,status,amount').or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`),
      supabase.from('human_venture_stakes').select('id,target_id,amount,status,return_amount').eq('investor_id', profile.id).order('created_at', { ascending: false }),
      supabase.from('arbitration_cases').select('id, dispute_id, verdict').contains('arbiters', [profile.id]),
    ]);
    setDisputes((d.data as Dispute[]) ?? []);
    setContracts((c.data as Contract[]) ?? []);
    setStakes((s.data as Stake[]) ?? []);

    // Embed desacoplado: traemos las disputas de los casos por separado
    // (evita el 500 del embed dispute:disputes(...) por relación/RLS).
    const rawCases = (a.data as { id: string; dispute_id: string; verdict: string | null }[]) ?? [];
    let cases: ArbCase[] = rawCases.map(x => ({ ...x, dispute: null }));
    const dIds = [...new Set(rawCases.map(x => x.dispute_id).filter(Boolean))];
    if (dIds.length) {
      const { data: dd } = await supabase.from('disputes').select('id,reason,status').in('id', dIds);
      const dmap = new Map(((dd as { id: string; reason: string; status: string }[]) ?? []).map(x => [x.id, { reason: x.reason, status: x.status }]));
      cases = rawCases.map(x => ({ ...x, dispute: dmap.get(x.dispute_id) ?? null }));
    }
    setArbCases(cases);

    // Verificar si el usuario es árbitro senior (para panel de apelaciones)
    const { data: seniorData } = await supabase.rpc('is_senior_arbiter', { p_user_id: profile.id });
    setIsSeniorArbiter(seniorData === true);

    // Cargar votos de apelación del usuario (para saber si ya votó)
    const { data: votesData } = await supabase.from('appeal_votes').select('dispute_id,arbiter_id,verdict,created_at').eq('arbiter_id', profile.id);
    setAppealVotes((votesData as AppealVote[]) ?? []);

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

  async function submitAppeal() {
    if (!profile || !selDispute || busy) return;
    const deposit = parseInt(appealDeposit);
    if (!deposit || deposit <= 0) return notify('Depósito inválido');
    setBusy(true);
    const { error } = await supabase.rpc('open_appeal', { p_dispute_id: selDispute.id, p_deposit: deposit });
    setBusy(false);
    if (error) return notify('Error: ' + error.message);
    setPanel(null); setSelDispute(null); setAppealDeposit('50');
    notify('Apelación abierta · panel de 3 árbitros senior asignado');
    await refreshProfile(); load();
  }

  async function castAppealVerdict(disputeId: string, verdict: 'UPHOLD' | 'OVERTURN') {
    setBusy(true);
    const { error } = await supabase.rpc('resolve_appeal', { p_dispute_id: disputeId, p_verdict: verdict });
    setBusy(false);
    if (error) return notify('Error: ' + error.message);
    notify(verdict === 'UPHOLD' ? 'Fallo confirmado' : 'Fallo revertido · fondos redistribuidos');
    await refreshProfile(); load();
  }

  if (loading) return <LoadingScreen message="ACCEDIENDO AL TRIBUNAL..." />;

  const activos = disputes.filter(d => d.status !== 'RESOLVED').length;
  const invertido = stakes.filter(s => s.status === 'ACTIVE').reduce((a, s) => a + s.amount, 0);
  const retornos = stakes.filter(s => s.status === 'RETURNED').reduce((a, s) => a + (s.return_amount ?? 0), 0);
  const pendientesArb = arbCases.filter(a => !a.verdict);

  // Apelaciones: disputas resueltas dentro de ventana de 7 días que puedo apelar
  const now = Date.now();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const appealableDisputes = disputes.filter(d =>
    d.status === 'RESOLVED' &&
    d.appeal_status === 'NONE' &&
    d.resolved_at &&
    (now - new Date(d.resolved_at).getTime()) < SEVEN_DAYS_MS
  );

  // Apelaciones abiertas donde soy árbitro senior asignado
  const myAppealCases = disputes.filter(d =>
    d.appeal_status === 'OPEN' &&
    d.appeal_arbiters?.includes(profile?.id ?? '')
  );

  // Apelaciones abiertas donde soy parte (para ver el estado)
  const myOpenAppeals = disputes.filter(d =>
    d.appeal_status === 'OPEN' &&
    (d.plaintiff_id === profile?.id || d.defendant_id === profile?.id)
  );

  // Apelaciones resueltas
  const resolvedAppeals = disputes.filter(d => d.appeal_status === 'RESOLVED');

  return (
    <div style={oc.root}>
      <ScanlineOverlay />
      <OmicronHeader
        onBack={() => setActiveTab('perfil')}
        icon={<Scale size={18} />}
        accent={C.red}
        title="Gobernanza"
        subtitle="Justicia descentralizada · Staking"
      />

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
                <p style={{ margin: '0 0 10px', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, color: '#dbeafe', lineHeight: 1.4 }}>
                  {a.dispute?.reason ?? 'Disputa sin descripción'}
                </p>

                {/* CAJA NEGRA · revisar evidencia cifrada antes del fallo */}
                <BlackboxPanel disputeId={a.dispute_id} reason={a.dispute?.reason ?? ''} />

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
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: DISPUTE_COLOR[d.status] ?? C.cyan }}>
                    <span className="liquid-dot" />{d.status}
                  </span>
                  <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>{new Date(d.created_at).toLocaleDateString('es-CL')}</span>
                </div>
                <p style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, color: '#dbeafe' }}>{d.reason}</p>
              </CyberCard>
            ))}
          </>
        )}

        {disputes.length === 0 && pendientesArb.length === 0 && (
          <p style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, padding: '2px 28px 6px', lineHeight: 1.6 }}>
            Aún no tienes disputas. Si un contrato sale mal, ábrela desde el botón de arriba.
          </p>
        )}

        <Divider glow margin="14px 16px" />

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* APELACIONES — Segunda instancia de justicia (árbitros senior) */}
        {/* ═══════════════════════════════════════════════════════════════ */}
        <SectionLabel>Apelaciones ⚖️</SectionLabel>
        <CyberCard color={C.gold} topBar>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <AlertTriangle size={18} style={{ color: C.gold }} />
            <div>
              <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 15, color: '#dbeafe' }}>Segunda Instancia</div>
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.goldDim, letterSpacing: 0.5 }}>PANEL SENIOR N5/N6 · QUÓRUM 2-DE-3 · VENTANA 7 DÍAS</div>
            </div>
          </div>
          <StatGrid cols={3} style={{ marginBottom: 12 }}>
            <StatCard label="Puedo apelar" value={String(appealableDisputes.length)} color={C.gold} />
            <StatCard label="Como árbitro" value={String(myAppealCases.length)} color={C.purple} />
            <StatCard label="Mis abiertas" value={String(myOpenAppeals.length)} color={C.cyan} />
          </StatGrid>
          {appealableDisputes.length > 0 && (
            <CyberButton variant="primary" onClick={() => setPanel('appeal')} style={{ borderColor: C.goldDim, color: C.gold }}>
              <AlertTriangle size={15} /> ABRIR APELACIÓN
            </CyberButton>
          )}
          {appealableDisputes.length === 0 && !isSeniorArbiter && myOpenAppeals.length === 0 && (
            <p style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, margin: 0, lineHeight: 1.5 }}>
              No tienes disputas resueltas apelables. Tienes 7 días tras un fallo para apelar.
            </p>
          )}
        </CyberCard>

        {/* CASOS DE APELACIÓN COMO ÁRBITRO SENIOR */}
        {myAppealCases.length > 0 && (
          <>
            <SectionLabel>Panel de Apelación (Árbitro Senior) 🔱</SectionLabel>
            {myAppealCases.map(d => {
              const myVote = appealVotes.find(v => v.dispute_id === d.id);
              return (
                <CyberCard key={d.id} color={C.purple} margin="0 14px 10px">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Scale size={14} style={{ color: C.purple }} />
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.purple }}>
                      APELACIÓN · {myVote ? 'YA VOTASTE' : 'EMITE TU VOTO'}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, color: '#dbeafe', lineHeight: 1.4 }}>
                    {d.reason}
                  </p>
                  <p style={{ margin: '0 0 10px', fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>
                    Disputa resuelta el {d.resolved_at ? new Date(d.resolved_at).toLocaleDateString('es-CL') : '—'} · Apelación abierta el {d.appeal_opened_at ? new Date(d.appeal_opened_at).toLocaleDateString('es-CL') : '—'}
                  </p>

                  {myVote ? (
                    <div style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(92, 200, 255, 0.08)', border: `1px solid ${C.cyanFaint}` }}>
                      <span style={{ fontFamily: FONT.mono, fontSize: 10, color: myVote.verdict === 'UPHOLD' ? C.green : C.gold }}>
                        Tu voto: {myVote.verdict === 'UPHOLD' ? '✓ CONFIRMAR FALLO' : '↩ REVERTIR FALLO'}
                      </span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <CyberButton variant="primary" onClick={() => castAppealVerdict(d.id, 'UPHOLD')} disabled={busy} style={{ borderColor: C.greenDim, color: C.green, flex: 1 }}>
                        <ThumbsUp size={14} /> CONFIRMAR
                      </CyberButton>
                      <CyberButton variant="danger" onClick={() => castAppealVerdict(d.id, 'OVERTURN')} disabled={busy} style={{ flex: 1 }}>
                        <ThumbsDown size={14} /> REVERTIR
                      </CyberButton>
                    </div>
                  )}
                </CyberCard>
              );
            })}
          </>
        )}

        {/* MIS APELACIONES ABIERTAS (como parte) */}
        {myOpenAppeals.length > 0 && (
          <>
            <SectionLabel>Mis Apelaciones en Curso</SectionLabel>
            {myOpenAppeals.map(d => {
              const votesForThis = appealVotes.filter(v => v.dispute_id === d.id);
              return (
                <CyberCard key={d.id} color={C.gold} margin="0 14px 10px">
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.gold }}>
                      <span className="liquid-dot" />APELACIÓN EN CURSO
                    </span>
                    <span style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>
                      {d.appeal_opened_at ? new Date(d.appeal_opened_at).toLocaleDateString('es-CL') : ''}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 6px', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, color: '#dbeafe' }}>{d.reason}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0 0' }}>
                    <span style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>
                      Votos: {votesForThis.length}/3 (necesita 2 para quórum)
                    </span>
                  </div>
                </CyberCard>
              );
            })}
          </>
        )}

        {/* APELACIONES RESUELTAS */}
        {resolvedAppeals.length > 0 && (
          <>
            <SectionLabel>Apelaciones Resueltas</SectionLabel>
            {resolvedAppeals.map(d => (
              <CyberCard key={d.id} color={C.cyanDim} margin="0 14px 10px">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: d.appeal_resolution?.includes('OVERTURN') ? C.gold : C.green }}>
                    {d.appeal_resolution?.includes('OVERTURN') ? '↩ REVERTIDO' : '✓ CONFIRMADO'}
                  </span>
                </div>
                <p style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 13, color: '#aab5cc' }}>{d.reason}</p>
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
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: s.status === 'ACTIVE' ? C.green : C.cyanDim }}>
                      {s.status === 'ACTIVE' && <span className="liquid-dot" />}
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
        {stakes.length === 0 && (
          <p style={{ textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, padding: '2px 28px 6px', lineHeight: 1.6 }}>
            Aún no tienes inversiones. Financia talento en el Mercado de Staking y gana +15%.
          </p>
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
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, outline: 'none', resize: 'none', marginBottom: 12 }} />
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
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, outline: 'none', marginBottom: 12 }} />
          <CyberButton variant="primary" onClick={submitStake} disabled={!selTarget || !amount || busy} style={{ borderColor: C.greenDim, color: C.green }}>
            {busy ? 'INVIRTIENDO...' : 'CONFIRMAR INVERSIÓN'}
          </CyberButton>
        </DetailPanel>
      )}

      {/* PANEL: ABRIR APELACIÓN */}
      {panel === 'appeal' && (
        <DetailPanel title="Abrir Apelación" subtitle="SEGUNDA INSTANCIA · PANEL SENIOR" accentColor={C.gold} onClose={() => { setPanel(null); setSelDispute(null); setAppealDeposit('50'); }}>
          <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 13, color: '#aab5cc', margin: '0 0 12px', lineHeight: 1.5 }}>
            Selecciona la disputa a apelar. Se cobrará un depósito que se devuelve si la apelación es exitosa (fallo revertido). Si se confirma el fallo original, pierdes el depósito.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
            {appealableDisputes.map(d => {
              const daysLeft = d.resolved_at ? Math.max(0, 7 - Math.floor((now - new Date(d.resolved_at).getTime()) / (24 * 60 * 60 * 1000))) : 0;
              return (
                <button key={d.id} onClick={() => setSelDispute(d)} style={cx(
                  { textAlign: 'left', padding: '10px 12px', borderRadius: 8, cursor: 'pointer', background: C.surface },
                  selDispute?.id === d.id ? { border: `1px solid ${C.gold}` } : { border: `1px solid ${C.cyanFaint}` }
                )}>
                  <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#dbeafe' }}>{d.reason}</div>
                  <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim, marginTop: 2 }}>
                    Resuelta: {d.resolved_at ? new Date(d.resolved_at).toLocaleDateString('es-CL') : '—'} · {daysLeft} días restantes para apelar
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, display: 'block', marginBottom: 6 }}>
              DEPÓSITO DE APELACIÓN (Ω) — se devuelve si ganas
            </label>
            <input type="number" min="1" value={appealDeposit} onChange={e => setAppealDeposit(e.target.value)} placeholder="50"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 14, outline: 'none' }} />
          </div>
          <CyberButton variant="primary" onClick={submitAppeal} disabled={!selDispute || !appealDeposit || busy} style={{ borderColor: C.goldDim, color: C.gold }}>
            {busy ? 'PROCESANDO...' : 'CONFIRMAR APELACIÓN'}
          </CyberButton>
        </DetailPanel>
      )}

      {toast && <CyberToast variant="cyan">{toast}</CyberToast>}
    </div>
  );
}


// ── Panel de la Caja Negra: quórum 2-de-3 para abrir la evidencia cifrada ──
function BlackboxPanel({ disputeId, reason }: { disputeId: string; reason: string }) {
  const [res, setRes] = useState<BlackboxResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [aLoading, setALoading] = useState(false);
  const [aErr, setAErr] = useState<string | null>(null);
  const { isPremium } = usePremium();
  const [premiumLock, setPremiumLock] = useState(false);

  async function vote() {
    setLoading(true); setErr(null);
    try { setRes(await openBlackbox(disputeId)); }
    catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }

  async function analyze() {
    if (!isPremium) { setPremiumLock(true); return; }
    setALoading(true); setAErr(null);
    try {
      const transcript = (res?.transcript ?? []).map(m => ({ autor: m.sender?.username ?? 'nodo', texto: m.content }));
      const { data, error } = await supabase.functions.invoke('arbiter-ai', { body: { reason, transcript } });
      const d = data as { analisis?: string; error?: string; detail?: string };
      if (error || d?.error || !d?.analisis) {
        let msg = d?.error || 'Relator IA no disponible (¿desplegaste "arbiter-ai"?).';
        const ctx = (error as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.json === 'function') { try { const b = await ctx.json(); if (b?.error) msg = b.detail ? `${b.error} — ${b.detail}` : b.error; } catch { /* */ } }
        setAErr(msg); return;
      }
      setAnalysis(d.analisis);
    } catch { setAErr('Error de conexión con el Relator IA.'); }
    finally { setALoading(false); }
  }

  return (
    <div style={{ border: `1px solid ${C.cyanFaint}`, borderRadius: 8, padding: 12, background: 'rgba(0,0,0,0.25)', marginBottom: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        {res?.unlocked ? <Unlock size={14} style={{ color: C.green }} /> : <Lock size={14} style={{ color: C.gold }} />}
        <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.cyan }}>CAJA NEGRA · QUÓRUM 2-DE-3</span>
      </div>

      {!res?.unlocked && (
        <>
          <p style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 12, color: C.cyanDim, margin: '0 0 8px' }}>
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
                <div style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 13, color: '#dbeafe' }}>{m.content}</div>
              </div>
            ))}
            {(res.transcript ?? []).length === 0 && (
              <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>SIN MENSAJES EN ESTE CANAL</div>
            )}
          </div>

          {/* RELATOR IA · análisis neutral del caso (no es veredicto) */}
          <div style={{ marginTop: 10 }}>
            {!analysis && (
              <button onClick={analyze} disabled={aLoading}
                style={{ width: '100%', padding: '8px', borderRadius: 6, background: 'rgba(255, 176, 46,0.12)', border: `1px solid ${C.gold}55`, color: C.gold, fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: aLoading ? 0.6 : 1 }}>
                {aLoading ? <><Loader2 size={13} className="animate-spin" /> ANALIZANDO…</> : <><Sparkles size={13} /> RELATOR IA · ANALIZAR CASO</>}
                {!isPremium && !aLoading && <PremiumBadge />}
              </button>
            )}
            {aErr && <p style={{ fontFamily: FONT.mono, fontSize: 9, color: C.red, marginTop: 6 }}>{aErr}</p>}
            {analysis && (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 8, background: 'rgba(92, 200, 255,0.06)', border: `1px solid ${C.cyanDim}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontFamily: FONT.mono, fontSize: 8.5, letterSpacing: 1.5, color: C.cyan }}>
                  <Sparkles size={11} /> ANÁLISIS NEUTRAL · RELATOR IA (no es veredicto)
                </div>
                <p style={{ margin: 0, fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', system-ui, sans-serif", fontSize: 13.5, color: '#dbeafe', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{analysis}</p>
              </div>
            )}
          </div>
        </>
      )}

      {err && <p style={{ fontFamily: FONT.mono, fontSize: 9, color: C.red, marginTop: 8 }}>{err}</p>}
      {premiumLock && <PremiumLock feature="El Relator IA del Tribunal" onClose={() => setPremiumLock(false)} />}
    </div>
  );
}
