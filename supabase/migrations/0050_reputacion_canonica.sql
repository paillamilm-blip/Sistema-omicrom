-- =====================================================================
-- 0050_reputacion_canonica.sql
-- MODELO DE REPUTACIÓN CANÓNICO (fuente única de verdad).
-- Ver DEFINICION_REPUTACION_OMICROM.md.
--
-- Reconciliación definitiva de las dos definiciones de "experiencia":
--   experience_score  := promedio( ejecución, calidad, trascendencia, fundamento )
--   reputation_score  := 0.20 · traditional_score  +  0.80 · experience_score
--
-- A partir de aquí `experience_score` es una columna DERIVADA (no un
-- acumulador). El trigger la recalcula ante cualquier cambio de los 4 ejes
-- (o de traditional_score). Los acumuladores de PE antiguos que aún escriban
-- experience_score quedan neutralizados de forma segura: el trigger la
-- normaliza al promedio de los 4 ejes. Los PE siguen viviendo en pe_points
-- y mueven NIVELES, no la reputación directa (la mueven vía Fundamento).
--
-- Escala 0–100. 100% idempotente (seguro de correr varias veces).
-- =====================================================================

-- ── 1) Función canónica de recálculo ─────────────────────────────────
-- NO es SECURITY DEFINER a propósito: sólo modifica la fila NEW.
create or replace function public.recalc_reputation()
returns trigger
language plpgsql
as $$
declare
  v_exp numeric;
  v_rep numeric;
begin
  -- experience_score = promedio de los 4 ejes del Gemelo Digital
  v_exp := round((coalesce(new.execution_score, 0)
                + coalesce(new.quality_score, 0)
                + coalesce(new.transcendence_score, 0)
                + coalesce(new.foundation_score, 0)) / 4.0, 2);
  new.experience_score := least(100, greatest(0, v_exp));

  -- reputación = 20% credenciales + 80% experiencia demostrada
  v_rep := round(coalesce(new.traditional_score, 0) * 0.20
               + new.experience_score * 0.80, 2);
  new.reputation_score := least(100, greatest(0, v_rep));

  new.reputation_updated_at := now();
  return new;
end;
$$;

-- ── 2) Trigger sobre los insumos reales ──────────────────────────────
-- Incluye experience_score para que cualquier escritura antigua (acumulador
-- de PE) se auto-corrija al promedio de los 4 ejes en el mismo statement.
drop trigger if exists trg_recalc_reputation on public.profiles;
create trigger trg_recalc_reputation
  before insert or update of
    traditional_score,
    experience_score,
    execution_score,
    quality_score,
    transcendence_score,
    foundation_score
  on public.profiles
  for each row execute function public.recalc_reputation();

-- ── 3) Backfill: normaliza a TODOS los perfiles existentes ───────────
-- Este UPDATE dispara el trigger (columna experience_score en la lista),
-- que recalcula experience_score y reputation_score de forma consistente.
update public.profiles
set experience_score = least(100, greatest(0, round((
        coalesce(execution_score, 0)
      + coalesce(quality_score, 0)
      + coalesce(transcendence_score, 0)
      + coalesce(foundation_score, 0)) / 4.0, 2)));

-- =====================================================================
-- FIN — Este archivo (0050) supersede la fórmula de 0009 y consolida la de
-- 9999_audit_consolidado.sql, agregando además que experience_score sea
-- derivado (promedio de los 4 ejes) para que frontend y backend coincidan.
-- =====================================================================
