-- ═══════════════════════════════════════════════════════════
-- 0002_skill_tree.sql · Árbol de Habilidades + Simulador (Fase 1)
-- ═══════════════════════════════════════════════════════════

create table if not exists public.skill_tree_nodes (
  id               uuid primary key default gen_random_uuid(),
  title            text not null,
  description      text not null default '',
  category         text not null check (category in ('FOUNDATION','SPECIALIZATION','ADVANCED')),
  parent_node_id   uuid references public.skill_tree_nodes(id) on delete set null,
  difficulty_level integer not null default 1 check (difficulty_level between 1 and 5),
  pe_reward        integer not null default 0,
  estimated_hours  numeric not null default 0,
  icon             text not null default 'Zap',
  color            text not null default 'cyan',
  order_index      integer not null default 0,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.user_skill_progress (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  node_id             uuid not null references public.skill_tree_nodes(id) on delete cascade,
  status              text not null default 'LOCKED'
                        check (status in ('LOCKED','IN_PROGRESS','VALIDATED','MASTERED')),
  progress_percentage integer not null default 0,
  attempts            integer not null default 0,
  best_time_seconds   integer,
  validated_at        timestamptz,
  created_at          timestamptz not null default now(),
  unique (user_id, node_id)
);

create table if not exists public.skill_tests (
  id                    uuid primary key default gen_random_uuid(),
  node_id               uuid not null references public.skill_tree_nodes(id) on delete cascade,
  test_name             text not null,
  description           text not null default '',
  problem_statement     text not null,
  test_cases            jsonb not null default '[]'::jsonb,
  time_limit_seconds    integer not null default 300,
  passing_score         integer not null default 80,
  difficulty_multiplier numeric not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);


create table if not exists public.skill_test_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.profiles(id) on delete cascade,
  test_id            uuid not null references public.skill_tests(id) on delete cascade,
  submission_code    text not null,
  result             text not null check (result in ('PASS','FAIL','TIMEOUT','ERROR')),
  score              integer not null default 0,
  time_taken_seconds integer not null default 0,
  error_message      text,
  attempted_at       timestamptz not null default now()
);

-- RLS
alter table public.skill_tree_nodes    enable row level security;
alter table public.user_skill_progress enable row level security;
alter table public.skill_tests         enable row level security;
alter table public.skill_test_attempts enable row level security;

drop policy if exists "nodes_read" on public.skill_tree_nodes;
create policy "nodes_read" on public.skill_tree_nodes for select using (true);

drop policy if exists "tests_read" on public.skill_tests;
create policy "tests_read" on public.skill_tests for select using (true);

drop policy if exists "progress_own" on public.user_skill_progress;
create policy "progress_own" on public.user_skill_progress
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "attempts_own" on public.skill_test_attempts;
create policy "attempts_own" on public.skill_test_attempts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- RPC: procesa un intento del simulador (server-side, fuente de verdad del PE)
create or replace function public.handle_skill_attempt(
  p_user_id    uuid,
  p_test_id    uuid,
  p_node_id    uuid,
  p_score      integer,
  p_time_sec   integer,
  p_code       text,
  p_result     text,
  p_tc_results jsonb default '[]'::jsonb
)
returns jsonb
language plpgsql
security definer set search_path = public
as $$
declare
  v_pe_reward    integer := 0;
  v_already_done boolean := false;
  v_pe_awarded   integer := 0;
begin
  -- Registrar intento
  insert into public.skill_test_attempts
    (user_id, test_id, submission_code, result, score, time_taken_seconds)
  values
    (p_user_id, p_test_id, p_code, p_result, p_score, p_time_sec);

  select pe_reward into v_pe_reward
  from public.skill_tree_nodes where id = p_node_id;

  -- ¿Ya estaba validado? (evita doble pago de PE)
  select (status in ('VALIDATED','MASTERED')) into v_already_done
  from public.user_skill_progress
  where user_id = p_user_id and node_id = p_node_id;

  -- Upsert de progreso
  insert into public.user_skill_progress
    (user_id, node_id, status, progress_percentage, attempts, best_time_seconds, validated_at)
  values (
    p_user_id, p_node_id,
    case when p_result = 'PASS' then 'VALIDATED' else 'IN_PROGRESS' end,
    case when p_result = 'PASS' then 100 else greatest(p_score, 0) end,
    1,
    case when p_result = 'PASS' then p_time_sec else null end,
    case when p_result = 'PASS' then now() else null end
  )
  on conflict (user_id, node_id) do update set
    attempts            = public.user_skill_progress.attempts + 1,
    status              = case when p_result = 'PASS' then 'VALIDATED' else public.user_skill_progress.status end,
    progress_percentage = greatest(public.user_skill_progress.progress_percentage, p_score),
    best_time_seconds   = case
                            when p_result = 'PASS' then
                              least(coalesce(public.user_skill_progress.best_time_seconds, p_time_sec), p_time_sec)
                            else public.user_skill_progress.best_time_seconds end,
    validated_at        = coalesce(public.user_skill_progress.validated_at,
                            case when p_result = 'PASS' then now() else null end);

  -- Otorgar PE solo la primera vez que se valida
  if p_result = 'PASS' and not coalesce(v_already_done, false) then
    v_pe_awarded := coalesce(v_pe_reward, 0);
    update public.profiles
      set pe_points        = pe_points + v_pe_awarded,
          experience_score = least(100, experience_score + floor(v_pe_awarded / 100.0) * 5)
    where id = p_user_id;
  end if;

  return jsonb_build_object('pe_awarded', v_pe_awarded);
end;
$$;


-- ── SEED: nodos iniciales ───────────────────────────────────
do $$
declare
  v_root  uuid;
  v_js    uuid;
  v_react uuid;
begin
  if not exists (select 1 from public.skill_tree_nodes) then
    insert into public.skill_tree_nodes (title, description, category, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
    values ('Fundamentos', 'Bases del pensamiento computacional', 'FOUNDATION', 1, 100, 8, 'Cpu', 'cyan', 0)
    returning id into v_root;

    insert into public.skill_tree_nodes (title, description, category, parent_node_id, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
    values ('JavaScript', 'Lógica, tipos y asincronía', 'SPECIALIZATION', v_root, 2, 250, 16, 'Code2', 'gold', 1)
    returning id into v_js;

    insert into public.skill_tree_nodes (title, description, category, parent_node_id, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
    values ('Algoritmos', 'Estructuras de datos y complejidad', 'SPECIALIZATION', v_root, 3, 300, 20, 'GitBranch', 'gold', 2);

    insert into public.skill_tree_nodes (title, description, category, parent_node_id, difficulty_level, pe_reward, estimated_hours, icon, color, order_index)
    values ('React', 'Componentes, estado y hooks', 'ADVANCED', v_js, 4, 500, 30, 'Atom', 'purple', 3)
    returning id into v_react;

    insert into public.skill_tests (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (
      v_js,
      'Invertir cadena',
      'Reto introductorio de manipulación de strings.',
      'Define una función "solution(input)" que reciba un string y devuelva el string invertido.',
      '[{"input":"omicron","expected_output":"norcimo","explanation":"orden inverso"},{"input":"abc","expected_output":"cba","explanation":"orden inverso"}]'::jsonb,
      300,
      80
    );
  end if;
end $$;
