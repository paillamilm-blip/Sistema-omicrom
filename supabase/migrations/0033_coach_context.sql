-- =====================================================================
-- 0033_coach_context.sql — Contexto para el Coach IA de Ómicrom
-- La Edge Function "coach" llama a este RPC (get_coach_context) para
-- armar el perfil del usuario que se le pasa a Gemini.
-- SIN este RPC el Coach IA responde 401 "No pude leer tu perfil".
-- Idempotente. Pensado para correr también en el SQL Editor de Supabase.
-- =====================================================================

create or replace function public.get_coach_context()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid    uuid := auth.uid();
  v_result jsonb;
begin
  if v_uid is null then
    return null;  -- la Edge Function lo traduce a "Inicia sesión"
  end if;

  select jsonb_build_object(
    -- Identidad básica
    'nombre', (select coalesce(full_name, username, 'Nodo') from public.profiles where id = v_uid),

    -- Gemelo Digital: los 4 ejes (0-100) + tradicional + reputación
    'gemelo', (
      select jsonb_build_object(
        'ejecucion',     round(coalesce(p.execution_score, 0)),
        'calidad',       round(coalesce(p.quality_score, 0)),
        'trascendencia', round(coalesce(p.transcendence_score, 0)),
        'fundamento',    round(coalesce(p.foundation_score, 0)),
        'tradicional',   round(coalesce(p.traditional_score, 0)),
        'reputacion',    round(coalesce(p.reputation_score, 0))
      )
      from public.profiles p where p.id = v_uid
    ),

    -- Credenciales verificadas por docentes
    'credenciales_verificadas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'titulo', c.title,
        'emisor', c.issuer,
        'tipo',   c.cred_type
      ) order by c.created_at desc)
      from public.credentials c
      where c.user_id = v_uid and c.status = 'VERIFIED'
    ), '[]'::jsonb),

    -- Habilidades ya validadas en el Árbol
    'habilidades_validadas', coalesce((
      select jsonb_agg(n.title order by n.order_index)
      from public.user_skill_progress usp
      join public.skill_tree_nodes n on n.id = usp.node_id
      where usp.user_id = v_uid and usp.status in ('VALIDATED', 'MASTERED')
    ), '[]'::jsonb),

    -- Habilidades pendientes (nodos aún no validados)
    'habilidades_pendientes', coalesce((
      select jsonb_agg(n.title order by n.order_index)
      from public.skill_tree_nodes n
      where not exists (
        select 1 from public.user_skill_progress usp
        where usp.user_id = v_uid
          and usp.node_id = n.id
          and usp.status in ('VALIDATED', 'MASTERED')
      )
    ), '[]'::jsonb),

    -- Cursos disponibles (publicados y que el usuario aún no completa)
    'cursos_disponibles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id',          ac.id,
        'titulo',      ac.title,
        'descripcion', ac.description,
        'dificultad',  ac.difficulty,
        'habilidad',   n.title
      ) order by ac.order_index)
      from public.academy_courses ac
      left join public.skill_tree_nodes n on n.id = ac.node_id
      where ac.is_published = true
        and not exists (
          select 1 from public.user_course_progress ucp
          where ucp.user_id = v_uid
            and ucp.course_id = ac.id
            and ucp.status = 'COMPLETED'
        )
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$fn$;

grant execute on function public.get_coach_context() to authenticated;
