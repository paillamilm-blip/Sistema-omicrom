-- =====================================================================
-- 0062_aplicar_analisis_cv.sql — Fix crítico: la RPC que ConvalidaOmicron.tsx
-- llama al analizar un CV (`aplicar_analisis_cv`) NUNCA EXISTIÓ en el
-- servidor. Por eso "el CV tiene 3 entradas y ninguna carga y no convalida
-- nada" (reporte de usuario): el cliente extraía el texto, lo analizaba
-- (heurística local + IA de analizar-cv), y al intentar persistirlo
-- recibía un error de función inexistente — silenciosamente, sin romper
-- la UI, pero sin escribir NADA en el perfil real.
--
-- Mismo patrón que 0048_convalidar_credencial.sql:
--   · SECURITY DEFINER → puede escribir los scores (sortea el trigger 0007).
--   · Usa auth.uid() → SOLO puede aplicar el análisis a TU propio perfil.
--   · Aditiva por eje (GREATEST(actual, nuevo)) → nunca baja un eje existente
--     si el usuario vuelve a subir un CV más flojo por error.
--
-- Además persiste lo que el usuario pidió explícitamente mostrar en el
-- Dossier de Experticia: resumen de 2 párrafos, años de experiencia, y el
-- detalle de skills con % de dominio (no solo etiquetas sueltas).
--
-- Idempotente.
-- =====================================================================

-- ── Columnas nuevas para el resultado del análisis de CV ─────────────
alter table public.profiles
  add column if not exists cv_summary text,
  add column if not exists cv_years_experience integer,
  add column if not exists skills_detail jsonb not null default '[]'::jsonb;

comment on column public.profiles.cv_summary is
  'Resumen de 2 párrafos generado por la IA (analizar-cv) o heurística local, explicando el nivel del profesional citando su CV real.';
comment on column public.profiles.cv_years_experience is
  'Años de experiencia detectados/declarados en el CV analizado.';
comment on column public.profiles.skills_detail is
  'Array de {name: text, pct: 0-100} — skill + porcentaje de dominio estimado, mostrado en el Dossier de Experticia.';

-- ── RPC: aplica el análisis completo del CV al perfil real ───────────
create or replace function public.aplicar_analisis_cv(
  p_name          text,
  p_skills        text[],
  p_exec          numeric,
  p_qual          numeric,
  p_trans         numeric,
  p_fund          numeric,
  p_years         integer default null,
  p_summary       text default null,
  p_skills_detail jsonb default null
)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  v_clamp_exec  numeric := greatest(0, least(100, coalesce(p_exec, 0)));
  v_clamp_qual  numeric := greatest(0, least(100, coalesce(p_qual, 0)));
  v_clamp_trans numeric := greatest(0, least(100, coalesce(p_trans, 0)));
  v_clamp_fund  numeric := greatest(0, least(100, coalesce(p_fund, 0)));
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  -- Ejes: ADITIVO por eje — un CV nuevo nunca hace bajar un eje ya ganado
  -- (mismo criterio de "nunca destructivo" que convalidar_credencial).
  -- Nombre/skills/resumen/años/detalle SÍ se sobrescriben: son la foto más
  -- reciente y completa de quién es el usuario, no un acumulador.
  update public.profiles set
    full_name           = case when coalesce(p_name, '') <> '' then p_name else full_name end,
    skills              = case when p_skills is not null and array_length(p_skills, 1) > 0 then p_skills else skills end,
    execution_score     = greatest(coalesce(execution_score, 0), v_clamp_exec),
    quality_score       = greatest(coalesce(quality_score, 0), v_clamp_qual),
    transcendence_score = greatest(coalesce(transcendence_score, 0), v_clamp_trans),
    foundation_score    = greatest(coalesce(foundation_score, 0), v_clamp_fund),
    cv_years_experience = coalesce(p_years, cv_years_experience),
    cv_summary           = coalesce(p_summary, cv_summary),
    skills_detail        = coalesce(p_skills_detail, skills_detail)
  where id = uid;
  -- → el trigger recalc_reputation (0050) recalcula experience_score y reputation_score.

  -- Auditoría best-effort (no crítica si el esquema difiere).
  begin
    insert into public.reputation_history(user_id, reason)
    values (uid, 'Análisis de CV aplicado (IA + heurística)');
  exception when others then
    null;
  end;

  return json_build_object(
    'ok', true,
    'reputation', (select reputation_score from public.profiles where id = uid)
  );
end;
$fn$;

revoke all on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) from public, anon;
grant execute on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) to authenticated;

notify pgrst, 'reload schema';
