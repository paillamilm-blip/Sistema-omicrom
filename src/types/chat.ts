// types/chat.ts
// Chat rooms, mensajes y mensajería directa

// ===== CHAT ROOMS (Job-linked) =====
export interface ChatRoom {
  id: string;
  job_id: string;
  participant_1: string;
  participant_2: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'DISPUTED';
  created_at: string;
}

export interface ChatMessage {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_hash: string;
  created_at: string;
}

// ===== MENSAJERÍA DIRECTA =====
export interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  network_id: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: { id: string; username: string };
}
