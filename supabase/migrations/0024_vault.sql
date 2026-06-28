-- =====================================================================
-- 0024_vault.sql — Bóveda de Conocimiento
-- Publicar documentos técnicos + consultarlos (pagar) + REGALÍAS ENCADENADAS
-- (si el documento deriva de otro, parte del pago sube al autor original).
-- Consultar un doc validado sube la Trascendencia del autor (ya conectado).
-- Idempotente.
-- =====================================================================

-- ── Consultar / comprar acceso a un documento ───────────────────────
create or replace function public.consult_vault_document(p_doc_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_doc record; v_parent record;
  v_cost numeric; v_bal numeric;
  v_parent_share numeric := 0; v_author_share numeric;
begin
  select * into v_doc from public.knowledge_vault_documents where id = p_doc_id;
  if v_doc is null then raise exception 'Documento no existe'; end if;
  if v_doc.author_id = auth.uid() then raise exception 'Es tu propio documento'; end if;

  if exists (select 1 from public.vault_queries where document_id = p_doc_id and reader_id = auth.uid()) then
    raise exception 'Ya tienes acceso a este documento';
  end if;

  v_cost := coalesce(v_doc.current_token_cost, 0);
  select token_balance into v_bal from public.profiles where id = auth.uid();
  if v_bal is null or v_bal < v_cost then raise exception 'Saldo insuficiente'; end if;

  -- Cobro al lector
  update public.profiles set token_balance = token_balance - v_cost where id = auth.uid();
  insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
  values (auth.uid(), 'withdrawal', -v_cost, 'Consulta en Bóveda', p_doc_id);

  -- Regalía encadenada: 20% sube al autor del documento padre
  if v_doc.parent_document_id is not null then
    select * into v_parent from public.knowledge_vault_documents where id = v_doc.parent_document_id;
    if v_parent is not null and v_parent.author_id is not null then
      v_parent_share := round(v_cost * 0.20);
      update public.profiles set token_balance = coalesce(token_balance,0) + v_parent_share where id = v_parent.author_id;
      update public.knowledge_vault_documents set total_royalties = coalesce(total_royalties,0) + v_parent_share where id = v_parent.id;
      insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
      values (v_parent.author_id, 'deposit', v_parent_share, 'Regalía encadenada · Bóveda', v_parent.id);
    end if;
  end if;

  -- Resto al autor
  v_author_share := v_cost - v_parent_share;
  if v_doc.author_id is not null and v_author_share > 0 then
    update public.profiles set token_balance = coalesce(token_balance,0) + v_author_share where id = v_doc.author_id;
    update public.knowledge_vault_documents set total_royalties = coalesce(total_royalties,0) + v_author_share where id = v_doc.id;
    insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
    values (v_doc.author_id, 'deposit', v_author_share, 'Venta en Bóveda', v_doc.id);
  end if;

  -- Registrar acceso
  insert into public.vault_queries (document_id, reader_id, cost_paid)
  values (p_doc_id, auth.uid(), v_cost);
end; $fn$;

grant execute on function public.consult_vault_document(uuid) to authenticated;

-- ── RLS / permisos ───────────────────────────────────────────────────
alter table public.knowledge_vault_documents enable row level security;
alter table public.vault_queries enable row level security;

drop policy if exists kv_select on public.knowledge_vault_documents;
create policy kv_select on public.knowledge_vault_documents for select to authenticated using (true);
drop policy if exists kv_insert on public.knowledge_vault_documents;
create policy kv_insert on public.knowledge_vault_documents for insert to authenticated with check (auth.uid() = author_id);
drop policy if exists kv_update_own on public.knowledge_vault_documents;
create policy kv_update_own on public.knowledge_vault_documents for update to authenticated using (auth.uid() = author_id);

drop policy if exists vq_select on public.vault_queries;
create policy vq_select on public.vault_queries for select to authenticated using (
  auth.uid() = reader_id
  or exists (select 1 from public.knowledge_vault_documents d where d.id = vault_queries.document_id and d.author_id = auth.uid())
);

grant select, insert, update on public.knowledge_vault_documents to authenticated;
grant select on public.vault_queries to authenticated;
