-- =====================================================================
--  ÓMICROM · CERRAR HALLAZGOS DE SEGURIDAD (antes de la beta)
--  Aplica de una: A1 (Bóveda), A2 (quórum), A3 (RLS gobernanza), M1 (contracts).
--  Reúne las migraciones 0030, 0027, 0032, 0028, 0029 (idempotentes, seguras
--  de re-ejecutar). Pega TODO en Supabase → SQL Editor → Run.
-- =====================================================================

-- ── M1 · RLS de contracts (0030) ────────────────────────────────────
alter table public.contracts enable row level security;
drop policy if exists contracts_select on public.contracts;
create policy contracts_select on public.contracts for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
drop policy if exists contracts_insert on public.contracts;
create policy contracts_insert on public.contracts for insert to authenticated
  with check (auth.uid() = buyer_id);
drop policy if exists contracts_update on public.contracts;
create policy contracts_update on public.contracts for update to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);
grant select, insert, update on public.contracts to authenticated;

-- ── A3 · RLS gobernanza/economía (0027) ─────────────────────────────
do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='human_venture_stakes' loop
    execute format('drop policy if exists %I on public.human_venture_stakes', r.policyname); end loop; end $$;
alter table public.human_venture_stakes enable row level security;
create policy hvs_select_own on public.human_venture_stakes for select to authenticated
  using (auth.uid() = investor_id or auth.uid() = target_id);
grant select on public.human_venture_stakes to authenticated;
revoke insert, update, delete on public.human_venture_stakes from authenticated;

do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='arbitration_cases' loop
    execute format('drop policy if exists %I on public.arbitration_cases', r.policyname); end loop; end $$;
alter table public.arbitration_cases enable row level security;
grant select on public.arbitration_cases to authenticated;
revoke insert, update, delete on public.arbitration_cases from authenticated;

do $$ declare r record; begin
  for r in select policyname from pg_policies where schemaname='public' and tablename='disputes' loop
    execute format('drop policy if exists %I on public.disputes', r.policyname); end loop; end $$;
alter table public.disputes enable row level security;
create policy disputes_insert on public.disputes for insert to authenticated
  with check (auth.uid() = plaintiff_id);
grant select, insert on public.disputes to authenticated;
revoke update, delete on public.disputes from authenticated;

-- ── A3 (cont.) · Fix recursión RLS con helpers SECURITY DEFINER (0032) ─
create or replace function public.is_arbiter_of(p_dispute_id uuid)
returns boolean language sql security definer stable set search_path = public as $fn$
  select exists (select 1 from public.arbitration_cases ac where ac.dispute_id = p_dispute_id and auth.uid() = any (ac.arbiters));
$fn$;
create or replace function public.is_party_of(p_dispute_id uuid)
returns boolean language sql security definer stable set search_path = public as $fn$
  select exists (select 1 from public.disputes d where d.id = p_dispute_id and auth.uid() in (d.plaintiff_id, d.defendant_id));
$fn$;
grant execute on function public.is_arbiter_of(uuid) to authenticated;
grant execute on function public.is_party_of(uuid) to authenticated;

drop policy if exists disputes_select on public.disputes;
create policy disputes_select on public.disputes for select to authenticated
  using (auth.uid() = plaintiff_id or auth.uid() = defendant_id or public.is_arbiter_of(id));
drop policy if exists arbcase_select on public.arbitration_cases;
create policy arbcase_select on public.arbitration_cases for select to authenticated
  using (auth.uid() = any (arbiters) or public.is_party_of(dispute_id));

-- ── A1 · Proteger contenido de la Bóveda a nivel de columna (0028) ──
revoke select on public.knowledge_vault_documents from authenticated;
grant select (id, author_id, title, initial_token_cost, current_token_cost, efficiency_score,
  competency_tags, created_at, parent_document_id, is_validated, total_royalties, embedding)
  on public.knowledge_vault_documents to authenticated;
grant insert, update on public.knowledge_vault_documents to authenticated;

