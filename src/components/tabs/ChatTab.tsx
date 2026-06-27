import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Shield, Timer, ArrowLeft, MessageCircle, Lock, ShieldCheck, ShieldAlert } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { C, FONT, BASE, cx } from '../../theme';
import { ScanlineOverlay, CyberHeader, CyberCard, SectionLabel, LoadingScreen } from '../shared/CyberComponents';
import { sendSecureMessage, loadSecureMessages } from '../../lib/secureChat';
import type { Message } from '../../types';

interface Room { id: string; title: string; buyer_id: string; seller_id: string; status: string | null; delivery_declared_at: string | null; }

const ST_COLOR: Record<string, string> = { LOCKED: C.gold, DELIVERED: C.cyan, RELEASED: C.green, DISPUTED: C.red };

export function ChatTab() {
  const { profile } = useApp();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [integrityOk, setIntegrityOk] = useState(true);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [objecting, setObjecting] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [approving, setApproving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);

  const loadRooms = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('contracts').select('id,title,buyer_id,seller_id,status,delivery_declared_at')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });
    const rs = (data as Room[]) ?? [];
    setRooms(rs);
    const ids = [...new Set(rs.flatMap(r => [r.buyer_id, r.seller_id]))].filter(id => id !== profile.id);
    if (ids.length) {
      const { data: p } = await supabase.from('profiles').select('id,username').in('id', ids);
      setNames(new Map(((p as { id: string; username: string }[]) ?? []).map(x => [x.id, x.username])));
    }
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadRooms(); }, [loadRooms]);

  // Mensajes (DESCIFRADOS vía Edge Function) + realtime de la sala seleccionada
  useEffect(() => {
    if (!room || !profile) return;
    let active = true;

    const reload = async () => {
      try {
        const { messages: msgs, integrity_ok } = await loadSecureMessages(room.id);
        if (active) { setMessages(msgs); setIntegrityOk(integrity_ok); }
      } catch (e) {
        console.error('Error cargando chat seguro:', e);
      }
    };
    reload();

    const ch = supabase.channel(`room-${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `network_id=eq.${room.id}` }, () => {
        // El payload llega cifrado → recargar descifrado
        reload();
      }).subscribe();

    return () => { active = false; supabase.removeChannel(ch); };
  }, [room, profile]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  function otherId(r: Room) { return r.buyer_id === profile?.id ? r.seller_id : r.buyer_id; }
  function otherName(r: Room) { return names.get(otherId(r)) ?? 'contraparte'; }

  function ghostLeft(r: Room): number | null {
    if (r.status !== 'DELIVERED' || !r.delivery_declared_at) return null;
    const end = new Date(r.delivery_declared_at).getTime() + 15 * 60000;
    return Math.max(0, Math.floor((end - now) / 1000));
  }

  async function send() {
    if (!input.trim() || !room || !profile || sending) return;
    const content = input.trim(); setInput(''); setSending(true);
    const other = otherId(room);
    const opt: Message = { id: crypto.randomUUID(), sender_id: profile.id, receiver_id: other, network_id: room.id, content, is_read: false, created_at: new Date().toISOString() };
    setMessages(p => [...p, opt]);
    try {
      await sendSecureMessage(room.id, content);
      const { messages: msgs, integrity_ok } = await loadSecureMessages(room.id);
      setMessages(msgs); setIntegrityOk(integrity_ok);
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      setInput(content);
      setMessages(p => p.filter(x => x.id !== opt.id)); // revertir optimista
    } finally {
      setSending(false);
    }
  }

  // Objetar la entrega durante Ghost Approval → abre disputa + detiene liberación
  async function objectDelivery() {
    if (!room || !profile || objecting) return;
    const reason = window.prompt('Motivo de la objeción a la entrega:', 'No cumple lo acordado');
    if (reason === null) return; // canceló
    setObjecting(true);
    try {
      const { error } = await supabase.rpc('object_delivery', {
        p_contract_id: room.id,
        p_reason: reason || 'Objeción durante Ghost Approval',
      });
      if (error) throw error;
      setRoom({ ...room, status: 'DISPUTED' }); // detiene el cronómetro en la UI
      await loadRooms();
    } catch (e) {
      console.error('Error al objetar:', e);
      alert('No se pudo objetar: ' + ((e as Error).message ?? e));
    } finally {
      setObjecting(false);
    }
  }

  // Vendedor declara entrega → DELIVERED + arranca Ghost Approval
  async function markDelivered() {
    if (!room || delivering) return;
    setDelivering(true);
    try {
      const { error } = await supabase.rpc('declare_delivery', { p_contract_id: room.id, p_note: null });
      if (error) throw error;
      setRoom({ ...room, status: 'DELIVERED', delivery_declared_at: new Date().toISOString() });
      await loadRooms();
    } catch (e) {
      alert('No se pudo marcar entregado: ' + ((e as Error).message ?? e));
    } finally {
      setDelivering(false);
    }
  }

  // Comprador aprueba la entrega → libera fondos (RELEASED)
  async function approveDelivery() {
    if (!room || approving) return;
    if (!window.confirm('¿Aprobar la entrega y liberar los fondos al vendedor?')) return;
    setApproving(true);
    try {
      const { error } = await supabase.rpc('release_escrow', { p_contract_id: room.id });
      if (error) throw error;
      setRoom({ ...room, status: 'RELEASED' });
      await loadRooms();
    } catch (e) {
      alert('No se pudo aprobar: ' + ((e as Error).message ?? e));
    } finally {
      setApproving(false);
    }
  }

  function fmt(iso: string) { return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }); }

  if (loading) return <LoadingScreen message="ABRIENDO CANALES SEGUROS..." />;

  // ── LISTA DE SALAS ──
  if (!room) {
    return (
      <div style={BASE.root}>
        <ScanlineOverlay />
        <CyberHeader title="CHAT SEGURO" subtitle="SALAS POR CONTRATO // CAJA NEGRA" dotColor={C.green} badge={<Shield size={16} style={{ color: C.cyan }} />} />
        <div style={cx(BASE.scrollArea, { padding: '10px 14px 20px' })}>
          <SectionLabel>◆ CANALES ACTIVOS ({rooms.length})</SectionLabel>
          {rooms.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <MessageCircle size={28} style={{ color: C.cyanDim }} />
              <p style={{ fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim, marginTop: 10 }}>SIN CONTRATOS · CONTRATA EN MARKET PARA ABRIR UN CANAL</p>
            </div>
          ) : rooms.map(r => (
            <CyberCard key={r.id} color={ST_COLOR[r.status ?? 'LOCKED'] ?? C.cyan} margin="0 0 10px" onClick={() => setRoom(r)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Lock size={15} style={{ color: ST_COLOR[r.status ?? 'LOCKED'] ?? C.cyan }} />
                  <div>
                    <div style={{ fontFamily: FONT.display, fontWeight: 700, fontSize: 14, color: '#dbeafe' }}>{r.title}</div>
                    <div style={{ fontFamily: FONT.mono, fontSize: 9, color: C.cyanDim }}>@{otherName(r)} · {r.status ?? 'LOCKED'}</div>
                  </div>
                </div>
                <Send size={14} style={{ color: C.cyanDim }} />
              </div>
            </CyberCard>
          ))}
        </div>
      </div>
    );
  }

  // ── CONVERSACIÓN ──
  const gl = ghostLeft(room);
  const isSeller = room.seller_id === profile?.id;
  const isBuyer = room.buyer_id === profile?.id;
  return (
    <div style={BASE.root}>
      <ScanlineOverlay />
      {/* Header de sala */}
      <div style={cx(BASE.header, { gap: 10 })}>
        <button onClick={() => { setRoom(null); setMessages([]); }} style={{ background: 'none', border: 'none', color: C.cyan, cursor: 'pointer', display: 'flex' }}>
          <ArrowLeft size={18} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT.mono, fontSize: 11, letterSpacing: 1, color: C.cyan, textTransform: 'uppercase', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{room.title}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            {integrityOk
              ? <ShieldCheck size={9} style={{ color: C.green }} />
              : <ShieldAlert size={9} style={{ color: C.red }} />}
            <span style={{ fontFamily: FONT.mono, fontSize: 8, color: integrityOk ? C.cyanDim : C.red }}>
              @{otherName(room)} · {integrityOk ? 'CAJA NEGRA · CADENA OK' : 'CADENA ALTERADA'}
            </span>
          </div>
        </div>
        <span style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: ST_COLOR[room.status ?? 'LOCKED'] ?? C.cyan, padding: '3px 8px', borderRadius: 12, border: `1px solid ${ST_COLOR[room.status ?? 'LOCKED'] ?? C.cyan}55` }}>{room.status ?? 'LOCKED'}</span>
      </div>

      {/* Acción del vendedor: marcar entregado (solo en LOCKED) */}
      {isSeller && room.status === 'LOCKED' && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', flexShrink: 0, background: 'rgba(34,197,94,0.07)', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <span style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: C.green }}>TRABAJO EN CURSO · ESCROW BLOQUEADO</span>
          <button onClick={markDelivered} disabled={delivering}
            style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: '#04110a', background: C.green, border: 'none', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontWeight: 700, opacity: delivering ? 0.5 : 1 }}>
            {delivering ? '...' : 'MARCAR ENTREGADO ▸'}
          </button>
        </div>
      )}

      {/* Ghost Approval por contrato */}
      {gl !== null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px', flexShrink: 0, background: 'rgba(124,58,237,0.08)', borderBottom: `1px solid ${C.cyanFaint}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Timer size={14} style={{ color: C.purple }} />
            <span style={{ fontFamily: FONT.mono, fontSize: 10, letterSpacing: 1, color: '#dbeafe' }}>GHOST APPROVAL</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: FONT.mono, fontSize: 14, fontWeight: 700, letterSpacing: 2, color: gl <= 60 ? C.red : C.cyan }}>
              {String(Math.floor(gl / 60)).padStart(2, '0')}:{String(gl % 60).padStart(2, '0')}
            </span>
            {isBuyer && (
              <button onClick={approveDelivery} disabled={approving}
                style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: '#04110a', background: C.green,
                  border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700, opacity: approving ? 0.5 : 1 }}>
                {approving ? '...' : 'APROBAR'}
              </button>
            )}
            <button onClick={objectDelivery} disabled={objecting}
              style={{ fontFamily: FONT.mono, fontSize: 9, letterSpacing: 1, color: '#fff', background: C.red,
                border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', opacity: objecting ? 0.5 : 1 }}>
              {objecting ? '...' : 'OBJETAR'}
            </button>
          </div>
        </div>
      )}

      {/* Mensajes */}
      <div style={cx(BASE.scrollArea, { padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 12 })}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', padding: 30, fontFamily: FONT.mono, fontSize: 10, color: C.cyanDim }}>CANAL CIFRADO · INICIA LA CONVERSACIÓN</div>
        )}
        {messages.map((m, i) => {
          const own = m.sender_id === profile?.id;
          return (
            <div key={`${m.id}-${i}`} style={{ display: 'flex', flexDirection: 'column', alignItems: own ? 'flex-end' : 'flex-start' }}>
              <span style={{ fontFamily: FONT.mono, fontSize: 8, letterSpacing: 1, color: C.cyanDim, marginBottom: 4 }}>{own ? 'TÚ' : `@${otherName(room)}`} · {fmt(m.created_at)}</span>
              <div style={{ maxWidth: '85%', padding: '10px 14px', borderRadius: 10, background: own ? 'rgba(0,245,255,0.1)' : C.surface, border: `1px solid ${own ? C.cyanDim : C.cyanFaint}`, borderTopRightRadius: own ? 2 : 10, borderTopLeftRadius: own ? 10 : 2 }}>
                <p style={{ margin: 0, fontFamily: "'Rajdhani', sans-serif", fontSize: 14, color: '#dbeafe', lineHeight: 1.45 }}>{m.content}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', flexShrink: 0, borderTop: `1px solid ${C.cyanFaint}` }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()} placeholder="Mensaje cifrado..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 10, background: C.surface, border: `1px solid ${C.cyanFaint}`, color: '#dbeafe', fontFamily: "'Rajdhani', sans-serif", fontSize: 14, outline: 'none' }} />
        <button onClick={send} disabled={!input.trim() || sending} style={{ width: 44, height: 44, borderRadius: 10, background: C.cyanFaint, border: `1px solid ${C.cyanDim}`, color: C.cyan, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: !input.trim() || sending ? 0.4 : 1 }}>
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
