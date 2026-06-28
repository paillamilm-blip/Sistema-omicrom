-- =====================================================================
-- 0025_vault_semantic.sql — Búsqueda semántica de la Bóveda (pgvector)
-- Activa pgvector, agrega columna de embedding (384 dims = modelo gte-small)
-- y una función de similitud por coseno. Base para el anti-plagio (linaje).
-- =====================================================================

-- ── 1) Extensión vectorial ───────────────────────────────────────────
create extension if not exists vector;

-- ── 2) Columna de embedding en los documentos de la Bóveda ───────────
alter table public.knowledge_vault_documents
  add column if not exists embedding vector(384);

-- Índice HNSW (rápido, no requiere "entrenar" como ivfflat)
create index if not exists idx_kv_embedding
  on public.knowledge_vault_documents
  using hnsw (embedding vector_cosine_ops);

-- ── 3) Búsqueda semántica: documentos más parecidos a una consulta ───
create or replace function public.match_vault_documents(
  query_embedding vector(384),
  match_count int default 10
)
returns table (
  id uuid, title text, current_token_cost numeric,
  author_id uuid, competency_tags text, total_royalties numeric,
  similarity float
)
language sql stable set search_path = public as $fn$
  select d.id, d.title, d.current_token_cost,
         d.author_id, d.competency_tags, d.total_royalties,
         1 - (d.embedding <=> query_embedding) as similarity
  from public.knowledge_vault_documents d
  where d.is_validated = true
    and d.embedding is not null
  order by d.embedding <=> query_embedding
  limit match_count;
$fn$;

grant execute on function public.match_vault_documents(vector, int) to authenticated;

-- ── 4) (Para el anti-plagio futuro) docs más parecidos a un embedding ─
-- Devuelve coincidencias por encima de un umbral, excluyendo un autor.
create or replace function public.find_similar_documents(
  query_embedding vector(384),
  p_threshold float default 0.85,
  p_exclude_author uuid default null
)
returns table (id uuid, title text, author_id uuid, similarity float)
language sql stable set search_path = public as $fn$
  select d.id, d.title, d.author_id, 1 - (d.embedding <=> query_embedding) as similarity
  from public.knowledge_vault_documents d
  where d.embedding is not null
    and (p_exclude_author is null or d.author_id <> p_exclude_author)
    and (1 - (d.embedding <=> query_embedding)) >= p_threshold
  order by d.embedding <=> query_embedding
  limit 5;
$fn$;

grant execute on function public.find_similar_documents(vector, float, uuid) to authenticated;
