// src/lib/secureChat.ts
// Cliente de la "Caja Negra" — versión 100% SQL (RPCs Postgres).
// El cifrado/descifrado ocurre dentro de Supabase (pgcrypto + Vault).
// El navegador NUNCA ve la clave; solo envía/recibe texto plano por TLS.

import { supabase } from './supabase';
import type { Message } from '../types';

export interface SecureHistory {
  messages: Message[];
  integrity_ok: boolean;
}

/** Envía un mensaje cifrado a la sala (network_id = contrato). */
export async function sendSecureMessage(networkId: string, content: string): Promise<void> {
  const { data, error } = await supabase.rpc('send_secure_message', {
    p_network_id: networkId,
    p_content: content,
  });
  if (error) throw new Error(error.message || 'Error al enviar el mensaje.');
  if (data && (data as { ok?: boolean }).ok === false) {
    throw new Error('No se pudo enviar el mensaje.');
  }
}

/** Carga y descifra el historial de una sala + flag de integridad. */
export async function loadSecureMessages(networkId: string): Promise<SecureHistory> {
  const { data, error } = await supabase.rpc('get_secure_messages', {
    p_network_id: networkId,
  });
  if (error) throw new Error(error.message || 'Error al cargar el chat.');
  const payload = (data ?? {}) as { messages?: Message[]; integrity_ok?: boolean };
  return {
    messages: payload.messages ?? [],
    integrity_ok: payload.integrity_ok !== false,
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
 * - Si aún no hay quórum: { unlocked:false, votes, threshold }.
 * - Si se alcanza el quórum (2 de 3): devuelve la transcripción descifrada.
 */
export async function openBlackbox(disputeId: string): Promise<BlackboxResult> {
  const { data, error } = await supabase.rpc('open_blackbox', {
    p_dispute_id: disputeId,
  });
  if (error) throw new Error(error.message || 'Error al abrir la Caja Negra.');
  return (data ?? { unlocked: false, votes: 0, threshold: 2 }) as BlackboxResult;
}
