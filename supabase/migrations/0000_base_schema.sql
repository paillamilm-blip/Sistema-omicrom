-- =====================================================================
-- schema.sql — RETRATO FIEL del esquema real de producción (Sistema Ómicron)
-- Generado desde information_schema. Esta es la FUENTE DE VERDAD.
--
-- ⚠️  Las migraciones 0001–0004 del repo son las "from scratch" originales y
--     DIVERGEN de esta realidad (p.ej. definían node_level como integer y una
--     tabla escrow_contracts que NO se usa). NO las corras sobre producción.
--     Las migraciones 0005–0010 SÍ son reales/aditivas y ya están aplicadas.
--
-- ⚠️  BUG HISTÓRICO (corregido en 0040_fix_handle_new_user_email_column.sql):
--     el trigger handle_new_user() de 0001_core.sql insertaba una columna
--     "email" en profiles que nunca existió aquí, causando 500 en cada
--     POST /auth/v1/signup (42703: column "email" does not exist).
-- =====================================================================

-- ---------- IDENTIDAD / NODOS ----------
create table if not exists public.profiles (
  id                        uuid primary key,
  token_balance             numeric default 0,
  username                  text,
  full_name                 text,
  avatar_url                text,
  bio                       text,
  location                  text,
  skills                    text[],
  node_type                 text not null default 'Nodo Operativo',
  node_level                text not null default 'N1',        -- ⚠️ TEXT ('N1','N2','N3'), no entero
  pe_points                 integer not null default 0,
  is_pioneer                boolean not null default true,
  token_escrow              bigint not null default 0,
  updated_at                timestamptz not null default now(),
  reputation_score          numeric default 50.00,
  reputation_updated_at     timestamp default now(),
  execution_score           numeric default 50,
  quality_score             numeric default 50,
  transcendence_score       numeric default 50,
  foundation_score          numeric default 50,
  traditional_score         numeric default 0,
  experience_score          numeric default 0,
  node_status               varchar default 'ACTIVE',
  last_audit_date           timestamp,
  is_verified_professional  boolean default false,
  can_receive_contracts     boolean default true,
  total_contracts_completed integer default 0,
  total_earnings            numeric default 0
);

-- ---------- ÁRBOL DE HABILIDADES ----------
create table if not exists public.skill_tree_nodes (
  id               uuid primary key default gen_random_uuid(),
  title            varchar not null,
  description      text,
  category         varchar not null,
  parent_node_id   uuid,
  difficulty_level integer,
  pe_reward        integer not null,
  estimated_hours  integer,
  icon             varchar,
  color            varchar,
  order_index      integer,
  created_at       timestamp default now(),
  updated_at       timestamp default now()
);

create table if not exists public.skill_tests (
  id                    uuid primary key default gen_random_uuid(),
  node_id               uuid not null,
  test_name             varchar not null,
  description           text,
  problem_statement     text not null,
  test_cases            jsonb not null,
  time_limit_seconds    integer not null,
  passing_score         integer not null,
  difficulty_multiplier numeric default 1.0,
  created_at            timestamp default now(),
  updated_at            timestamp default now()
);

create table if not exists public.skill_test_attempts (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  test_id            uuid not null,
  submission_code    text not null,
  result             varchar not null,
  score              integer,
  time_taken_seconds integer,
  error_message      text,
  attempted_at       timestamp default now()
);

create table if not exists public.user_skill_progress (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null,
  node_id             uuid not null,
  status              varchar default 'LOCKED',
  progress_percentage integer default 0,
  attempts            integer default 0,
  best_time_seconds   integer,
  validated_at        timestamp,
  created_at          timestamp default now()
);

-- ---------- MARKET / BÓVEDA ----------
create table if not exists public.market_services (
  id            uuid primary key default gen_random_uuid(),
  seller_id     uuid not null,
  title         text not null,
  description   text,
  price         integer not null,
  category      text not null,
  tags          text[] default '{}',
  rating        double precision default 0,
  total_reviews integer default 0,
  is_active     boolean default true,
  created_at    timestamptz default current_timestamp
);

create table if not exists public.knowledge_vault_documents (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text,
  author_id          uuid,
  initial_token_cost double precision default 100,
  current_token_cost double precision default 100,
  efficiency_score   double precision default 0,
  competency_tags    text,
  created_at         timestamptz default now(),
  parent_document_id uuid,
  is_validated       boolean not null default false,
  total_royalties    numeric not null default 0
);

create table if not exists public.vault_queries (
  id          uuid primary key default gen_random_uuid(),
  document_id uuid,
  reader_id   uuid,
  cost_paid   numeric not null,
  created_at  timestamptz not null default now()
);

-- ---------- EMPLEOS ----------
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  poster_id   uuid not null,
  title       text not null,
  company     text,
  description text,
  location    text,
  distance_km integer,
  is_remote   boolean default false,
  is_urgent   boolean default false,
  salary_min  integer,
  salary_max  integer,
  category    text not null,
  tags        text[] default '{}',
  is_active   boolean default true,
  created_at  timestamptz default current_timestamp
);

create table if not exists public.job_applications (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid not null,
  applicant_id uuid not null,
  cover_note   text,
  status       text default 'pending',
  created_at   timestamptz default current_timestamp
);

