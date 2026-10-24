-- ══════════════════════════════════════════════════════════════════════
-- 10007_recorte_mercado.sql — Fase 6B: la base deja de sostener el mercado
--
-- EL HECHO: jobs / job_postings / job_applications / job_matches responden con
--   0 filas (verificado en vivo: 214 ms, `[]`). Nadie publicó nunca una oferta.
--   El código que las mostraba ya salió del repo en la rama
--   fase-6-recorte-datos (commits ab0e215 + 1eacd0d): gapEngine,
--   useJobsQuery, commissionQuote y el anillo de ofertas de la Red Viva.
--
-- ── PUERTA OBLIGATORIA ────────────────────────────────────────────────
--   NO ejecutar esta migración antes de mergear el PR de la 6B. Si la base
--   suelta las tablas y la app desplegada todavía las consulta, la Red Viva
--   queda mostrando un error de red en vez de una red vacía. Orden:
--     1) merge del PR 6B → Vercel despliega
--     2) esta migración
--     3) supabase functions delete sync-jobs notify-matches stripe-webhook verificar-pago
--        (son las que leen esta familia; ninguna es invocada desde src/)
--
-- ── EL CANDADO (heredado de 10006) ────────────────────────────────────
--   Ninguna tabla se suelta a ciegas: el conteo corre adentro de la migración,
--   como postgres, sorteando RLS. Con filas reales, se conserva y se avisa.
--
-- ── LA EXCEPCIÓN QUE TRAE DATOS ───────────────────────────────────────
--   wallet_transactions sobrevivió a 10006 porque tiene 1 fila. Es esta, y es
--   el único registro económico que jamás existió en el sistema:
--
--     transaction_type | filas | desde      | hasta      | neto_tokens
--     purchase         | 1     | 2026-07-24 | 2026-07-24 | 25000
--
--   Un saldo de 25.000 tokens que no compra nada: no hay checkout, no hay
--   transferencias, no hay retiros, y la cuota de IA usa otro sistema
--   (check_and_consume_credit). Se conserva COMO TEXTO en el aviso de esta
--   migración y después la tabla se suelta. profiles.token_balance NO se toca:
--   es una columna viva del perfil, y la app ya dice en voz alta que no compra
--   nada.
--
--   El respaldo se imprime ANTES del drop, así que el log de la ejecución
--   queda con el contenido completo de la tabla (no solo el resumen de arriba).
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   No hay rollback de datos. Las familias de empleos/freelance están en 0
--   filas; wallet_transactions vuelve a crearse desde 0003/0053 si algún día
--   el producto vende algo, y el saldo de esa única compra queda en el aviso.
--
-- ── LO QUE QUEDA VIVO A PROPÓSITO ─────────────────────────────────────
--   credentials, actas_evidencia, exam_sessions, skill_test_attempts,
--   skill_tests, omicron_skill_proofs, todo el catálogo de Academia,
--   profiles.token_balance, daily_activity, reputation_history,
--   analytics_events, push_subscriptions, rate_limits/rate_limit_events,
--   user_ai_context. Ahí está el único bucle con tracción:
--   Oráculo → lección → quiz → Gemelo.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. WALLET — respaldo como texto, y recién después el drop
-- ══════════════════════════════════════════════════════════════════════
do $do$
declare
  v_n      bigint;
  v_backup text;
begin
  if to_regclass('public.wallet_transactions') is null then
    raise notice '[10007] wallet_transactions: ya no existe, nada que respaldar.';
    return;
  end if;

  execute 'select count(*) from public.wallet_transactions' into v_n;

  if v_n > 5 then
    raise warning '[10007] wallet_transactions tiene % filas (se esperaba 1). SE CONSERVA: hay historial que no aparece en el inventario de 10006. Rever antes de dropear.', v_n;
    return;
  end if;

  select coalesce(
           json_agg(to_jsonb(t))::text,
           '[]'
         )
    into v_backup
    from public.wallet_transactions t;

  raise warning '[10007] RESPALDO wallet_transactions (% fila(s)): %', v_n, left(v_backup, 4000);

  drop table public.wallet_transactions cascade;
  raise notice '[10007] wallet_transactions dropeada después de imprimir su contenido.';
end;
$do$;


-- ══════════════════════════════════════════════════════════════════════
-- 2. LA FAMILIA DE EMPLEOS — con el mismo candado de 0 filas
-- ══════════════════════════════════════════════════════════════════════
do $do$
declare
  v_t text;
  v_n bigint;
  v_dropped text[] := '{}';
  v_kept    text[] := '{}';
  v_blocked text[] := '{}';
  v_list text[] := array[
    'jobs', 'job_postings', 'job_applications', 'job_matches',
    'freelance_needs', 'freelance_applications'
  ];
