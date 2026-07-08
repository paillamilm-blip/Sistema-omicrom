-- =====================================================================
-- 0043_appeals.sql — Sistema de Justicia: Proceso de Apelación
-- Alineado con DEFINICION_OMICROM_v8_BACKEND.md · sección 5.
--
-- disputes.appellant_id / appeal_deposit ya existían en el esquema real
-- (schema.sql) pero sin lógica. Esta migración les da comportamiento:
--
--   1) open_appeal(): abre apelación dentro de ventana de 7 días desde
--      que la disputa quedó RESOLVED. Cobra el depósito (se pierde si
--      la apelación es rechazada; se devuelve si se revierte el fallo).
--   2) appeal_votes: panel de 3 árbitros "senior" (proxy de N5/N6, ya
--      que el sistema real usa node_type + reputación en vez de N1-N6):
--        senior = node_type IN ('Nodo Arquitecto','Nodo Fundador')
--                 AND reputation_score >= 70
--   3) resolve_appeal(): quórum 2-de-3 de árbitros senior. Decisión
--      final salvo fraude comprobado (reapertura manual vía soporte,
--      fuera de alcance de esta migración).
--
-- Idempotente.
-- =====================================================================

-- ── 1) Estado de apelación en disputes ───────────────────────────────
alter table public.disputes
  add column if not exists appeal_status text not null default 'NONE'
    check (appeal_status in ('NONE','OPEN','RESOLVED'));

alter table public.disputes
  add column if not exists appeal_opened_at timestamptz;

alter table public.disputes
  add column if not exists appeal_resolution text;

-- Panel de árbitros SENIOR de la apelación, separado de arbitration_cases.arbiters
-- (el panel original del Tribunal de Pares) para no perder el rastro de auditoría
-- de quién arbitró el caso en primera instancia.
alter table public.disputes
  add column if not exists appeal_arbiters uuid[] not null default '{}';

-- ── 2) Panel de votos de apelación (árbitros senior) ─────────────────
create table if not exists public.appeal_votes (
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  arbiter_id uuid not null references public.profiles(id) on delete cascade,
  verdict    text not null check (verdict in ('UPHOLD','OVERTURN')),  -- UPHOLD = confirma fallo original
  created_at timestamptz not null default now(),
  primary key (dispute_id, arbiter_id)
);
alter table public.appeal_votes enable row level security;

drop policy if exists apv_select on public.appeal_votes;
create policy apv_select on public.appeal_votes for select to authenticated using (
  auth.uid() = arbiter_id
  or exists (select 1 from public.disputes d
             where d.id = appeal_votes.dispute_id
               and (auth.uid() = d.plaintiff_id or auth.uid() = d.defendant_id))
);
grant select on public.appeal_votes to authenticated;
revoke insert, update, delete on public.appeal_votes from authenticated;  -- solo vía RPC

-- ── 3) Helper: ¿es árbitro senior? (proxy de N5/N6) ──────────────────
create or replace function public.is_senior_arbiter(p_user_id uuid)
returns boolean language sql stable set search_path = public as $fn$
  select exists (
    select 1 from public.profiles
    where id = p_user_id
      and node_type in ('Nodo Arquitecto','Nodo Fundador')
      and coalesce(reputation_score,0) >= 70
  );
$fn$;

-- Función de solo lectura, sin efectos secundarios ni datos sensibles más
-- allá de un booleano: se expone para que el frontend pueda mostrar/ocultar
-- la opción de apelar según elegibilidad, sin depender solo de RLS de profiles.
grant execute on function public.is_senior_arbiter(uuid) to authenticated;

-- ── 4) open_appeal(): abrir apelación (ventana 7 días + depósito) ────
create or replace function public.open_appeal(p_dispute_id uuid, p_deposit numeric)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_dispute record; v_bal numeric; v_arbiters uuid[];
begin
  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then raise exception 'Disputa no existe'; end if;
  if v_dispute.status <> 'RESOLVED' then raise exception 'Solo se puede apelar una disputa ya resuelta'; end if;
  if v_dispute.appeal_status <> 'NONE' then raise exception 'Esta disputa ya tiene una apelación'; end if;
  if not (auth.uid() = v_dispute.plaintiff_id or auth.uid() = v_dispute.defendant_id) then
    raise exception 'Solo una parte de la disputa puede apelar';
  end if;

  -- Ventana de 7 días desde la resolución real (disputes.resolved_at, fijada por
  -- resolve_dispute() en 0042_penalties_pmc.sql).
  if v_dispute.resolved_at is null then
    raise exception 'Esta disputa no tiene fecha de resolución registrada';
  end if;
  if v_dispute.resolved_at < now() - interval '7 days' then
    raise exception 'La ventana de apelación (7 días) ya expiró';
  end if;

  if p_deposit <= 0 then raise exception 'El depósito debe ser mayor a 0'; end if;
  select token_balance into v_bal from public.profiles where id = auth.uid();
  if v_bal is null or v_bal < p_deposit then raise exception 'Saldo insuficiente para el depósito de apelación'; end if;

  update public.profiles set token_balance = token_balance - p_deposit where id = auth.uid();
  insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
  values (auth.uid(), 'withdrawal', -p_deposit, 'Depósito de apelación', p_dispute_id);

  -- Asignar panel de 3 árbitros senior distintos de las partes
  select array_agg(id) into v_arbiters
  from (
    select id from public.profiles
    where public.is_senior_arbiter(id)
      and id <> v_dispute.plaintiff_id
      and (v_dispute.defendant_id is null or id <> v_dispute.defendant_id)
    order by random()
    limit 3
  ) q;

  if coalesce(array_length(v_arbiters,1),0) < 3 then
    raise exception 'No hay suficientes árbitros senior disponibles para el panel de apelación';
  end if;

  update public.disputes
  set appellant_id     = auth.uid(),
      appeal_deposit    = p_deposit,
      appeal_status     = 'OPEN',
      appeal_opened_at  = now(),
      appeal_arbiters   = v_arbiters
  where id = p_dispute_id;
