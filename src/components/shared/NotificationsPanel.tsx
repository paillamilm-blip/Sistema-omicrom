import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, FileText, Briefcase, MessageCircle, Star, Info } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../store/AppContext';
import { Modal } from './Modal';
import type { Notification } from '../../types';

interface Props { onClose: () => void }

const TYPE_ICON: Record<string, React.ReactNode> = {
  JOB_MATCH:           <Briefcase size={16} className="text-omicron-green" />,
  CONTRACT_COMPLETED:  <FileText size={16} className="text-omicron-accent" />,
  MESSAGE_RECEIVED:    <MessageCircle size={16} className="text-omicron-cyan" />,
  REPUTATION_ALERT:    <Star size={16} className="text-omicron-gold" />,
  AUDIT_TRIGGERED:     <Info size={16} className="text-omicron-gold" />,
  DISPUTE_OPENED:      <Info size={16} className="text-red-400" />,
  ARBITRATION_VERDICT: <Info size={16} className="text-omicron-accent" />,
  info:                <Info size={16} className="text-omicron-subtle" />,
};

export function NotificationsPanel({ onClose }: Props) {
  const { profile, unreadCount, setUnreadCount } = useApp();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => {
        setNotifications(data as Notification[] ?? []);
        setLoading(false);
      });
  }, [profile]);


  async function markAllRead() {
    if (!profile) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', profile.id)
      .eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function markOne(id: string) {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    setUnreadCount(Math.max(0, unreadCount - 1));
  }

  function timeAgo(iso: string) {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  }

  const unread = notifications.filter(n => !n.is_read).length;


  return (
    <Modal title="Notificaciones" onClose={onClose}>
      {/* Actions bar */}
      {unread > 0 && (
        <div className="flex justify-between items-center px-5 py-2 border-b border-omicron-border">
          <span className="text-omicron-subtle text-xs">{unread} sin leer</span>
          <button
            onClick={markAllRead}
            className="flex items-center gap-1 text-omicron-accent text-xs font-medium hover:text-violet-400 transition"
          >
            <CheckCheck size={14} />
            Marcar todo leído
          </button>
        </div>
      )}

      <div className="pb-4">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-omicron-subtle text-sm">
            Cargando...
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center py-16 gap-3">
            <Bell size={32} className="text-omicron-muted" />
            <p className="text-omicron-subtle text-sm">Sin notificaciones</p>
          </div>
        ) : (


          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => !notif.is_read && markOne(notif.id)}
              className={`flex items-start gap-3 px-5 py-3.5 border-b border-omicron-border/50 cursor-pointer transition ${
                !notif.is_read ? 'bg-omicron-accent/5 hover:bg-omicron-accent/10' : 'hover:bg-omicron-surface/50'
              }`}
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-none mt-0.5 ${
                !notif.is_read ? 'bg-omicron-accent/20 border border-omicron-accent/30' : 'bg-omicron-surface border border-omicron-border'
              }`}>
                {TYPE_ICON[notif.type] ?? TYPE_ICON.info}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-omicron-text text-sm font-semibold leading-tight truncate">{notif.title}</p>
                  <span className="text-omicron-subtle text-[10px] flex-none">{timeAgo(notif.created_at)}</span>
                </div>
                {notif.message && <p className="text-omicron-subtle text-xs mt-0.5 leading-snug">{notif.message}</p>}
              </div>
              {!notif.is_read && (
                <Check size={12} className="text-omicron-accent flex-none mt-1.5" />
              )}
            </div>
          ))
        )}
      </div>
    </Modal>
  );
}
