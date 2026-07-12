-- =====================================================================
-- 9999_audit_consolidado.sql
-- TODO lo pendiente del audit, en orden y 100% idempotente.
-- Seguro de correr varias veces.
-- =====================================================================

-- ── 1) HALLAZGO #1: blindaje del perfil ──────────────────────────────
create or replace function public.protect_profile_columns()
returns trigger language plpgsql as $$
begin
  if current_user in ('postgres','supabase_admin','service_role','supabase_auth_admin') then
    return new;
  end if;
  new.token_balance:=old.token_balance; new.token_escrow:=old.token_escrow;
  new.reputation_score:=old.reputation_score; new.reputation_updated_at:=old.reputation_updated_at;
  new.execution_score:=old.execution_score; new.quality_score:=old.quality_score;
  new.transcendence_score:=old.transcendence_score; new.foundation_score:=old.foundation_score;
  new.traditional_score:=old.traditional_score; new.experience_score:=old.experience_score;
  new.pe_points:=old.pe_points; new.node_type:=old.node_type; new.node_level:=old.node_level;
  new.node_status:=old.node_status; new.is_verified_professional:=old.is_verified_professional;
  new.can_receive_contracts:=old.can_receive_contracts; new.total_earnings:=old.total_earnings;
  new.total_contracts_completed:=old.total_contracts_completed; new.is_pioneer:=old.is_pioneer;
  new.last_audit_date:=old.last_audit_date;
  return new;
end; $$;
drop trigger if exists trg_protect_profile on public.profiles;
create trigger trg_protect_profile before update on public.profiles
  for each row execute function public.protect_profile_columns();

-- ── 2) QUICK WINS: índices + realtime + username ─────────────────────
create index if not exists ix_messages_network_created on public.messages(network_id, created_at);
create index if not exists ix_blackbox_votes_dispute    on public.blackbox_votes(dispute_id);
create index if not exists ix_skill_attempts_user_test  on public.skill_test_attempts(user_id, test_id);
create index if not exists ix_contracts_buyer           on public.contracts(buyer_id);
create index if not exists ix_contracts_seller          on public.contracts(seller_id);

alter table public.profiles replica identity full;

create or replace function public.ensure_unique_username()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.username is null or btrim(new.username) = '' then
    new.username := 'nodo_' || substr(new.id::text, 1, 8);
  end if;
  while exists (select 1 from public.profiles where username = new.username and id <> new.id) loop
    new.username := new.username || floor(random()*10000)::int;
  end loop;
  return new;
end; $$;
drop trigger if exists trg_ensure_unique_username on public.profiles;
create trigger trg_ensure_unique_username before insert on public.profiles
  for each row execute function public.ensure_unique_username();

-- ── 3) HALLAZGO #5: reputación fuente única y unificada ──────────────
-- CANÓNICO (ver 0050_reputacion_canonica.sql y DEFINICION_REPUTACION_OMICROM.md):
--   experience_score := promedio de los 4 ejes  (columna DERIVADA)
--   base             := 0.20·traditional + 0.80·experience_score   (lo que TIENES)
--   momentum         := min(15, sqrt(pe_points)/4)                  (lo que PUEDES conseguir)
--   reputation_score := min(100, base + momentum)
-- Idéntico a 0050 porque 9999 corre al final y no debe revertir 0050.
create or replace function public.recalc_reputation()
returns trigger language plpgsql as $$
declare v_exp numeric; v_base numeric; v_momentum numeric;
begin
  v_exp := round((coalesce(new.execution_score,0)+coalesce(new.quality_score,0)
          + coalesce(new.transcendence_score,0)+coalesce(new.foundation_score,0))/4.0, 2);
  new.experience_score := least(100, greatest(0, v_exp));
  v_base := coalesce(new.traditional_score,0)*0.20 + new.experience_score*0.80;
  v_momentum := least(15, round(sqrt(greatest(coalesce(new.pe_points,0),0)::numeric) / 4.0, 2));
  new.reputation_score := least(100, greatest(0, round(v_base + v_momentum, 2)));
  new.reputation_updated_at := now();
  return new;
