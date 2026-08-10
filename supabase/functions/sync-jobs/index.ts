// supabase/functions/sync-jobs/index.ts
// ═══════════════════════════════════════════════════════════════════════
// SYNC-JOBS — Sincroniza empleos REALES desde APIs públicas gratuitas.
// Fuentes: Himalayas.app + Remotive.com + Arbeitnow.com
// Todas 100% gratis, sin API key, sin rate limit agresivo.
// Upsert con deduplicación por (source, external_id).
// ═══════════════════════════════════════════════════════════════════════

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── Tipos internos ───────────────────────────────────────────────────
interface NormalizedJob {
  source: string;
  external_id: string;
  external_url: string;
  title: string;
  description: string;
  company_name: string;
  category: string;
  tags: string[];
  remote: boolean;
  salary_range: string | null;
  location: string | null;
  published_at: string;
}

// ── HIMALAYAS ────────────────────────────────────────────────────────
async function fetchHimalayas(): Promise<NormalizedJob[]> {
  try {
    const res = await fetch('https://himalayas.app/jobs/api?limit=30');
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.jobs ?? data ?? [];
    return jobs.map((j: any) => ({
      source: 'himalayas',
      external_id: String(j.id ?? j.slug ?? ''),
      external_url: j.applicationUrl ?? j.url ?? `https://himalayas.app/jobs/${j.slug}`,
      title: j.title ?? '',
      description: (j.excerpt ?? j.description ?? '').slice(0, 500),
      company_name: j.companyName ?? j.company?.name ?? 'Empresa',
      category: inferCategory(j.title, j.categories ?? []),
      tags: (j.categories ?? j.tags ?? []).slice(0, 8),
      remote: true,
      salary_range: parseSalary(j.minSalary, j.maxSalary),
      location: j.location ?? null,
      published_at: j.pubDate ?? j.publishedDate ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.error('[sync-jobs] Himalayas error:', e);
    return [];
  }
}

// ── REMOTIVE ─────────────────────────────────────────────────────────
async function fetchRemotive(): Promise<NormalizedJob[]> {
  try {
    const res = await fetch('https://remotive.com/api/remote-jobs?limit=30');
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.jobs ?? [];
    return jobs.map((j: any) => ({
      source: 'remotive',
      external_id: String(j.id ?? ''),
      external_url: j.url ?? '',
      title: j.title ?? '',
      description: (j.description ?? '').replace(/<[^>]+>/g, '').slice(0, 500),
      company_name: j.company_name ?? 'Empresa',
      category: inferCategory(j.title, [j.category ?? '']),
      tags: [j.category, ...(j.tags ?? [])].filter(Boolean).slice(0, 8),
      remote: true,
      salary_range: j.salary || null,
      location: j.candidate_required_location || null,
      published_at: j.publication_date ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.error('[sync-jobs] Remotive error:', e);
    return [];
  }
}

// ── ARBEITNOW ────────────────────────────────────────────────────────
async function fetchArbeitnow(): Promise<NormalizedJob[]> {
  try {
    const allJobs: NormalizedJob[] = [];
    // Paginar hasta 3 páginas (max ~60 empleos)
    for (let page = 1; page <= 3; page++) {
      const res = await fetch(`https://www.arbeitnow.com/api/job-board-api?page=${page}`);
      if (!res.ok) break;
      const data = await res.json();
      const jobs = data.data ?? [];
      if (jobs.length === 0) break;

      for (const j of jobs) {
        allJobs.push({
          source: 'arbeitnow',
          external_id: String(j.slug ?? j.url ?? ''),
          external_url: j.url ?? `https://www.arbeitnow.com/view/${j.slug}`,
          title: j.title ?? '',
          description: (j.description ?? '').replace(/<[^>]+>/g, '').slice(0, 500),
          company_name: j.company_name ?? 'Empresa',
          category: inferCategory(j.title, j.tags ?? []),
          tags: (j.tags ?? []).slice(0, 8),
          remote: j.remote ?? false,
          salary_range: null, // Arbeitnow no siempre incluye salario
          location: j.location ?? null,
          published_at: safeDate(j.created_at),
        });
      }
    }
    return allJobs;
  } catch (e) {
    console.error('[sync-jobs] Arbeitnow error:', e);
    return [];
  }
}

// ── GETONBOARD (Chile/LATAM — tech jobs) ─────────────────────────────
async function fetchGetOnBoard(): Promise<NormalizedJob[]> {
  try {
    const res = await fetch('https://www.getonbrd.com/api/v0/search/jobs?per_page=50&country_id=chile');
    if (!res.ok) return [];
    const data = await res.json();
    const jobs = data.data ?? [];
    return jobs.map((j: any) => ({
      source: 'getonboard',
      external_id: String(j.id ?? ''),
      external_url: j.attributes?.url ?? `https://www.getonbrd.com/jobs/${j.id}`,
      title: j.attributes?.title ?? '',
      description: (j.attributes?.description_headline ?? '').slice(0, 500),
      company_name: j.attributes?.company?.data?.attributes?.name ?? 'Empresa Chile',
      category: inferCategory(j.attributes?.title ?? '', j.attributes?.tags ?? []),
      tags: (j.attributes?.tags ?? []).slice(0, 8),
      remote: j.attributes?.remote ?? false,
      salary_range: j.attributes?.min_salary && j.attributes?.max_salary
        ? `$${j.attributes.min_salary}-$${j.attributes.max_salary} USD`
        : null,
      location: j.attributes?.city ?? 'Chile',
      published_at: j.attributes?.published_at ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.error('[sync-jobs] GetOnBoard error:', e);
    return [];
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function inferCategory(title: string, tags: string[]): string {
  const t = (title + ' ' + tags.join(' ')).toLowerCase();
  if (/front.?end|react|vue|angular|css|html|ui/i.test(t)) return 'frontend';
  if (/back.?end|node|python|java|ruby|php|go|rust|api|server/i.test(t)) return 'backend';
  if (/full.?stack/i.test(t)) return 'fullstack';
  if (/data|analy|machine|ml|ai|deep/i.test(t)) return 'data';
  if (/devops|sre|infra|cloud|aws|docker|kubernetes/i.test(t)) return 'devops';
  if (/mobile|ios|android|flutter|react.native/i.test(t)) return 'mobile';
  if (/design|ux|ui|figma|product.design/i.test(t)) return 'diseño';
  if (/market|growth|seo|content/i.test(t)) return 'marketing';
  if (/manager|lead|director|head/i.test(t)) return 'liderazgo';
  if (/qa|test|quality/i.test(t)) return 'qa';
  return 'otro';
}

function parseSalary(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `$${Math.round(min / 1000)}k–$${Math.round(max / 1000)}k/año`;
  if (min) return `Desde $${Math.round(min / 1000)}k/año`;
  if (max) return `Hasta $${Math.round(max / 1000)}k/año`;
  return null;
}

/** Convierte timestamp unix (seconds) o ISO string a ISO string seguro. */
function safeDate(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'number') {
    const d = new Date(val * 1000);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  return new Date().toISOString();
}

// ── Main Handler ─────────────────────────────────────────────────────
Deno.serve(async (_req) => {
  try {
    console.log('[sync-jobs] Iniciando sincronización...');

    // Fetch en paralelo
    const [himalayasJobs, remotiveJobs, arbeitnowJobs, getonboardJobs] = await Promise.all([
      fetchHimalayas(),
      fetchRemotive(),
      fetchArbeitnow(),
      fetchGetOnBoard(),
    ]);

    const allJobs = [...himalayasJobs, ...remotiveJobs, ...arbeitnowJobs, ...getonboardJobs];
    console.log(`[sync-jobs] Total encontrados: ${allJobs.length} (Himalayas: ${himalayasJobs.length}, Remotive: ${remotiveJobs.length}, Arbeitnow: ${arbeitnowJobs.length}, GetOnBoard: ${getonboardJobs.length})`);

    if (allJobs.length === 0) {
      return new Response(JSON.stringify({ ok: true, synced: 0, message: 'No se encontraron empleos nuevos' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Insert individual — deduplicación manual (select + insert/update).
    // PostgREST no soporta onConflict con partial unique index.
    let synced = 0;
    let errors = 0;
    let skipped = 0;
    const validJobs = allJobs.filter(job => job.external_id && job.title);

    for (const job of validJobs) {
      const row = {
        title: job.title,
        description: job.description,
        is_remote: job.remote,
        location: job.location,
        status: 'OPEN',
        published_at: job.published_at,
        source: job.source,
        external_id: job.external_id,
        external_url: job.external_url,
        salary_range: job.salary_range,
        company_name: job.company_name,
        required_skills: JSON.stringify(job.tags),
      };

      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('job_postings')
        .select('id')
        .eq('source', job.source)
        .eq('external_id', job.external_id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('job_postings')
          .update(row)
          .eq('id', existing.id);
        if (error) { errors++; } else { skipped++; }
      } else {
        const { error } = await supabase
          .from('job_postings')
          .insert(row);
        if (error) { errors++; } else { synced++; }
      }
    }

    console.log(`[sync-jobs] Resultado: ${synced} nuevos, ${skipped} actualizados, ${errors} errores`);

    return new Response(JSON.stringify({
      ok: true,
      synced,
      updated: skipped,
      errors,
      sources: {
        himalayas: himalayasJobs.length,
        remotive: remotiveJobs.length,
        arbeitnow: arbeitnowJobs.length,
        getonboard: getonboardJobs.length,
      },
    }), { headers: { 'Content-Type': 'application/json' } });

  } catch (e) {
    console.error('[sync-jobs] Fatal:', e);
    return new Response(JSON.stringify({ ok: false, error: (e as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
