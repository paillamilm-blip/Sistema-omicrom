-- =====================================================================
-- 0029_arbiter_quorum.sql — Hallazgo A2: arbitraje por QUÓRUM 2-de-3
-- Antes: un solo árbitro resolvía y movía fondos.
-- Ahora: cada árbitro VOTA; la disputa se resuelve solo cuando un veredicto
-- alcanza 2 votos coincidentes. Idempotente.
-- =====================================================================

-- 1) Tabla de votos de árbitros (1 voto por árbitro, modificable)
create table if not exists public.arbiter_votes (
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  arbiter_id uuid not null references public.profiles(id) on delete cascade,
  verdict    text not null check (verdict in ('PLAINTIFF_WINS','DEFENDANT_WINS')),
  created_at timestamptz not null default now(),
  primary key (dispute_id, arbiter_id)
);
alter table public.arbiter_votes enable row level security;

drop policy if exists av_select on public.arbiter_votes;
create policy av_select on public.arbiter_votes for select to authenticated using (
  auth.uid() = arbiter_id
  or exists (select 1 from public.arbitration_cases ac
             where ac.dispute_id = arbiter_votes.dispute_id and auth.uid() = any(ac.arbiters))
);
grant select on public.arbiter_votes to authenticated;
revoke insert, update, delete on public.arbiter_votes from authenticated;  -- solo vía RPC

-- 2) resolve_dispute con quórum
create or replace function public.resolve_dispute(p_dispute_id uuid, p_verdict text)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_dispute record; v_case record; v_contract record;
  v_winner uuid; v_final text; v_votes int;
begin
  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then raise exception 'Disputa no existe'; end if;
  if v_dispute.status = 'RESOLVED' then raise exception 'La disputa ya fue resuelta'; end if;

  select * into v_case from public.arbitration_cases where dispute_id = p_dispute_id;
  if v_case is null then raise exception 'Caso de arbitraje no encontrado'; end if;
  if not (auth.uid() = any(v_case.arbiters)) then raise exception 'Solo un árbitro asignado puede votar'; end if;
  if p_verdict not in ('PLAINTIFF_WINS','DEFENDANT_WINS') then raise exception 'Veredicto inválido'; end if;

  -- Registrar / actualizar el voto del árbitro
  insert into public.arbiter_votes (dispute_id, arbiter_id, verdict)
  values (p_dispute_id, auth.uid(), p_verdict)
  on conflict (dispute_id, arbiter_id) do update set verdict = excluded.verdict, created_at = now();

  -- ¿Hay quórum? (un veredicto con >= 2 votos)
  select verdict, count(*) into v_final, v_votes
  from public.arbiter_votes
  where dispute_id = p_dispute_id
  group by verdict
  order by count(*) desc
  limit 1;

  if coalesce(v_votes,0) < 2 then
    return;  -- voto registrado; aún sin quórum
  end if;

  -- QUÓRUM alcanzado -> resolver
  v_winner := case when v_final = 'PLAINTIFF_WINS' then v_dispute.plaintiff_id else v_dispute.defendant_id end;

  update public.arbitration_cases set verdict = v_final, decided_by = auth.uid(), decision_date = now()
  where dispute_id = p_dispute_id;
  update public.disputes set status = 'RESOLVED', resolution = 'Fallo por quórum: ' || v_final
  where id = p_dispute_id;

  -- Mover fondos del escrow
  if v_dispute.contract_id is not null then
    select * into v_contract from public.contracts where id = v_dispute.contract_id;
    if v_contract is not null and upper(coalesce(v_contract.status,'')) not in ('RELEASED','REFUNDED') then
      if v_winner = v_contract.seller_id then
        update public.profiles set token_escrow = greatest(coalesce(token_escrow,0) - v_contract.amount, 0) where id = v_contract.buyer_id;
        update public.profiles set token_balance = coalesce(token_balance,0) + v_contract.amount where id = v_contract.seller_id;
        update public.contracts set status = 'RELEASED' where id = v_contract.id;
        insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        values (v_contract.seller_id, 'escrow_release', v_contract.amount, 'Disputa fallada a tu favor', v_contract.id);
      else
        update public.profiles set token_escrow = greatest(coalesce(token_escrow,0) - v_contract.amount, 0),
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
