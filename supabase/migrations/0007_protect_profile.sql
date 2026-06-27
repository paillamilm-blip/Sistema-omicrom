-- =====================================================================
-- 0007_protect_profile.sql  —  HALLAZGO #1: blindar columnas del perfil
-- Impide que el cliente (rol "authenticated") modifique campos sensibles.
-- Solo los roles del servidor (postgres / service_role) y las funciones
-- SECURITY DEFINER pueden cambiar tokens, reputación, rango, etc.
-- Idempotente.
-- =====================================================================

-- IMPORTANTE: este trigger NO es SECURITY DEFINER a propósito, para que
-- current_user refleje al verdadero llamante (authenticated vs postgres).
create or replace function public.protect_profile_columns()
returns trigger
language plpgsql
as $$
begin
  -- Roles privilegiados (RPCs SECURITY DEFINER del servidor, service_role): acceso total
  if current_user in ('postgres', 'supabase_admin', 'service_role', 'supabase_auth_admin') then
    return new;
  end if;

  -- Cliente: se revierten los cambios a columnas protegidas (se ignoran en silencio)
  new.token_balance             := old.token_balance;
  new.token_escrow              := old.token_escrow;
  new.reputation_score          := old.reputation_score;
  new.reputation_updated_at     := old.reputation_updated_at;
  new.execution_score           := old.execution_score;
  new.quality_score             := old.quality_score;
  new.transcendence_score       := old.transcendence_score;
  new.foundation_score          := old.foundation_score;
  new.traditional_score         := old.traditional_score;
  new.experience_score          := old.experience_score;
  new.pe_points                 := old.pe_points;
  new.node_type                 := old.node_type;
  new.node_level                := old.node_level;
  new.node_status               := old.node_status;
  new.is_verified_professional  := old.is_verified_professional;
  new.can_receive_contracts     := old.can_receive_contracts;
  new.total_earnings            := old.total_earnings;
  new.total_contracts_completed := old.total_contracts_completed;
  new.is_pioneer                := old.is_pioneer;
  new.last_audit_date           := old.last_audit_date;

  return new;
end; $$;

drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile
  before update on public.profiles
  for each row execute function public.protect_profile_columns();
