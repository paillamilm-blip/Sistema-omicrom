-- ═══════════════════════════════════════════════════════════
-- 0003_market_wallet.sql · Market, Wallet y Escrow (Fase 3 / Fase 2)
-- ═══════════════════════════════════════════════════════════

-- ── MARKET SERVICES ─────────────────────────────────────────
create table if not exists public.market_services (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null references public.profiles(id) on delete cascade,
  title         text not null,
  description   text,
  price         numeric not null check (price >= 0),
  category      text not null default 'dev',
  tags          text[],
  rating        numeric not null default 0,
  total_reviews integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

alter table public.market_services enable row level security;

drop policy if exists "services_read" on public.market_services;
create policy "services_read" on public.market_services for select using (true);

drop policy if exists "services_owner_write" on public.market_services;
create policy "services_owner_write" on public.market_services
  for all using (auth.uid() = seller_id) with check (auth.uid() = seller_id);

-- ── WALLET TRANSACTIONS ─────────────────────────────────────
create table if not exists public.wallet_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  transaction_type text not null
                     check (transaction_type in ('deposit','escrow_lock','escrow_release','refund','commission','withdrawal')),
  amount           numeric not null,
  balance_after    numeric,
  description      text,
  reference_id     uuid,
  created_at       timestamptz not null default now()
);

alter table public.wallet_transactions enable row level security;

drop policy if exists "wallet_tx_own" on public.wallet_transactions;
create policy "wallet_tx_own" on public.wallet_transactions
  for select using (auth.uid() = user_id);


-- ── ESCROW CONTRACTS ────────────────────────────────────────
create table if not exists public.escrow_contracts (
  id                      uuid primary key default gen_random_uuid(),
  service_id              uuid references public.market_services(id) on delete set null,
  buyer_id                uuid not null references public.profiles(id) on delete cascade,
  seller_id               uuid not null references public.profiles(id) on delete cascade,
  title                   text not null,
  amount                  numeric not null check (amount > 0),
  buyer_note              text,
  status                  text not null default 'LOCKED'
                            check (status in ('LOCKED','APPROVED','RELEASED','REFUNDED','DISPUTED')),
  ghost_approval_deadline timestamptz not null default (now() + interval '15 minutes'),
  created_at              timestamptz not null default now(),
  released_at             timestamptz
);

alter table public.escrow_contracts enable row level security;

drop policy if exists "escrow_parties" on public.escrow_contracts;
create policy "escrow_parties" on public.escrow_contracts
  for select using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- RPC: transferencia atómica de tokens entre usuarios
create or replace function public.transfer_tokens(
  p_sender_id   uuid,
  p_receiver_id uuid,
  p_amount      numeric,
  p_note        text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_sender_balance numeric;
begin
  if p_amount <= 0 then raise exception 'El monto debe ser positivo'; end if;

  select token_balance into v_sender_balance from public.profiles where id = p_sender_id for update;
  if v_sender_balance is null then raise exception 'Remitente no encontrado'; end if;
  if v_sender_balance < p_amount then raise exception 'Saldo insuficiente'; end if;

  update public.profiles set token_balance = token_balance - p_amount where id = p_sender_id;
  update public.profiles set token_balance = token_balance + p_amount where id = p_receiver_id;

  insert into public.wallet_transactions (user_id, transaction_type, amount, balance_after, description)
  values (p_sender_id, 'withdrawal', -p_amount, v_sender_balance - p_amount, coalesce(p_note, 'Transferencia enviada'));

  insert into public.wallet_transactions (user_id, transaction_type, amount, description)
  values (p_receiver_id, 'deposit', p_amount, coalesce(p_note, 'Transferencia recibida'));
end;
$$;


-- RPC: crear contrato escrow (bloquea fondos del comprador)
create or replace function public.create_escrow_contract(
  p_buyer_id   uuid,
  p_seller_id  uuid,
  p_service_id uuid,
  p_title      text,
  p_amount     numeric,
  p_buyer_note text default null
)
returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_balance     numeric;
  v_contract_id uuid;
begin
  if p_amount <= 0 then raise exception 'El monto debe ser positivo'; end if;

  select token_balance into v_balance from public.profiles where id = p_buyer_id for update;
  if v_balance is null then raise exception 'Comprador no encontrado'; end if;
  if v_balance < p_amount then raise exception 'Saldo insuficiente para el escrow'; end if;

  -- Mover fondos de saldo disponible a escrow
  update public.profiles
    set token_balance = token_balance - p_amount,
        token_escrow  = token_escrow + p_amount
  where id = p_buyer_id;

  insert into public.escrow_contracts (service_id, buyer_id, seller_id, title, amount, buyer_note)
  values (p_service_id, p_buyer_id, p_seller_id, p_title, p_amount, p_buyer_note)
  returning id into v_contract_id;

  insert into public.wallet_transactions (user_id, transaction_type, amount, balance_after, description, reference_id)
  values (p_buyer_id, 'escrow_lock', -p_amount, v_balance - p_amount, 'Fondos bloqueados: ' || p_title, v_contract_id);

  return v_contract_id;
end;
$$;
