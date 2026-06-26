// src/lib/secureChat.ts
// Cliente de la "Caja Negra": habla con las Edge Functions de cifrado.
// El navegador NUNCA ve la clave; solo envía/recibe texto plano por TLS.

import { supabase } from './supabase';
import type { Message } from '../types';

export interface SecureHistory {
  messages: Message[];
  integrity_ok: boolean;
}

/** Envía un mensaje cifrado a la sala (network_id = contrato). */
export async function sendSecureMessage(networkId: string, content: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke('chat-send', {
    body: { network_id: networkId, content },
  });
  // Reintento simple ante conflicto de cadena (dos envíos a la vez)
  if (data?.retry) {
    const retry = await supabase.functions.invoke('chat-send', {
      body: { network_id: networkId, content },
    });
    if (retry.error || retry.data?.error) {
      throw new Error(retry.data?.error || retry.error?.message || 'Error al enviar.');
    }
    return;
  }
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Error al enviar el mensaje.');
  }
}

/** Carga y descifra el historial de una sala + flag de integridad. */
export async function loadSecureMessages(networkId: string): Promise<SecureHistory> {
  const { data, error } = await supabase.functions.invoke('chat-history', {
    body: { network_id: networkId },
  });
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Error al cargar el chat.');
  }
  return {
    messages: (data?.messages as Message[]) ?? [],
    integrity_ok: data?.integrity_ok !== false,
  };
}

// ===== Apertura de la Caja Negra (quórum de árbitros) =====

export interface BlackboxTranscriptItem {
  id: string;
  sender_id: string;
  sender?: { id: string; username: string };
  content: string;
  created_at: string;
}

export interface BlackboxResult {
  unlocked: boolean;
  votes: number;
  threshold: number;
  integrity_ok?: boolean;
  transcript?: BlackboxTranscriptItem[];
  message?: string;
}

/**
 * Un árbitro asignado vota para abrir la Caja Negra de una disputa.
 * - Si aún no hay quórum: devuelve { unlocked:false, votes, threshold }.
 * - Si se alcanza el quórum (2 de 3): devuelve la transcripción descifrada.
 */
export async function openBlackbox(disputeId: string): Promise<BlackboxResult> {
  const { data, error } = await supabase.functions.invoke('blackbox-open', {
    body: { dispute_id: disputeId },
  });
  if (error || data?.error) {
    throw new Error(data?.error || error?.message || 'Error al abrir la Caja Negra.');
  }
  return data as BlackboxResult;
}
