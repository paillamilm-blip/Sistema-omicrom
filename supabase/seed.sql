-- =====================================================================
-- seed.sql — Semilla de demostración para Sistema Ómicron
-- Usa cuentas existentes (prueba06..09). Idempotente y best-effort.
-- Córrela en el SQL Editor. NO crea usuarios de auth (usa los que ya tienes).
-- =====================================================================

do $$
declare
  u1 uuid; u2 uuid; u3 uuid; u4 uuid;
  -- IDs fijos para que re-correr no duplique
  svc1 uuid := 'b0000000-0000-0000-0000-000000000001';
  svc2 uuid := 'b0000000-0000-0000-0000-000000000002';
  svc3 uuid := 'b0000000-0000-0000-0000-000000000003';
  job1 uuid := 'd0000000-0000-0000-0000-000000000001';
  job2 uuid := 'd0000000-0000-0000-0000-000000000002';
  doc1 uuid := 'e0000000-0000-0000-0000-000000000001';
  con1 uuid := 'c0000000-0000-0000-0000-000000000001'; -- LOCKED (u1 compra a u2)
  con2 uuid := 'c0000000-0000-0000-0000-000000000002'; -- DELIVERED (u1 compra a u3)
  con3 uuid := 'c0000000-0000-0000-0000-000000000003'; -- en disputa (u2 compra a u3)
  dsp1 uuid := 'f0000000-0000-0000-0000-000000000001';
  arb1 uuid := 'f0000000-0000-0000-0000-000000000002';
