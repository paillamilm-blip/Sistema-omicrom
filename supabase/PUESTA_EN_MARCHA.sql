-- =====================================================================
--  ÓMICROM · PUESTA EN MARCHA — TODO EN UNO (migraciones 0033 → 0039)
--  ---------------------------------------------------------------------
--  Pega TODO este archivo en Supabase → SQL Editor → New query → Run.
--  Es SEGURO de re-ejecutar (idempotente) y NO borra datos.
--  Deja lista la base para: Coach, Examinador, Actas, Mercado, Bóveda,
--  Radar de empleos y Ómicrom Premium.
-- =====================================================================

-- ── A) Columnas nuevas en tablas existentes ─────────────────────────
alter table public.profiles      add column if not exists competencias_validadas int not null default 0;   -- Actas validadas (Sello de Confianza)
alter table public.profiles      add column if not exists is_premium boolean not null default false;         -- Ómicrom Premium (IA)
alter table public.job_postings   add column if not exists lat double precision;                              -- Radar
alter table public.job_postings   add column if not exists lng double precision;
alter table public.job_postings   add column if not exists location text;
alter table public.job_postings   add column if not exists is_remote boolean not null default false;

-- ── B) academy_courses (arregla el error 400) ──────────────────────
create table if not exists public.academy_courses (
  id uuid primary key default gen_random_uuid(),
  node_id uuid references public.skill_tree_nodes(id) on delete set null,
  title text not null, description text default '', cover_emoji text default '📘',
  difficulty int not null default 1 check (difficulty between 1 and 5),
  passing_score int not null default 70, order_index int not null default 0,
  is_published boolean not null default true, created_at timestamptz not null default now()
);
alter table public.academy_courses add column if not exists node_id uuid references public.skill_tree_nodes(id) on delete set null;
alter table public.academy_courses add column if not exists description text default '';
alter table public.academy_courses add column if not exists cover_emoji text default '📘';
alter table public.academy_courses add column if not exists difficulty int not null default 1;
alter table public.academy_courses add column if not exists passing_score int not null default 70;
alter table public.academy_courses add column if not exists order_index int not null default 0;
alter table public.academy_courses add column if not exists is_published boolean not null default true;
alter table public.academy_courses add column if not exists created_at timestamptz not null default now();
alter table public.academy_courses enable row level security;
drop policy if exists courses_read on public.academy_courses;
create policy courses_read on public.academy_courses for select to authenticated using (is_published);
grant select on public.academy_courses to authenticated;

-- ── C) Examinador IA: sesiones + actas de evidencia ────────────────
create table if not exists public.exam_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  node_id uuid not null references public.skill_tree_nodes(id) on delete cascade,
  payload jsonb not null, status text not null default 'OPEN', created_at timestamptz not null default now()
);
alter table public.exam_sessions enable row level security;

create table if not exists public.actas_evidencia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  node_id uuid not null references public.skill_tree_nodes(id) on delete cascade,
  ejecucion int not null default 0, calidad int not null default 0,
  trascendencia int not null default 0, fundamento int not null default 0,
  puntaje_global int not null default 0, veredicto text not null default 'REPROBADO',
  resumen text, detalle jsonb, validador text not null default 'IA',
  created_at timestamptz not null default now()
);
alter table public.actas_evidencia enable row level security;
drop policy if exists actas_own_read on public.actas_evidencia;
create policy actas_own_read on public.actas_evidencia for select to authenticated using (user_id = auth.uid());
grant select on public.actas_evidencia to authenticated;

-- ── D) Backfill del contador de competencias validadas ─────────────
update public.profiles p set competencias_validadas = coalesce((
  select count(distinct a.node_id) from public.actas_evidencia a
  where a.user_id = p.id and a.veredicto = 'APROBADO'), 0);

-- ── E) RPC aplicar_acta (Gemelo + progreso + PE + contador) ────────
create or replace function public.aplicar_acta(
  p_node_id uuid, p_ejecucion int, p_calidad int, p_trascendencia int, p_fundamento int,
  p_puntaje int, p_veredicto text, p_resumen text, p_detalle jsonb
) returns uuid language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_acta uuid; v_pe int; v_prev text; v_aprob boolean := (p_veredicto = 'APROBADO');
begin
  if v_uid is null then raise exception 'No autenticado'; end if;
  insert into public.actas_evidencia (user_id,node_id,ejecucion,calidad,trascendencia,fundamento,puntaje_global,veredicto,resumen,detalle,validador)
  values (v_uid,p_node_id,p_ejecucion,p_calidad,p_trascendencia,p_fundamento,p_puntaje,p_veredicto,p_resumen,p_detalle,'IA')
  returning id into v_acta;
  update public.profiles set
    execution_score=round(coalesce(execution_score,50)*0.85+p_ejecucion*0.15),
    quality_score=round(coalesce(quality_score,50)*0.85+p_calidad*0.15),
    transcendence_score=round(coalesce(transcendence_score,50)*0.85+p_trascendencia*0.15),
    foundation_score=round(coalesce(foundation_score,50)*0.85+p_fundamento*0.15), updated_at=now()
  where id=v_uid;
  if v_aprob then
    select status into v_prev from public.user_skill_progress where user_id=v_uid and node_id=p_node_id;
    update public.user_skill_progress set status='VALIDATED',progress_percentage=100,validated_at=now(),attempts=coalesce(attempts,0)+1 where user_id=v_uid and node_id=p_node_id;
    if not found then insert into public.user_skill_progress (user_id,node_id,status,progress_percentage,attempts,validated_at) values (v_uid,p_node_id,'VALIDATED',100,1,now()); end if;
    if v_prev is distinct from 'VALIDATED' and v_prev is distinct from 'MASTERED' then
      select pe_reward into v_pe from public.skill_tree_nodes where id=p_node_id;
      update public.profiles set pe_points=coalesce(pe_points,0)+coalesce(v_pe,0), experience_score=coalesce(experience_score,0)+coalesce(v_pe,0), competencias_validadas=coalesce(competencias_validadas,0)+1 where id=v_uid;
    end if;
  end if;
  return v_acta;
