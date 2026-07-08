-- =====================================================================
-- 0042_penalties_pmc.sql — Sistema de Justicia: Puntos de Mala Conducta (PMC)
-- Alineado con DEFINICION_OMICROM_v8_BACKEND.md · sección 5.
--
-- Qué hace:
--   1) Tabla `penalties`: registro histórico de cada sanción aplicada.
--   2) Función `apply_penalty()` (interna, SECURITY DEFINER): aplica el
--      impacto en reputación/tokens y deja registro. NO se expone a
--      `authenticated` — solo la llaman otras funciones SECURITY DEFINER
--      del sistema (resolve_dispute, resolve_appeal).
--   3) `resolve_dispute()` se redefine para penalizar automáticamente a la
--      parte que pierde la disputa (cierra el loop: disputa → PMC).
--   4) Recuperación con el tiempo: cron diario que decae el PMC activo de
--      cada sanción (gracia 30 días, decae ~5%/día, suelo 0), igual estilo
--      que la depreciación H-07 de la Bóveda (0026).
--
-- Escalas de severidad (configurable a futuro, valores base v1):
--   LOW      →  5 pmc · -2  reputación ·   0 tokens
--   MEDIUM   → 15 pmc · -5  reputación · -10 tokens
--   HIGH     → 30 pmc · -10 reputación · -25 tokens
--   CRITICAL → 60 pmc · -20 reputación · -50 tokens
--
-- Idempotente.
-- =====================================================================

-- ── 1) Tabla de penalizaciones ───────────────────────────────────────
create table if not exists public.penalties (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  dispute_id          uuid references public.disputes(id) on delete set null,
  penalty_type        text not null,                          -- ej. 'DISPUTE_LOSS', 'FRAUD', 'MANUAL'
  severity            text not null check (severity in ('LOW','MEDIUM','HIGH','CRITICAL')),
  pmc_points          numeric not null default 0,              -- valor original (auditoría, inmutable)
  current_pmc_points  numeric not null default 0,              -- valor vigente (decae con el tiempo)
  reputation_impact   numeric not null default 0,              -- negativo = penaliza
  tokens_impact       numeric not null default 0,              -- negativo = penaliza
  reason              text,
  created_at          timestamptz not null default now(),
  recovered_at        timestamptz                              -- cuando el PMC llegó a 0
);

-- Fecha real de resolución de la disputa (antes no existía; resolve_dispute()
-- la fija más abajo). La usa 0043_appeals.sql para la ventana de apelación
-- de 7 días, en vez de un proxy frágil basado en timestamps de votos.
alter table public.disputes
  add column if not exists resolved_at timestamptz;

alter table public.penalties enable row level security;

drop policy if exists penalties_select on public.penalties;
create policy penalties_select on public.penalties for select to authenticated
  using (auth.uid() = user_id);

grant select on public.penalties to authenticated;
revoke insert, update, delete on public.penalties from authenticated;  -- solo vía funciones internas

-- ── 2) apply_penalty(): función interna de aplicación de sanciones ──
-- NO se otorga EXECUTE a `authenticated`. Solo la invocan funciones
-- SECURITY DEFINER del propio sistema (dueñas: postgres), que al ser
-- SECURITY DEFINER heredan el privilegio del owner para llamarla.
create or replace function public.apply_penalty(
  p_user_id      uuid,
  p_dispute_id   uuid,
  p_penalty_type text,
  p_severity     text,
  p_reason       text default null
)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_pmc numeric; v_rep numeric; v_tok numeric;
  v_old_rep numeric; v_new_rep numeric;
begin
  if p_severity not in ('LOW','MEDIUM','HIGH','CRITICAL') then
    raise exception 'Severidad inválida: %', p_severity;
  end if;

  select pmc, rep, tok into v_pmc, v_rep, v_tok
  from (values
    ('LOW',       5::numeric,  -2::numeric,   0::numeric),
    ('MEDIUM',   15::numeric,  -5::numeric, -10::numeric),
    ('HIGH',     30::numeric, -10::numeric, -25::numeric),
    ('CRITICAL', 60::numeric, -20::numeric, -50::numeric)
  ) as t(sev, pmc, rep, tok)
  where sev = p_severity;

  insert into public.penalties (
    user_id, dispute_id, penalty_type, severity,
    pmc_points, current_pmc_points, reputation_impact, tokens_impact, reason
  ) values (
    p_user_id, p_dispute_id, p_penalty_type, p_severity,
    v_pmc, v_pmc, v_rep, v_tok, p_reason
  );

  -- Captura el valor ANTES del update (evita inconsistencia por clamping
  -- cuando la reputación está cerca de los límites 0/100).
  select coalesce(reputation_score,50) into v_old_rep from public.profiles where id = p_user_id;
  v_new_rep := greatest(least(v_old_rep + v_rep, 100), 0);

  -- Aplica el impacto: reputación clamped [0,100], tokens nunca bajo 0
  update public.profiles
  set reputation_score = v_new_rep,
      token_balance     = greatest(coalesce(token_balance,0) + v_tok, 0)
  where id = p_user_id;

  insert into public.reputation_history (
    user_id, old_reputation, new_reputation, reason, trigger_event_id
  ) values (
    p_user_id, v_old_rep, v_new_rep,
    'Penalización PMC: ' || p_penalty_type || ' (' || p_severity || ')', p_dispute_id
  );
