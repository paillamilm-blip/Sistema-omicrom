// src/features/empleos/components/IncomingJobs.tsx
// ═══════════════════════════════════════════════════════════════════════
// "EL TRABAJO TE BUSCA" — Real-time job notifications via DynamicIsland.
//
// Listens to Supabase Realtime for:
//   1) MATCH personalizado → INSERT en `job_matches` (dorado, prioritario)
//   2) Oferta nueva → INSERT en `job_postings` (cyan, informativo)
//
// Uses the DynamicIsland component for iPhone 14+ style notification.
// ═══════════════════════════════════════════════════════════════════════
import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useApp } from '@/store/AppContext';
import { C } from '@/theme';
import { DynamicIsland } from '@/shared/components/DynamicIsland';
import { notifyOrb } from '@/features/omicron/services/notify';
import { hapticSuccess } from '@/shared/utils/haptics';
import { jobMatchCopy } from '@/shared/utils/microcopy';

interface JobRow {
  id?: string;
  title?: string;
  company_id?: string;
  status?: string;
}

interface Notification {
  icon: string;
  title: string;
  subtitle: string;
  accent: string;
  tab: 'empleos';
}

export function IncomingJobPush() {
  const { profile, setActiveTab } = useApp();
  const [notification, setNotification] = useState<Notification | null>(null);
  const [visible, setVisible] = useState(false);
  const queueRef = useRef<Notification[]>([]);

  const showNext = useCallback(() => {
    const next = queueRef.current.shift();
    if (next) {
      setNotification(next);
      setVisible(true);
    }
  }, []);

  const handleDismiss = useCallback(() => {
    setVisible(false);
    // Show next in queue after dismiss animation
    setTimeout(() => showNext(), 500);
  }, [showNext]);

  const handleTap = useCallback(() => {
    setActiveTab('empleos');
    handleDismiss();
  }, [setActiveTab, handleDismiss]);

  useEffect(() => {
    if (!profile?.id) return;
    const uid = profile.id;

    const push = (notif: Notification) => {
      // Haptic + orb notification
      hapticSuccess();
      notifyOrb(
        notif.title,
        notif.accent === C.gold ? 'gold' : 'info'
      );

      // Queue or show immediately
      if (visible) {
        queueRef.current.push(notif);
      } else {
        setNotification(notif);
        setVisible(true);
      }
    };

    const channel = supabase
      .channel('omicron-jobs-live')
      // 1) Match personalizado: el trabajo te busca A TI
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_matches', filter: `user_id=eq.${uid}` },
        () => {
          push({
            icon: '🎯',
            title: jobMatchCopy('nueva oportunidad', profile),
            subtitle: 'El sistema encontró un match con tu perfil',
            accent: C.gold,
            tab: 'empleos',
          });
        },
      )
      // 2) Oferta nueva publicada en la red
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'job_postings' },
        (payload) => {
          const row = payload.new as JobRow;
          if (!row) return;
          if (row.company_id === uid) return;
          if (row.status && row.status !== 'OPEN') return;
          push({
            icon: '💼',
            title: row.title || 'Nueva oportunidad',
            subtitle: 'Oferta publicada en la red',
            accent: C.cyan,
            tab: 'empleos',
          });
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [profile?.id, profile, visible]);

  if (!notification) return null;

  return (
    <DynamicIsland
      visible={visible}
      icon={notification.icon}
      title={notification.title}
      subtitle={notification.subtitle}
      accent={notification.accent}
      onTap={handleTap}
      onDismiss={handleDismiss}
      duration={8000}
    />
  );
}
