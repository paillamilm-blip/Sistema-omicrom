-- =====================================================================
-- 0049_perf_indexes.sql — Índices para escalar (auditoría 🟠)
-- Acelera las consultas más frecuentes de la app (empleos, matches, ranking,
-- notificaciones, contratos, historial de reputación). Todos idempotentes.
-- =====================================================================

-- Cada índice en su propio bloque: si la columna/tabla no existe (schema-drift),
-- se salta en vez de abortar la migración.
do $$ begin execute 'create index if not exists idx_job_postings_status_published on public.job_postings (status, published_at desc)'; exception when others then null; end $$;
do $$ begin execute 'create index if not exists idx_job_matches_user on public.job_matches (user_id)'; exception when others then null; end $$;
do $$ begin execute 'create index if not exists idx_job_applications_applicant on public.job_applications (applicant_id)'; exception when others then null; end $$;
do $$ begin execute 'create index if not exists idx_profiles_reputation on public.profiles (reputation_score desc)'; exception when others then null; end $$;
do $$ begin execute 'create index if not exists idx_notifications_user_unread on public.notifications (user_id, is_read)'; exception when others then null; end $$;
do $$ begin execute 'create index if not exists idx_contracts_seller_status on public.contracts (seller_id, status)'; exception when others then null; end $$;
do $$ begin execute 'create index if not exists idx_reputation_history_user on public.reputation_history (user_id)'; exception when others then null; end $$;

notify pgrst, 'reload schema';