end; $fn$;

-- ── 3) resolve_dispute(): se redefine para penalizar al perdedor ────
-- Mismo cuerpo que 0029_arbiter_quorum.sql + llamada a apply_penalty()
-- sobre la parte que pierde, una vez alcanzado el quórum.
create or replace function public.resolve_dispute(p_dispute_id uuid, p_verdict text)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  v_dispute record; v_case record; v_contract record;
  v_winner uuid; v_loser uuid; v_final text; v_votes int;
begin
  select * into v_dispute from public.disputes where id = p_dispute_id;
  if v_dispute is null then raise exception 'Disputa no existe'; end if;
  if v_dispute.status = 'RESOLVED' then raise exception 'La disputa ya fue resuelta'; end if;

  select * into v_case from public.arbitration_cases where dispute_id = p_dispute_id;
  if v_case is null then raise exception 'Caso de arbitraje no encontrado'; end if;
  if not (auth.uid() = any(v_case.arbiters)) then raise exception 'Solo un árbitro asignado puede votar'; end if;
  if p_verdict not in ('PLAINTIFF_WINS','DEFENDANT_WINS') then raise exception 'Veredicto inválido'; end if;

  insert into public.arbiter_votes (dispute_id, arbiter_id, verdict)
  values (p_dispute_id, auth.uid(), p_verdict)
  on conflict (dispute_id, arbiter_id) do update set verdict = excluded.verdict, created_at = now();

  select verdict, count(*) into v_final, v_votes
  from public.arbiter_votes
  where dispute_id = p_dispute_id
  group by verdict
  order by count(*) desc
  limit 1;

  if coalesce(v_votes,0) < 2 then
    return;  -- voto registrado; aún sin quórum
  end if;

  v_winner := case when v_final = 'PLAINTIFF_WINS' then v_dispute.plaintiff_id else v_dispute.defendant_id end;
  v_loser  := case when v_final = 'PLAINTIFF_WINS' then v_dispute.defendant_id else v_dispute.plaintiff_id end;

  update public.arbitration_cases set verdict = v_final, decided_by = auth.uid(), decision_date = now()
  where dispute_id = p_dispute_id;
  update public.disputes set status = 'RESOLVED', resolution = 'Fallo por quórum: ' || v_final, resolved_at = now()
  where id = p_dispute_id;

  if v_dispute.contract_id is not null then
    select * into v_contract from public.contracts where id = v_dispute.contract_id;
    if v_contract is not null and upper(coalesce(v_contract.status,'')) not in ('RELEASED','REFUNDED') then
      if v_winner = v_contract.seller_id then
        update public.profiles set token_escrow = greatest(coalesce(token_escrow,0) - v_contract.amount, 0) where id = v_contract.buyer_id;
        update public.profiles set token_balance = coalesce(token_balance,0) + v_contract.amount where id = v_contract.seller_id;
        update public.contracts set status = 'RELEASED' where id = v_contract.id;
        insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        values (v_contract.seller_id, 'escrow_release', v_contract.amount, 'Disputa fallada a tu favor', v_contract.id);
      else
        update public.profiles set token_escrow = greatest(coalesce(token_escrow,0) - v_contract.amount, 0),
                                   token_balance = coalesce(token_balance,0) + v_contract.amount
        where id = v_contract.buyer_id;
        update public.contracts set status = 'REFUNDED' where id = v_contract.id;
        insert into public.wallet_transactions (user_id, transaction_type, amount, description, reference_id)
        values (v_contract.buyer_id, 'refund', v_contract.amount, 'Disputa fallada a tu favor', v_contract.id);
      end if;
    end if;
  end if;

  -- 🆕 Penalización automática (PMC) a la parte que perdió la disputa
  if v_loser is not null then
    perform public.apply_penalty(v_loser, p_dispute_id, 'DISPUTE_LOSS', 'MEDIUM',
      'Disputa resuelta en tu contra por quórum de árbitros');
  end if;
end; $fn$;

grant execute on function public.resolve_dispute(uuid, text) to authenticated;

-- ── 4) Recuperación del PMC con el tiempo (cron diario) ──────────────
create or replace function public.apply_pmc_recovery()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  update public.penalties
  set current_pmc_points = greatest(round(current_pmc_points * 0.95), 0)
  where recovered_at is null
    and current_pmc_points > 0
    and created_at < now() - interval '30 days';

  update public.penalties
  set recovered_at = now()
  where recovered_at is null and current_pmc_points <= 0;
end; $fn$;

do $do$ begin
  perform cron.unschedule('pmc_recovery_daily');
exception when others then null; end $do$;

select cron.schedule(
  'pmc_recovery_daily',
  '0 3 * * *',
  $cron$ select public.apply_pmc_recovery(); $cron$
);
