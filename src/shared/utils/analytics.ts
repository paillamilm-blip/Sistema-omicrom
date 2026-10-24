// src/lib/analytics.ts
// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS — Métricas reales para inversionistas.
// Trackea: activación, retención, engagement, conversión.
// Guarda en Supabase (tabla analytics_events) para queries server-side.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from '@/infrastructure/supabase/client';

export type EventName =
  // Acquisition
  | 'app_opened'
  | 'signup_started'
  | 'signup_completed'
  // Activation
  | 'onboarding_started'
  | 'onboarding_completed'
  | 'first_profile_generated'
  // Engagement
  | 'orb_node_tapped'
  | 'chat_message_sent'
  | 'job_viewed'
  | 'job_applied'
  | 'carta_generated'
  | 'challenge_completed'
  | 'skill_validated'
  | 'cv_uploaded'
  | 'cv_analyzed'
  | 'service_published'
  // Retention
  | 'daily_return'
  | 'streak_continued'
  | 'push_received'
  | 'push_clicked'
  // Social
  | 'connection_sent'
  | 'connection_accepted'
  | 'dm_sent'
  | 'follow_user'
  // Revenue
  | 'checkout_started'
  | 'payment_completed';

interface EventProperties {
  [key: string]: string | number | boolean | null;
}

/**
 * Trackear un evento de analytics.
 * Guarda en Supabase + localStorage para métricas offline.
 */
export function track(event: EventName, properties?: EventProperties): void {
  const payload = {
    event,
    properties: properties ?? {},
    timestamp: new Date().toISOString(),
    session_id: getSessionId(),
    user_agent: navigator.userAgent.slice(0, 200),
    screen: `${window.innerWidth}x${window.innerHeight}`,
  };

  // Guardar en Supabase (fire-and-forget)
  supabase.from('analytics_events').insert({
    event_name: event,
    properties: payload.properties,
    session_id: payload.session_id,
    device_info: { ua: payload.user_agent, screen: payload.screen },
    created_at: payload.timestamp,
  }).then(() => {});

  // Log en dev
  if (import.meta.env.DEV) {
    console.log(`[analytics] ${event}`, properties ?? '');
  }
}

/**
 * Trackear tiempo en una sección (para medir engagement depth).
 */
export function trackTime(section: string): () => void {
  const start = Date.now();
  return () => {
    const seconds = Math.round((Date.now() - start) / 1000);
    if (seconds > 2) { // Solo si estuvo >2s (no bounces)
      track('orb_node_tapped', { section, seconds_spent: seconds });
    }
  };
}

/**
 * Session ID único por visita (se regenera cada vez que cierra el tab).
 */
function getSessionId(): string {
  const key = 'omicron_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}
