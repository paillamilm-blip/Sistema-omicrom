-- =====================================================================
-- 0035_seed_skill_tests.sql — Retos del Simulador para nodos sin test
--
-- El Simulador "no abre" cuando el nodo no tiene fila en skill_tests
-- (handleStartChallenge no encuentra datos y no hace nada). El seed
-- original (0002) solo creó un reto para el nodo "JavaScript".
--
-- Aquí agregamos retos para los nodos base que normalmente existen.
-- Cada reto se inserta SOLO si ese nodo aún no tiene ninguno (idempotente).
-- Las soluciones se definen como función global "solution(input)" que
-- recibe un string y devuelve un string (así lo evalúa la función run-code).
-- =====================================================================

do $seed$
declare
  v_node uuid;
begin
  -- ── Fundamentos · Suma de dígitos ──────────────────────────────────
  select id into v_node from public.skill_tree_nodes where title = 'Fundamentos' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id = v_node) then
    insert into public.skill_tests
      (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (
      v_node,
      'Suma de dígitos',
      'Reto base de lógica y manejo de strings.',
      'Define una función "solution(input)" que reciba un string con un número entero y devuelva, como string, la suma de sus dígitos. Ejemplo: "123" -> "6".',
      '[{"input":"123","expected_output":"6","explanation":"1+2+3"},{"input":"405","expected_output":"9","explanation":"4+0+5"},{"input":"9","expected_output":"9","explanation":"un solo dígito"}]'::jsonb,
      300,
      70
    );
  end if;

  -- ── Algoritmos · Contar vocales ────────────────────────────────────
  select id into v_node from public.skill_tree_nodes where title = 'Algoritmos' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id = v_node) then
    insert into public.skill_tests
      (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (
      v_node,
      'Contar vocales',
      'Recorrer una cadena y contar elementos.',
      'Define una función "solution(input)" que reciba un string en minúsculas y devuelva, como string, cuántas vocales (a, e, i, o, u) tiene. Ejemplo: "hola" -> "2".',
      '[{"input":"hola","expected_output":"2","explanation":"o, a"},{"input":"omicron","expected_output":"3","explanation":"o, i, o"},{"input":"xyz","expected_output":"0","explanation":"sin vocales"}]'::jsonb,
      300,
      80
    );
  end if;

  -- ── React · Largo de la palabra ────────────────────────────────────
  select id into v_node from public.skill_tree_nodes where title = 'React' order by order_index limit 1;
  if v_node is not null and not exists (select 1 from public.skill_tests where node_id = v_node) then
    insert into public.skill_tests
      (node_id, test_name, description, problem_statement, test_cases, time_limit_seconds, passing_score)
    values (
      v_node,
      'Largo del texto',
      'Reto introductorio de manipulación de strings.',
      'Define una función "solution(input)" que reciba un string y devuelva, como string, cuántos caracteres tiene. Ejemplo: "abc" -> "3".',
      '[{"input":"abc","expected_output":"3","explanation":"3 letras"},{"input":"omicron","expected_output":"7","explanation":"7 letras"},{"input":"","expected_output":"0","explanation":"vacío"}]'::jsonb,
      300,
      80
    );
  end if;
end;
$seed$;
