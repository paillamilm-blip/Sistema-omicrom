// supabase/functions/_shared/userContext.ts
// ═══════════════════════════════════════════════════════════════════════
// CONTEXTO UNIFICADO DEL USUARIO — Módulo compartido para TODAS las Edge Functions.
//
// Filosofía: cada función IA del sistema de aprendizaje continuo en tiempo real
// necesita conocer al usuario COMPLETO (skills, CV, ejes, nivel, historial,
// competencias validadas). Este módulo centraliza esa extracción para que
// todas las funciones operen con la misma fuente de verdad.
//
// Uso:
//   const ctx = await getUserContext(admin, userId);
//   // ctx.profile, ctx.skills, ctx.cv_summary, ctx.axes, ctx.competencias, etc.
// ═══════════════════════════════════════════════════════════════════════

import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Tipos ──────────────────────────────────────────────────────────────

export interface UserAxes {
  execution: number;
  quality: number;
  transcendence: number;
  foundation: number;
}

export interface UserContext {
  userId: string;
  fullName: string;
  username: string;
  nodeType: string;
  nodeLevel: number;
  reputationScore: number;
  pePoints: number;
  axes: UserAxes;
  skills: string[];
  skillsDetail: { name: string; pct: number }[];
  cvSummary: string;
  cvYearsExperience: number;
  competenciasValidadas: string[];       // títulos de nodos aprobados
  ultimoExamen: { nodo: string; puntaje: number; veredicto: string } | null;
  isPremium: boolean;
}

// ─── Sanitización anti prompt-injection ─────────────────────────────────

const MAX_CV_LENGTH = 500;
const INJECTION_PATTERNS = /(?:ignore|forget|disregard|override|new instructions|system prompt|you are now|act as|pretend)/gi;

/**
 * Sanitiza un string de CV/texto libre para prevenir prompt injection.
 * Trunca a MAX_CV_LENGTH chars y neutraliza patrones sospechosos.
 */
export function sanitizeFreeText(text: string): string {
  if (!text) return '';
  let clean = text.slice(0, MAX_CV_LENGTH).trim();
  // Neutralizar posibles instrucciones inyectadas
  if (INJECTION_PATTERNS.test(clean)) {
    clean = clean.replace(INJECTION_PATTERNS, '[REDACTED]');
  }
  // Eliminar caracteres de control
  clean = clean.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
  return clean;
}

// ─── Auth helper ────────────────────────────────────────────────────────

/**
 * Extrae el userId del JWT del request. Retorna null si no autenticado.
 */
export async function authenticateUser(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<string | null> {
  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader) return null;
  const c = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data } = await c.auth.getUser();
  return data?.user?.id ?? null;
}

// ─── Contexto completo ──────────────────────────────────────────────────

/**
 * Obtiene el contexto completo del usuario desde la BD (service_role).
 * Incluye: perfil, ejes, skills, CV, competencias validadas, último examen.
 * Diseñado para ser llamado UNA VEZ por request y compartido en el prompt.
 */
export async function getUserContext(
  admin: SupabaseClient,
  userId: string,
): Promise<UserContext | null> {
  // 1) Perfil completo
  const { data: prof } = await admin
    .from('profiles')
    .select(
      'full_name, username, node_type, node_level, reputation_score, pe_points, ' +
      'execution_score, quality_score, transcendence_score, foundation_score, ' +
      'skills, skills_detail, cv_summary, cv_years_experience, is_premium'
    )
    .eq('id', userId)
    .maybeSingle();

  if (!prof) return null;

  // 2) Competencias validadas (títulos de nodos aprobados por examen)
  const { data: actas } = await admin
    .from('actas_evidencia')
    .select('nodo:skill_tree_nodes(title)')
    .eq('user_id', userId)
    .eq('veredicto', 'APROBADO')
    .order('created_at', { ascending: false })
    .limit(20);

  const competencias = [...new Set(
    (actas ?? [])
      .map((a: any) => a.nodo?.title)
      .filter(Boolean) as string[]
  )];

  // 3) Último examen rendido (para contexto de progreso)
  const { data: lastExam } = await admin
    .from('actas_evidencia')
    .select('puntaje_global, veredicto, nodo:skill_tree_nodes(title)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const ultimoExamen = lastExam
    ? {
        nodo: (lastExam as any).nodo?.title ?? 'Desconocido',
        puntaje: (lastExam as any).puntaje_global ?? 0,
        veredicto: (lastExam as any).veredicto ?? 'N/A',
      }
    : null;

  return {
    userId,
    fullName: prof.full_name ?? '',
    username: prof.username ?? '',
    nodeType: prof.node_type ?? 'Nodo Operativo',
    nodeLevel: prof.node_level ?? 1,
    reputationScore: Math.round(prof.reputation_score ?? 0),
    pePoints: prof.pe_points ?? 0,
    axes: {
      execution: Math.round(prof.execution_score ?? 0),
      quality: Math.round(prof.quality_score ?? 0),
      transcendence: Math.round(prof.transcendence_score ?? 0),
      foundation: Math.round(prof.foundation_score ?? 0),
    },
    skills: Array.isArray(prof.skills) ? prof.skills : [],
    skillsDetail: Array.isArray(prof.skills_detail) ? prof.skills_detail : [],
    cvSummary: sanitizeFreeText((prof.cv_summary ?? '').toString()),
    cvYearsExperience: prof.cv_years_experience ?? 0,
    competenciasValidadas: competencias,
    ultimoExamen,
    isPremium: prof.is_premium ?? false,
  };
}

// ─── Generador de contexto textual para prompts ─────────────────────────

/**
 * Genera un bloque de texto compacto con el contexto del usuario,
 * listo para inyectar en cualquier system prompt de la plataforma.
 * Cada función puede usar la versión completa o un subset.
 */
export function formatContextForPrompt(ctx: UserContext, options?: {
  includeCompetencias?: boolean;
  includeCV?: boolean;
  includeLastExam?: boolean;
  includeAxes?: boolean;
}): string {
  const opts = {
    includeCompetencias: true,
    includeCV: true,
    includeLastExam: true,
    includeAxes: true,
    ...options,
  };

  const parts: string[] = [];

  parts.push(`USUARIO: ${ctx.fullName || ctx.username} (@${ctx.username})`);
  parts.push(`NIVEL: ${ctx.nodeType} N${ctx.nodeLevel} · Reputación ${ctx.reputationScore}/100 · ${ctx.pePoints} PE`);

  if (opts.includeAxes) {
    parts.push(
      `GEMELO DIGITAL: Ejecución=${ctx.axes.execution}, Calidad=${ctx.axes.quality}, ` +
      `Trascendencia=${ctx.axes.transcendence}, Fundamento=${ctx.axes.foundation}`
    );
  }

  if (ctx.skills.length > 0) {
    parts.push(`SKILLS: ${ctx.skills.slice(0, 12).join(', ')}`);
  }

  if (opts.includeCV && ctx.cvSummary) {
    parts.push(`CV: ${ctx.cvSummary} (${ctx.cvYearsExperience} años exp.)`);
  }

  if (opts.includeCompetencias && ctx.competenciasValidadas.length > 0) {
    parts.push(`COMPETENCIAS VALIDADAS: ${ctx.competenciasValidadas.slice(0, 10).join(', ')}`);
  }

  if (opts.includeLastExam && ctx.ultimoExamen) {
    parts.push(
      `ÚLTIMO EXAMEN: "${ctx.ultimoExamen.nodo}" → ${ctx.ultimoExamen.veredicto} (${ctx.ultimoExamen.puntaje}%)`
    );
  }

  return parts.join('\n');
}
