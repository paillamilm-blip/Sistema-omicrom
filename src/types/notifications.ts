// types/notifications.ts
// Notificaciones del sistema

export type NotificationType =
  | 'JOB_MATCH'
  | 'REPUTATION_ALERT'
  | 'AUDIT_TRIGGERED'
  | 'DISPUTE_OPENED'
  | 'ARBITRATION_VERDICT'
  | 'CONTRACT_COMPLETED'
  | 'MESSAGE_RECEIVED';

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  related_id?: string;
  is_read: boolean;
  created_at: string;
}
