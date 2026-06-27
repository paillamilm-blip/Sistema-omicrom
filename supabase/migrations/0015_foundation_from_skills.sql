-- =====================================================================
-- 0015_foundation_from_skills.sql
-- Conecta el eje FUNDAMENTO del Gemelo con el progreso del árbol (MaxSkill).
-- foundation_score = % (ponderado por dificultad) de nodos VALIDATED/MASTERED.
-- Al cambiar, el trigger de reputación recalcula la reputación automáticamente.
-- Idempotente. Etiquetas de dollar-quote con nombre para el editor de Supabase.
-- =====================================================================

-- ── 1) Función de recálculo del Fundamento ───────────────────────────
create or replace function public.recalc_foundation_score(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn1$
declare
  v_total numeric;
  v_done  numeric;
  v_score numeric;
begin
  select coalesce(sum(greatest(difficulty_level, 1)), 0) into v_total
  from public.skill_tree_nodes;

  select coalesce(sum(greatest(n.difficulty_level, 1)), 0) into v_done
  from public.user_skill_progress p
  join public.skill_tree_nodes n on n.id = p.node_id
  where p.user_id = p_user
    and p.status in ('VALIDATED', 'MASTERED');

  if v_total > 0 then
    v_score := round((v_done / v_total) * 100, 2);
  else
    v_score := 0;
  end if;

  update public.profiles
  set foundation_score = least(100, greatest(0, v_score))
  where id = p_user;
end;
$fn1$;

-- ── 2) Trigger: al avanzar en el árbol, recalcular Fundamento ────────
create or replace function public.fn_skill_progress_after()
returns trigger language plpgsql security definer set search_path = public as $fn2$
begin
  perform public.recalc_foundation_score(coalesce(new.user_id, old.user_id));
  return null;
end;
$fn2$;

drop trigger if exists trg_skill_progress_foundation on public.user_skill_progress;
create trigger trg_skill_progress_foundation
  after insert or update or delete on public.user_skill_progress
  for each row execute function public.fn_skill_progress_after();

-- ── 3) Backfill: recalcular para quienes ya tienen progreso ──────────
do $do$
declare r record;
begin
  for r in (select distinct user_id from public.user_skill_progress) loop
    perform public.recalc_foundation_score(r.user_id);
  end loop;
end;
$do$;