create or replace function public.get_vault_content(p_doc_id uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare v_content text; v_author uuid;
begin
  select description, author_id into v_content, v_author from public.knowledge_vault_documents where id = p_doc_id;
  if v_author = auth.uid() then return v_content; end if;
  if exists (select 1 from public.vault_queries where document_id = p_doc_id and reader_id = auth.uid()) then return v_content; end if;
  return null;
end; $fn$;
grant execute on function public.get_vault_content(uuid) to authenticated;

-- ── A2 · Arbitraje por quórum 2-de-3 (0029) ─────────────────────────
create table if not exists public.arbiter_votes (
  dispute_id uuid not null references public.disputes(id) on delete cascade,
  arbiter_id uuid not null references public.profiles(id) on delete cascade,
  verdict text not null check (verdict in ('PLAINTIFF_WINS','DEFENDANT_WINS')),
  created_at timestamptz not null default now(),
  primary key (dispute_id, arbiter_id)
);
alter table public.arbiter_votes enable row level security;
drop policy if exists av_select on public.arbiter_votes;
create policy av_select on public.arbiter_votes for select to authenticated using (
  auth.uid() = arbiter_id
  or exists (select 1 from public.arbitration_cases ac where ac.dispute_id = arbiter_votes.dispute_id and auth.uid() = any(ac.arbiters)));
grant select on public.arbiter_votes to authenticated;
revoke insert, update, delete on public.arbiter_votes from authenticated;

create or replace function public.resolve_dispute(p_dispute_id uuid, p_verdict text)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_dispute record; v_case record; v_contract record; v_winner uuid; v_final text; v_votes int;
begin
  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then raise exception 'Disputa no existe'; end if;
  if v_dispute.status = 'RESOLVED' then raise exception 'La disputa ya fue resuelta'; end if;
  select * into v_case from public.arbitration_cases where dispute_id = p_dispute_id;
  if v_case is null then raise exception 'Caso de arbitraje no encontrado'; end if;
  if not (auth.uid() = any(v_case.arbiters)) then raise exception 'Solo un árbitro asignado puede votar'; end if;
  if p_verdict not in ('PLAINTIFF_WINS','DEFENDANT_WINS') then raise exception 'Veredicto inválido'; end if;
  insert into public.arbiter_votes (dispute_id, arbiter_id, verdict) values (p_dispute_id, auth.uid(), p_verdict)
  on conflict (dispute_id, arbiter_id) do update set verdict = excluded.verdict, created_at = now();
  select verdict, count(*) into v_final, v_votes from public.arbiter_votes where dispute_id = p_dispute_id
  group by verdict order by count(*) desc limit 1;
  if coalesce(v_votes,0) < 2 then return; end if;
  v_winner := case when v_final = 'PLAINTIFF_WINS' then v_dispute.plaintiff_id else v_dispute.defendant_id end;
  update public.arbitration_cases set verdict = v_final, decided_by = auth.uid(), decision_date = now() where dispute_id = p_dispute_id;
  update public.disputes set status = 'RESOLVED', resolution = 'Fallo por quórum: ' || v_final where id = p_dispute_id;
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
                                   token_balance = coalesce(token_balance,0) + v_contract.amount where id = v_contract.buyer_id;
        update public.contracts set status = 'REFUNDED' where id = v_contract.id;
        insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        values (v_contract.buyer_id, 'refund', v_contract.amount, 'Disputa fallada a tu favor', v_contract.id);
      end if;
    end if;
  end if;
end; $fn$;
grant execute on function public.resolve_dispute(uuid, text) to authenticated;

notify pgrst, 'reload schema';

-- ── VERIFICACIÓN (debería mostrar rls_activo = true en las 5 tablas) ─
select tablename, rowsecurity as rls_activo
from pg_tables
where schemaname = 'public'
  and tablename in ('contracts','disputes','arbitration_cases','human_venture_stakes','knowledge_vault_documents','arbiter_votes')
order by tablename;