end; $$;
drop trigger if exists trg_recalc_reputation on public.profiles;
create trigger trg_recalc_reputation
  before insert or update of traditional_score, experience_score,
    execution_score, quality_score, transcendence_score, foundation_score, pe_points
  on public.profiles
  for each row execute function public.recalc_reputation();

-- Backfill: normaliza experience_score (promedio de 4 ejes); el trigger recalcula reputación (base + momentum).
update public.profiles
set experience_score = least(100, greatest(0, round((
      coalesce(execution_score,0)+coalesce(quality_score,0)
      +coalesce(transcendence_score,0)+coalesce(foundation_score,0))/4.0, 2)));

-- ── 4) Fuga RLS en messages ──────────────────────────────────────────
drop policy if exists "messages_select" on public.messages;

-- ── 5) STATE MACHINE del contrato ────────────────────────────────────
-- Normalizar cualquier estado existente a MAYÚSCULAS canónicas
update public.contracts set status = case lower(coalesce(status,''))
  when 'pending' then 'PENDING'
  when 'locked' then 'LOCKED'
  when 'delivered' then 'DELIVERED'
  when 'delivery_declared' then 'DELIVERED'
  when 'released' then 'RELEASED'
  when 'completed' then 'RELEASED'
  when 'completado' then 'RELEASED'
  when 'disputed' then 'DISPUTED'
  when 'refunded' then 'REFUNDED'
  else 'PENDING' end
where status is not null and status <> upper(status);

alter table public.contracts alter column status set default 'PENDING';
alter table public.contracts drop constraint if exists contracts_status_check;
alter table public.contracts add constraint contracts_status_check
  check (status in ('PENDING','LOCKED','DELIVERED','RELEASED','DISPUTED','REFUNDED'));

-- Eliminar funciones de Ghost Approval obsoletas/rotas
drop function if exists public.fn_process_ghost_approvals();
drop function if exists public.ghost_approval_sweep();

-- Quitar cualquier cron que llame a la función rota (sin error si no existe)
do $$ begin
  perform cron.unschedule(jobid) from cron.job where command ilike '%fn_process_ghost_approvals%';
exception when others then null; end $$;

-- ── 6) Botón OBJETAR (abre disputa + detiene liberación) ─────────────
create or replace function public.object_delivery(p_contract_id uuid, p_reason text default 'Objeción durante Ghost Approval')
returns uuid language plpgsql security definer set search_path = public as $$
declare c record; v_other uuid; v_dispute uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id and auth.uid() <> c.seller_id then raise exception 'No autorizado'; end if;
  if c.status <> 'DELIVERED' then raise exception 'Solo se puede objetar una entrega en curso'; end if;
  v_other := case when auth.uid() = c.buyer_id then c.seller_id else c.buyer_id end;
  insert into public.disputes (contract_id, plaintiff_id, defendant_id, reason, status)
  values (p_contract_id, auth.uid(), v_other,
          coalesce(nullif(btrim(p_reason),''),'Objeción durante Ghost Approval'),'OPENED')
  returning id into v_dispute;
  update public.contracts set status='DISPUTED', updated_at=now()
  where id = p_contract_id and status='DELIVERED';
  return v_dispute;
end; $$;
grant execute on function public.object_delivery(uuid, text) to authenticated;

-- ── 7) Botón ENTREGAR (vendedor declara entrega) ─────────────────────
create or replace function public.declare_delivery(p_contract_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare c record;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;
  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.seller_id then raise exception 'Solo el vendedor puede declarar la entrega'; end if;
  if c.status not in ('LOCKED','PENDING') then raise exception 'El contrato no está en curso'; end if;
  update public.contracts
    set status='DELIVERED', delivery_declared_at=now(),
        delivery_note=coalesce(p_note, delivery_note), updated_at=now()
  where id = p_contract_id;
end; $$;
grant execute on function public.declare_delivery(uuid, text) to authenticated;