begin
  select id into u1 from public.profiles where username = 'prueba06' limit 1;
  select id into u2 from public.profiles where username = 'prueba07' limit 1;
  select id into u3 from public.profiles where username = 'prueba08' limit 1;
  select id into u4 from public.profiles where username = 'prueba09' limit 1;

  if u1 is null or u2 is null or u3 is null then
    raise notice 'Faltan cuentas de prueba (prueba06/07/08). Crea esas cuentas y vuelve a correr.';
    return;
  end if;
  if u4 is null then u4 := u2; end if; -- fallback si no existe prueba09

  -- ── 1) Perfiles: balances + Gemelo variado (para que el radar se vea vivo) ──
  begin
    update public.profiles set token_balance=8000, traditional_score=40, execution_score=78, quality_score=70, transcendence_score=55, foundation_score=82, pe_points=1200 where id=u1;
    update public.profiles set token_balance=5000, traditional_score=20, execution_score=60, quality_score=85, transcendence_score=40, foundation_score=65, pe_points=600  where id=u2;
    update public.profiles set token_balance=3000, traditional_score=60, execution_score=90, quality_score=72, transcendence_score=68, foundation_score=88, pe_points=2600 where id=u3;
    update public.profiles set token_balance=2000, traditional_score=10, execution_score=45, quality_score=50, transcendence_score=35, foundation_score=55, pe_points=300  where id=u4;
  exception when others then raise notice 'perfiles: %', sqlerrm; end;

  -- ── 2) Servicios del Market ──
  begin
    insert into public.market_services (id, seller_id, title, description, price, category, tags, rating, total_reviews, is_active) values
      (svc1, u2, 'Diseño de PCB industrial', 'Diseño y ruteo de placas para automatización (KiCad).', 800, 'Hardware', '{PCB,KiCad,Electrónica}', 4.8, 12, true),
      (svc2, u3, 'Optimización de procesos PET', 'Reducción de ciclo en moldes de inyección.', 1200, 'Industria', '{PET,Procesos,Lean}', 4.9, 21, true),
      (svc3, u2, 'API de telemetría en tiempo real', 'Backend de sensores con Supabase + Edge Functions.', 950, 'Software', '{API,Realtime,IoT}', 4.7, 8, true)
    on conflict (id) do nothing;
  exception when others then raise notice 'market: %', sqlerrm; end;

  -- ── 3) Empleos ──
  begin
    insert into public.jobs (id, poster_id, title, company, description, location, is_remote, is_urgent, salary_min, salary_max, category, tags, is_active) values
      (job1, u3, 'Ingeniero de Automatización', 'Ómicron Labs', 'Integración de PLCs y SCADA.', 'Santiago, CL', false, true, 1800, 2600, 'Ingeniería', '{PLC,SCADA,Automatización}', true),
      (job2, u2, 'Dev Full-Stack (React + Supabase)', 'NodoTech', 'Construcción de módulos del sistema.', 'Remoto', true, false, 1500, 2200, 'Software', '{React,Supabase,TypeScript}', true)
    on conflict (id) do nothing;
  exception when others then raise notice 'jobs: %', sqlerrm; end;

  -- ── 4) Documento de la Bóveda de Conocimiento ──
  begin
    insert into public.knowledge_vault_documents (id, title, description, author_id, initial_token_cost, current_token_cost, efficiency_score, competency_tags, is_validated, total_royalties) values
      (doc1, 'Protocolo de Calibración de Moldes', 'Guía validada para reducir merma en inyección PET.', u3, 150, 180, 92, 'PET,Calidad', true, 340)
    on conflict (id) do nothing;
  exception when others then raise notice 'vault: %', sqlerrm; end;

  -- ── 5) Contratos (los triggers bloquean el escrow automáticamente) ──
  begin
    if not exists (select 1 from public.contracts where id=con1) then
      insert into public.contracts (id, service_id, buyer_id, seller_id, title, description, amount, status)
      values (con1, svc1, u1, u2, 'Diseño PCB - Lote A', 'Placa controladora v2', 500, null); -- trigger → LOCKED
    end if;

    if not exists (select 1 from public.contracts where id=con2) then
      insert into public.contracts (id, service_id, buyer_id, seller_id, title, description, amount, status)
      values (con2, svc2, u1, u3, 'Optimización línea PET', 'Reducir ciclo 8%', 700, null);
      update public.contracts set status='DELIVERED', delivery_declared_at = now() - interval '5 minutes' where id=con2; -- Ghost Approval corriendo
    end if;

    if not exists (select 1 from public.contracts where id=con3) then
      insert into public.contracts (id, service_id, buyer_id, seller_id, title, description, amount, status)
      values (con3, svc3, u2, u3, 'API Telemetría', 'Endpoint de sensores', 600, null);
      update public.contracts set status='DISPUTED' where id=con3;
    end if;
  exception when others then raise notice 'contracts: %', sqlerrm; end;

  -- ── 6) Mensajes (texto plano: ciphertext null → se muestran tal cual) ──
  begin
    if not exists (select 1 from public.messages where network_id=con1) then
      insert into public.messages (id, sender_id, receiver_id, network_id, content, is_read, created_at) values
        ('c1000000-0000-0000-0000-000000000001', u1, u2, con1, 'Hola, ¿cómo va el diseño de la placa?', true, now()-interval '3 hours'),
        ('c1000000-0000-0000-0000-000000000002', u2, u1, con1, 'Avanzando bien, te entrego mañana.', true, now()-interval '2 hours'),
        ('c1000000-0000-0000-0000-000000000003', u1, u2, con1, 'Perfecto, quedo atento.', false, now()-interval '1 hour');
    end if;
    if not exists (select 1 from public.messages where network_id=con3) then
      insert into public.messages (id, sender_id, receiver_id, network_id, content, is_read, created_at) values
        ('c3000000-0000-0000-0000-000000000001', u2, u3, con3, 'La API no responde como acordamos.', true, now()-interval '5 hours'),
        ('c3000000-0000-0000-0000-000000000002', u3, u2, con3, 'Revisé y cumple el contrato.', true, now()-interval '4 hours');
    end if;
  exception when others then raise notice 'messages: %', sqlerrm; end;

  -- ── 7) Disputa + árbitros (u1 será ÁRBITRO → la verá en Gobernanza) ──
  begin
    insert into public.disputes (id, contract_id, plaintiff_id, defendant_id, reason, status)
    values (dsp1, con3, u2, u3, 'El entregable no cumple lo acordado en el contrato.', 'OPENED')
    on conflict (id) do nothing;

    insert into public.arbitration_cases (id, dispute_id, arbiters)
    values (arb1, dsp1, array[u1, u4]::uuid[])
    on conflict (id) do nothing;
  exception when others then raise notice 'dispute: %', sqlerrm; end;

  -- ── 8) Staking (u1 invierte en u2) ──
  begin
    insert into public.human_venture_stakes (id, investor_id, target_id, amount, status)
    values ('a0000000-0000-0000-0000-000000000001', u1, u2, 200, 'ACTIVE')
    on conflict (id) do nothing;
  exception when others then raise notice 'stake: %', sqlerrm; end;

  -- ── 9) Progreso en el árbol (u1 valida la raíz → se ilumina y abre hijos) ──
  begin
    if not exists (select 1 from public.user_skill_progress where user_id=u1 and node_id='22222222-2222-2222-2222-222222222222') then
      insert into public.user_skill_progress (user_id, node_id, status, progress_percentage, validated_at)
      values (u1, '22222222-2222-2222-2222-222222222222', 'VALIDATED', 100, now());
    end if;
    if not exists (select 1 from public.user_skill_progress where user_id=u1 and node_id='11111111-1111-1111-1111-111111111111') then
      insert into public.user_skill_progress (user_id, node_id, status, progress_percentage)
      values (u1, '11111111-1111-1111-1111-111111111111', 'IN_PROGRESS', 45);
    end if;
  exception when others then raise notice 'skill_progress: %', sqlerrm; end;

  -- ── 10) Historial de wallet (u1) ──
  begin
    insert into public.wallet_transactions (id, user_id, amount, transaction_type, description) values
      ('aa000000-0000-0000-0000-000000000001', u1, 1000, 'deposit',  'Bono de bienvenida'),
      ('aa000000-0000-0000-0000-000000000002', u1, -500, 'escrow_lock', 'Escrow: Diseño PCB - Lote A'),
      ('aa000000-0000-0000-0000-000000000003', u1, 200,  'reward',   'PE convertidos')
    on conflict (id) do nothing;
  exception when others then raise notice 'wallet: %', sqlerrm; end;

  raise notice 'Semilla aplicada. Usuario principal: prueba06.';
end $$;
