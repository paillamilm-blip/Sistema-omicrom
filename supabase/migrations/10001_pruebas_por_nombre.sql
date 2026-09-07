-- ══════════════════════════════════════════════════════════════════════
-- 10001_pruebas_por_nombre.sql
-- LA PRUEBA SE VUELVE OBSERVABLE — cimiento de la Red Viva.
--
-- EL PROBLEMA REAL: Ómicrom vende "conocimiento verificable, no declarado", y su
-- reputación es 20 % credenciales + 80 % desempeño demostrado. Pero HOY la app no
-- puede saber si una habilidad concreta del CV fue probada o solo declarada:
--
--   • public.user_skill_progress  → indexada por node_id (uuid del catálogo),
--     no por el nombre de la habilidad que el CV del usuario declara.
--   • public.actas_evidencia      → idem, por node_id.
--   • public.omicron_knowledge_fund → SÍ guarda note='skill:<nombre>', pero tiene
--     RLS activa SIN políticas (10000, línea 87): el cliente no puede leerla.
--     Y además solo registra fila si el Fondo tenía saldo: con el Fondo en 0 el
--     examen se aprueba y NO queda ningún rastro por nombre.
--
-- Resultado: "declarado" y "probado" son indistinguibles en la UI, así que la
-- pantalla no puede hacer otra cosa que mostrar el pct que el propio CV afirma.
-- Eso es DECLARAR disfrazado de MEDIR — exactamente lo que el producto promete no
-- hacer.
--
-- LA SOLUCIÓN: un registro de pruebas indexado por NOMBRE de habilidad, legible
-- por su dueño, escrito por el examen. Aditivo y auditable:
--
--   1. public.omicron_skill_proofs  — qué habilidades probó cada usuario, con el
--      mejor score real, cuántas veces y cuánto le pagó el Fondo.
--   2. register_exam_success        — se reemplaza conservando EXACTAMENTE su
--      comportamiento y sus 8 claves de retorno; solo agrega el registro de la
--      prueba (envuelto: si falla, el examen sigue funcionando igual).
--   3. omicron_fund_quote(skill)    — cuánto pagaría probar ESTA habilidad ANTES
--      de dar el examen, con el motivo en lenguaje claro. Hoy el monto solo se
--      conocía DESPUÉS de aprobar, así que era imposible invitar con la verdad.
--
-- POR QUÉ NO SE INVENTA NADA: si una prueba vieja no dejó score (porque solo
-- quedó rastro en el libro del Fondo), best_score queda NULL — no se rellena con
-- un número plausible. NULL significa "probada, sin score registrado", y la UI lo
-- dice así. Nunca se marca como probada una habilidad por tener pct alto.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   supabase db push        (versión > 9999: no requiere --include-all)
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   -- Qué probé yo (con sesión de usuario; RLS deja ver solo lo propio):
--   select skill_label, best_score, proofs_count, tokens_earned, last_proven_at
--   from public.omicron_skill_proofs order by last_proven_at desc;
--
--   -- Cuánto pagaría probar una habilidad concreta:
--   select public.omicron_fund_quote('Excel');
--
--   -- Cuántas pruebas se recuperaron del historial ya existente:
--   select count(*) as pruebas_recuperadas from public.omicron_skill_proofs;
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   \i supabase/migrations/10000_fondo_conocimiento.sql  -- examen sin registro
--   drop function if exists public.omicron_fund_quote(text);
--   -- La tabla se CONSERVA (es registro de pruebas reales, no cache):
--   -- drop table public.omicron_skill_proofs;
--   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. EL REGISTRO DE PRUEBAS (por nombre de habilidad)
-- ══════════════════════════════════════════════════════════════════════
-- skill_key = lower(trim(nombre)) para que "Excel", "excel" y " EXCEL " sean la
-- misma habilidad (idéntico criterio al antiduplicado del Fondo, que usa
-- note = 'skill:' || lower(skill)). skill_label conserva cómo se escribió.
create table if not exists public.omicron_skill_proofs (
  user_id         uuid    not null references public.profiles(id) on delete cascade,
  skill_key       text    not null,
  skill_label     text    not null,
  best_score      integer          check (best_score is null or best_score between 0 and 100),
  proofs_count    integer not null default 0,
  tokens_earned   numeric not null default 0,
  first_proven_at timestamptz not null default now(),
  last_proven_at  timestamptz not null default now(),
  primary key (user_id, skill_key)
);

