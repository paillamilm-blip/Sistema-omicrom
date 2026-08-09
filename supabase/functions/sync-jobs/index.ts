// supabase/functions/sync-jobs/index.ts
// ═══════════════════════════════════════════════════════════════════════
// SYNC JOBS — Consulta APIs públicas de empleo y guarda en job_postings.
// Fuentes: Himalayas (remoto, gratis, sin key) + Remotive (tech remoto).
// Se ejecuta periódicamente (cron o manual) cada 6-12 horas.
// ═══════════════════════════════════════════════════════════════════════
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

// ── Normalizar al schema de job_postings ─────────────────────────────
interface NormalizedJob {
  title: string;
  description: string;
  category: string;
  tags: string[];
  budget_usd: number;
  status: string;
  published_at: string;
  source: string;
  external_id: string;
  external_url: string;
  remote: boolean;
  salary_range: string;
  required_node_level: number;
  time_limit_hours: number;
  company_id: string;
}

// ── HIMALAYAS API (remoto, gratis, sin auth) ─────────────────────────
async function fetchHimalayas(): Promise<NormalizedJob[]> {
  try {
    const resp = await fetch('https://himalayas.app/jobs/api?limit=20');
    if (!resp.ok) return [];
    const data = await resp.json();
    const jobs = data?.jobs ?? [];
    return jobs.map((j: any) => ({
      title: j.title ?? 'Sin título',
      description: (j.excerpt ?? j.description ?? '').slice(0, 2000),
      category: inferCategory(j.title, j.categories ?? []),
      tags: (j.categories ?? []).slice(0, 5),
      budget_usd: parseSalary(j.salary),
      status: 'OPEN',
      published_at: j.pubDate ?? new Date().toISOString(),
      source: 'himalayas',
      external_id: String(j.id ?? j.slug ?? Math.random()),
      external_url: j.applicationLink ?? j.url ?? `https://himalayas.app/jobs/${j.slug}`,
      remote: true,
      salary_range: j.salary ?? '',
      required_node_level: 1,
      time_limit_hours: 160,
      company_id: '00000000-0000-0000-0000-000000000001',
    }));
  } catch (e) {
    console.error('[sync-jobs] Himalayas error:', e);
    return [];
  }
}

// ── REMOTIVE API (tech remoto, gratis, sin auth) ─────────────────────
async function fetchRemotive(): Promise<NormalizedJob[]> {
  try {
    const resp = await fetch('https://remotive.com/api/remote-jobs?category=software-dev&limit=15');
    if (!resp.ok) return [];
    const data = await resp.json();
    const jobs = data?.jobs ?? [];
    return jobs.map((j: any) => ({
      title: j.title ?? 'Sin título',
      description: (j.description ?? '').replace(/<[^>]*>/g, '').slice(0, 2000),
      category: inferCategory(j.title, j.tags ?? []),
      tags: (j.tags ?? []).slice(0, 5),
      budget_usd: parseSalary(j.salary),
      status: 'OPEN',
      published_at: j.publication_date ?? new Date().toISOString(),
      source: 'remotive',
      external_id: String(j.id),
      external_url: j.url ?? '',
      remote: true,
      salary_range: j.salary ?? '',
      required_node_level: 1,
      time_limit_hours: 160,
      company_id: '00000000-0000-0000-0000-000000000001',
    }));
  } catch (e) {
    console.error('[sync-jobs] Remotive error:', e);
    return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function inferCategory(title: string, tags: string[]): string {
  const t = (title + ' ' + tags.join(' ')).toLowerCase();
  if (/frontend|react|vue|angular|css/.test(t)) return 'frontend';
  if (/backend|node|python|java|go|rust|api/.test(t)) return 'backend';
  if (/full.?stack/.test(t)) return 'fullstack';
  if (/design|ux|ui|figma/.test(t)) return 'diseño';
  if (/data|ml|machine|ai|analytics/.test(t)) return 'data';
  if (/devops|sre|cloud|infra/.test(t)) return 'devops';
  if (/lead|manager|director/.test(t)) return 'liderazgo';
  if (/mobile|ios|android|flutter/.test(t)) return 'mobile';
  return 'desarrollo';
}

function parseSalary(salary: string | null | undefined): number {
  if (!salary) return 0;
  const nums = salary.match(/\d[\d,]*/g);
  if (!nums || nums.length === 0) return 0;
  const values = nums.map(n => parseInt(n.replace(/,/g, ''), 10)).filter(n => n > 100);
  if (values.length === 0) return 0;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

// ── HANDLER ──────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    console.log('[sync-jobs] Starting job sync...');

    // Fetch from all sources in parallel
    const [himalayas, remotive] = await Promise.all([
      fetchHimalayas(),
      fetchRemotive(),
    ]);

    const allJobs = [...himalayas, ...remotive];
    console.log(`[sync-jobs] Fetched ${allJobs.length} jobs (Himalayas: ${himalayas.length}, Remotive: ${remotive.length})`);

    if (allJobs.length === 0) {
      return json({ ok: true, synced: 0, message: 'No jobs found from APIs' });
    }

    // Upsert into job_postings (skip duplicates via external_id)
    let inserted = 0;
    for (const job of allJobs) {
      const { error } = await admin.from('job_postings').upsert(job, {
        onConflict: 'source,external_id',
        ignoreDuplicates: true,
      });
      if (!error) inserted++;
    }

    console.log(`[sync-jobs] Done: ${inserted}/${allJobs.length} jobs synced.`);
    return json({ ok: true, synced: inserted, total: allJobs.length, sources: { himalayas: himalayas.length, remotive: remotive.length } });
  } catch (e) {
    console.error('[sync-jobs] Fatal error:', e);
    return json({ ok: false, error: String(e) }, 500);
  }
});
