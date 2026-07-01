-- =====================================================================
-- 0038_jobs_geo.sql — Geolocalización de ofertas (Radar de Oportunidades)
-- Agrega ubicación a las ofertas para el radar por cercanía. Sin PostGIS:
-- guardamos lat/lng simples y la distancia se calcula en el cliente (haversine).
-- Idempotente.
-- =====================================================================

alter table public.job_postings add column if not exists lat        double precision;
alter table public.job_postings add column if not exists lng        double precision;
alter table public.job_postings add column if not exists location   text;
alter table public.job_postings add column if not exists is_remote  boolean not null default false;

notify pgrst, 'reload schema';
