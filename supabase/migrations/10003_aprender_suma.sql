-- =====================================================================
-- 10003_aprender_suma.sql — FASE 1.6: "Aprender siempre suma"
--
-- Hallazgo del piloto 2026-10-23: aprobar el quiz de un curso NUEVO bajaba
-- la reputación (40 → 30). Dos causas:
--   1) recalc_foundation_score (0015) reemplaza el 50 inicial de fábrica
--      por el % real del árbol (≈2 en un usuario nuevo) → Fundamento cae.
--   2) submit_quiz (0020) valida el nodo pero no otorga ningún PE → el
--      momentum de 0050 tampoco compensa.
--
-- Arreglos:
--   A) Fundamento monótono: el recálculo por árbol NUNCA puede bajar el
--      valor actual; solo subirlo. (La escritura directa de la columna y
--      el nudge de exámenes 0036 siguen funcionando igual.)
--   B) Primera validación de un nodo vía quiz otorga su pe_reward.
--
-- Idempotente. Solo redefine funciones; los triggers ya existen.
-- =====================================================================

-- ── A) Fundamento monótono ────────────────────────────────────────────
create or replace function public.recalc_foundation_score(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn1$
declare
  v_total   numeric;
  v_done    numeric;
  v_score   numeric;
  v_current numeric;
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

  -- APRENDER NUNCA RESTA: el árbol solo puede subir el Fundamento.
  select coalesce(foundation_score, 0) into v_current
  from public.profiles where id = p_user;

  update public.profiles
  set foundation_score = least(100, greatest(v_current, v_score))
  where id = p_user;
end; $fn1$;

-- ── B) submit_quiz: la primera validación de un nodo paga su pe_reward ─
create or replace function public.submit_quiz(p_course_id uuid, p_answers jsonb)
returns table(score int, passed boolean)
language plpgsql security definer set search_path = public as $fn2$
declare
  v_total   int;
  v_correct int;
  v_score   int;
  v_pass    int;
  v_node    uuid;
  v_done_lessons int;
  v_total_lessons int;
  v_passed  boolean;
  v_prev    text;
  v_pay     boolean := false;
  v_pe      int;
begin
  select count(*) into v_total from public.course_quiz_questions where course_id = p_course_id;
  if v_total = 0 then
    return query select 0, false; return;
  end if;

  select count(*) into v_correct
  from public.course_quiz_questions q
  where q.course_id = p_course_id
    and (p_answers ->> q.id::text)::int = q.correct_index;

  v_score := round(v_correct::numeric / v_total * 100);

  select passing_score, node_id into v_pass, v_node
  from public.academy_courses where id = p_course_id;

  v_passed := v_score >= coalesce(v_pass, 70);

  insert into public.user_course_progress (user_id, course_id, quiz_score, quiz_passed)
  values (auth.uid(), p_course_id, v_score, v_passed)
  on conflict (user_id, course_id)
  do update set quiz_score = excluded.quiz_score, quiz_passed = excluded.quiz_passed;

  if v_passed then
    select count(*) into v_total_lessons from public.course_lessons where course_id = p_course_id;
    select count(*) into v_done_lessons
      from public.user_lesson_progress ulp
      join public.course_lessons cl on cl.id = ulp.lesson_id
      where cl.course_id = p_course_id and ulp.user_id = auth.uid();

    if v_done_lessons >= v_total_lessons then
      update public.user_course_progress
        set status = 'COMPLETED', completed_at = now()
      where user_id = auth.uid() and course_id = p_course_id;

      if v_node is not null then
        select status into v_prev
        from public.user_skill_progress
        where user_id = auth.uid() and node_id = v_node;

        if v_prev is null then
          insert into public.user_skill_progress (user_id, node_id, status, progress_percentage, validated_at)
          values (auth.uid(), v_node, 'VALIDATED', 100, now());
          v_pay := true;
        elsif v_prev not in ('VALIDATED', 'MASTERED') then
          update public.user_skill_progress
            set status = 'VALIDATED', progress_percentage = 100, validated_at = now()
          where user_id = auth.uid() and node_id = v_node;
          v_pay := true;
        end if;

        -- APRENDER SUMA: primera validación del nodo → cobra su recompensa en PE
        if v_pay then
          select coalesce(pe_reward, 0) into v_pe
          from public.skill_tree_nodes where id = v_node;
          if coalesce(v_pe, 0) > 0 then
            update public.profiles
            set pe_points = coalesce(pe_points, 0) + v_pe
            where id = auth.uid();
          end if;
        end if;
      end if;
    end if;
  end if;

  return query select v_score, v_passed;
end; $fn2$;

grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- =====================================================================
-- FIN — Verificación: cuenta nueva → lecciones → quiz 100% ⇒
-- foundation_score no baja de 50, pe_points sube en pe_reward del nodo,
-- reputation_score sube (momentum) o se mantiene, nunca baja.
-- =====================================================================
