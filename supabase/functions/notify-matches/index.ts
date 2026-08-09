// supabase/functions/notify-matches/index.ts
// ═══════════════════════════════════════════════════════════════════════
// NOTIFY-MATCHES — Detecta empleos nuevos con match alto y envía push.
// Cable 2: Empleo nuevo → match vs perfiles → push personalizado.
// Invocar después de sync-jobs (o con pg_cron cada 6h).
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

Deno.serve(async (_req) => {
  try {
    // 1. Empleos publicados en las últimas 12h
    const since = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const { data: recentJobs } = await supabase
      .from('job_postings')
      .select('id, title, required_skills, company_name')
      .eq('status', 'OPEN')
      .gt('published_at', since)
      .limit(50);

    if (!recentJobs || recentJobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, matches: 0, message: 'No hay empleos nuevos' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Perfiles con push subscription activa
    const { data: subscribers } = await supabase
      .from('push_subscriptions')
      .select('user_id')
      .limit(100);

    if (!subscribers || subscribers.length === 0) {
      return new Response(JSON.stringify({ ok: true, matches: 0, message: 'No hay subscribers' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const userIds = [...new Set(subscribers.map(s => s.user_id))];

    // 3. Buscar perfiles de esos usuarios
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, skills, username')
      .in('id', userIds);

    if (!profiles) {
      return new Response(JSON.stringify({ ok: true, matches: 0 }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 4. Calcular matches simples (skill overlap)
    let notified = 0;
    const notifyQueue: { userId: string; jobTitle: string; company: string; matchPct: number }[] = [];

    for (const profile of profiles) {
      const userSkills = (profile.skills ?? []).map((s: string) => s.toLowerCase());
      if (userSkills.length === 0) continue;

      for (const job of recentJobs) {
        let jobSkills: string[] = [];
        try {
          jobSkills = Array.isArray(job.required_skills)
            ? job.required_skills.map((s: string) => s.toLowerCase())
            : JSON.parse(job.required_skills ?? '[]').map((s: string) => s.toLowerCase());
        } catch { continue; }

        if (jobSkills.length === 0) continue;

        const overlap = userSkills.filter((s: string) => jobSkills.some((js: string) => js.includes(s) || s.includes(js)));
        const matchPct = Math.round((overlap.length / Math.max(jobSkills.length, 1)) * 100);

        if (matchPct >= 60) {
          notifyQueue.push({
            userId: profile.id,
            jobTitle: job.title,
            company: job.company_name ?? 'Empresa',
            matchPct,
          });
          break; // Solo 1 notificación por usuario
        }
      }
    }

    // 5. Enviar push a cada match (via send-push)
    if (notifyQueue.length > 0) {
      for (const match of notifyQueue.slice(0, 20)) {
        await supabase.functions.invoke('send-push', {
          body: {
            user_ids: [match.userId],
            payload: {
              title: '💼 Nueva oportunidad',
              body: `${match.jobTitle} en ${match.company} — ${match.matchPct}% match contigo`,
              url: '/?tab=empleos',
            },
          },
        });
        notified++;
      }
    }

    return new Response(JSON.stringify({
      ok: true,
      recentJobs: recentJobs.length,
      subscribers: userIds.length,
      matches: notifyQueue.length,
      notified,
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
});
