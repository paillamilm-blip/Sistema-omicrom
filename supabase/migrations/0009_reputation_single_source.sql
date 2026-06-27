-- =====================================================================
-- 0009_reputation_single_source.sql — HALLAZGO #5
-- Una sola fuente de verdad para reputation_score (regla 80/20 del manifiesto).
-- Se auto-mantiene por trigger cuando cambian traditional_score / experience_score.
-- El cliente ya no la calcula (y el trigger del #1 le impide escribirla).
-- Supone que los puntajes están en escala 0–100.
-- =====================================================================

create or replace function public.recalc_reputation()
returns trigger
language plpgsql
as $$
declare v_rep numeric;
begin
  -- 80/20: 20% credenciales + 80% experiencia demostrada
  v_rep := round(coalesce(new.traditional_score, 0) * 0.20
               + coalesce(new.experience_score, 0) * 0.80, 2);
  new.reputation_score      := least(100, greatest(0, v_rep));
  new.reputation_updated_at := now();
  return new;
end; $$;

-- Solo se dispara cuando cambian los insumos (no en ediciones cosméticas)
drop trigger if exists trg_recalc_reputation on public.profiles;
create trigger trg_recalc_reputation
  before insert or update of traditional_score, experience_score on public.profiles
  for each row execute function public.recalc_reputation();

-- Backfill: recalcula la reputación de TODOS los perfiles existentes una vez
update public.profiles
set reputation_score = least(100, greatest(0,
      round(coalesce(traditional_score, 0) * 0.20
          + coalesce(experience_score, 0) * 0.80, 2))),
    reputation_updated_at = now();