begin
  foreach v_t in array v_list loop
    if to_regclass('public.' || quote_ident(v_t)) is null then
      v_blocked := v_blocked || (v_t || ': no existe en esta base');
      continue;
    end if;

    begin
      execute 'select count(*) from public.' || quote_ident(v_t) into v_n;
    exception when others then
      v_blocked := v_blocked || (v_t || ': no se pudo contar');
      continue;
    end;

    if v_n > 0 then
      v_kept := v_kept || (v_t || ': ' || v_n || ' filas');
      continue;
    end if;

    begin
      execute 'drop table public.' || quote_ident(v_t) || ' cascade';
      v_dropped := v_dropped || v_t;
    exception when others then
      v_blocked := v_blocked || (v_t || ': dependencias (' || left(sqlerrm, 60) || ')');
    end;
  end loop;

  raise notice '[10007] tablas dropeadas (%): %',
    array_length(v_dropped, 1), coalesce(array_to_string(v_dropped, ', '), 'ninguna');
  if array_length(v_kept, 1) > 0 then
    raise warning '[10007] CON DATOS REALES, se conservan: %', array_to_string(v_kept, ', ');
  end if;
  if array_length(v_blocked, 1) > 0 then
    raise notice '[10007] no dropeables: %', array_to_string(v_blocked, ', ');
  end if;
end;
$do$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. LAS RPCs DE ESA FAMILIA — firma leída del catálogo, no escrita a mano
-- ══════════════════════════════════════════════════════════════════════
-- credit_tokens_from_payment era la que acreditaba la compra de tokens desde
-- stripe-webhook / verificar-pago. Sin wallet_transactions y sin checkout, es
-- superficie de ataque sin dueño: se suelta junto con las tablas que alimentaba.
-- Ninguna se suelta si un trigger de una tabla conservada la sigue usando.
do $do$
declare
  v_rec  record;
  v_name text;
  v_dropped text[] := '{}';
  v_kept    text[] := '{}';
  v_orphans text[] := '{}';
  v_names text[] := array[
    'apply_to_job', 'run_matchmaking', 'fn_job_matchmaking',
    'credit_tokens_from_payment'
  ];
  v_live_tables text[] := array[
    'profiles', 'credentials', 'daily_activity', 'analytics_events',
    'push_subscriptions', 'reputation_history', 'skill_tree_nodes', 'skill_tests',
    'skill_test_attempts', 'exam_sessions', 'user_skill_progress', 'academy_courses',
    'course_lessons', 'course_quiz_questions', 'user_course_progress',
    'user_lesson_progress', 'omicron_skill_proofs', 'actas_evidencia', 'rate_limits',
    'rate_limit_events', 'user_ai_context'
  ];
begin
  foreach v_name in array v_names loop
    if not exists (
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_name
    ) then
      v_orphans := v_orphans || v_name;
      continue;
    end if;

    for v_rec in
      select p.oid,
             exists (
               select 1
               from pg_trigger t
               join pg_class c on c.oid = t.tgrelid
               join pg_namespace n on n.oid = c.relnamespace
               where t.tgfoid = p.oid
                 and not t.tgisinternal
                 and n.nspname = 'public'
                 and c.relname::text = any (v_live_tables)
             ) as la_usa_trigger_vivo
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_name
    loop
      if v_rec.la_usa_trigger_vivo then
        v_kept := v_kept || (v_name || ': trigger vivo');
      else
        begin
          execute format('drop function %s', v_rec.oid::regprocedure);
          v_dropped := v_dropped || v_name;
        exception when others then
          v_kept := v_kept || (v_name || ': ' || left(sqlerrm, 60));
        end;
      end if;
    end loop;
  end loop;

  raise notice '[10007] RPCs dropeadas (%): %',
    array_length(v_dropped, 1), coalesce(array_to_string(v_dropped, ', '), 'ninguna');
  if array_length(v_kept, 1) > 0 then
    raise warning '[10007] RPCs conservadas: %', array_to_string(v_kept, ', ');
  end if;
  if array_length(v_orphans, 1) > 0 then
    raise notice '[10007] nunca existieron en esta base: %', array_to_string(v_orphans, ', ');
  end if;
end;
$do$;

notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════
-- 4. REPORTE — una sola sentencia: lo que quedó vivo se ve acá
-- ══════════════════════════════════════════════════════════════════════
select t as tabla,
       (to_regclass('public.' || quote_ident(t)) is not null) as sigue_en_la_base
from unnest(array[
  'jobs','job_postings','job_applications','job_matches',
  'freelance_needs','freelance_applications','wallet_transactions'
]) as t
order by sigue_en_la_base desc, tabla;