end; $fn$;
grant execute on function public.aplicar_acta(uuid,int,int,int,int,int,text,text,jsonb) to authenticated;

-- ── F) RPC get_coach_context (Coach IA) ────────────────────────────
create or replace function public.get_coach_context()
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_uid uuid := auth.uid(); v_result jsonb;
begin
  if v_uid is null then return null; end if;
  select jsonb_build_object(
    'nombre', (select coalesce(full_name, username, 'Nodo') from public.profiles where id = v_uid),
    'gemelo', (select jsonb_build_object('ejecucion',round(coalesce(p.execution_score,0)),'calidad',round(coalesce(p.quality_score,0)),'trascendencia',round(coalesce(p.transcendence_score,0)),'fundamento',round(coalesce(p.foundation_score,0)),'reputacion',round(coalesce(p.reputation_score,0))) from public.profiles p where p.id=v_uid),
    'credenciales_verificadas', coalesce((select jsonb_agg(jsonb_build_object('titulo',c.title,'emisor',c.issuer,'tipo',c.cred_type) order by c.created_at desc) from public.credentials c where c.user_id=v_uid and c.status='VERIFIED'),'[]'::jsonb),
    'habilidades_validadas', coalesce((select jsonb_agg(n.title order by n.order_index) from public.user_skill_progress usp join public.skill_tree_nodes n on n.id=usp.node_id where usp.user_id=v_uid and usp.status in ('VALIDATED','MASTERED')),'[]'::jsonb),
    'habilidades_pendientes', coalesce((select jsonb_agg(n.title order by n.order_index) from public.skill_tree_nodes n where not exists (select 1 from public.user_skill_progress usp where usp.user_id=v_uid and usp.node_id=n.id and usp.status in ('VALIDATED','MASTERED'))),'[]'::jsonb),
    'cursos_disponibles', coalesce((select jsonb_agg(jsonb_build_object('id',ac.id,'titulo',ac.title,'descripcion',ac.description,'dificultad',ac.difficulty,'habilidad',n.title) order by ac.order_index) from public.academy_courses ac left join public.skill_tree_nodes n on n.id=ac.node_id where ac.is_published=true and not exists (select 1 from public.user_course_progress ucp where ucp.user_id=v_uid and ucp.course_id=ac.id and ucp.status='COMPLETED')),'[]'::jsonb)
  ) into v_result;
  return v_result;
end; $fn$;
grant execute on function public.get_coach_context() to authenticated;

-- ── G) Seed de retos del Simulador (nodos base sin test) ───────────
do $seed$
declare v_node uuid;
begin
  select id into v_node from public.skill_tree_nodes where title='Fundamentos' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id=v_node) then
    insert into public.skill_tests (node_id,test_name,description,problem_statement,test_cases,time_limit_seconds,passing_score)
    values (v_node,'Suma de dígitos','Reto base.','Define solution(input) que devuelva la suma de los dígitos del string. "123" -> "6".','[{"input":"123","expected_output":"6"},{"input":"405","expected_output":"9"}]'::jsonb,300,70);
  end if;
  select id into v_node from public.skill_tree_nodes where title='Algoritmos' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id=v_node) then
    insert into public.skill_tests (node_id,test_name,description,problem_statement,test_cases,time_limit_seconds,passing_score)
    values (v_node,'Contar vocales','Recorrer una cadena.','Define solution(input) que devuelva cuántas vocales tiene el string. "hola" -> "2".','[{"input":"hola","expected_output":"2"},{"input":"xyz","expected_output":"0"}]'::jsonb,300,80);
  end if;
  select id into v_node from public.skill_tree_nodes where title='React' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id=v_node) then
    insert into public.skill_tests (node_id,test_name,description,problem_statement,test_cases,time_limit_seconds,passing_score)
    values (v_node,'Largo del texto','Reto intro.','Define solution(input) que devuelva cuántos caracteres tiene el string. "abc" -> "3".','[{"input":"abc","expected_output":"3"},{"input":"","expected_output":"0"}]'::jsonb,300,80);
  end if;
end; $seed$;

-- ── FINAL: refrescar la caché del API ───────────────────────────────
notify pgrst, 'reload schema';
