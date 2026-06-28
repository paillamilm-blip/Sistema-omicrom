-- =====================================================================
-- 0020_academy.sql — Academia conectada al árbol de habilidades (MaxSkill)
-- Cada curso refuerza un nodo. Completarlo valida el nodo -> sube Fundamento.
-- Quiz calificado en el servidor (las respuestas correctas no se exponen).
-- Idempotente.
-- =====================================================================

-- ── 1) Tablas ────────────────────────────────────────────────────────
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

create table if not exists public.course_lessons (
  id          uuid primary key default gen_random_uuid(),
  course_id   uuid not null references public.academy_courses(id) on delete cascade,
  title       text not null,
  content     text default '',
  video_url   text,
  order_index int  not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.course_quiz_questions (
  id            uuid primary key default gen_random_uuid(),
  course_id     uuid not null references public.academy_courses(id) on delete cascade,
  question      text not null,
  options       jsonb not null,
  correct_index int  not null,
  order_index   int  not null default 0
);

create table if not exists public.user_lesson_progress (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  lesson_id    uuid not null references public.course_lessons(id) on delete cascade,
  completed_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

create table if not exists public.user_course_progress (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  course_id    uuid not null references public.academy_courses(id) on delete cascade,
  status       text not null default 'IN_PROGRESS' check (status in ('IN_PROGRESS','COMPLETED')),
  quiz_score   int,
  quiz_passed  boolean not null default false,
  completed_at timestamptz,
  unique (user_id, course_id)
);

create index if not exists idx_lessons_course on public.course_lessons(course_id);
create index if not exists idx_quiz_course    on public.course_quiz_questions(course_id);
create index if not exists idx_ucp_user       on public.user_course_progress(user_id);

-- ── 2) RLS ───────────────────────────────────────────────────────────
alter table public.academy_courses      enable row level security;
alter table public.course_lessons       enable row level security;
alter table public.course_quiz_questions enable row level security;
alter table public.user_lesson_progress  enable row level security;
alter table public.user_course_progress  enable row level security;

-- Cursos y lecciones: lectura para autenticados
drop policy if exists courses_read on public.academy_courses;
create policy courses_read on public.academy_courses for select to authenticated using (is_published);

drop policy if exists lessons_read on public.course_lessons;
create policy lessons_read on public.course_lessons for select to authenticated using (true);

-- Quiz: SIN política de select -> nadie lee correct_index directo (solo via RPC)

-- Progreso: cada quien el suyo
drop policy if exists ulp_own on public.user_lesson_progress;
create policy ulp_own on public.user_lesson_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists ucp_own on public.user_course_progress;
create policy ucp_own on public.user_course_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.academy_courses, public.course_lessons to authenticated;
grant select, insert, update, delete on public.user_lesson_progress, public.user_course_progress to authenticated;

-- ── 3) RPC: obtener quiz SIN respuestas correctas ────────────────────
create or replace function public.get_course_quiz(p_course_id uuid)
returns table(id uuid, question text, options jsonb, order_index int)
language sql security definer set search_path = public as $fn$
  select id, question, options, order_index
  from public.course_quiz_questions
  where course_id = p_course_id
  order by order_index;
$fn$;

grant execute on function public.get_course_quiz(uuid) to authenticated;

-- ── 4) RPC: marcar lección completada ────────────────────────────────
create or replace function public.mark_lesson_complete(p_lesson_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_course uuid;
begin
  insert into public.user_lesson_progress (user_id, lesson_id)
  values (auth.uid(), p_lesson_id)
  on conflict (user_id, lesson_id) do nothing;

  -- asegurar fila de progreso de curso
  select course_id into v_course from public.course_lessons where id = p_lesson_id;
  if v_course is not null then
    insert into public.user_course_progress (user_id, course_id)
    values (auth.uid(), v_course)
    on conflict (user_id, course_id) do nothing;
  end if;
end; $fn$;

grant execute on function public.mark_lesson_complete(uuid) to authenticated;

-- ── 5) RPC: enviar quiz (califica en servidor, valida nodo si aprueba) ─
create or replace function public.submit_quiz(p_course_id uuid, p_answers jsonb)
returns table(score int, passed boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  v_total   int;
  v_correct int;
  v_score   int;
  v_pass    int;
  v_node    uuid;
  v_done_lessons int;
  v_total_lessons int;
  v_passed boolean;
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

  -- guardar progreso del curso
  insert into public.user_course_progress (user_id, course_id, quiz_score, quiz_passed)
  values (auth.uid(), p_course_id, v_score, v_passed)
  on conflict (user_id, course_id)
  do update set quiz_score = excluded.quiz_score, quiz_passed = excluded.quiz_passed;

  if v_passed then
    -- ¿completó todas las lecciones?
    select count(*) into v_total_lessons from public.course_lessons where course_id = p_course_id;
    select count(*) into v_done_lessons
      from public.user_lesson_progress ulp
      join public.course_lessons cl on cl.id = ulp.lesson_id
      where cl.course_id = p_course_id and ulp.user_id = auth.uid();

    if v_done_lessons >= v_total_lessons then
      update public.user_course_progress
        set status = 'COMPLETED', completed_at = now()
      where user_id = auth.uid() and course_id = p_course_id;

      -- validar el nodo del árbol -> dispara recalc del Fundamento
      if v_node is not null then
        if exists (select 1 from public.user_skill_progress where user_id = auth.uid() and node_id = v_node) then
          update public.user_skill_progress
            set status = 'VALIDATED', progress_percentage = 100, validated_at = now()
          where user_id = auth.uid() and node_id = v_node;
        else
          insert into public.user_skill_progress (user_id, node_id, status, progress_percentage, validated_at)
          values (auth.uid(), v_node, 'VALIDATED', 100, now());
        end if;
      end if;
    end if;
  end if;

  return query select v_score, v_passed;
end; $fn$;

grant execute on function public.submit_quiz(uuid, jsonb) to authenticated;

-- ── 6) Seed de prueba: 1 curso ligado a un nodo FOUNDATION ───────────
do $do$
declare v_node uuid; v_course uuid; v_l1 uuid; v_l2 uuid;
begin
  select id into v_node from public.skill_tree_nodes
    where category = 'FOUNDATION' order by order_index limit 1;

  if not exists (select 1 from public.academy_courses where title = 'Fundamentos de Algoritmos') then
    insert into public.academy_courses (node_id, title, description, cover_emoji, difficulty, order_index)
    values (v_node, 'Fundamentos de Algoritmos',
            'Aprende los conceptos base: variables, condicionales, bucles y complejidad.',
            '🧮', 1, 1)
    returning id into v_course;

    insert into public.course_lessons (course_id, title, content, order_index)
    values (v_course, 'Variables y tipos', 'Una variable guarda un valor. Tipos comunes: número, texto, booleano.', 1)
    returning id into v_l1;
    insert into public.course_lessons (course_id, title, content, order_index)
    values (v_course, 'Bucles y complejidad', 'Un bucle repite instrucciones. La complejidad mide cuánto crece el costo.', 2)
    returning id into v_l2;

    insert into public.course_quiz_questions (course_id, question, options, correct_index, order_index) values
      (v_course, '¿Qué guarda una variable?', '["Un valor","Un color","Una imagen","Nada"]'::jsonb, 0, 1),
      (v_course, '¿Para qué sirve un bucle?', '["Pintar","Repetir instrucciones","Apagar el PC","Borrar datos"]'::jsonb, 1, 2),
      (v_course, '¿Qué mide la complejidad?', '["El color","El peso del archivo","Cómo crece el costo","La marca"]'::jsonb, 2, 3);
  end if;
end; $do$;
