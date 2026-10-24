-- ══════════════════════════════════════════════════════════════════════
-- 10008_recorte_mercado_cierre.sql — cierra lo que 10007 dejó vivo
--
-- QUÉ PASÓ CON 10007: dropeó 5 de 7. Sobrevivieron freelance_needs (5 filas)
-- y job_matches (373 filas). El candado no falló: midió como postgres, vio
-- filas y conservó. Lo que falló es la evidencia con la que se justificó la
-- fase: el "0 filas" se había leído por la API, y RLS filtra el select, así
-- que un `[]` no prueba que la tabla esté vacía.
--
-- QUÉ SON ESAS FILAS (verificado, no supuesto):
--
--   freelance_needs — las 5 son el INSERT semilla de 0069_freelance_needs.sql
--   línea 129: ids literales b0000000-…0001 a …0005 publicados por los perfiles
--   demo a0000000-…. Títulos "Página web para mi emprendimiento", "Diseño de
--   logo y branding", etc. Un solo created_at (el día que corrió 0069), las 5
--   en OPEN, postulantes_count = 0 en todas. Nadie publicó nada nunca.
--
--   job_matches — 373 filas, todas del MISMO día (2026-08-17), para UN solo
--   usuario, sobre 373 job_id distintos, todas con score 55.9 exacto (promedio
--   = máximo). Los títulos son de un feed alemán de empleos ((m/w/d), "all
--   genders", Göttingen) que entró con sync-jobs. La tabla job_id no tiene FK
--   real: job_matches nació en 0000_base_schema.sql:191 con `job_id uuid`
--   pelado, y el `references job_postings` de 0004 nunca aplicó porque ese
--   create era `if not exists`. Es decir: el motor afirmó 373 "te calza" contra
--   ofertas que nunca estuvieron en job_postings (esa tabla estaba en 0 y por
--   eso 10007 la dropeó sin problema).
--
--   Ese es el hallazgo de la fase, y corrige el framing de la cabecera de
--   10007: no es que "nadie publicó una oferta". Es que el sistema le dijo a
--   un usuario que tenía 373 oportunidades que no existían, todas con el mismo
--   score, en una sola corrida.
--
-- ── PUERTA ────────────────────────────────────────────────────────────
--   Ninguna. Verificado con git grep: ni src/ de la rama ni src/ de origin/main
--   referencian freelance_needs ni job_matches. A diferencia de job_postings
--   (que main sí lo lee en useJobsQuery.ts:18 y DashboardVivo.tsx:63, y por eso
--   el despliegue actual está fallando hasta que merges el PR de la 6B), estas
--   dos se pueden soltar ya.
--
--   Orden recomendado antes de correr esto:
--     supabase functions delete sync-jobs notify-matches
--   Son los únicos escritores posibles de esta familia. Si después del delete
--   el candado de job_matches igual salta, es que hay un cron: buscarlo antes.
--
-- ── CANDADOS ──────────────────────────────────────────────────────────
--   freelance_needs: se conserva si pasa de 5 (alguien publicó de verdad
--     después del seed).
--   job_matches: se conserva si pasa de 373 (hay un writer vivo).
--   Ambos imprimen su contenido ANTES del drop, así que el log queda con la
--   prueba. De job_matches no se vuelcan las 373 filas crudas: se imprime a
--   QUIÉN se le afirmó cada cosa y un muestreo de títulos, que es la evidencia
--   que importa.
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   Sin rollback de datos. El seed de freelance_needs vuelve a crearse con la
--   propia 0069 si algún día se relanza el mercado. Los 373 matches no valen
--   un rollback: son derivados, apuntan a ofertas inexistentes y el motor que
--   los calculó (run_matchmaking / fn_job_matchmaking) ya salió con 10007.
--
-- ── RPCs HUÉRFANAS ────────────────────────────────────────────────────
--   §3 suelta, leyendo el catálogo, toda función de public cuyo cuerpo mencione
--   las tablas de esta familia. No hay consumers, y una RPC expuesta por
--   PostgREST sin dueño es superficie de ataque. Se conservan si un trigger de
--   una tabla viva las usa.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. FREELANCE_NEEDS — el seed de 0069, impreso y soltado
-- ══════════════════════════════════════════════════════════════════════
do $do$
declare
  v_n    bigint;
  v_dump text;
begin
  if to_regclass('public.freelance_needs') is null then
    raise notice '[10008] freelance_needs: ya no existe, nada que soltar.';
    return;
  end if;

  execute 'select count(*) from public.freelance_needs' into v_n;

  if v_n > 5 then
    raise warning '[10008] freelance_needs tiene % filas (el seed de 0069 aporta 5). SE CONSERVA: aparecieron necesidades publicadas de verdad después del seed. Rever antes de dropear.', v_n;
    return;
  end if;

  select coalesce(
           json_agg(json_build_object(
             'id',            left(t.id::text, 8),
             'titulo',        t.title,
             'publicador',    left(t.publisher_id::text, 8),
             'categoria',     t.category,
             'estado',        t.status,
             'postulantes',   t.applicants_count,
             'creado',        t.created_at
           ))::text,
           '[]'
         )
    into v_dump
    from public.freelance_needs t;

  raise warning '[10008] RESPALDO freelance_needs (% fila(s)): %', v_n, left(v_dump, 6000);

  drop table public.freelance_needs cascade;
  raise notice '[10008] freelance_needs dropeada. Las filas eran el INSERT semilla de 0069 (ids b0000000-…), no usuarios.';
end;
$do$;


-- ══════════════════════════════════════════════════════════════════════
-- 2. JOB_MATCHES — a quién se le afirmó qué, y recién después el drop
-- ══════════════════════════════════════════════════════════════════════
do $do$
declare
  v_n      bigint;
  v_aquien text;
  v_titulos text;
begin
  if to_regclass('public.job_matches') is null then
    raise notice '[10008] job_matches: ya no existe, nada que soltar.';
    return;
  end if;

  execute 'select count(*) from public.job_matches' into v_n;

  if v_n > 373 then
    raise warning '[10008] job_matches pasó de 373 a % filas: hay un escritor vivo (sync-jobs / notify-matches / un cron). SE CONSERVA y hay que encontrar el writer antes de seguir.', v_n;
    return;
  end if;

  -- El registro que queda: QUÉ usuario recibió la afirmación y cuántas veces.
  select coalesce(
           json_agg(json_build_object(
             'usuario',     left(o.user_id::text, 8),
             'quien',       o.quien,
             'afirmaciones', o.n,
             'score',       o.score,
             'dia',         o.dia
           ))::text,
           '[]'
         )
    into v_aquien
    from (
      select m.user_id,
             coalesce(p.full_name, p.username, 'perfil-inexistente') as quien,
             count(*) as n,
             max(m.match_score) as score,
             min(m.sent_at)::date as dia
        from public.job_matches m
        left join public.profiles p on p.id = m.user_id
       group by m.user_id, coalesce(p.full_name, p.username, 'perfil-inexistente')
       order by count(*) desc
    ) o;

  raise warning '[10008] A QUIÉN SE LE AFIRMÓ (% fila(s) en total): %', v_n, left(v_aquien, 4000);

  select left(coalesce(string_agg(t, ' | '), 'sin título'), 3000)
    into v_titulos
    from (
      select distinct left(coalesce(job_title, '(sin título)'), 60) as t
        from public.job_matches
       order by 1
       limit 12
    ) x;

  raise warning '[10008] MUESTRA de ofertas invocadas (1 de % distintas): %',
    (select count(distinct job_id) from public.job_matches), v_titulos;

  drop table public.job_matches cascade;
  raise notice '[10008] job_matches dropeada. 373 afirmaciones de un solo día, un solo usuario, score idéntico, contra ofertas que nunca estuvieron en job_postings.';
end;
$do$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. RPCs QUE TODAVÍA MENSIONAN LA FAMILIA — firma leída del catálogo
-- ══════════════════════════════════════════════════════════════════════
-- 10007 soltó apply_to_job / run_matchmaking / fn_job_matchmaking de memoria.
-- Acá se lee el cuerpo real de cada función de public, así que no queda ninguna
-- huérfana expuesta por PostgREST (accept_applicant y las de 0069 viven acá).
do $do$
declare
  v_rec     record;
  v_dropped text[] := '{}';
  v_kept    text[] := '{}';
  v_live_tables text[] := array[
    'profiles', 'credentials', 'daily_activity', 'analytics_events',
    'push_subscriptions', 'reputation_history', 'skill_tree_nodes', 'skill_tests',
    'skill_test_attempts', 'exam_sessions', 'user_skill_progress', 'academy_courses',
    'course_lessons', 'course_quiz_questions', 'user_course_progress',
    'user_lesson_progress', 'omicron_skill_proofs', 'actas_evidencia', 'rate_limits',
    'rate_limit_events', 'user_ai_context'
  ];
begin
  for v_rec in
    select p.oid, p.proname
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and (  cast(p.prosrc as text) ilike '%freelance_needs%'
           or cast(p.prosrc as text) ilike '%freelance_applications%'
           or cast(p.prosrc as text) ilike '%job_matches%'
           or cast(p.prosrc as text) ilike '%job_postings%' )
     order by p.proname
  loop
    if exists (
      select 1
        from pg_trigger t
        join pg_class c on c.oid = t.tgrelid
        join pg_namespace tn on tn.oid = c.relnamespace
       where t.tgfoid = v_rec.oid
         and not t.tgisinternal
         and tn.nspname = 'public'
         and c.relname::text = any (v_live_tables)
    ) then
      v_kept := v_kept || (v_rec.proname || ': trigger vivo la usa');
    else
      begin
        execute format('drop function %s', v_rec.oid::regprocedure);
        v_dropped := v_dropped || v_rec.proname;
      exception when others then
        v_kept := v_kept || (v_rec.proname || ': ' || left(sqlerrm, 60));
      end;
    end if;
  end loop;

  raise notice '[10008] RPCs dropeadas (%): %',
    array_length(v_dropped, 1), coalesce(array_to_string(v_dropped, ', '), 'ninguna');
  if array_length(v_kept, 1) > 0 then
    raise warning '[10008] RPCs conservadas: %', array_to_string(v_kept, ', ');
  end if;
end;
$do$;

notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════
-- 4. REPORTE — la familia de mercado, entera, en una sola sentencia
-- ══════════════════════════════════════════════════════════════════════
select t as tabla,
       (to_regclass('public.' || quote_ident(t)) is not null) as sigue_en_la_base
from unnest(array[
  'jobs','job_postings','job_applications','job_matches',
  'freelance_needs','freelance_applications','wallet_transactions'
]) as t
order by sigue_en_la_base desc, tabla;
