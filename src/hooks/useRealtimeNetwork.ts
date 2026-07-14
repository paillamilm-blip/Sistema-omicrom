// src/hooks/useRealtimeNetwork.ts
// Capa de tiempo real REAL (multiusuario) sobre Supabase Realtime.
//
// Usa dos primitivas que NO requieren tablas nuevas ni migraciones:
//   1) Presence  → cuántos nodos están conectados AHORA (contador real y
//      escalable) + lista de quién está en línea.
//   2) Broadcast → eventos del ecosistema en vivo (alguien entró, subió de
//      nivel, mejoró su reputación…) que todos los clientes reciben al instante.
//
// Un único canal global "omicron-live" hace de "lobby" de la red. Para escalar
// a decenas de miles de usuarios se puede fragmentar por cohortes/región
// (ver nota en el PR); para el volumen actual un lobby único es suficiente.
import { useCallback, useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

export interface LiveNode {
  id: string;
  username: string;
  node_type: string;
  node_level: number;
  online_at: string;
}

export type LiveEventKind = 'join' | 'action' | 'level' | 'system';

export interface LiveEvent {
  id: string;
  text: string;
  kind: LiveEventKind;
  ts: number;
}

export interface RealtimeNetwork {
  /** Nodos conectados en este momento (presencia real). */
  onlineCount: number;
  /** Lista de nodos en línea. */
  nodes: LiveNode[];
  /** Últimos eventos del ecosistema (más reciente primero). */
  events: LiveEvent[];
  /** Emite un evento al resto de la red (y lo muestra localmente). */
  broadcast: (text: string, kind?: LiveEventKind) => void;
  /** true cuando el canal está suscrito. */
  connected: boolean;
}

const CHANNEL = 'omicron-live';
const MAX_EVENTS = 15;

export interface RealtimeMeta {
  username: string;
  node_type: string;
  node_level: number;
}

export function useRealtimeNetwork(
  userId: string | undefined,
  meta: RealtimeMeta,
): RealtimeNetwork {
  const [onlineCount, setOnlineCount] = useState(0);
  const [nodes, setNodes] = useState<LiveNode[]>([]);
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [connected, setConnected] = useState(false);

  const channelRef = useRef<RealtimeChannel | null>(null);
  // Mantiene el meta actualizado sin re-suscribir el canal en cada render.
  const metaRef = useRef<RealtimeMeta>(meta);
  metaRef.current = meta;
  // Throttle para broadcasts (evita spam a la red)
  const lastBroadcastRef = useRef<number>(0);

  const pushEvent = useCallback((text: string, kind: LiveEventKind) => {
    setEvents((prev) =>
      [
        { id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, text, kind, ts: Date.now() },
        ...prev,
      ].slice(0, MAX_EVENTS),
    );
  }, []);

  const broadcast = useCallback(
    (text: string, kind: LiveEventKind = 'action') => {
      const ch = channelRef.current;
      if (ch) {
        // Throttle: máximo 1 broadcast cada 2 segundos para no colapsar la red
        const now = Date.now();
        if (now - lastBroadcastRef.current < 2000) return;
        lastBroadcastRef.current = now;
        void ch.send({ type: 'broadcast', event: 'activity', payload: { text, kind } });
      }
      pushEvent(text, kind);
    },
    [pushEvent],
  );

  useEffect(() => {
    if (!userId) return;

    const channel = supabase.channel(CHANNEL, {
      config: { presence: { key: userId } },
    });
    channelRef.current = channel;

    // Evita el "todos entraron" al conectar: ignora los eventos de join del
    // burst inicial (los ya conectados) y solo anuncia llegadas reales después.
    let joinReady = false;
    let joinTimer: ReturnType<typeof setTimeout> | undefined;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState() as unknown as Record<string, LiveNode[]>;
        const list: LiveNode[] = [];
        Object.keys(state).forEach((k) => {
          const first = state[k] && state[k][0];
          if (first) list.push(first);
        });
        setNodes(list);
        setOnlineCount(list.length);
      })
      .on('presence', { event: 'join' }, (payload) => {
        if (!joinReady) return; // ignora el burst inicial de presencias existentes
        const arrivals = payload.newPresences as unknown as LiveNode[];
        arrivals.forEach((n) => {
          if (n && n.id !== userId) pushEvent(`${n.username || 'Un nodo'} entró a la red`, 'join');
        });
      })
      .on('broadcast', { event: 'activity' }, (msg) => {
        const p = msg.payload as { text?: string; kind?: LiveEventKind } | undefined;
        if (p && p.text) pushEvent(p.text, p.kind ?? 'action');
      })
      .subscribe((status) => {
        if (String(status) === 'SUBSCRIBED') {
          setConnected(true);
          const m = metaRef.current;
          void channel.track({
            id: userId,
            username: m.username,
            node_type: m.node_type,
            node_level: m.node_level,
            online_at: new Date().toISOString(),
          });
          // A partir de ~3s tras conectar, los joins ya son llegadas reales.
          joinTimer = setTimeout(() => { joinReady = true; }, 3000);
        } else {
          setConnected(false);
        }
      });

    return () => {
      setConnected(false);
      if (joinTimer) clearTimeout(joinTimer);
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [userId, pushEvent]);

  return { onlineCount, nodes, events, broadcast, connected };
}
