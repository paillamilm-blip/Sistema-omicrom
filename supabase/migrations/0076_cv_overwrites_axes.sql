-- =====================================================================
-- 0076_cv_overwrites_axes.sql — Fix: el CV real SOBREESCRIBE los ejes,
-- no usa GREATEST.
--
-- CONTEXTO:
--   El onboarding genera un perfil ESTIMADO desde 1 frase ("ingeniero
--   industrial"). Esos datos son un PUNTO DE PARTIDA. Cuando el usuario
--   sube su CV real (PDF/Word), el análisis completo (IA + heurística)
--   es la FUENTE AUTORITATIVA — debe reemplazar las estimaciones.
--
--   ANTES: aplicar_analisis_cv usaba GREATEST(actual, nuevo) para ejes.
--   Esto significaba que si el onboarding infló un eje (ej: exec=45
--   estimado de "ingeniero industrial"), el CV real no podía corregirlo
--   a un valor más preciso (ej: exec=38). Resultado: datos del onboarding
--   "congelados" que no reflejaban el CV real → "no convalida mi CV".
--
--   AHORA: El CV SOBREESCRIBE directamente los 4 ejes. El CV es una
--   radiografía completa del profesional — es más confiable que un
--   estimado de 1 frase. Si el usuario sube un CV mejor después,
--   los nuevos valores (más altos) se aplican naturalmente.
--
--   NOTA: convalidar_credencial (0048) sigue usando GREATEST porque
--   las credenciales son ADITIVAS (título + año + vault). Solo el CV
--   es un "reemplazo total" del perfil.
--
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
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  -- ═══════════════════════════════════════════════════════════════════
  -- FIX: Los ejes ahora se SOBREESCRIBEN directamente.
  --
  -- El CV es la fuente autoritativa del perfil profesional. Es una
  -- radiografía completa (analizada por IA + heurística de todo el
  -- texto). Los datos del onboarding (estimados de 1 frase) son solo
  -- un punto de partida que el CV reemplaza con información real.
  --
  -- Nombre/skills/resumen/años/detalle TAMBIÉN se sobrescriben
  -- (misma lógica: el CV tiene la foto más completa).
  -- ═══════════════════════════════════════════════════════════════════
  update public.profiles set
    full_name           = case when coalesce(p_name, '') <> '' then p_name else full_name end,
    skills              = case when p_skills is not null and array_length(p_skills, 1) > 0 then p_skills else skills end,
    execution_score     = v_clamp_exec,
    quality_score       = v_clamp_qual,
    transcendence_score = v_clamp_trans,
    foundation_score    = v_clamp_fund,
    cv_years_experience = coalesce(p_years, cv_years_experience),
    cv_summary          = coalesce(p_summary, cv_summary),
    skills_detail       = coalesce(p_skills_detail, skills_detail)
  where id = uid;
  -- → el trigger recalc_reputation (0050) recalcula experience_score y reputation_score.

  -- Auditoría best-effort (no crítica si el esquema difiere).
  begin
    insert into public.reputation_history(user_id, reason)
    values (uid, 'Análisis de CV aplicado (sobreescribe ejes)');
  exception when others then
    null;
  end;

  return json_build_object(
    'ok', true,
    'reputation', (select reputation_score from public.profiles where id = uid)
  );
end;
$fn$;

-- Mantener permisos
revoke all on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) from public, anon;
grant execute on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) to authenticated;
grant execute on function public.aplicar_analisis_cv(text, text[], numeric, numeric, numeric, numeric, integer, text, jsonb) to authenticator;

notify pgrst, 'reload schema';
