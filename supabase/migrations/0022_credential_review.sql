-- =====================================================================
-- 0022_credential_review.sql — Validación de credenciales por docentes
-- Validador = perfil con is_verified_professional = true.
-- Aprobar una credencial -> status VERIFIED -> sube traditional_score (ya conectado).
-- Idempotente.
-- =====================================================================

-- ── 1) Listar credenciales PENDIENTES (solo validadores) ─────────────
drop function if exists public.get_pending_credentials();
create function public.get_pending_credentials()
returns table (
  id uuid, user_id uuid, username text, cred_type text, title text,
  issuer text, document_path text, verification_url text,
  experience_years numeric, created_at timestamptz
)
language plpgsql security definer set search_path = public as $fn$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_verified_professional = true) then
    raise exception 'Solo validadores pueden ver credenciales pendientes';
  end if;

  return query
    select c.id, c.user_id, p.username, c.cred_type, c.title,
           c.issuer, c.document_path, c.verification_url,
           c.experience_years, c.created_at
    from public.credentials c
    join public.profiles p on p.id = c.user_id
    where c.status = 'PENDING'
    order by c.created_at asc;
end; $fn$;

grant execute on function public.get_pending_credentials() to authenticated;

-- ── 2) Aprobar / rechazar una credencial ─────────────────────────────
drop function if exists public.review_credential(uuid, boolean, text);
create function public.review_credential(p_credential_id uuid, p_approve boolean, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and is_verified_professional = true) then
    raise exception 'Solo validadores pueden revisar credenciales';
  end if;

  if p_approve then
    update public.credentials
      set status = 'VERIFIED', verified_by = auth.uid(), verified_at = now(), reject_reason = null
    where id = p_credential_id and status = 'PENDING';
  else
    update public.credentials
      set status = 'REJECTED', verified_by = auth.uid(), verified_at = now(), reject_reason = coalesce(p_reason, 'No cumple los requisitos')
    where id = p_credential_id and status = 'PENDING';
  end if;
  -- El trigger trg_credentials_after recalcula el traditional_score del dueño.
end; $fn$;

grant execute on function public.review_credential(uuid, boolean, text) to authenticated;

-- ── 3) Los validadores pueden VER los documentos del bucket credentials ─
drop policy if exists cred_files_validator_select on storage.objects;
create policy cred_files_validator_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'credentials'
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.is_verified_professional = true)
  );
