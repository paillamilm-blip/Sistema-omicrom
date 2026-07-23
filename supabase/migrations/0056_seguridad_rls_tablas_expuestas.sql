-- 0056 · Seguridad: activar RLS en tablas que estaban expuestas al público.
-- Las escriben funciones/triggers SECURITY DEFINER (sortean RLS); el front no
-- las lee, así que restringir la lectura del cliente no rompe nada.

-- ghost_approval_log: solo las partes del contrato pueden leer su registro.
alter table public.ghost_approval_log enable row level security;
drop policy if exists ghost_log_read_parties on public.ghost_approval_log;
create policy ghost_log_read_parties on public.ghost_approval_log
  for select to authenticated
  using ((select auth.uid()) in (worker_id, client_id));

-- reputation_logs: cada usuario lee solo su historial.
alter table public.reputation_logs enable row level security;
drop policy if exists replogs_read_own on public.reputation_logs;
create policy replogs_read_own on public.reputation_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

-- user_status_history: cada usuario lee solo su historial.
alter table public.user_status_history enable row level security;
drop policy if exists ush_read_own on public.user_status_history;
create policy ush_read_own on public.user_status_history
  for select to authenticated
  using (user_id = (select auth.uid()));

-- jobs (tabla legacy, no usada por el front): lectura de vacantes activas,
-- y el dueño gestiona las suyas.
alter table public.jobs enable row level security;
drop policy if exists jobs_read_active on public.jobs;
create policy jobs_read_active on public.jobs
  for select to authenticated
  using (is_active is true or poster_id = (select auth.uid()));
drop policy if exists jobs_owner_ins on public.jobs;
create policy jobs_owner_ins on public.jobs
  for insert to authenticated
  with check (poster_id = (select auth.uid()));
drop policy if exists jobs_owner_upd on public.jobs;
create policy jobs_owner_upd on public.jobs
  for update to authenticated
  using (poster_id = (select auth.uid()))
  with check (poster_id = (select auth.uid()));
drop policy if exists jobs_owner_del on public.jobs;
create policy jobs_owner_del on public.jobs
  for delete to authenticated
  using (poster_id = (select auth.uid()));
