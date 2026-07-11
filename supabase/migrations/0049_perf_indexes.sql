-- =====================================================================
-- 0049_perf_indexes.sql — Índices para escalar (auditoría 🟠)
-- Acelera las consultas más frecuentes de la app (empleos, matches, ranking,
-- notificaciones, contratos, historial de reputación). Todos idempotentes.
-- =====================================================================

-- Empleos: listado de ofertas abiertas ordenadas por fecha
create index if not exists idx_job_postings_status_published
  on public.job_postings (status, published_at desc);

-- Matches del usuario ("el trabajo te busca")
create index if not exists idx_job_matches_user
  on public.job_matches (user_id);

-- Postulaciones del usuario
create index if not exists idx_job_applications_applicant
  on public.job_applications (applicant_id);

-- Ranking en vivo (leaderboard por reputación)
create index if not exists idx_profiles_reputation
  on public.profiles (reputation_score desc);

-- Notificaciones no leídas por usuario
create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, is_read);

-- Ejecución desde contratos (recalc por vendedor + estado)
create index if not exists idx_contracts_seller_status
  on public.contracts (seller_id, status);

-- Historial de reputación (auditoría por usuario)
create index if not exists idx_reputation_history_user
  on public.reputation_history (user_id);

notify pgrst, 'reload schema';
