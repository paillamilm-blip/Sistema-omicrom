-- =====================================================================
-- seed_demo.sql — Semilla DEMO completa de TODAS las transacciones
-- Llena cada módulo con datos para ver la app "viva".
-- Usa las cuentas prueba06–prueba09. Idempotente y por secciones (si una
-- falla, las demás siguen). Correr en el SQL Editor de Supabase.
-- =====================================================================
do $$
declare
  u1 uuid; u2 uuid; u3 uuid; u4 uuid;
  c1 uuid; c2 uuid; c3 uuid; doc1 uuid; job1 uuid;
begin
  select id into u1 from public.profiles where username='prueba06';
  select id into u2 from public.profiles where username='prueba07';
  select id into u3 from public.profiles where username='prueba08';
  select id into u4 from public.profiles where username='prueba09';
  if u1 is null or u2 is null then
    raise notice 'Faltan cuentas prueba06–prueba09. Crea esos usuarios primero.';
    return;
  end if;

  -- 1) PERFILES: saldos + un DOCENTE validador (prueba07) ─────────────
  begin
    update public.profiles set token_balance=12000, token_escrow=0, pe_points=1200, node_type='Nodo Core' where id=u1;
    update public.profiles set token_balance=9000,  pe_points=2600, node_type='Nodo Arquitecto', is_verified_professional=true where id=u2;
    update public.profiles set token_balance=7000,  pe_points=600,  node_type='Nodo Core' where id=u3;
    update public.profiles set token_balance=5000,  pe_points=200 where id=u4;
  exception when others then raise notice 'perfiles: %', sqlerrm; end;

  -- 2) CREDENCIALES: 1 verificada + 1 pendiente (para que el docente valide)
  begin
    if not exists (select 1 from public.credentials where user_id=u1 and title='Ingeniería en Informática') then
      insert into public.credentials (user_id, cred_type, title, issuer, status, verified_by, verified_at)
      values (u1,'DEGREE','Ingeniería en Informática','Universidad de Chile','VERIFIED',u2,now());
    end if;
    if not exists (select 1 from public.credentials where user_id=u1 and title='Diplomado en Ciencia de Datos') then
      insert into public.credentials (user_id, cred_type, title, issuer, status)
      values (u1,'DIPLOMA','Diplomado en Ciencia de Datos','Coursera','PENDING');
    end if;
  exception when others then raise notice 'credenciales: %', sqlerrm; end;

  -- 3) ÁRBOL: nodo validado (sube Fundamento) ─────────────────────────
  begin
    if exists (select 1 from public.skill_tree_nodes where category='FOUNDATION') then
      if not exists (
        select 1 from public.user_skill_progress p
        join public.skill_tree_nodes n on n.id=p.node_id
        where p.user_id=u1 and n.category='FOUNDATION'
      ) then
        insert into public.user_skill_progress (user_id, node_id, status, progress_percentage, validated_at)
        select u1, id, 'VALIDATED', 100, now() from public.skill_tree_nodes
        where category='FOUNDATION' order by order_index limit 1;
      end if;
    end if;
  exception when others then raise notice 'arbol: %', sqlerrm; end;

  -- 4) ACADEMIA: curso completado ─────────────────────────────────────
  begin
    insert into public.user_course_progress (user_id, course_id, status, quiz_score, quiz_passed, completed_at)
    select u1, id, 'COMPLETED', 100, true, now() from public.academy_courses limit 1
    on conflict (user_id, course_id) do nothing;
  exception when others then raise notice 'academia: %', sqlerrm; end;

  -- 5) CONTRATOS: en curso (LOCKED), entregado (DELIVERED), liberado+calificado
  begin
    if not exists (select 1 from public.contracts where title='App de inventario' and seller_id=u1) then
      insert into public.contracts (buyer_id, seller_id, title, amount, status)
      values (u3, u1, 'App de inventario', 400, 'LOCKED') returning id into c1;
    end if;
    if not exists (select 1 from public.contracts where title='Landing page corporativa' and seller_id=u1) then
      insert into public.contracts (buyer_id, seller_id, title, amount, status, delivery_declared_at)
      values (u4, u1, 'Landing page corporativa', 250, 'DELIVERED', now()) returning id into c2;
    end if;
    if not exists (select 1 from public.contracts where title='Dashboard analítico' and seller_id=u1) then
      insert into public.contracts (buyer_id, seller_id, title, amount, status, rating, rated_at)
      values (u3, u1, 'Dashboard analítico', 600, 'RELEASED', 5, now()) returning id into c3;
      -- liberar fondos del contrato RELEASED (escrow -> vendedor)
      update public.profiles set token_escrow=greatest(coalesce(token_escrow,0)-600,0) where id=u3;
      update public.profiles set token_balance=token_balance+600, total_contracts_completed=coalesce(total_contracts_completed,0)+1 where id=u1;
      insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
      values (u1,'escrow_release',600,'Pago por Dashboard analítico',c3);
    end if;
  exception when others then raise notice 'contratos: %', sqlerrm; end;

  -- 6) DISPUTA: sobre el contrato DELIVERED (asigna 3 árbitros por trigger)
  begin
    if c2 is not null and not exists (select 1 from public.disputes where contract_id=c2) then
      insert into public.disputes (contract_id, plaintiff_id, defendant_id, reason, status)
      values (c2, u4, u1, 'La entrega no cumple con lo acordado en el brief.', 'OPENED');
    end if;
  exception when others then raise notice 'disputa: %', sqlerrm; end;

  -- 7) STAKING: u1 invierte en u3 ─────────────────────────────────────
  begin
    if not exists (select 1 from public.human_venture_stakes where investor_id=u1 and target_id=u3) then
      insert into public.human_venture_stakes (investor_id, target_id, amount, status)
      values (u1, u3, 500, 'ACTIVE');
      update public.profiles set token_balance=token_balance-500 where id=u1;
      insert into public.wallet_transactions (user_id, transaction_type, amount, description)
      values (u1,'withdrawal',-500,'Inversión en staking de @prueba08');
    end if;
  exception when others then raise notice 'staking: %', sqlerrm; end;

  -- 8) EMPLEOS: oferta (genera terna por trigger) + aplicación ────────
  begin
    if not exists (select 1 from public.job_postings where title='Backend Node.js' and company_id=u2) then
      insert into public.job_postings (company_id, title, description, category, tags, required_node_level, budget_usd, time_limit_hours)
      values (u2,'Backend Node.js','API REST con autenticación y pruebas','dev', array['Node','API','JWT'], 1, 800, 72)
      returning id into job1;
      insert into public.job_applications (job_id, applicant_id, cover_note, status)
      values (job1, u1, 'Tengo experiencia en APIs Node, me interesa.', 'pending')
      on conflict (job_id, applicant_id) do nothing;
    end if;
  exception when others then raise notice 'empleos: %', sqlerrm; end;

  -- 9) BÓVEDA: documento publicado + consulta (regalía al autor) ───────
  begin
    if not exists (select 1 from public.knowledge_vault_documents where title='Optimización de queries SQL' and author_id=u1) then
      insert into public.knowledge_vault_documents (author_id, title, description, initial_token_cost, current_token_cost, competency_tags, is_validated)
      values (u1,'Optimización de queries SQL','Usa índices en columnas filtradas, evita SELECT *, revisa el plan de ejecución con EXPLAIN ANALYZE y normaliza solo lo necesario.', 100, 100, 'SQL', true)
      returning id into doc1;
      -- u3 consulta y paga 100 -> 100 a u1
      update public.profiles set token_balance=token_balance-100 where id=u3;
      update public.profiles set token_balance=token_balance+100 where id=u1;
      update public.knowledge_vault_documents set total_royalties=coalesce(total_royalties,0)+100 where id=doc1;
      insert into public.vault_queries (document_id, reader_id, cost_paid) values (doc1, u3, 100);
      insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id) values (u1,'deposit',100,'Venta en Bóveda',doc1);
      insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id) values (u3,'withdrawal',-100,'Consulta en Bóveda',doc1);
    end if;
  exception when others then raise notice 'boveda: %', sqlerrm; end;

  -- 10) MENTORÍAS: u2 mentorea a u1 ───────────────────────────────────
  begin
    if not exists (select 1 from public.mentorships where mentor_id=u2 and mentee_id=u1) then
      insert into public.mentorships (mentor_id, mentee_id, topic, status)
      values (u2, u1, 'Arquitectura de software', 'COMPLETED');
    end if;
  exception when others then raise notice 'mentorias: %', sqlerrm; end;

  -- 11) NOTIFICACIONES ────────────────────────────────────────────────
  begin
    insert into public.notifications (user_id, type, title, body, is_read)
    values (u1,'contract_update','Entrega aprobada ✅','Tu trabajo "Dashboard analítico" fue aprobado. +600 T.', false);
    insert into public.notifications (user_id, type, title, body, is_read)
    values (u1,'vault','Nueva regalía 🪙','Recibiste 100 T por una consulta en tu documento de la Bóveda.', false);
    insert into public.notifications (user_id, type, title, body, is_read)
    values (u1,'credential','Credencial verificada 🎓','Tu título fue validado por un docente.', false);
  exception when others then raise notice 'notif: %', sqlerrm; end;

  -- 12) GEMELO: recalcular ejes según lo sembrado, luego dejar uno "vivo"
  begin
    perform public.recalc_traditional_score(u1);
    perform public.recalc_foundation_score(u1);
    perform public.recalc_execution_score(u1);
    perform public.recalc_quality_score(u1);
    perform public.recalc_transcendence_score(u1);
    perform public.recalc_transcendence_score(u2);
    perform public.recalc_transcendence_score(u3);
  exception when others then raise notice 'gemelo: %', sqlerrm; end;

  raise notice 'Semilla DEMO aplicada ✅';
end $$;
