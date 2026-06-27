-- =====================================================================
-- 0013_credentials.sql — Credenciales del Gemelo Digital
-- CV, estudios, certificados y experiencia -> alimentan traditional_score (20%)
-- + foto de perfil (avatar_url) + buckets de Storage.
-- Idempotente. Pensado para correr en el SQL Editor de Supabase.
-- =====================================================================

-- ── 0) Foto de perfil ────────────────────────────────────────────────
alter table public.profiles add column if not exists avatar_url text;

-- ── 1) Tabla de credenciales ─────────────────────────────────────────
create table if not exists public.credentials (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  cred_type        text not null check (cred_type in
                     ('DEGREE','DIPLOMA','CERTIFICATE_QR','CERTIFICATE_DOC','EXPERIENCE')),
  title            text not null,
  issuer           text,
  issue_date       date,
  expiry_date      date,
  has_qr           boolean not null default false,
  verification_url text,
  document_path    text,
  experience_years numeric default 0,
  points           int not null default 0,
  status           text not null default 'PENDING'
                     check (status in ('PENDING','VERIFIED','REJECTED')),
  verified_by      uuid references public.profiles(id),
  verified_at      timestamptz,
  reject_reason    text,
  created_at       timestamptz not null default now()
);

create index if not exists idx_credentials_user   on public.credentials(user_id);
create index if not exists idx_credentials_status on public.credentials(status);

alter table public.credentials enable row level security;

-- ── 2) Puntaje por tipo + auto-verificación de QR (trigger BEFORE) ────
create or replace function public.fn_credentials_score()
returns trigger language plpgsql as $$
begin
  -- El puntaje SIEMPRE lo decide el servidor (el cliente no puede inflarlo)
  new.points := case new.cred_type
    when 'DEGREE'          then 30
    when 'DIPLOMA'         then 15
    when 'CERTIFICATE_QR'  then 10
    when 'CERTIFICATE_DOC' then 8
    when 'EXPERIENCE'      then least(coalesce(new.experience_years,0) * 5, 50)::int
    else 0
  end;

  -- En INSERT el cliente NUNCA decide el estado: entra como PENDING
  if TG_OP = 'INSERT' then
    new.status      := 'PENDING';
    new.verified_by := null;
    new.verified_at := null;
  end if;

  -- Certificados con QR + link de verificación -> aprobación automática
  if new.cred_type = 'CERTIFICATE_QR'
     and coalesce(new.verification_url,'') <> '' then
    new.has_qr := true;
    if new.status = 'PENDING' then
      new.status      := 'VERIFIED';
      new.verified_at := now();
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_credentials_score on public.credentials;
create trigger trg_credentials_score
  before insert or update on public.credentials
  for each row execute function public.fn_credentials_score();

-- ── 3) Recalcular traditional_score (suma de credenciales VERIFIED) ───
create or replace function public.recalc_traditional_score(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare v_total int;
begin
  select least(coalesce(sum(points), 0), 100) into v_total
  from public.credentials
  where user_id = p_user and status = 'VERIFIED';

  update public.profiles set traditional_score = v_total where id = p_user;
end; $$;

-- ── 4) Cuando cambie una credencial, recalcular el score del dueño ────
create or replace function public.fn_credentials_after()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.recalc_traditional_score(coalesce(new.user_id, old.user_id));
  return null;
end; $$;

drop trigger if exists trg_credentials_after on public.credentials;
create trigger trg_credentials_after
  after insert or update or delete on public.credentials
  for each row execute function public.fn_credentials_after();

-- ── 5) RLS: cada quien gestiona SUS credenciales ─────────────────────
drop policy if exists cred_select_own on public.credentials;
create policy cred_select_own on public.credentials
  for select using (auth.uid() = user_id);

drop policy if exists cred_insert_own on public.credentials;
create policy cred_insert_own on public.credentials
  for insert with check (auth.uid() = user_id);

-- Solo puede editar mientras esté PENDING (no puede auto-aprobarse)
drop policy if exists cred_update_own on public.credentials;
create policy cred_update_own on public.credentials
  for update using (auth.uid() = user_id and status = 'PENDING')
  with check (auth.uid() = user_id and status = 'PENDING');

drop policy if exists cred_delete_own on public.credentials;
create policy cred_delete_own on public.credentials
  for delete using (auth.uid() = user_id);

grant select, insert, update, delete on public.credentials to authenticated;
