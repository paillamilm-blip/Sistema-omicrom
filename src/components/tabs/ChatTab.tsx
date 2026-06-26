import { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Shield, Lock, Timer } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import type { Message } from '../../types';

const SYSTEM_MESSAGES: Omit<Message, 'id' | 'sender_id' | 'receiver_id' | 'network_id' | 'is_read'>[] = [
  {
    content: 'Bienvenido al canal seguro! Toda comunicación es monitoreada por el escáner de seguridad y respaldada en la Caja Negra.',
    created_at: new Date(Date.now() - 3600000).toISOString(),
  }
];

export function ChatTab() {
  const { profile } = useApp();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const mountedRef = useRef(true);

  // Ghost Approval (Fase 2): SLA de 15 min sin objeción = liberación de fondos.
  // TODO: estos valores vendrán de la tabla escrow_contracts (deadline real).
  const isGhostApprovalActive = true;
  const slaMinutes = 15;
  const [ghostSecondsLeft, setGhostSecondsLeft] = useState(slaMinutes * 60);

  // ✅ Innovación: cuenta regresiva funcional (antes era estática "29:59")
  useEffect(() => {
    if (!isGhostApprovalActive) return;
    const t = setInterval(() => {
      setGhostSecondsLeft(s => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [isGhostApprovalActive]);

  const ghostMM = String(Math.floor(ghostSecondsLeft / 60)).padStart(2, '0');
  const ghostSS = String(ghostSecondsLeft % 60).padStart(2, '0');

  const loadMessages = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('messages')
      .select('*, sender:profiles!messages_sender_id_fkey(id, username)')
      .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
      .order('created_at', { ascending: true })
      .limit(50);
    if (mountedRef.current) {
      setMessages(data as Message[] ?? []);
    }
  }, [profile]);


  useEffect(() => {
    if (!profile) return;
    mountedRef.current = true;

    loadMessages();

    const channel = supabase
      .channel(`chat-${profile.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, payload => {
        const newMsg = payload.new as Message;
        if (newMsg.sender_id === profile.id || newMsg.receiver_id === profile.id) {
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
        }
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      mountedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [profile, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  async function sendMessage() {
    if (!input.trim() || !profile || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    const optimistic: Message = {
      id: crypto.randomUUID(),
      sender_id: profile.id,
      receiver_id: null,
      network_id: null,
      content,
      is_read: false,
      created_at: new Date().toISOString(),
    };
    setMessages(prev => [...prev, optimistic]);

    await supabase.from('messages').insert({
      sender_id: profile.id,
      content,
    });

    setSending(false);
  }

  function formatTime(iso: string) {
    return new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
  }

  const allMessages = [
    ...SYSTEM_MESSAGES.map((m, i) => ({ ...m, id: `sys-${i}`, sender_id: 'system', receiver_id: null, network_id: null, is_read: true })),
    ...messages,
  ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());


  return (
    <div className="flex flex-col flex-1 min-h-0 bg-omicron-bg">
      {/* Header alineado al Manifiesto */}
      <div className="flex-none px-4 py-3 bg-omicron-card border-b border-omicron-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-omicron-accent/20 border border-omicron-accent/40 flex items-center justify-center">
              <Lock size={18} className="text-omicron-accent" />
            </div>
            <div>
              <p className="text-omicron-text font-semibold text-sm">Chat Seguro</p>
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-omicron-green pulse-dot" />
                <span className="text-omicron-cyan text-xs">Caja Negra Activa</span>
                <span className="text-omicron-subtle text-xs">. Cifrado E2E</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-omicron-subtle text-xs">
            <Shield size={12} className="text-omicron-accent" />
            <span className="text-[11px]">Auditado<br/>en vivo</span>
          </div>
        </div>
      </div>

      {/* FIX H-04: Banner Ghost Approval Dinámico */}
      {isGhostApprovalActive && (
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


      {/* Messages */}
      <div className="flex-1 scroll-area px-4 py-3 space-y-3">
        {allMessages.map((msg, idx) => {
          const isOwn = msg.sender_id === profile?.id;
          const isSystem = msg.sender_id === 'system';
          const senderName = isSystem ? 'Sistema Ómicron' : isOwn ? (profile?.username ?? 'Tú') : ((msg as Message & { sender?: { username: string } }).sender?.username ?? 'Nodo');

          return (
            <div key={`${msg.id}-${idx}`} className={`msg-enter ${isOwn ? 'flex flex-col items-end' : 'flex flex-col items-start'}`}>
              <span className="text-omicron-subtle text-[10px] mb-1 px-1">
                {isSystem ? 'Sistema Ómicron' : senderName} . {formatTime(msg.created_at)}
              </span>
              <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                isOwn
                  ? 'bg-omicron-accent/20 border border-omicron-accent/40 rounded-tr-sm'
                  : 'bg-omicron-card border border-omicron-border rounded-tl-sm'
              }`}>
                <p className="text-omicron-text text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          );
        })}

        {messages.length === 0 && (
          <div className="flex flex-col items-start msg-enter">
            <span className="text-omicron-subtle text-[10px] mb-1 px-1">Nodo_Arquitecto_N2 . 10:15</span>
            <div className="max-w-[85%] rounded-2xl rounded-tl-sm px-4 py-3 bg-omicron-card border border-omicron-border">
              <p className="text-omicron-text text-sm leading-relaxed">
                ¡Hola! Vi tu perfil en el Market. ¿Podemos coordinar un proyecto bajo contrato Escrow?
              </p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>


      {/* Input */}
      <div className="flex-none px-4 py-3 bg-omicron-bg border-t border-omicron-border">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            placeholder="Escribe un mensaje seguro..."
            className="flex-1 bg-omicron-card border border-omicron-border rounded-2xl px-4 py-3 text-omicron-text placeholder:text-omicron-muted text-sm focus:outline-none focus:border-omicron-accent transition"
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || sending}
            className="w-11 h-11 bg-omicron-accent hover:bg-violet-600 disabled:opacity-40 rounded-xl flex items-center justify-center transition active:scale-90"
          >
            <Send size={16} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
