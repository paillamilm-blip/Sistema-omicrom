-- =====================================================================
-- 0021_governance.sql — Backend de Gobernanza (Tribunal de Pares + Staking)
-- Completa lo que el frontend ya espera: asignación de árbitros, fallo con
-- movimiento de fondos, y staking de talento. Idempotente.
-- =====================================================================

-- ── 0) Eliminar versiones previas (evita "cannot change return type") ─
drop function if exists public.resolve_dispute(uuid, text);
drop function if exists public.create_stake(uuid, numeric);
drop function if exists public.create_stake(uuid, integer);
drop function if exists public.withdraw_stake(uuid);

-- ── 1) Al abrir una disputa, asignar 3 árbitros aleatorios ───────────
create or replace function public.fn_assign_arbiters()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_arbiters uuid[];
begin
  select array_agg(id) into v_arbiters
  from (
    select id from public.profiles
    where id <> new.plaintiff_id
      and (new.defendant_id is null or id <> new.defendant_id)
    order by random()
    limit 3
  ) q;

  insert into public.arbitration_cases (dispute_id, arbiters)
  values (new.id, coalesce(v_arbiters, '{}'::uuid[]));

  update public.disputes set status = 'IN_REVIEW' where id = new.id;
  return null;
end; $fn$;

drop trigger if exists trg_assign_arbiters on public.disputes;
create trigger trg_assign_arbiters
  after insert on public.disputes
  for each row execute function public.fn_assign_arbiters();

-- ── 2) resolve_dispute: el árbitro emite el fallo y se mueven fondos ──
create or replace function public.resolve_dispute(p_dispute_id uuid, p_verdict text)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_dispute  record;
  v_case     record;
  v_contract record;
  v_winner   uuid;
begin
  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then raise exception 'Disputa no existe'; end if;
  if v_dispute.status = 'RESOLVED' then raise exception 'La disputa ya fue resuelta'; end if;

  select * into v_case from public.arbitration_cases where dispute_id = p_dispute_id;
  if v_case is null then raise exception 'Caso de arbitraje no encontrado'; end if;
  if not (auth.uid() = any(v_case.arbiters)) then
    raise exception 'Solo un árbitro asignado puede emitir el fallo';
  end if;
  if p_verdict not in ('PLAINTIFF_WINS','DEFENDANT_WINS') then
    raise exception 'Veredicto inválido';
  end if;

  v_winner := case when p_verdict = 'PLAINTIFF_WINS'
                   then v_dispute.plaintiff_id else v_dispute.defendant_id end;

  update public.arbitration_cases
    set verdict = p_verdict, decided_by = auth.uid(), decision_date = now()
  where dispute_id = p_dispute_id;

  update public.disputes
    set status = 'RESOLVED', resolution = 'Fallo: ' || p_verdict
  where id = p_dispute_id;

  -- Movimiento de fondos del escrow del contrato asociado
  if v_dispute.contract_id is not null then
    select * into v_contract from public.contracts where id = v_dispute.contract_id;
    if v_contract is not null and upper(coalesce(v_contract.status,'')) not in ('RELEASED','REFUNDED') then
      if v_winner = v_contract.seller_id then
        -- Gana el vendedor: liberar escrow al vendedor
        update public.profiles set token_escrow = greatest(coalesce(token_escrow,0) - v_contract.amount, 0)
          where id = v_contract.buyer_id;
        update public.profiles set token_balance = coalesce(token_balance,0) + v_contract.amount
          where id = v_contract.seller_id;
        update public.contracts set status = 'RELEASED' where id = v_contract.id;
        insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        values (v_contract.seller_id, 'escrow_release', v_contract.amount, 'Disputa fallada a tu favor', v_contract.id);
      else
        -- Gana el comprador: reembolsar
        update public.profiles
          set token_escrow  = greatest(coalesce(token_escrow,0) - v_contract.amount, 0),
              token_balance = coalesce(token_balance,0) + v_contract.amount
          where id = v_contract.buyer_id;
        update public.contracts set status = 'REFUNDED' where id = v_contract.id;
        insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        values (v_contract.buyer_id, 'refund', v_contract.amount, 'Disputa fallada a tu favor', v_contract.id);
      end if;
    end if;
  end if;
end; $fn$;

grant execute on function public.resolve_dispute(uuid, text) to authenticated;

-- ── 3) Staking de talento ────────────────────────────────────────────
create or replace function public.create_stake(p_target_id uuid, p_amount numeric)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_bal numeric;
begin
  if p_amount <= 0 then raise exception 'Monto inválido'; end if;
  if p_target_id = auth.uid() then raise exception 'No puedes invertir en ti mismo'; end if;

  select token_balance into v_bal from public.profiles where id = auth.uid();
  if v_bal is null or v_bal < p_amount then raise exception 'Saldo insuficiente'; end if;

  update public.profiles set token_balance = token_balance - p_amount where id = auth.uid();

  insert into public.human_venture_stakes (investor_id, target_id, amount, status)
  values (auth.uid(), p_target_id, p_amount, 'ACTIVE');

  insert into public.wallet_transactions (user_id, transaction_type, amount, description)
  values (auth.uid(), 'withdrawal', -p_amount, 'Inversión en staking de talento');
end; $fn$;

grant execute on function public.create_stake(uuid, numeric) to authenticated;

create or replace function public.withdraw_stake(p_stake_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_stake record; v_return numeric;
begin
  select * into v_stake from public.human_venture_stakes where id = p_stake_id;
  if v_stake is null then raise exception 'Inversión no existe'; end if;
  if v_stake.investor_id <> auth.uid() then raise exception 'No es tu inversión'; end if;
  if v_stake.status <> 'ACTIVE' then raise exception 'Inversión ya retornada'; end if;

  v_return := round(v_stake.amount * 1.15);

  update public.human_venture_stakes
    set status = 'RETURNED', return_amount = v_return, returned_at = now()
  where id = p_stake_id;

  update public.profiles set token_balance = coalesce(token_balance,0) + v_return where id = auth.uid();

  insert into public.wallet_transactions (user_id, transaction_type, amount, description)
  values (auth.uid(), 'deposit', v_return, 'Retorno de staking (+15%)');
end; $fn$;

grant execute on function public.withdraw_stake(uuid) to authenticated;
