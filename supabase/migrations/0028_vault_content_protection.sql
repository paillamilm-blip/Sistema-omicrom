-- =====================================================================
-- 0028_vault_content_protection.sql — Proteger el CONTENIDO de la Bóveda
-- Hallazgo A1: la "description" (la solución pagada) era legible por cualquiera.
-- Fix: seguridad a NIVEL DE COLUMNA — el cliente no puede leer "description";
-- solo se obtiene vía get_vault_content() si pagó (vault_queries) o es el autor.
-- Idempotente.
-- =====================================================================

-- 1) Quitar el SELECT amplio y dar acceso por columnas (SIN "description")
revoke select on public.knowledge_vault_documents from authenticated;

grant select (
  id, author_id, title, initial_token_cost, current_token_cost,
  efficiency_score, competency_tags, created_at, parent_document_id,
  is_validated, total_royalties, embedding
) on public.knowledge_vault_documents to authenticated;

-- el autor sigue pudiendo publicar/editar (insert/update no se afectan)
grant insert, update on public.knowledge_vault_documents to authenticated;

-- 2) Función para obtener el contenido SOLO si tienes acceso
create or replace function public.get_vault_content(p_doc_id uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare v_content text; v_author uuid;
begin
  select description, author_id into v_content, v_author
  from public.knowledge_vault_documents where id = p_doc_id;

  if v_author = auth.uid() then
    return v_content;                                  -- el autor ve su contenido
  end if;
  if exists (select 1 from public.vault_queries
             where document_id = p_doc_id and reader_id = auth.uid()) then
    return v_content;                                  -- pagó -> tiene acceso
  end if;
  return null;                                         -- sin acceso -> nada
end; $fn$;

grant execute on function public.get_vault_content(uuid) to authenticated;
