-- ══════════════════════════════════════════════════════════════════════
-- 10006_recorte_economico.sql — Fase 6: la base deja de sostener lo que la app ya no promete
--
-- EL HECHO: la auditoría de uso (2026-10-23) mostró que TODA la capa
--   económica está en cero filas. Nadie contrató, nadie pagó, nadie retiró,
--   nadie arbitró un conflicto, nadie publicó una bóveda. El único bucle con
--   tracción real es el de aprendizaje: Oráculo → lección → quiz → Gemelo.
-- El código que mostraba esa capa ya salió de la app (rama fase-6-recorte-datos).
-- Esta migración hace que la base diga lo mismo que la interfaz.
--
-- ORDEN OBLIGATORIO — por qué esto es UNA migración y no un suelta-y-ya:
--   1. register_exam_success (la RPC VIVA que llama MaxSkillTab al aprobar)
--      hoy paga desde omicron_knowledge_fund. Si se suelta la tabla sin tocar
--      la función, el examen empieza a fallar y se rompe el único camino que
--      sí funciona. Primero se redefine.
--   2. las tablas de cero uso, con candado de 0 filas.
--   3. las RPCs muertas de Fondo / mercado / social / bóveda: aunque no haya
--      código que las llame, siguen expuestas en la API con SECURITY DEFINER
--      y son superficie de ataque sin dueño. Se sueltan DESPUÉS de las tablas
--      porque muchas están llamadas desde políticas de esas mismas tablas: al
--      revés, el drop las encuentra dependientes y no se van.
--
-- EL CANDADO: ninguna tabla se dropea a ciegas. Cada una se suelta solo si
--   TIENE 0 FILAS en el momento de ejecutar. El conteo corre adentro de la
--   migración, como postgres, sorteando RLS: un conteo desde el cliente
--   anónimo daría 0 en CUALQUIER tabla y sería un candidato falso. Si alguna
--   tiene datos, se conserva y se avisa por qué.
--
-- LO QUE A PROPÓSITO NO SE TOCA ACÁ:
--   • jobs / job_postings / job_applications / job_matches / freelance_*: la Red
--     Viva todavía lee ofertas (useJobsQuery). Se dropean en 10007, cuando salga
--     la capa de mercado del código (Fase 6B).
--   • credentials: es la promesa central del producto ("imposible de falsificar").
--   • actas_evidencia, exam_sessions, skill_test_attempts, skill_tests: el examen vivo.
--   • rate_limits / rate_limit_events: los escriben las Edge Functions (check_rate_limit).
--   • push_subscriptions, analytics_events, daily_activity, reputation_history,
--     omicron_skill_proofs, user_ai_context y todo el catálogo de Academia: uso real.
--   • handle_new_user, ensure_unique_username, recalc_*, protect_profile_columns,
--     set_updated_at, fn_credentials_*: triggers del alta y de la reputación. Intocables.
--     El paso 3 lo verifica en el catálogo: una función lista para morir solo
--     muere si ningún trigger de una tabla conservada la usa.
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   select prosrc like '%grant_exam_reward%' as ainda_paga_del_fondo
--   from pg_proc
--   where oid = 'public.register_exam_success(text, integer, text)'::regprocedure;
--   → false
--
--   Y de verdad (esto la consulta no lo prueba): aprobar un quiz desde la app y
--   ver la fila nueva en reputation_history con los ejes subidos.
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   No hay rollback de datos: se dropean tablas vacías. Para volver atrás hay
--   que recrear el esquema desde 10000/10001 y las migraciones de mercado.
--   Por eso el candado de 0 filas es la única red de seguridad, y está primero.
--
-- ── LO QUE QUEDA DEL LADO DEL DESPLIEGUE (no es SQL, es su entorno) ───
--   Tres Edge Functions leen tablas que acá se sueltan, y NINGUNA es invocada
--   desde la app (verificado contra src/ y contra las 5 funciones que sí se
--   llaman: credential, proxy-ai, proxy-tts, simulador-universal, vault-oracle):
--     • supabase/functions/ghost-approval  (notifications, contracts, wallet_transactions)
--     • supabase/functions/market-match    (market_services)
--     • supabase/functions/_shared/blackbox.ts (chat_room_keys, contracts — huérfano:
--       ningún índice lo importa)
--   Siguen desplegadas y son superficie de ataque aunque el producto no las use.
--   Cuando él decida, se retiran con:  supabase functions delete ghost-approval market-match
--   (blackbox.ts es un compartido, se borra del repo junto con el chat en 6B).
--   proxy-ai menciona "messages": es el campo del cuerpo de la petición, no la tabla.
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. EL EXAMEN DEJA DE PROMETER PLATA
-- ══════════════════════════════════════════════════════════════════════
-- Idéntico a 10001 en lo que importa: mismos ejes, misma fórmula, la misma
-- prueba registrada por nombre. Se van las dos claves de recompensa y las tres
-- llamadas al Fondo. La app ya no lee reward_tokens, así que el contrato con el
-- cliente sigue válido.
create or replace function public.register_exam_success(
  p_skill text,
  p_score integer,
  p_kind  text default 'mixed'
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_quality_delta    numeric    := 0;
  v_execution_delta  numeric;
  v_foundation_delta numeric;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  if p_score < 70 then
    return json_build_object('ok', false, 'error', 'score insuficiente para subir ejes');
  end if;

  -- ── Ejes: idéntico a 0073 / 10000 / 10001 (no se toca la fórmula) ──
  v_quality_delta := least(5, greatest(2, round((p_score - 70) * 0.1 + 2)));

  v_execution_delta := case
    when p_kind in ('practical', 'mixed') then least(3, greatest(1, round((p_score - 70) * 0.07 + 1)))
    else 0
  end;

  v_foundation_delta := case
    when p_kind in ('theory', 'mixed') then least(2, greatest(1, round((p_score - 70) * 0.05 + 1)))
    else 0
  end;

  update public.profiles set
    quality_score         = least(100, coalesce(quality_score, 0) + v_quality_delta),
    execution_score       = least(100, coalesce(execution_score, 0) + v_execution_delta),
    foundation_score      = least(100, coalesce(foundation_score, 0) + v_foundation_delta),
    reputation_updated_at = now()
  where id = v_uid;

  begin
    insert into public.reputation_history(user_id, reason)
    values (v_uid, 'Examen aprobado: ' || coalesce(p_skill, 'general') || ' (score: ' || p_score || ', kind: ' || p_kind || ')');
  exception when others then null;
  end;

  -- La prueba queda registrada por NOMBRE: eso es lo que distingue "lo declaré"
  -- de "lo probé", y hoy es lo único que pesa en la reputación.
  begin
    perform public.omicron_record_skill_proof(v_uid, p_skill, p_score);
  exception when others then null;
  end;

  return json_build_object(
    'ok', true,
    'quality_delta', v_quality_delta,
    'execution_delta', v_execution_delta,
    'foundation_delta', v_foundation_delta,
    'skill', p_skill,
    'score', p_score
  );
end;
$fn$;

revoke all on function public.register_exam_success(text, integer, text) from public, anon;
grant execute on function public.register_exam_success(text, integer, text) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 2. TABLAS DE CERO USO — CON CANDADO DE 0 FILAS
-- ══════════════════════════════════════════════════════════════════════
do $do$
declare
  v_t   text;
  v_n   bigint;
  v_dropped text[] := '{}';
  v_kept    text[] := '{}';
  v_blocked text[] := '{}';
  v_list text[] := array[
    -- social
    'connections', 'direct_messages', 'messages', 'chat_room_keys', 'follows',
    'mentorships', 'notifications', 'user_status', 'user_status_history',
    'gemelo_profiles', 'reputation_logs', 'ghost_approval_log',
    -- bóveda
    'knowledge_vault_documents', 'vault_queries', 'content_lineage',
    -- economía y mercado (la familia de empleos queda para 10007)
    'contracts', 'escrow_contracts', 'market_services', 'wallet_transactions',
    'payment_intents', 'payment_methods', 'stripe_customers', 'withdrawal_requests',
    'penalties', 'disputes', 'arbitration_cases', 'arbiter_votes', 'blackbox_votes',
    'appeal_votes', 'human_venture_stakes',
    -- Fondo de Conocimiento
    'omicron_knowledge_fund', 'omicron_platform_revenue'
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

  raise notice '[10006] tablas dropeadas (%): %',
    array_length(v_dropped, 1), coalesce(array_to_string(v_dropped, ', '), 'ninguna');
  if array_length(v_kept, 1) > 0 then
    raise warning '[10006] CON DATOS REALES, se conservan: %', array_to_string(v_kept, ', ');
  else
    raise notice '[10006] ninguna tabla del recorte tenía filas.';
  end if;
  if array_length(v_blocked, 1) > 0 then
    raise notice '[10006] no dropeables: %', array_to_string(v_blocked, ', ');
  end if;
end;
$do$;


-- ══════════════════════════════════════════════════════════════════════
-- 3. RPCs MUERTAS (Fondo + mercado + social + bóveda)
-- ══════════════════════════════════════════════════════════════════════
-- Las firmas se LEEN DEL CATÁLOGO, no se escriben a mano: así no queda ninguna
-- función viva por haber invocado el drop con una firma equivocada. Y ninguna
-- se suelta si un trigger de una tabla conservada la sigue usando.
do $do$
declare
  v_rec  record;
  v_name text;
  v_existe boolean;
  v_dropped text[] := '{}';
  v_kept    text[] := '{}';
  v_orphans text[] := '{}';
  v_names text[] := array[
    -- Fondo de Conocimiento (10000 / 10001)
    'omicron_fund_quote', 'omicron_fund_balance', 'omicron_fund_seed',
    'omicron_fund_contribute', 'omicron_grant_exam_reward',
    -- conexiones, mensajes directos, chat cifrado, salas
    'send_connection_request', 'respond_connection_request', 'my_connections',
    'my_pending_requests', 'connection_status', 'send_direct_message',
    'get_direct_thread', 'mark_dm_read', 'my_dm_conversations',
    'send_secure_message', 'get_secure_messages', 'verify_chat_chain', 'bb_room_key',
    -- seguir / seguidores
    'follow_user', 'unfollow_user', 'get_follower_count', 'get_following_count',
    -- ranking (ya no hay pantalla de leaderboard)
    'get_leaderboard',
    -- contratos, escrow, entregas, pagos, retiros
    'create_escrow_contract', 'declare_delivery', 'object_delivery', 'rate_contract',
    'release_escrow', 'ghost_release_funds', 'transfer_tokens', 'request_withdrawal',
    -- penalizaciones, disputas, arbitraje, apelaciones, apuestas
    'apply_penalty', 'apply_pmc_recovery', 'open_blackbox', 'open_appeal',
    'resolve_appeal', 'resolve_dispute', 'create_stake', 'withdraw_stake',
    'is_arbiter_of', 'is_senior_arbiter', 'is_party_of',
    -- bóveda (0 documentos publicados: el Oráculo no tiene qué recomendar)
    'consult_vault_document', 'get_vault_content', 'find_similar_documents',
    'match_vault_documents', 'register_content_lineage', 'apply_vault_depreciation',
    'apply_token_depreciation',
    -- coaching y retención
    'get_coach_context', 'get_retention_cohort', 'upsert_ai_context',
    -- funciones de trigger cuya tabla ya se dropeó arriba
    'gemelo_touch_updated_at', 'fn_touch_activity_wallet', 'fn_touch_activity_contracts',
    'fn_touch_activity_vault_query', 'protect_contract_columns', 'fn_vault_transcendence',
    'fn_market_transcendence', 'fn_mentorship_transcendence', 'fn_assign_arbiters',
    'fn_rate_limit_disputes', 'fn_contract_execution_after', 'touch_last_activity'
  ];
  -- Tablas que SE QUEDAN: si un trigger sobre alguna de ellas apunta a la
  -- función, la función es parte del camino vivo y no se toca.
  v_live_tables text[] := array[
    'profiles', 'credentials', 'daily_activity', 'analytics_events',
    'push_subscriptions', 'reputation_history', 'skill_tree_nodes', 'skill_tests',
    'skill_test_attempts', 'exam_sessions', 'user_skill_progress', 'academy_courses',
    'course_lessons', 'course_quiz_questions', 'user_course_progress',
    'user_lesson_progress', 'omicron_skill_proofs', 'actas_evidencia', 'rate_limits',
    'rate_limit_events', 'user_ai_context', 'jobs', 'job_postings', 'job_applications',
    'job_matches', 'freelance_needs', 'freelance_applications'
  ];
begin
  foreach v_name in array v_names loop
    select exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = v_name
    ) into v_existe;

    if not v_existe then
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

  raise notice '[10006] RPCs dropeadas (%): %',
    array_length(v_dropped, 1), coalesce(array_to_string(v_dropped, ', '), 'ninguna');
  if array_length(v_kept, 1) > 0 then
    raise warning '[10006] RPCs conservadas: %', array_to_string(v_kept, ', ');
  end if;
  if array_length(v_orphans, 1) > 0 then
    raise notice '[10006] nunca existieron en esta base: %', array_to_string(v_orphans, ', ');
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
  'connections','direct_messages','messages','chat_room_keys','follows','mentorships',
  'notifications','user_status','user_status_history','gemelo_profiles','reputation_logs',
  'ghost_approval_log','knowledge_vault_documents','vault_queries','content_lineage',
  'contracts','escrow_contracts','market_services','wallet_transactions','payment_intents',
  'payment_methods','stripe_customers','withdrawal_requests','penalties','disputes',
  'arbitration_cases','arbiter_votes','blackbox_votes','appeal_votes','human_venture_stakes',
  'omicron_knowledge_fund','omicron_platform_revenue'
]) as t
order by sigue_en_la_base desc, tabla;
