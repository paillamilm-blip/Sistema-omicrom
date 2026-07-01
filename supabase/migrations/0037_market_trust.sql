-- =====================================================================
-- 0037_market_trust.sql — Sello de Confianza para el Mercado
--
-- El Mercado ahora muestra la EVIDENCIA del vendedor (reputación del Gemelo +
-- nº de competencias validadas por IA). Como las actas son privadas (RLS por
-- dueño), publicamos solo un CONTADOR agregado en profiles (público, seguro).
-- Idempotente.
-- =====================================================================

-- Contador público de competencias validadas (nodos aprobados por examen).
alter table public.profiles add column if not exists competencias_validadas int not null default 0;

-- Backfill: contar los nodos ya validados por acta para cada usuario.
update public.profiles p set competencias_validadas = coalesce((
  select count(distinct a.node_id)
  from public.actas_evidencia a
  where a.user_id = p.id and a.veredicto = 'APROBADO'
), 0);

-- Recrear aplicar_acta para que ADEMÁS incremente el contador al validar un nodo nuevo.
create or replace function public.aplicar_acta(
  p_node_id       uuid,
  p_ejecucion     int,
  p_calidad       int,
  p_trascendencia int,
  p_fundamento    int,
  p_puntaje       int,
  p_veredicto     text,
  p_resumen       text,
  p_detalle       jsonb
) returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid   uuid := auth.uid();
  v_acta  uuid;
  v_pe    int;
  v_prev  text;
  v_aprob boolean := (p_veredicto = 'APROBADO');
begin
  if v_uid is null then
    raise exception 'No autenticado';
  end if;

  insert into public.actas_evidencia
    (user_id, node_id, ejecucion, calidad, trascendencia, fundamento,
     puntaje_global, veredicto, resumen, detalle, validador)
  values
    (v_uid, p_node_id, p_ejecucion, p_calidad, p_trascendencia, p_fundamento,
     p_puntaje, p_veredicto, p_resumen, p_detalle, 'IA')
  returning id into v_acta;

  update public.profiles set
    execution_score     = round(coalesce(execution_score, 50)     * 0.85 + p_ejecucion     * 0.15),
    quality_score       = round(coalesce(quality_score, 50)       * 0.85 + p_calidad        * 0.15),
    transcendence_score = round(coalesce(transcendence_score, 50) * 0.85 + p_trascendencia  * 0.15),
    foundation_score    = round(coalesce(foundation_score, 50)    * 0.85 + p_fundamento     * 0.15),
    updated_at          = now()
  where id = v_uid;

  if v_aprob then
    select status into v_prev
    from public.user_skill_progress
    where user_id = v_uid and node_id = p_node_id;

    update public.user_skill_progress
      set status = 'VALIDATED', progress_percentage = 100,
          validated_at = now(), attempts = coalesce(attempts, 0) + 1
      where user_id = v_uid and node_id = p_node_id;

    if not found then
      insert into public.user_skill_progress
        (user_id, node_id, status, progress_percentage, attempts, validated_at)
      values (v_uid, p_node_id, 'VALIDATED', 100, 1, now());
    end if;

    if v_prev is distinct from 'VALIDATED' and v_prev is distinct from 'MASTERED' then
      select pe_reward into v_pe from public.skill_tree_nodes where id = p_node_id;
      update public.profiles
        set pe_points              = coalesce(pe_points, 0) + coalesce(v_pe, 0),
            experience_score       = coalesce(experience_score, 0) + coalesce(v_pe, 0),
            competencias_validadas = coalesce(competencias_validadas, 0) + 1
        where id = v_uid;
    end if;
  else
    update public.user_skill_progress
      set status = 'IN_PROGRESS', attempts = coalesce(attempts, 0) + 1
      where user_id = v_uid and node_id = p_node_id
        and status not in ('VALIDATED', 'MASTERED');
    if not found then
      insert into public.user_skill_progress
        (user_id, node_id, status, progress_percentage, attempts)
      values (v_uid, p_node_id, 'IN_PROGRESS', 50, 1)
      on conflict do nothing;
    end if;
  end if;

  return v_acta;
end;
$fn$;

grant execute on function public.aplicar_acta(uuid,int,int,int,int,int,text,text,jsonb) to authenticated;

notify pgrst, 'reload schema';