end; $fn$;

grant execute on function public.open_appeal(uuid, numeric) to authenticated;

-- ── 5) resolve_appeal(): panel senior vota, quórum 2-de-3 ────────────
create or replace function public.resolve_appeal(p_dispute_id uuid, p_verdict text)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_dispute record; v_contract record; v_original_verdict text;
  v_final text; v_votes int; v_new_winner uuid; v_new_loser uuid; v_old_winner uuid;
begin
  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then raise exception 'Disputa no existe'; end if;
  if v_dispute.appeal_status <> 'OPEN' then raise exception 'No hay apelación abierta para esta disputa'; end if;
  if p_verdict not in ('UPHOLD','OVERTURN') then raise exception 'Veredicto de apelación inválido'; end if;

  if not public.is_senior_arbiter(auth.uid()) or not (auth.uid() = any(v_dispute.appeal_arbiters)) then
    raise exception 'Solo un árbitro senior asignado al panel de apelación puede votar';
  end if;

  insert into public.appeal_votes (dispute_id, arbiter_id, verdict)
  values (p_dispute_id, auth.uid(), p_verdict)
  on conflict (dispute_id, arbiter_id) do update set verdict = excluded.verdict, created_at = now();

  select verdict, count(*) into v_final, v_votes
  from public.appeal_votes
  where dispute_id = p_dispute_id
  group by verdict
  order by count(*) desc
  limit 1;

  if coalesce(v_votes,0) < 2 then
    return;  -- voto registrado; aún sin quórum
  end if;

  update public.disputes
  set appeal_status = 'RESOLVED',
      appeal_resolution = 'Apelación: ' || v_final
  where id = p_dispute_id;

  if v_final = 'UPHOLD' then
    -- Se confirma el fallo original: se pierde el depósito (queda como comisión de plataforma)
    return;
  end if;

  -- OVERTURN: se revierte el fallo original y se devuelve el depósito al apelante.
  -- Se usa el veredicto limpio de arbitration_cases.verdict (no un parseo de texto
  -- sobre disputes.resolution, que es una descripción libre pensada para humanos).
  select verdict into v_original_verdict from public.arbitration_cases where dispute_id = p_dispute_id;
  v_old_winner := case when v_original_verdict = 'PLAINTIFF_WINS'
                        then v_dispute.plaintiff_id else v_dispute.defendant_id end;
  v_new_winner := case when v_old_winner = v_dispute.plaintiff_id
                        then v_dispute.defendant_id else v_dispute.plaintiff_id end;
  v_new_loser  := v_old_winner;

  update public.profiles set token_balance = coalesce(token_balance,0) + v_dispute.appeal_deposit
  where id = v_dispute.appellant_id;
  insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
  values (v_dispute.appellant_id, 'deposit', v_dispute.appeal_deposit, 'Devolución de depósito · apelación exitosa', p_dispute_id);

  -- Revertir movimiento de fondos del contrato asociado (si aplica y aún no se revirtió)
  if v_dispute.contract_id is not null and v_new_winner is not null then
    select * into v_contract from public.contracts where id = v_dispute.contract_id;
    if v_contract is not null then
      if v_new_winner = v_contract.seller_id and v_contract.status = 'REFUNDED' then
        update public.profiles set token_balance = greatest(coalesce(token_balance,0) - v_contract.amount, 0) where id = v_contract.buyer_id;
        update public.profiles set token_balance = coalesce(token_balance,0) + v_contract.amount where id = v_contract.seller_id;
        update public.contracts set status = 'RELEASED' where id = v_contract.id;
      elsif v_new_winner = v_contract.buyer_id and v_contract.status = 'RELEASED' then
        update public.profiles set token_balance = greatest(coalesce(token_balance,0) - v_contract.amount, 0) where id = v_contract.seller_id;
        update public.profiles set token_balance = coalesce(token_balance,0) + v_contract.amount where id = v_contract.buyer_id;
        update public.contracts set status = 'REFUNDED' where id = v_contract.id;
      end if;
      insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
      values (v_new_winner, 'escrow_release', v_contract.amount, 'Fallo revertido por apelación', v_contract.id);
    end if;
  end if;

  -- Ajustar penalización: revertir el PMC indebido al nuevo ganador (best-effort, última sanción por esta disputa)
  update public.penalties
  set current_pmc_points = 0, recovered_at = now(), reason = coalesce(reason,'') || ' [revertido por apelación]'
  where dispute_id = p_dispute_id and user_id = v_new_winner and recovered_at is null;

  -- Penalizar al que efectivamente perdió tras la apelación (si aún no tiene sanción por esta disputa)
  if v_new_loser is not null and not exists (
    select 1 from public.penalties where dispute_id = p_dispute_id and user_id = v_new_loser
  ) then
    perform public.apply_penalty(v_new_loser, p_dispute_id, 'DISPUTE_LOSS_APPEAL', 'MEDIUM',
      'Disputa revertida en tu contra tras apelación');
  end if;
end; $fn$;

grant execute on function public.resolve_appeal(uuid, text) to authenticated;
