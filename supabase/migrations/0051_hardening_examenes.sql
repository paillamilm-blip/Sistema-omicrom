-- =====================================================================
-- 0051_hardening_examenes.sql
-- Cierra huecos CRÍTICOS de la auditoría (sec-score / sec-rpc-auth):
-- el navegador NO debe poder otorgarse PE ni mover sus ejes fabricando
-- el resultado de un examen. Esto es lo que protege la INTEGRIDAD de la
-- reputación (PE inflado → momentum inflado → reputación inflada).
--
-- ⚠️ DESPLIEGUE ACOPLADO: esta migración va de la mano con el cambio en la
-- Edge Function `examen-ia` (llama a aplicar_acta con el cliente ADMIN y le
-- pasa p_user_id). Deben desplegarse JUNTAS:
--     supabase db push
--     supabase functions deploy examen-ia
-- Si solo aplicas una, el examen deja de registrar el acta.
--
-- Idempotente.
-- =====================================================================

-- ── 1) handle_skill_attempt: solo service_role ───────────────────────
-- La Edge Function `run-code` la invoca con el cliente ADMIN (service role),
-- así que revocarla de public/authenticated NO rompe nada y cierra el hueco
-- de "regalarse PE" e impersonar (recibía p_user_id por parámetro + p_result
-- del cliente).
do $$ begin
  execute 'revoke execute on function public.handle_skill_attempt(uuid,uuid,uuid,integer,integer,text,text,jsonb) from public, anon, authenticated';
exception when others then null; end $$;
do $$ begin
  execute 'grant execute on function public.handle_skill_attempt(uuid,uuid,uuid,integer,integer,text,text,jsonb) to service_role';
exception when others then null; end $$;

-- ── 2) aplicar_acta: recibe p_user_id y SOLO la invoca service_role ──
-- Antes usaba auth.uid() y estaba abierta a `authenticated`, por lo que
-- cualquiera podía llamarla desde la consola con p_veredicto='APROBADO'.
-- Ahora el uid lo pasa la Edge Function (que tiene la clave de respuestas y
-- ya verificó al usuario) usando el cliente admin.
drop function if exists public.aplicar_acta(uuid,int,int,int,int,int,text,text,jsonb);

create or replace function public.aplicar_acta(
  p_user_id       uuid,
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
  v_uid   uuid := p_user_id;
  v_acta  uuid;
  v_pe    int;
  v_prev  text;
  v_aprob boolean := (p_veredicto = 'APROBADO');
  -- clamps defensivos 0..100 (aunque la Edge Function ya los aplica)
  v_ej    int := least(100, greatest(0, coalesce(p_ejecucion, 0)));
  v_ca    int := least(100, greatest(0, coalesce(p_calidad, 0)));
  v_tr    int := least(100, greatest(0, coalesce(p_trascendencia, 0)));
  v_fu    int := least(100, greatest(0, coalesce(p_fundamento, 0)));
begin
  if v_uid is null then
    raise exception 'user_id requerido';
  end if;

  -- 1) Guardar el acta (evidencia auditable)
  insert into public.actas_evidencia
    (user_id, node_id, ejecucion, calidad, trascendencia, fundamento,
     puntaje_global, veredicto, resumen, detalle, validador)
  values
    (v_uid, p_node_id, v_ej, v_ca, v_tr, v_fu,
     least(100, greatest(0, coalesce(p_puntaje, 0))), p_veredicto, p_resumen, p_detalle, 'IA')
  returning id into v_acta;

  -- 2) Nudge al Gemelo Digital (mezcla suave 85/15 hacia el resultado)
  update public.profiles set
    execution_score     = round(coalesce(execution_score, 50)     * 0.85 + v_ej * 0.15),
    quality_score       = round(coalesce(quality_score, 50)       * 0.85 + v_ca * 0.15),
    transcendence_score = round(coalesce(transcendence_score, 50) * 0.85 + v_tr * 0.15),
    foundation_score    = round(coalesce(foundation_score, 50)    * 0.85 + v_fu * 0.15),
    updated_at          = now()
  where id = v_uid;

  -- 3) Si aprobó: marcar el nodo validado y premiar PE (solo la 1a vez)
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
      -- pe_points es acumulador legítimo (mueve niveles + momentum acotado).
      -- experience_score NO se toca: es derivado (promedio de 4 ejes, trigger 0050).
      update public.profiles
        set pe_points = coalesce(pe_points, 0) + coalesce(v_pe, 0)
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

do $$ begin
  execute 'revoke execute on function public.aplicar_acta(uuid,uuid,int,int,int,int,int,text,text,jsonb) from public, anon, authenticated';
exception when others then null; end $$;
grant execute on function public.aplicar_acta(uuid,uuid,int,int,int,int,int,text,text,jsonb) to service_role;

notify pgrst, 'reload schema';
