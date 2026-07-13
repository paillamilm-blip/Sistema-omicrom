-- =====================================================================
-- 0053_stripe_integration.sql — Estructura para monetización con Stripe
-- Preparación para conversión tokens ↔ dinero real (CLP).
-- Tablas, RPCs y políticas RLS. Edge Functions en supabase/functions/.
-- Idempotente. NO activar hasta tener volumen de usuarios.
-- =====================================================================

-- ── 1) Métodos de pago de los usuarios (tarjetas guardadas) ─────────
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_method_id text not null, -- pm_xxx de Stripe
  card_brand text, -- visa, mastercard, amex
  card_last4 text, -- últimos 4 dígitos
  is_default boolean default false,
  created_at timestamptz not null default now(),
  unique(user_id, stripe_payment_method_id)
);

alter table public.payment_methods enable row level security;

drop policy if exists pm_select_own on public.payment_methods;
create policy pm_select_own on public.payment_methods
  for select to authenticated using (auth.uid() = user_id);

grant select on public.payment_methods to authenticated;
revoke insert, update, delete on public.payment_methods from authenticated;

-- ── 2) Clientes Stripe + KYC ─────────────────────────────────────────
create table if not exists public.stripe_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique, -- cus_xxx
  kyc_verified boolean default false,
  kyc_documents jsonb, -- {rut, nombre, banco, tipo_cuenta, numero_cuenta}
  created_at timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;

drop policy if exists sc_select_own on public.stripe_customers;
create policy sc_select_own on public.stripe_customers
  for select to authenticated using (auth.uid() = user_id);

grant select on public.stripe_customers to authenticated;
revoke insert, update, delete on public.stripe_customers from authenticated;

-- ── 3) Intenciones de pago (recargas) ────────────────────────────────
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text not null unique, -- pi_xxx
  amount_clp integer not null, -- monto en pesos chilenos
  tokens_amount integer not null, -- tokens que recibirá
  status text not null check (status in ('pending','succeeded','failed','refunded')),
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.payment_intents enable row level security;

drop policy if exists pi_select_own on public.payment_intents;
create policy pi_select_own on public.payment_intents
  for select to authenticated using (auth.uid() = user_id);

grant select on public.payment_intents to authenticated;
revoke insert, update, delete on public.payment_intents from authenticated;

-- ── 4) Solicitudes de retiro (tokens → CLP) ──────────────────────────
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tokens_amount integer not null check (tokens_amount > 0),
  amount_clp integer not null, -- monto en CLP a recibir
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  rejection_reason text,
  stripe_transfer_id text, -- tr_xxx (cuando se procese)
  bank_account jsonb not null, -- {banco, tipo_cuenta, numero_cuenta}
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.withdrawal_requests enable row level security;

drop policy if exists wr_select_own on public.withdrawal_requests;
create policy wr_select_own on public.withdrawal_requests
  for select to authenticated using (auth.uid() = user_id);

drop policy if exists wr_insert_own on public.withdrawal_requests;
create policy wr_insert_own on public.withdrawal_requests
  for insert to authenticated with check (auth.uid() = user_id);

grant select, insert on public.withdrawal_requests to authenticated;
revoke update, delete on public.withdrawal_requests from authenticated;

-- ── 5) RPC: Acreditar tokens desde pago confirmado (webhook) ─────────
create or replace function public.credit_tokens_from_payment(
  p_user_id uuid,
  p_tokens integer,
  p_payment_intent_id text
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  -- Prevenir doble acreditación
  if exists (select 1 from public.wallet_transactions 
             where reference_id = p_payment_intent_id 
             and transaction_type = 'purchase') then
    return; -- ya procesado
  end if;

  -- Acreditar tokens
  update public.profiles 
  set token_balance = coalesce(token_balance, 0) + p_tokens
  where id = p_user_id;

  -- Registrar transacción
  insert into public.wallet_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description, 
    reference_id
  ) values (
    p_user_id, 
    'purchase', 
    p_tokens, 
    'Recarga con Stripe', 
    p_payment_intent_id
  );
end; $fn$;

grant execute on function public.credit_tokens_from_payment(uuid, integer, text) to service_role;

-- ── 6) RPC: Solicitar retiro (valida saldo y límites) ────────────────
create or replace function public.request_withdrawal(
  p_tokens integer,
  p_bank_account jsonb
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  v_user_id uuid := auth.uid();
  v_balance integer;
  v_kyc boolean;
  v_amount_clp integer;
  v_request_id uuid;
begin
  if p_tokens < 1000 then
    raise exception 'Mínimo de retiro: 1.000 tokens ($10.000 CLP)';
  end if;

  -- Verificar saldo
  select token_balance into v_balance from public.profiles where id = v_user_id;
  if v_balance is null or v_balance < p_tokens then
    raise exception 'Saldo insuficiente';
  end if;

  -- Verificar KYC para montos > 10.000 tokens ($100.000 CLP)
  if p_tokens > 10000 then
    select kyc_verified into v_kyc from public.stripe_customers where user_id = v_user_id;
    if coalesce(v_kyc, false) = false then
      raise exception 'Necesitas verificar tu identidad para retiros superiores a $100.000 CLP';
    end if;
  end if;

  -- Calcular CLP (10 tokens = 90 CLP, comisión 10%)
  v_amount_clp := round(p_tokens * 9.0); -- 10% comisión

  -- Bloquear tokens (pasar a escrow temporal)
  update public.profiles 
  set token_balance = token_balance - p_tokens,
      token_escrow = coalesce(token_escrow, 0) + p_tokens
  where id = v_user_id;

  -- Crear solicitud
  insert into public.withdrawal_requests (
    user_id, 
    tokens_amount, 
    amount_clp, 
    bank_account
  ) values (
    v_user_id, 
    p_tokens, 
    v_amount_clp, 
    p_bank_account
  ) returning id into v_request_id;

  -- Registrar transacción pendiente
  insert into public.wallet_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description, 
    reference_id
  ) values (
    v_user_id, 
    'withdrawal', 
    -p_tokens, 
    'Retiro a cuenta bancaria (pendiente)', 
    v_request_id::text
  );

  return v_request_id;
end; $fn$;

grant execute on function public.request_withdrawal(integer, jsonb) to authenticated;

-- ── 7) Índices para performance ──────────────────────────────────────
create index if not exists idx_payment_intents_user on public.payment_intents(user_id);
create index if not exists idx_payment_intents_status on public.payment_intents(status);
create index if not exists idx_withdrawal_requests_user on public.withdrawal_requests(user_id);
create index if not exists idx_withdrawal_requests_status on public.withdrawal_requests(status);

notify pgrst, 'reload schema';

