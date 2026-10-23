-- 10005 · El catálogo de la Academia se lee sin cuenta
-- ═══════════════════════════════════════════════════════════════════════
-- Motivo: tras el recorte de la Fase 5 quedó UN solo camino (entrar → Oráculo →
-- lección → quiz → Gemelo). Pero `courses_read` era `to authenticated`, así que
-- un visitante nuevo que abría Academia veía "Aún no hay cursos" aunque el
-- catálogo estuviera publicado: la primera pantalla del camino era vacía por
-- un tema de permisos, no de contenido.
--
-- Qué cambia: el catálogo publicado y sus lecciones pasan a ser lectura pública
-- (es material educativo, no dato personal). Lo privado sigue siendo lo mismo:
-- el progreso por persona (`user_lesson_progress` / `user_course_progress`
-- siguen atados a auth.uid()) y las respuestas de los quiz, que solo se entregan
-- cifradas por RPC. Un invitado puede leer; para guardar y validar necesita cuenta.

-- ── Cursos: lectura pública solo de lo publicado ─────────────────────
drop policy if exists courses_read on public.academy_courses;
create policy courses_read on public.academy_courses
  for select to anon, authenticated
  using (is_published);

-- ── Lecciones: se leen sin cuenta, pero solo las de cursos publicados ─
drop policy if exists lessons_read on public.course_lessons;
create policy lessons_read on public.course_lessons
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.academy_courses c
      where c.id = course_lessons.course_id and c.is_published
    )
  );

grant select on public.academy_courses to anon;
grant select on public.course_lessons  to anon;

-- Los quiz no se tocan: `course_quiz_questions` sigue sin política de select y
-- `get_course_quiz` solo está ejecutable por `authenticated` (nunca por `anon`),
-- así que un invitado no puede pedir preguntas ni ver respuestas.

notify pgrst, 'reload schema';
