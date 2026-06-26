import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Shield, Lock, Timer, CheckCircle2, AlertTriangle, MessageSquare } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { sendSecureMessage, loadSecureMessages } from '../../lib/secureChat';
import type { Message } from '../../types';

interface Room {
  network_id:    string; // id del contrato
  title:         string;
  status:        string;
  counterpart:   string;
}

export function ChatTab() {
  const { profile } = useApp();

  const [rooms, setRooms]         = useState<Room[]>([]);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages]   = useState<Message[]>([]);
  const [integrityOk, setIntegrityOk] = useState(true);
  const [input, setInput]         = useState('');
  const [sending, setSending]     = useState(false);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [loadingMsgs, setLoadingMsgs]   = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const channelRef  = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef  = useRef(true);

  // ── Ghost Approval (banner SLA 15 min) ──
  const activeRoomData = rooms.find(r => r.network_id === activeRoom);
  const isGhostApprovalActive = activeRoomData?.status === 'delivered' || activeRoomData?.status === 'in_progress';
  const slaMinutes = 15;
  const [ghostSecondsLeft, setGhostSecondsLeft] = useState(slaMinutes * 60);

  useEffect(() => {
    if (!isGhostApprovalActive) return;
    setGhostSecondsLeft(slaMinutes * 60);
    const t = setInterval(() => setGhostSecondsLeft(s => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [isGhostApprovalActive, activeRoom]);

  const ghostMM = String(Math.floor(ghostSecondsLeft / 60)).padStart(2, '0');
  const ghostSS = String(ghostSecondsLeft % 60).padStart(2, '0');


  // ── Cargar salas (contratos del usuario) ──
  const loadRooms = useCallback(async () => {
    if (!profile) return;
    setLoadingRooms(true);
    const { data: cs } = await supabase
      .from('contracts')
      .select('*')
      .or(`buyer_id.eq.${profile.id},seller_id.eq.${profile.id}`)
      .order('created_at', { ascending: false });

    const contracts = (cs ?? []) as Array<{
      id: string; title: string; status: string; buyer_id: string; seller_id: string;
    }>;

    // Nombres de las contrapartes (sin joins, en una sola query)
    const ids = [...new Set(contracts.flatMap(c => [c.buyer_id, c.seller_id]))];
    let nameById: Record<string, string> = {};
    if (ids.length) {
      const { data: profs } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .in('id', ids);
      nameById = Object.fromEntries(
        (profs ?? []).map((p: { id: string; username?: string; full_name?: string }) =>
          [p.id, p.username || p.full_name || 'Nodo']),
      );
    }

    const list: Room[] = contracts.map(c => {
      const otherId = c.buyer_id === profile.id ? c.seller_id : c.buyer_id;
      return {
        network_id:  c.id,
        title:       c.title || 'Contrato',
        status:      c.status || 'active',
        counterpart: nameById[otherId] || 'Nodo',
      };
    });

    if (mountedRef.current) {
      setRooms(list);
      setLoadingRooms(false);
      // Auto-seleccionar la primera sala si no hay ninguna activa
      if (!activeRoom && list.length) setActiveRoom(list[0].network_id);
    }
  }, [profile, activeRoom]);


  // ── Cargar mensajes (descifrados) de la sala activa ──
  const loadMessages = useCallback(async () => {
    if (!activeRoom) { setMessages([]); return; }
    setLoadingMsgs(true);
    try {
      const { messages: msgs, integrity_ok } = await loadSecureMessages(activeRoom);
      if (mountedRef.current) {
        setMessages(msgs);
        setIntegrityOk(integrity_ok);
      }
    } catch (e) {
      console.error('Error cargando chat seguro:', e);
      if (mountedRef.current) setMessages([]);
    } finally {
      if (mountedRef.current) setLoadingMsgs(false);
    }
  }, [activeRoom]);


  // Montaje: cargar salas
  useEffect(() => {
    mountedRef.current = true;
    loadRooms();
    return () => { mountedRef.current = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);


  // Cambio de sala: cargar mensajes + suscribir realtime de esa sala
  useEffect(() => {
    if (!activeRoom) return;
    loadMessages();

    const channel = supabase
      .channel(`room-${activeRoom}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `network_id=eq.${activeRoom}`,
      }, () => {
        // El payload llega cifrado → recargar descifrado
        loadMessages();
      })
      .subscribe();

    channelRef.current = channel;
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [activeRoom, loadMessages]);


  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // ── Enviar mensaje cifrado ──
  async function sendMessage() {
    if (!input.trim() || !profile || !activeRoom || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);
    try {
      await sendSecureMessage(activeRoom, content);
      await loadMessages();
    } catch (e) {
      console.error('Error enviando mensaje:', e);
      setInput(content); // restaurar si falla
    } finally {
      setSending(false);
    }
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }


  return (
    <div className="flex flex-col flex-1 min-h-0 bg-omicron-bg">

      {/* ── HEADER ── */}
      <div className="flex-none px-4 py-3 bg-omicron-card border-b border-omicron-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
              <Lock size={18} className="text-omicron-accent" />
            </div>
            <div>
              <p className="text-omicron-text font-semibold text-sm">
                {activeRoomData ? activeRoomData.counterpart : 'Chat Seguro'}
              </p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-omicron-green pulse-dot" />
                <span className="text-omicron-cyan text-xs">Caja Negra</span>
                <span className="text-omicron-subtle text-xs">· AES-256</span>
              </div>
            </div>
          </div>

          {/* Sello de integridad de la cadena */}
          {activeRoom && (
            integrityOk ? (
              <div className="flex items-center gap-1 text-omicron-green text-[11px]">
                <CheckCircle2 size={13} />
                <span>Cadena<br/>íntegra</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-red-400 text-[11px] animate-pulse">
                <AlertTriangle size={13} />
                <span>Cadena<br/>alterada</span>
              </div>
            )
          )}
        </div>
      </div>


      {/* ── SELECTOR DE SALAS ── */}
      {rooms.length > 0 && (
        <div className="flex-none flex gap-2 px-3 py-2 bg-omicron-bg border-b border-omicron-border overflow-x-auto">
          {rooms.map(r => (
            <button
              key={r.network_id}
              onClick={() => setActiveRoom(r.network_id)}
              className={`flex-none px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                activeRoom === r.network_id
                  ? 'bg-omicron-accent/20 border-omicron-accent/50 text-omicron-text'
                  : 'bg-omicron-card border-omicron-border text-omicron-subtle'
              }`}
            >
              {r.counterpart}
            </button>
          ))}
        </div>
      )}


      {/* ── BANNER GHOST APPROVAL ── */}
      {activeRoom && isGhostApprovalActive && (
        <div className="flex-none bg-omicron-accent/10 border-b border-omicron-accent/20 px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer size={14} className="text-omicron-accent animate-pulse" />
            <span className="text-xs text-omicron-text font-medium">Ghost Approval Activo</span>
            <span className="text-[9px] text-omicron-subtle bg-omicron-surface px-1.5 py-0.5 rounded border border-omicron-border">
              SLA: {slaMinutes} min
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-bold font-mono tracking-wider ${
              ghostSecondsLeft <= 60 ? 'text-red-400 animate-pulse' : 'text-omicron-accent'
            }`}>
              {ghostMM}:{ghostSS}
            </span>
            <button className="text-[10px] font-bold text-white bg-red-500 hover:bg-red-600 px-2 py-1 rounded transition">
              OBJETAR
            </button>
          </div>
        </div>
      )}


      {/* ── MENSAJES ── */}
      <div className="flex-1 scroll-area px-4 py-3 space-y-3">

        {/* Sin salas */}
        {!loadingRooms && rooms.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center px-6">
            <MessageSquare size={40} className="text-omicron-subtle mb-3 opacity-50" />
            <p className="text-omicron-text text-sm font-medium">Aún no tienes salas activas</p>
            <p className="text-omicron-subtle text-xs mt-1">
              Cuando inicies un contrato (Escrow) en el Market, se abrirá aquí un canal seguro y cifrado con tu contraparte.
            </p>
          </div>
        )}

        {/* Cargando */}
        {loadingMsgs && (
          <div className="flex justify-center py-6">
            <span className="text-omicron-subtle text-xs animate-pulse">Descifrando Caja Negra…</span>
          </div>
        )}

        {/* Sala vacía */}
        {activeRoom && !loadingMsgs && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Shield size={28} className="text-omicron-accent mb-2 opacity-60" />
            <p className="text-omicron-subtle text-xs">
              Canal cifrado listo. Envía el primer mensaje seguro.
            </p>
          </div>
        )}

        {/* Lista de mensajes */}
        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === profile?.id;
          const senderName = isOwn
            ? (profile?.username ?? 'Tú')
            : ((msg as Message & { sender?: { username: string } }).sender?.username ?? activeRoomData?.counterpart ?? 'Nodo');

          return (
            <div key={`${msg.id}-${idx}`} className={`msg-enter ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
              <span className="text-omicron-subtle text-[10px] mb-1 px-1">
                {senderName} · {formatTime(msg.created_at)}
              </span>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                isOwn
                  ? 'bg-omicron-accent/20 border border-omicron-accent/40 rounded-tr-sm'
                  : 'bg-omicron-card border border-omicron-border rounded-tl-sm'
              }`}>
                <p className="text-omicron-text text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          );
        })}

        <div ref={bottomRef} />
      </div>


      {/* ── INPUT ── */}
      <div className="flex-none px-4 py-3 bg-omicron-bg border-t border-omicron-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder={activeRoom ? 'Escribe un mensaje cifrado…' : 'Selecciona una sala…'}
            disabled={!activeRoom}
            className="flex-1 bg-omicron-card border border-omicron-border rounded-2xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition disabled:opacity-50"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending || !activeRoom}
            className="w-11 h-11 bg-omicron-accent hover:bg-violet-600 disabled:opacity-40 rounded-xl flex items-center justify-center transition active:scale-90"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
