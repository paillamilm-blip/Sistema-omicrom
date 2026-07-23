-- 0060 · Consolidar políticas SELECT permisivas duplicadas (rendimiento) y
-- corregir una exposición (job_matches tenía lectura pública 'true').
-- Ya aplicada y verificada en producción; se versiona para el repo.

-- job_matches: quitar la política pública 'true' (exponía TODOS los matches);
-- queda jm_select (propio o empresa dueña de la vacante).
drop policy if exists matches_read on public.job_matches;

-- job_postings: había 2 SELECT 'true' (pública + authenticated); dejar solo la pública.
drop policy if exists jp_select on public.job_postings;

-- market_services: la política ALL del dueño se divide en solo-escritura;
-- la lectura pública del marketplace queda en services_read.
drop policy if exists services_owner_write on public.market_services;
drop policy if exists services_owner_ins on public.market_services;
drop policy if exists services_owner_upd on public.market_services;
drop policy if exists services_owner_del on public.market_services;
create policy services_owner_ins on public.market_services for insert to public with check ((select auth.uid()) = seller_id);
create policy services_owner_upd on public.market_services for update to public using ((select auth.uid()) = seller_id) with check ((select auth.uid()) = seller_id);
create policy services_owner_del on public.market_services for delete to public using ((select auth.uid()) = seller_id);

-- user_status: mismo patrón; la lectura queda en status_read.
drop policy if exists status_own_write on public.user_status;
drop policy if exists status_own_ins on public.user_status;
drop policy if exists status_own_upd on public.user_status;
drop policy if exists status_own_del on public.user_status;
create policy status_own_ins on public.user_status for insert to public with check ((select auth.uid()) = user_id);
create policy status_own_upd on public.user_status for update to public using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy status_own_del on public.user_status for delete to public using ((select auth.uid()) = user_id);

-- mentorships: mismo patrón; la lectura queda en mentorship_select (mentor o mentee).
drop policy if exists mentorship_mentor_write on public.mentorships;
drop policy if exists mentorship_mentor_ins on public.mentorships;
drop policy if exists mentorship_mentor_upd on public.mentorships;
drop policy if exists mentorship_mentor_del on public.mentorships;
create policy mentorship_mentor_ins on public.mentorships for insert to public with check ((select auth.uid()) = mentor_id);
create policy mentorship_mentor_upd on public.mentorships for update to public using ((select auth.uid()) = mentor_id) with check ((select auth.uid()) = mentor_id);
create policy mentorship_mentor_del on public.mentorships for delete to public using ((select auth.uid()) = mentor_id);
