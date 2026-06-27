-- =====================================================================
-- 0014_storage_buckets.sql — Buckets de Storage
-- avatars     -> foto de perfil (pública)
-- credentials -> documentos/certificados (privados)
-- Cada usuario sube SOLO dentro de su carpeta {uid}/...
-- Idempotente.
-- =====================================================================

-- ── 1) Buckets ───────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('credentials', 'credentials', false)
on conflict (id) do nothing;

-- ── 2) Políticas: AVATARS (lectura pública, escritura en carpeta propia)
drop policy if exists avatars_read on storage.objects;
create policy avatars_read on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists avatars_insert on storage.objects;
create policy avatars_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_update on storage.objects;
create policy avatars_update on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists avatars_delete on storage.objects;
create policy avatars_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- ── 3) Políticas: CREDENTIALS (privado, solo el dueño lee/escribe) ────
drop policy if exists cred_files_select on storage.objects;
create policy cred_files_select on storage.objects
  for select to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cred_files_insert on storage.objects;
create policy cred_files_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists cred_files_delete on storage.objects;
create policy cred_files_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'credentials' and (storage.foldername(name))[1] = auth.uid()::text);