create table if not exists public.job_matches (
  id           uuid primary key default gen_random_uuid(),
  job_id       uuid,
  user_id      uuid,
  match_score  numeric not null default 0,
  rank         integer not null default 0,
  match_reason text,
  sent_at      timestamptz not null default now()
);

-- ---------- CONTRATOS / ESCROW / CHAT ----------
create table if not exists public.contracts (
  id                   uuid primary key default gen_random_uuid(),
  service_id           uuid,
  buyer_id             uuid not null,
  seller_id            uuid not null,
  title                text not null,
  description          text,
  amount               numeric not null,
  status               text default 'pending',   -- ⚠️ default minúscula; el código usa MAYÚSCULAS
  buyer_note           text,
  delivery_note        text,
  dispute_reason       text,
  completed_at         timestamptz,
  created_at           timestamptz default current_timestamp,
  updated_at           timestamptz default current_timestamp,
  efficiency_level     text,
  delivery_declared_at timestamptz
);

create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid not null,
  receiver_id uuid,
  network_id  uuid,                 -- = contracts.id (sala)
  content     text not null,
  is_read     boolean default false,
  created_at  timestamptz default current_timestamp,
  ciphertext  text,                 -- Caja Negra (cifrado)
  iv          text,
  prev_hash   text,                 -- cadena de integridad
  msg_hash    text
);

create table if not exists public.chat_room_keys (
  network_id    uuid primary key,
  dek_encrypted text not null,
  dek_iv        text not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.ghost_approval_log (
  id               uuid primary key default gen_random_uuid(),
  contract_id      uuid not null,
  worker_id        uuid not null,
  client_id        uuid not null,
  token_amount     bigint not null,
  declared_at      timestamptz,
  auto_approved_at timestamptz default now(),
  created_at       timestamptz default now()
);

-- ---------- GOBERNANZA / JUSTICIA ----------
create table if not exists public.disputes (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid,
  plaintiff_id   uuid not null,
  defendant_id   uuid,
  reason         text not null,
  status         text not null default 'OPENED',
  resolution     text,
  created_at     timestamptz not null default now(),
  appellant_id   uuid,
  appeal_deposit numeric not null default 0
);

create table if not exists public.arbitration_cases (
  id                uuid primary key default gen_random_uuid(),
  dispute_id        uuid,
  arbiters          uuid[] not null default '{}',
  verdict           text,
  reasoning         text,
  decided_by        uuid,
  decision_date     timestamptz,
  reputation_impact numeric default 0,
  created_at        timestamptz not null default now()
);

create table if not exists public.blackbox_votes (
  id         uuid primary key default gen_random_uuid(),
  network_id uuid not null,
  dispute_id uuid,
  arbiter_id uuid not null,
  created_at timestamptz not null default now(),
  unique (network_id, arbiter_id)
);

-- ---------- STAKING ----------
create table if not exists public.human_venture_stakes (
  id            uuid primary key default gen_random_uuid(),
  investor_id   uuid not null,
  target_id     uuid not null,
  amount        numeric not null,
  status        text not null default 'ACTIVE',
  return_amount numeric,
  created_at    timestamptz not null default now(),
  returned_at   timestamptz
);

-- ---------- WALLET / REPUTACIÓN / NOTIFICACIONES ----------
create table if not exists public.wallet_transactions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null,
  amount           numeric not null,
  transaction_type varchar not null,
  reference_id     uuid,
  created_at       timestamptz default now(),
  balance_after    bigint,
  description      text,
  type             text
);

create table if not exists public.reputation_history (
  id                      uuid primary key default gen_random_uuid(),
  user_id                 uuid not null,
  old_reputation          numeric,
  new_reputation          numeric,
  old_execution_score     numeric,
  new_execution_score     numeric,
  old_quality_score       numeric,
  new_quality_score       numeric,
  old_transcendence_score numeric,
  new_transcendence_score numeric,
  old_foundation_score    numeric,
  new_foundation_score    numeric,
  reason                  varchar,
  trigger_event_id        uuid,
  created_at              timestamp default now()
);

create table if not exists public.reputation_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  points      integer not null,
  reason      text,
  action_type text not null,
  source      text,
  created_at  timestamptz default current_timestamp
);

create table if not exists public.notifications (
  id             bigserial primary key,
  user_id        uuid not null,
  title          text,
  body           text,
  type           text,
  reference_id   text,
  reference_type text,
  is_read        boolean default false,
  created_at     timestamptz default now()
);

-- ---------- ESTADO DEL USUARIO ----------
create table if not exists public.user_status (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  is_paused   boolean default false,
  pause_reason text,
  availability text default 'available',
  work_mode    text default 'flexible',
  hourly_rate  integer,
  pause_until  timestamptz
);

create table if not exists public.user_status_history (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null,
  previous_node_type text,
  new_node_type      text,
  previous_pe        integer,
  new_pe             integer,
  reason             text,
  created_at         timestamptz default now()
);

-- =====================================================================
-- NOTA: Funciones (RPCs), triggers y políticas RLS NO están en este
-- archivo. Viven en las migraciones 0005–0010 + tu configuración previa.
-- Para un repo 100% reproducible, el siguiente paso sería volcar también
-- las funciones (pg_get_functiondef) y las policies (pg_policies).
-- =====================================================================
