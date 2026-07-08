-- =====================================================================
-- 0044_vault_chained_royalties.sql — Regalías Encadenadas (linaje real)
-- Alineado con DEFINICION_OMICROM_v8_BACKEND.md · sección 4.
--
-- Antes (0024_vault.sql): solo repartía 20% fijo a UN nivel (el padre
-- directo), usando knowledge_vault_documents.parent_document_id.
--
-- Ahora:
--   1) Tabla `content_lineage`: registro explícito de derivación entre
--      documentos, con similarity_score (detección de contenido derivado,
--      similitud ≥ 85%, ya calculable con find_similar_documents() de
--      0025_vault_semantic.sql).
--   2) consult_vault_document() se redefine para recorrer la cadena de
--      linaje hasta 3 niveles de profundidad, aplicando:
--         Regalía = Ingreso × (20% × 0.75 ^ Profundidad)
--      Profundidad 1 (padre directo)   → 20% × 0.75^1 = 15.0%
--      Profundidad 2 (abuelo)          → 20% × 0.75^2 = 11.25%
--      Profundidad 3 (bisabuelo, tope) → 20% × 0.75^3 = 8.4375%
--
-- register_content_lineage(): se llama al publicar un documento derivado
-- (detectado por similitud ≥ 0.85 contra find_similar_documents), y migra
-- automáticamente los parent_document_id existentes a content_lineage
-- para no perder el linaje ya registrado.
--
-- Idempotente.
-- =====================================================================

-- ── 1) Tabla de linaje de contenido ──────────────────────────────────
create table if not exists public.content_lineage (
  id                 uuid primary key default gen_random_uuid(),
  parent_content_id  uuid not null references public.knowledge_vault_documents(id) on delete cascade,
  child_content_id   uuid not null references public.knowledge_vault_documents(id) on delete cascade,
  similarity_score   double precision,
  created_at         timestamptz not null default now(),
  unique (parent_content_id, child_content_id)
);

alter table public.content_lineage enable row level security;

drop policy if exists cl_select on public.content_lineage;
create policy cl_select on public.content_lineage for select to authenticated using (true);

grant select on public.content_lineage to authenticated;
revoke insert, update, delete on public.content_lineage from authenticated;  -- solo vía RPC

-- ── 2) Migrar linaje ya existente (parent_document_id) a la tabla nueva ──
insert into public.content_lineage (parent_content_id, child_content_id, similarity_score)
select parent_document_id, id, null
from public.knowledge_vault_documents
where parent_document_id is not null
on conflict (parent_content_id, child_content_id) do nothing;

-- ── 3) register_content_lineage(): registrar derivación al publicar ─
create or replace function public.register_content_lineage(
  p_child_id uuid, p_parent_id uuid, p_similarity double precision
)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_child_author uuid;
begin
  if p_similarity < 0.85 then
    -- Nota: RAISE en PL/pgSQL solo hace sustitución simple de "%", NO soporta
    -- especificadores de formato estilo C ("%.2f"). Se redondea con round() antes.
    raise exception 'Similitud insuficiente (%) para registrar linaje (mínimo 0.85)', round(p_similarity::numeric, 2);
  end if;
  if p_child_id = p_parent_id then
    raise exception 'Un documento no puede derivar de sí mismo';
  end if;

  -- 🔒 Solo el autor del documento HIJO puede declarar su propio linaje.
  -- Sin este chequeo, cualquier usuario autenticado podría registrar que el
  -- documento de OTRO autor "deriva" de uno propio, desviando hacia sí mismo
  -- las regalías encadenadas de las futuras ventas de ese documento ajeno.
  select author_id into v_child_author from public.knowledge_vault_documents where id = p_child_id;
  if v_child_author is null then raise exception 'Documento hijo no existe'; end if;
  if v_child_author <> auth.uid() then
    raise exception 'Solo el autor del documento puede declarar de qué documento deriva';
  end if;

  insert into public.content_lineage (parent_content_id, child_content_id, similarity_score)
  values (p_parent_id, p_child_id, p_similarity)
  on conflict (parent_content_id, child_content_id)
  do update set similarity_score = excluded.similarity_score;

  -- Mantener retro-compatibilidad con la columna legacy
  update public.knowledge_vault_documents
  set parent_document_id = p_parent_id
  where id = p_child_id and parent_document_id is null;
end; $fn$;

grant execute on function public.register_content_lineage(uuid, uuid, double precision) to authenticated;

-- ── 4) consult_vault_document(): regalías encadenadas hasta 3 niveles ──
create or replace function public.consult_vault_document(p_doc_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_doc record;
  v_cost numeric; v_bal numeric;
  v_remaining numeric; v_author_share numeric;
  v_ancestor_id uuid; v_ancestor_author uuid; v_depth int;
  v_pct numeric; v_share numeric;
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

  v_remaining := v_cost;

  -- Recorrer la cadena de linaje hacia arriba, hasta 3 niveles de profundidad
  v_ancestor_id := p_doc_id;
  v_depth := 0;
  while v_depth < 3 loop
    select parent_content_id into v_ancestor_id
    from public.content_lineage
    where child_content_id = v_ancestor_id
    order by similarity_score desc nulls last, created_at asc
    limit 1;

    exit when v_ancestor_id is null;
    v_depth := v_depth + 1;

    select author_id into v_ancestor_author
    from public.knowledge_vault_documents where id = v_ancestor_id;

    continue when v_ancestor_author is null;

    -- Regalía = Ingreso × (20% × 0.75 ^ Profundidad)
    v_pct   := 0.20 * power(0.75, v_depth);
    v_share := round(v_cost * v_pct);

    if v_share > 0 and v_share <= v_remaining then
      update public.profiles set token_balance = coalesce(token_balance,0) + v_share where id = v_ancestor_author;
      update public.knowledge_vault_documents set total_royalties = coalesce(total_royalties,0) + v_share where id = v_ancestor_id;
      insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
      values (v_ancestor_author, 'deposit', v_share, 'Regalía encadenada · Bóveda (nivel ' || v_depth || ')', v_ancestor_id);
      v_remaining := v_remaining - v_share;
    end if;
  end loop;

  -- Resto al autor directo
  v_author_share := v_remaining;
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
