-- =====================================================================
-- 0050_reputacion_canonica.sql
-- MODELO DE REPUTACIÓN CANÓNICO Y UNIFICADO (fuente única de verdad).
-- Ver DEFINICION_REPUTACION_OMICROM.md.
--
-- La reputación mide EN TIEMPO REAL "lo que tienes" + "lo que puedes conseguir":
--
--   experience_score = promedio( ejecución, calidad, trascendencia, fundamento )
--   base            = 0.20 · traditional_score  +  0.80 · experience_score   -- lo que TIENES
--   momentum        = min(15, sqrt(pe_points) / 4)                           -- lo que PUEDES conseguir
--   reputation_score = min(100, base + momentum)
--
-- - `experience_score` es DERIVADO (promedio de los 4 ejes), no un acumulador.
-- - Los PE (pe_points) SÍ suman a la reputación, como un bono de momentum
--   acotado (+15 máx) con rendimientos decrecientes: premian el aprendizaje
--   y el potencial sin permitir "comprar" reputación ni inflarla sin límite.
-- - Todo se recalcula por trigger ante cualquier cambio de las variables:
--   la reputación está siempre "medida en tiempo real con todo sobre la mesa".
--
-- Escala 0–100. 100% idempotente (seguro de correr varias veces).
-- =====================================================================

-- ── 1) Función canónica de recálculo ─────────────────────────────────
create or replace function public.recalc_reputation()
returns trigger
language plpgsql
as $$
declare
  v_exp      numeric;
  v_base     numeric;
  v_momentum numeric;
begin
  -- experiencia laboral = promedio de los 4 ejes del Gemelo Digital
  v_exp := round((coalesce(new.execution_score, 0)
                + coalesce(new.quality_score, 0)
                + coalesce(new.transcendence_score, 0)
                + coalesce(new.foundation_score, 0)) / 4.0, 2);
  new.experience_score := least(100, greatest(0, v_exp));

  -- base demostrada: 20% credenciales + 80% experiencia laboral
  v_base := coalesce(new.traditional_score, 0) * 0.20
          + new.experience_score * 0.80;

  -- momentum por PE (potencial): bono acotado a +15, rendimientos decrecientes
  v_momentum := least(15, round(sqrt(greatest(coalesce(new.pe_points, 0), 0)) / 4.0, 2));

  new.reputation_score := least(100, greatest(0, round(v_base + v_momentum, 2)));
  new.reputation_updated_at := now();
  return new;
end;
$$;

-- ── 2) Trigger sobre TODOS los insumos (incluye pe_points) ───────────
-- Incluye experience_score y pe_points para que cualquier cambio recalcule
-- la reputación en tiempo real y auto-corrija escrituras antiguas.
drop trigger if exists trg_recalc_reputation on public.profiles;
create trigger trg_recalc_reputation
  before insert or update of
    traditional_score,
    experience_score,
    execution_score,
    quality_score,
    transcendence_score,
    foundation_score,
    pe_points
  on public.profiles
  for each row execute function public.recalc_reputation();

-- ── 3) Backfill: normaliza a TODOS los perfiles existentes ───────────
-- Este UPDATE dispara el trigger (columna experience_score en la lista),
-- que recalcula experience_score y reputation_score (base + momentum).
update public.profiles
set experience_score = least(100, greatest(0, round((
        coalesce(execution_score, 0)
      + coalesce(quality_score, 0)
      + coalesce(transcendence_score, 0)
      + coalesce(foundation_score, 0)) / 4.0, 2)));

-- =====================================================================
-- FIN — 0050 supersede la fórmula de 0009 y consolida la de 9999. El bono
-- de momentum por PE se puede ajustar cambiando el cap (15) o el divisor (4).
-- =====================================================================
