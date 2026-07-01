-- =====================================================================
-- 0036_examen_ia.sql — Examinador IA + Acta de Evidencia (Gemelo Digital)
--
-- El Simulador deja de ser "escribir codigo" y pasa a ser un EXAMINADOR IA:
-- preguntas tecnicas (opcion multiple + caso aplicado + defensa) generadas
-- segun el nodo y el nivel del usuario. La IA evalua los 4 ejes y emite un
-- ACTA DE EVIDENCIA auditable que actualiza el Gemelo Digital.
-- Idempotente.
-- =====================================================================

-- ── Sesiones de examen (guardan las preguntas + la clave de respuestas) ──
-- Se escribe/lee SOLO desde la Edge Function (service role). La clave de
-- respuestas NUNCA viaja al navegador.
create table if not exists public.exam_sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  node_id     uuid not null references public.skill_tree_nodes(id) on delete cascade,
  payload     jsonb not null,                 -- examen completo (con clave + criterios)
  status      text not null default 'OPEN',   -- OPEN | EVALUATED
  created_at  timestamptz not null default now()
);
alter table public.exam_sessions enable row level security;
-- (sin policies de lectura: solo la funcion con service role accede)

-- ── Actas de Evidencia (el corazon del Gemelo: prueba auditable) ─────────
create table if not exists public.actas_evidencia (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles(id) on delete cascade,
  node_id        uuid not null references public.skill_tree_nodes(id) on delete cascade,
  ejecucion      int  not null default 0,
  calidad        int  not null default 0,
  trascendencia  int  not null default 0,
  fundamento     int  not null default 0,
  puntaje_global int  not null default 0,
  veredicto      text not null default 'REPROBADO',  -- APROBADO | REPROBADO
  resumen        text,
  detalle        jsonb,                               -- preguntas + respuestas + razonamiento IA
  validador      text not null default 'IA',
  created_at     timestamptz not null default now()
);
alter table public.actas_evidencia enable row level security;

drop policy if exists actas_own_read on public.actas_evidencia;
create policy actas_own_read on public.actas_evidencia
  for select to authenticated using (user_id = auth.uid());

grant select on public.actas_evidencia to authenticated;

-- ── RPC: aplicar un acta (inserta + actualiza Gemelo + progreso + PE) ────
-- security definer: corre con permisos de owner pero usa auth.uid() para
-- saber QUIEN es el usuario (nadie puede emitir un acta a nombre de otro).
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

  -- 1) Guardar el acta (evidencia auditable)
  insert into public.actas_evidencia
    (user_id, node_id, ejecucion, calidad, trascendencia, fundamento,
     puntaje_global, veredicto, resumen, detalle, validador)
  values
    (v_uid, p_node_id, p_ejecucion, p_calidad, p_trascendencia, p_fundamento,
     p_puntaje, p_veredicto, p_resumen, p_detalle, 'IA')
  returning id into v_acta;

  -- 2) Nudge al Gemelo Digital (mezcla suave 85/15 hacia el resultado)
  update public.profiles set
    execution_score     = round(coalesce(execution_score, 50)     * 0.85 + p_ejecucion     * 0.15),
    quality_score       = round(coalesce(quality_score, 50)       * 0.85 + p_calidad        * 0.15),
    transcendence_score = round(coalesce(transcendence_score, 50) * 0.85 + p_trascendencia  * 0.15),
    foundation_score    = round(coalesce(foundation_score, 50)    * 0.85 + p_fundamento     * 0.15),
    updated_at          = now()
  where id = v_uid;

  -- 3) Si aprobo: marcar el nodo como validado y premiar PE (solo la 1a vez)
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
        set pe_points        = coalesce(pe_points, 0) + coalesce(v_pe, 0),
            experience_score = coalesce(experience_score, 0) + coalesce(v_pe, 0)
        where id = v_uid;
    end if;
  else
    -- Reprobado: dejar el nodo en progreso (si no estaba validado)
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
