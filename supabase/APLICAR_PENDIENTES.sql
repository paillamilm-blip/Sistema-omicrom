-- =====================================================================
--  ÓMICROM · APLICAR PENDIENTES  (2026-06-30)
--  ---------------------------------------------------------------------
--  Pega TODO este archivo en el SQL Editor de Supabase y dale "Run".
--  Es seguro: se puede correr varias veces sin romper nada (idempotente)
--  y NO borra datos.
--
--  Resuelve 3 cosas:
--   1) Coach IA   -> crea la pieza que faltaba (get_coach_context)
--   2) Error 400  -> deja la tabla academy_courses con la forma correcta
--   3) Simulador  -> carga retos (skill_tests) para los nodos base
--
--  OJO: esto arregla la BASE DE DATOS. Además hay que (desde el panel):
--   - Poner el secreto GEMINI_API_KEY
--   - Desplegar las Edge Functions "coach" y "run-code"
--  (ver el PR / la conversación para los pasos).
-- =====================================================================


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║ PARTE 2 (primero) · ARREGLAR academy_courses (error 400)           ║
-- ╚═══════════════════════════════════════════════════════════════════╝

create table if not exists public.academy_courses (
  id            uuid primary key default gen_random_uuid(),
  node_id       uuid references public.skill_tree_nodes(id) on delete set null,
  title         text not null,
  description   text default '',
  cover_emoji   text default '📘',
  difficulty    int  not null default 1 check (difficulty between 1 and 5),
  passing_score int  not null default 70,
  order_index   int  not null default 0,
  is_published  boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.academy_courses add column if not exists node_id       uuid references public.skill_tree_nodes(id) on delete set null;
alter table public.academy_courses add column if not exists description   text default '';
alter table public.academy_courses add column if not exists cover_emoji   text default '📘';
alter table public.academy_courses add column if not exists difficulty    int  not null default 1;
alter table public.academy_courses add column if not exists passing_score int  not null default 70;
alter table public.academy_courses add column if not exists order_index   int  not null default 0;
alter table public.academy_courses add column if not exists is_published  boolean not null default true;
alter table public.academy_courses add column if not exists created_at    timestamptz not null default now();

alter table public.academy_courses enable row level security;
drop policy if exists courses_read on public.academy_courses;
create policy courses_read on public.academy_courses
  for select to authenticated using (is_published);
grant select on public.academy_courses to authenticated;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║ PARTE 1 · COACH IA · crear get_coach_context                       ║
-- ╚═══════════════════════════════════════════════════════════════════╝

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
    return null;
  end if;

  select jsonb_build_object(
    'nombre', (select coalesce(full_name, username, 'Nodo') from public.profiles where id = v_uid),
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
    'credenciales_verificadas', coalesce((
      select jsonb_agg(jsonb_build_object(
        'titulo', c.title, 'emisor', c.issuer, 'tipo', c.cred_type
      ) order by c.created_at desc)
      from public.credentials c
      where c.user_id = v_uid and c.status = 'VERIFIED'
    ), '[]'::jsonb),
    'habilidades_validadas', coalesce((
      select jsonb_agg(n.title order by n.order_index)
      from public.user_skill_progress usp
      join public.skill_tree_nodes n on n.id = usp.node_id
      where usp.user_id = v_uid and usp.status in ('VALIDATED', 'MASTERED')
    ), '[]'::jsonb),
    'habilidades_pendientes', coalesce((
      select jsonb_agg(n.title order by n.order_index)
      from public.skill_tree_nodes n
      where not exists (
        select 1 from public.user_skill_progress usp
        where usp.user_id = v_uid and usp.node_id = n.id
          and usp.status in ('VALIDATED', 'MASTERED')
      )
    ), '[]'::jsonb),
    'cursos_disponibles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', ac.id, 'titulo', ac.title, 'descripcion', ac.description,
        'dificultad', ac.difficulty, 'habilidad', n.title
      ) order by ac.order_index)
      from public.academy_courses ac
      left join public.skill_tree_nodes n on n.id = ac.node_id
      where ac.is_published = true
        and not exists (
          select 1 from public.user_course_progress ucp
          where ucp.user_id = v_uid and ucp.course_id = ac.id and ucp.status = 'COMPLETED'
        )
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$fn$;

grant execute on function public.get_coach_context() to authenticated;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║ PARTE 3 · SIMULADOR · retos (skill_tests) para nodos sin reto      ║
-- ╚═══════════════════════════════════════════════════════════════════╝

do $seed$
declare v_node uuid;
begin
  -- Fundamentos · Suma de dígitos
  select id into v_node from public.skill_tree_nodes where title = 'Fundamentos' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id = v_node) then
    insert into public.skill_tests
      (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (v_node, 'Suma de dígitos', 'Reto base de lógica y manejo de strings.',
      'Define una función "solution(input)" que reciba un string con un número entero y devuelva, como string, la suma de sus dígitos. Ejemplo: "123" -> "6".',
      '[{"input":"123","expected_output":"6","explanation":"1+2+3"},{"input":"405","expected_output":"9","explanation":"4+0+5"},{"input":"9","expected_output":"9","explanation":"un solo dígito"}]'::jsonb,
      300, 70);
  end if;

  -- Algoritmos · Contar vocales
  select id into v_node from public.skill_tree_nodes where title = 'Algoritmos' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id = v_node) then
    insert into public.skill_tests
      (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (v_node, 'Contar vocales', 'Recorrer una cadena y contar elementos.',
      'Define una función "solution(input)" que reciba un string en minúsculas y devuelva, como string, cuántas vocales (a, e, i, o, u) tiene. Ejemplo: "hola" -> "2".',
      '[{"input":"hola","expected_output":"2","explanation":"o, a"},{"input":"omicron","expected_output":"3","explanation":"o, i, o"},{"input":"xyz","expected_output":"0","explanation":"sin vocales"}]'::jsonb,
      300, 80);
  end if;

  -- React · Largo del texto
  select id into v_node from public.skill_tree_nodes where title = 'React' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id = v_node) then
    insert into public.skill_tests
      (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (v_node, 'Largo del texto', 'Reto introductorio de manipulación de strings.',
      'Define una función "solution(input)" que reciba un string y devuelva, como string, cuántos caracteres tiene. Ejemplo: "abc" -> "3".',
      '[{"input":"abc","expected_output":"3","explanation":"3 letras"},{"input":"omicron","expected_output":"7","explanation":"7 letras"},{"input":"","expected_output":"0","explanation":"vacío"}]'::jsonb,
      300, 80);
  end if;
end;
$seed$;


-- ╔═══════════════════════════════════════════════════════════════════╗
-- ║ FINAL · refrescar la caché del API REST (borra el 400 al instante) ║
-- ╚═══════════════════════════════════════════════════════════════════╝
notify pgrst, 'reload schema';


-- ── Verificación rápida (opcional): debería devolver filas/conteos OK ─
-- select count(*) as cursos      from public.academy_courses;
-- select count(*) as retos       from public.skill_tests;
-- select proname  as rpc_coach   from pg_proc where proname = 'get_coach_context';
