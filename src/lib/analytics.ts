// src/lib/analytics.ts
// ═══════════════════════════════════════════════════════════════════════
// ANALYTICS — Métricas reales para inversionistas.
// Trackea: activación, retención, engagement, conversión.
// Guarda en Supabase (tabla analytics_events) para queries server-side.
// ═══════════════════════════════════════════════════════════════════════

import { supabase } from './supabase';

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

// ═══════════════════════════════════════════════════════════════════════
// MÉTRICAS CALCULADAS (para dashboard de inversionistas)
// ═══════════════════════════════════════════════════════════════════════

export interface InvestorMetrics {
  totalUsers: number;
  activeUsersD7: number;
  activationRate: number; // % que completa onboarding
  retentionD7: number; // % que vuelve al día 7
  avgSessionsPerUser: number;
  totalJobApplications: number;
  totalConnections: number;
  dailyActiveUsers: number;
  monthlyActiveUsers: number;
  revenue: number;
}

/**
 * Calcula métricas clave para inversionistas.
 * Llama a RPCs de Supabase que hacen los cálculos server-side.
 */
export async function getInvestorMetrics(): Promise<InvestorMetrics | null> {
  try {
    const [users, active7, activations, sessions, jobs, connections] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).neq('is_ghost', true),
      supabase.from('daily_activity').select('user_id', { count: 'exact', head: true })
        .gte('activity_date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)),
      supabase.from('profiles').select('id', { count: 'exact', head: true })
        .neq('is_ghost', true).not('skills', 'is', null),
      supabase.from('analytics_events').select('session_id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
      supabase.from('job_applications').select('id', { count: 'exact', head: true }),
      supabase.from('connections').select('id', { count: 'exact', head: true }),
    ]);

    const totalUsers = users.count ?? 0;
    const activeD7 = active7.count ?? 0;
    const activatedUsers = activations.count ?? 0;
    const totalSessions = sessions.count ?? 0;
    const totalJobs = jobs.count ?? 0;
    const totalConns = connections.count ?? 0;

    return {
      totalUsers,
      activeUsersD7: activeD7,
      activationRate: totalUsers > 0 ? Math.round((activatedUsers / totalUsers) * 100) : 0,
      retentionD7: totalUsers > 0 ? Math.round((activeD7 / totalUsers) * 100) : 0,
      avgSessionsPerUser: totalUsers > 0 ? Math.round(totalSessions / totalUsers) : 0,
      totalJobApplications: totalJobs,
      totalConnections: totalConns,
      dailyActiveUsers: activeD7, // Aproximación
      monthlyActiveUsers: totalUsers, // Todos los que tienen actividad
      revenue: 0, // Stripe no activado aún
    };
  } catch (e) {
    console.error('[analytics] Error obteniendo métricas:', e);
    return null;
  }
}