comment on table public.omicron_skill_proofs is
  'Habilidades DEMOSTRADAS por nombre (no declaradas). La escribe register_exam_success. best_score NULL = probada sin score registrado (prueba histórica recuperada).';
comment on column public.omicron_skill_proofs.skill_key is
  'lower(trim(nombre)) — misma normalización que el antiduplicado del Fondo.';

create index if not exists idx_skill_proofs_user
  on public.omicron_skill_proofs (user_id, last_proven_at desc);

-- RLS: cada uno ve SOLO sus pruebas. La escritura queda para las funciones
-- SECURITY DEFINER: nadie puede declararse probado a mano desde el cliente.
alter table public.omicron_skill_proofs enable row level security;

do $do$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'omicron_skill_proofs'
      and policyname = 'skill_proofs_own_read'
  ) then
    create policy skill_proofs_own_read on public.omicron_skill_proofs
      for select using (auth.uid() = user_id);
  end if;
end;
$do$;

grant select on public.omicron_skill_proofs to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 2. REGISTRAR UNA PRUEBA (interna)
-- ══════════════════════════════════════════════════════════════════════
-- Idempotente por (usuario, habilidad): la segunda vez no duplica, acumula.
-- best_score usa GREATEST — coherente con la filosofía aditiva del sistema:
-- una prueba peor no borra una mejor.
create or replace function public.omicron_record_skill_proof(
  p_user_id uuid,
  p_skill   text,
  p_score   integer,
  p_tokens  numeric default 0
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  v_label text := nullif(btrim(coalesce(p_skill, '')), '');
  v_key   text;
begin
  if p_user_id is null or v_label is null then
    return;
  end if;

  v_key := lower(v_label);

  insert into public.omicron_skill_proofs as sp
    (user_id, skill_key, skill_label, best_score, proofs_count, tokens_earned)
  values
    (p_user_id, v_key, v_label, p_score, 1, greatest(coalesce(p_tokens, 0), 0))
  on conflict (user_id, skill_key) do update set
    -- Se conserva la etiqueta más informativa (la más larga no vacía).
    skill_label    = case
                       when length(excluded.skill_label) > length(sp.skill_label)
                       then excluded.skill_label else sp.skill_label
                     end,
    -- GREATEST (nunca baja: filosofía aditiva del sistema), pero conservando el
    -- significado de NULL = "probada sin puntaje registrado". Si ninguna de las
    -- dos tiene score, sigue siendo NULL: no se convierte en un 0 falso.
    best_score     = case
                       when sp.best_score is null and excluded.best_score is null then null
                       else greatest(coalesce(sp.best_score, 0), coalesce(excluded.best_score, 0))
                     end,
    proofs_count   = sp.proofs_count + 1,
    tokens_earned  = sp.tokens_earned + greatest(coalesce(excluded.tokens_earned, 0), 0),
    last_proven_at = now();
end;
$fn$;

revoke all on function public.omicron_record_skill_proof(uuid, text, integer, numeric)
  from public, anon, authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 3. COTIZAR LA RECOMPENSA ANTES DEL EXAMEN
-- ══════════════════════════════════════════════════════════════════════
-- Replica las MISMAS constantes y candados que omicron_grant_exam_reward para no
-- prometer nunca más de lo que se va a pagar. Si el Fondo está en 0, devuelve 0 y
-- lo dice; si ya cobraste esa habilidad, devuelve 0 y lo dice.
-- El texto de 'motivo' viene de la base a propósito: la app no tiene que adivinar
-- la razón, la muestra tal cual (mismo criterio que reward_reason en 10000).
create or replace function public.omicron_fund_quote(p_skill text)
returns json
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  k_base      constant numeric := 300;   -- iguales a omicron_grant_exam_reward
  k_max       constant numeric := 500;
  k_daily_cap constant numeric := 1000;
  v_uid       uuid := auth.uid();
  v_label     text := nullif(btrim(coalesce(p_skill, '')), '');
  v_key       text;
  v_saldo     numeric;
  v_ya_cobrada boolean := false;
  v_probada   boolean := false;
  v_hoy       numeric := 0;
  v_restante  numeric;
  v_techo     numeric;
  v_min       numeric;
  v_max       numeric;
  v_motivo    text;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  v_key   := lower(coalesce(v_label, 'general'));
  v_saldo := greatest(public.omicron_fund_balance(), 0);

  select exists(
    select 1 from public.omicron_knowledge_fund
    where direction = 'out' and user_id = v_uid
      and source = 'exam_reward' and note = 'skill:' || v_key
  ) into v_ya_cobrada;

  select exists(
    select 1 from public.omicron_skill_proofs
    where user_id = v_uid and skill_key = v_key
  ) into v_probada;

  select coalesce(sum(amount), 0) into v_hoy
  from public.omicron_knowledge_fund
  where direction = 'out' and user_id = v_uid
    and source = 'exam_reward'
    and created_at >= date_trunc('day', now());

  v_restante := greatest(k_daily_cap - v_hoy, 0);
  v_techo    := least(v_saldo, v_restante);

  if v_ya_cobrada then
    v_min := 0; v_max := 0;
    v_motivo := 'Ya cobraste la recompensa de esta habilidad. Probarla de nuevo sube tus ejes, pero no paga otra vez.';
  elsif v_saldo <= 0 then
    v_min := 0; v_max := 0;
    v_motivo := 'El Fondo de Conocimiento está en 0 por ahora, así que probarla paga 0. Tus ejes suben igual.';
  elsif v_restante <= 0 then
    v_min := 0; v_max := 0;
    v_motivo := 'Ya alcanzaste el máximo que se puede cobrar hoy. Mañana vuelve a estar disponible.';
  else
    v_min := floor(least(k_base, v_techo));
    v_max := floor(least(k_max, v_techo));
    if v_max <= v_min then
      v_motivo := 'Probarla te paga ' || v_max || ' tokens del Fondo de Conocimiento.';
    else
      v_motivo := 'Probarla te paga entre ' || v_min || ' y ' || v_max ||
                  ' tokens del Fondo de Conocimiento, según qué tan bien te vaya.';
    end if;
  end if;

  return json_build_object(
    'ok', true,
    'skill', v_label,
    'saldo_fondo', floor(v_saldo),
    'ya_cobrada', v_ya_cobrada,
    'probada', v_probada,
    'tope_diario_restante', floor(v_restante),
    'estimado_min', v_min,
    'estimado_max', v_max,
    'motivo', v_motivo
  );
end;
$fn$;

revoke all on function public.omicron_fund_quote(text) from public, anon;
grant execute on function public.omicron_fund_quote(text) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 4. EL EXAMEN AHORA DEJA RASTRO POR NOMBRE
-- ══════════════════════════════════════════════════════════════════════
-- CREATE OR REPLACE de register_exam_success (10000) conservando EXACTAMENTE su
-- comportamiento, sus fórmulas de ejes y sus 8 claves de retorno. Lo único nuevo
-- es la llamada a omicron_record_skill_proof, envuelta en su propio bloque: si el
-- registro de la prueba falla, el examen sube los ejes y paga igual.
create or replace function public.register_exam_success(
  p_skill text,
  p_score integer,
  p_kind  text default 'mixed'
)
returns json language plpgsql security definer set search_path = public as $fn$
declare
  v_uid uuid := auth.uid();
  v_quality_delta    numeric;
  v_execution_delta  numeric;
  v_foundation_delta numeric;
  v_reward           numeric := 0;
  v_reason           text;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  if p_score < 70 then
    return json_build_object('ok', false, 'error', 'score insuficiente para subir ejes');
  end if;

  -- ── Ejes: idéntico a 0073 / 10000 (no se toca la fórmula) ──
  v_quality_delta := least(5, greatest(2, round((p_score - 70) * 0.1 + 2)));

  v_execution_delta := case
    when p_kind in ('practical', 'mixed') then least(3, greatest(1, round((p_score - 70) * 0.07 + 1)))
    else 0
  end;

  v_foundation_delta := case
    when p_kind in ('theory', 'mixed') then least(2, greatest(1, round((p_score - 70) * 0.05 + 1)))
    else 0
  end;

  update public.profiles set
    quality_score         = least(100, coalesce(quality_score, 0) + v_quality_delta),
    execution_score       = least(100, coalesce(execution_score, 0) + v_execution_delta),
    foundation_score      = least(100, coalesce(foundation_score, 0) + v_foundation_delta),
    reputation_updated_at = now()
  where id = v_uid;

  begin
    insert into public.reputation_history(user_id, reason)
    values (v_uid, 'Examen aprobado: ' || coalesce(p_skill, 'general') || ' (score: ' || p_score || ', kind: ' || p_kind || ')');
  exception when others then null;
  end;

  -- ── Recompensa del Fondo de Conocimiento (idéntico a 10000) ──
  begin
    v_reward := public.omicron_grant_exam_reward(v_uid, p_skill, p_score);
  exception when others then
    v_reward := 0;
  end;

  -- ── NUEVO: la prueba queda registrada por NOMBRE de habilidad ──
  -- Esto es lo que permite que la app distinga "lo declaré" de "lo probé".
  -- Envuelto: un fallo acá nunca puede invalidar un examen ya aprobado.
  begin
    perform public.omicron_record_skill_proof(v_uid, p_skill, p_score, v_reward);
  exception when others then null;
  end;

  -- Motivo en lenguaje claro, para que la app pueda decir la verdad.
  if v_reward > 0 then
    v_reason := 'Ganaste ' || v_reward || ' tokens del Fondo de Conocimiento.';
  elsif public.omicron_fund_balance() <= 0 then
    v_reason := 'El Fondo de Conocimiento está en 0 por ahora. Tus ejes igual subieron.';
  else
    v_reason := 'Ya habías cobrado la recompensa de esta habilidad (o alcanzaste el tope diario).';
  end if;

  return json_build_object(
    'ok', true,
    'quality_delta', v_quality_delta,
    'execution_delta', v_execution_delta,
    'foundation_delta', v_foundation_delta,
    'skill', p_skill,
    'score', p_score,
    'reward_tokens', v_reward,
    'reward_reason', v_reason
  );
end;
$fn$;

revoke all on function public.register_exam_success(text, integer, text) from public, anon;
grant execute on function public.register_exam_success(text, integer, text) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 5. RECUPERAR LAS PRUEBAS QUE YA EXISTÍAN
-- ══════════════════════════════════════════════════════════════════════
-- Nadie que ya aprobó un examen debería aparecer como "sin probar". Se reconstruye
-- desde dos rastros que ya están en la base, sin inventar datos:
--
--   (a) reputation_history: 'Examen aprobado: <skill> (score: <n>, kind: <k>)'
--       → tiene el score REAL.
--   (b) el libro del Fondo: note = 'skill:<nombre>'
--       → tiene los tokens pagados, pero NO el score → best_score queda NULL.
--
-- Tolerante a fallos: si alguna tabla no existe en esta base, no rompe la
-- migración (la Red Viva simplemente arranca sin historial recuperado).
do $do$
declare
  v_recuperadas integer := 0;
begin
  -- (a) desde el historial de reputación (trae score real)
  begin
    insert into public.omicron_skill_proofs
      (user_id, skill_key, skill_label, best_score, proofs_count, tokens_earned,
       first_proven_at, last_proven_at)
    select
      h.user_id,
      lower(btrim(h.skill)) as skill_key,
      btrim(h.skill)        as skill_label,
      max(h.score)          as best_score,
      count(*)::int         as proofs_count,
      0                     as tokens_earned,
      min(h.created_at)     as first_proven_at,
      max(h.created_at)     as last_proven_at
    from (
      select
        rh.user_id,
        substring(rh.reason from 'Examen aprobado: (.*) \(score:')      as skill,
        nullif(substring(rh.reason from '\(score: ([0-9]+)'), '')::int  as score,
        rh.created_at
      from public.reputation_history rh
      where rh.reason like 'Examen aprobado: %(score: %'
    ) h
    where h.skill is not null
      and btrim(h.skill) <> ''
      and lower(btrim(h.skill)) <> 'general'
      and exists (select 1 from public.profiles p where p.id = h.user_id)
    group by h.user_id, lower(btrim(h.skill)), btrim(h.skill)
    on conflict (user_id, skill_key) do nothing;

    get diagnostics v_recuperadas = row_count;
    raise notice '[10001] Pruebas recuperadas del historial de reputación: %', v_recuperadas;
  exception when others then
    raise notice '[10001] No se pudo leer reputation_history (%). Se continúa.', sqlerrm;
  end;

  -- (b) desde el libro del Fondo (trae tokens, sin score → best_score NULL)
  begin
    insert into public.omicron_skill_proofs as sp
      (user_id, skill_key, skill_label, best_score, proofs_count, tokens_earned,
       first_proven_at, last_proven_at)
    select
      f.user_id,
      substring(f.note from 7)              as skill_key,   -- quita 'skill:'
      substring(f.note from 7)              as skill_label,
      null::int                             as best_score,
      count(*)::int                         as proofs_count,
      coalesce(sum(f.amount), 0)            as tokens_earned,
      min(f.created_at)                     as first_proven_at,
      max(f.created_at)                     as last_proven_at
    from public.omicron_knowledge_fund f
    where f.direction = 'out'
      and f.source = 'exam_reward'
      and f.user_id is not null
      and f.note like 'skill:%'
      and length(substring(f.note from 7)) > 0
      and substring(f.note from 7) <> 'general'
      and exists (select 1 from public.profiles p where p.id = f.user_id)
    group by f.user_id, substring(f.note from 7)
    on conflict (user_id, skill_key) do update set
      tokens_earned = greatest(sp.tokens_earned, excluded.tokens_earned);

    get diagnostics v_recuperadas = row_count;
    raise notice '[10001] Pruebas recuperadas del libro del Fondo: %', v_recuperadas;
  exception when others then
    raise notice '[10001] No se pudo leer omicron_knowledge_fund (%). Se continúa.', sqlerrm;
  end;
end;
$do$;


-- ══════════════════════════════════════════════════════════════════════
-- 6. RECARGAR EL ESQUEMA DE LA API
-- ══════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════
-- ADVERTENCIAS
-- ══════════════════════════════════════════════════════════════════════
--
-- ADVERTENCIA 1 — best_score NULL es información, no un hueco a rellenar.
--   Significa "probada, sin score registrado" (prueba histórica reconstruida
--   desde el libro del Fondo). La UI debe decir eso, nunca inventar un número.
--
-- ADVERTENCIA 2 — esta tabla registra pruebas de EXAMEN. Cuando se sumen otras
--   formas de prueba (contrato completado, validación de un colega), deben
--   escribir acá con su propio origen; conviene entonces agregar una columna
--   source text default 'exam' antes de que existan varios productores.
--
-- ADVERTENCIA 3 — el corte que sigue abierto: register_exam_success acepta
--   cualquier nombre de habilidad, pero el examen en sí (Edge Function
--   simulador-universal) exige una fila en skill_tree_nodes y rechaza los ids
--   'virtual-*' que fabrica MaxSkillTab. Hasta que eso se resuelva (Inc 5 del
--   plan), no se puede probar CUALQUIER habilidad del CV, solo las del catálogo.
--   La app debe ser honesta al respecto en la ficha del nodo.
-- ══════════════════════════════════════════════════════════════════════
