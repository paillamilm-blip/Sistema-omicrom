-- =====================================================================
-- 0077_cv_aditivo_suma_total.sql — LÓGICA CORRECTA: TODO SUMA
--
-- FILOSOFÍA OMICRON:
--   El sistema es un MEDIDOR EN TIEMPO REAL. Toda información que ingresa
--   SUMA al perfil del profesional. Nada resta. Cada interacción enriquece.
--
--   Onboarding ("abogado") → base inicial
--   CV (PDF completo) → EXPANDE con más detalle
--   Cursos, contratos, validaciones → siguen sumando
--
-- LÓGICA:
--   · Ejes: GREATEST (el máximo entre lo existente y lo nuevo)
--     → Si el onboarding estimó exec=45 y el CV da exec=62, queda 62
--     → Si el CV da exec=38, queda 45 (nunca baja)
--
--   · Skills: MERGE (unión de existentes + nuevos, sin duplicados)
--     → Si tenía ['Derecho', 'Gestión'] y el CV agrega ['Litigación', 'Contratos']
--       el resultado es ['Derecho', 'Gestión', 'Litigación', 'Contratos']
--
--   · Name: el más reciente si no está vacío
--   · Years: el MAYOR entre existente y nuevo
--   · Summary: el más reciente (CV es más completo)
--   · Skills_detail: MERGE por nombre (actualiza % si ya existe, agrega si es nuevo)
--
-- REEMPLAZA 0076 que usaba overwrite directo (incorrecto para la filosofía Omicron).
-- Idempotente (CREATE OR REPLACE).
-- =====================================================================

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
  v_existing_skills text[];
  v_merged_skills text[];
  v_existing_detail jsonb;
  v_merged_detail jsonb;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  -- Leer skills existentes para hacer MERGE
  select skills, skills_detail
  into v_existing_skills, v_existing_detail
  from public.profiles where id = uid;

  -- ═══════════════════════════════════════════════════════════════════
  -- SKILLS: MERGE (unión sin duplicados)
  -- Los skills nuevos se AGREGAN a los existentes, no los reemplazan.
  -- Esto permite que el onboarding + CV + cursos futuros acumulen.
  -- ═══════════════════════════════════════════════════════════════════
  if p_skills is not null and array_length(p_skills, 1) > 0 then
    -- Unir arrays y eliminar duplicados (case-insensitive)
    select array_agg(distinct skill)
    into v_merged_skills
    from (
      select unnest(coalesce(v_existing_skills, '{}')) as skill
      union
      select unnest(p_skills) as skill
    ) all_skills
    where skill is not null and skill <> '';
  else
    v_merged_skills := v_existing_skills;
  end if;

  -- ═══════════════════════════════════════════════════════════════════
  -- SKILLS_DETAIL: MERGE por nombre
  -- Si un skill ya existe, actualiza el % al MAYOR. Si es nuevo, lo agrega.
  -- ═══════════════════════════════════════════════════════════════════
  if p_skills_detail is not null and jsonb_array_length(p_skills_detail) > 0 then
    -- Merge: para cada skill en p_skills_detail, si existe en v_existing_detail
    -- toma el MAYOR pct; si no existe, lo agrega.
    with existing as (
      select elem->>'name' as name, (elem->>'pct')::int as pct
      from jsonb_array_elements(coalesce(v_existing_detail, '[]'::jsonb)) elem
    ),
    incoming as (
      select elem->>'name' as name, (elem->>'pct')::int as pct
      from jsonb_array_elements(p_skills_detail) elem
    ),
    merged as (
      select
        coalesce(i.name, e.name) as name,
        greatest(coalesce(e.pct, 0), coalesce(i.pct, 0)) as pct
      from existing e
      full outer join incoming i on lower(e.name) = lower(i.name)
      where coalesce(i.name, e.name) is not null
    )
    select jsonb_agg(jsonb_build_object('name', name, 'pct', pct))
    into v_merged_detail
    from merged;
  else
    v_merged_detail := v_existing_detail;
  end if;

  -- ═══════════════════════════════════════════════════════════════════
  -- UPDATE: TODO SUMA
  -- · Ejes: GREATEST (nunca baja)
  -- · Skills: merged (unión)
  -- · Name: el más reciente si no vacío
  -- · Years: el MAYOR
  -- · Summary: el más reciente (más completo)
  -- ═══════════════════════════════════════════════════════════════════
  update public.profiles set
    full_name           = case when coalesce(p_name, '') <> '' then p_name else full_name end,
    skills              = coalesce(v_merged_skills, skills),
    execution_score     = greatest(coalesce(execution_score, 0), v_clamp_exec),
    quality_score       = greatest(coalesce(quality_score, 0), v_clamp_qual),
    transcendence_score = greatest(coalesce(transcendence_score, 0), v_clamp_trans),
    foundation_score    = greatest(coalesce(foundation_score, 0), v_clamp_fund),
    cv_years_experience = greatest(coalesce(cv_years_experience, 0), coalesce(p_years, 0)),
    cv_summary          = case when coalesce(p_summary, '') <> '' then p_summary else cv_summary end,
    skills_detail       = coalesce(v_merged_detail, skills_detail)
  where id = uid;
  -- → el trigger recalc_reputation (0050) recalcula experience_score y reputation_score.

  -- Auditoría
  begin
    insert into public.reputation_history(user_id, reason)
    values (uid, 'CV analizado — skills y ejes expandidos (suma total)');
  exception when others then null;
  end;

  return json_build_object(
    'ok', true,
    'skills_count', coalesce(array_length(v_merged_skills, 1), 0),
    'reputation', (select reputation_score from public.profiles where id = uid)
  );
end;
$fn$;

-- Permisos
revoke all on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) from public, anon;
grant execute on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) to authenticated;
grant execute on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) to authenticator;

notify pgrst, 'reload schema';
