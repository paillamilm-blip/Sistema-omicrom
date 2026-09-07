-- ══════════════════════════════════════════════════════════════════════
-- 10002_examen_de_cualquier_habilidad.sql
-- SE ROMPE EL CORTE #1: ahora se puede probar CUALQUIER habilidad del CV.
--
-- EL PROBLEMA REAL: Ómicrom promete "aprendizaje continuo en tiempo real
-- conectado con oportunidades reales". Pero el examen solo existía para el
-- catálogo curado a mano (skill_tree_nodes). Un abogado subía su CV, veía
-- "Derecho Laboral", tocaba validar… y no pasaba nada:
--
--   MaxSkillTab.makeVirtualNode() fabricaba un id 'virtual-derecho-laboral',
--   y la Edge Function simulador-universal hace
--     .from('skill_tree_nodes').select(...).eq('id', nodeId)
--   sobre una columna UUID → 404 'Nodo no encontrado' (el string ni castea).
--
-- O sea: la frase central del producto era falsa para toda habilidad que no
-- estuviera precargada. Y precargar a mano el universo de las profesiones no
-- escala: es exactamente el cuello de botella que Ómicrom dice eliminar.
--
-- LA SOLUCIÓN: materializar el nodo al vuelo. Si la habilidad no existe en el
-- catálogo, se crea una fila REAL (uuid de verdad) y todo lo de abajo funciona
-- sin cambios: la Edge Function la encuentra, aplicar_acta respeta su FK,
-- user_skill_progress registra el avance y register_exam_success deja la prueba
-- por nombre (migración 10001) que hace que el nodo se pinte SÓLIDO en la Red
-- Viva y que el Fondo de Conocimiento pague.
--
-- ⚠️ NO REQUIERE REDEPLOY DE EDGE FUNCTIONS. El cliente pide el uuid con este
-- RPC y después invoca al simulador como siempre. Blast radius mínimo a
-- propósito: no se toca nada que hoy funcione.
--
-- EFECTO SECUNDARIO BUENO: el árbol de habilidades deja de ser un catálogo
-- curado y empieza a crecer con lo que los profesionales reales declaran. La
-- primera persona que declara "Derecho Laboral" crea ese nodo. El catálogo se
-- vuelve un mapa de las competencias que existen de verdad en el mercado.
--
-- ── APPLY ─────────────────────────────────────────────────────────────
--   supabase db push
--
-- ── VERIFY ────────────────────────────────────────────────────────────
--   select public.omicron_ensure_skill_node('Derecho Laboral');
--   -- → {"ok":true,"node_id":"…","title":"Derecho Laboral","created":true}
--   select public.omicron_ensure_skill_node('derecho  laboral');
--   -- → el MISMO node_id, created:false (no duplica por mayúsculas/espacios)
--
--   -- Cuánto creció el árbol por demanda real de la gente:
--   select origin, count(*) from public.skill_tree_nodes group by origin;
--
--   -- Nodos creados por demanda, con quién los pidió (auditoría):
--   select title, created_by, created_at from public.skill_tree_nodes
--   where origin = 'demanda' order by created_at desc limit 20;
--
-- ── ROLLBACK ──────────────────────────────────────────────────────────
--   drop function if exists public.omicron_ensure_skill_node(text);
--   -- Los nodos creados se CONSERVAN: tienen actas y progreso colgando de su
--   -- FK. Borrarlos borraría exámenes reales de gente real.
--   -- Para ocultarlos sin borrar nada:
--   --   update public.skill_tree_nodes set order_index = 9999
--   --   where origin = 'demanda';
--   notify pgrst, 'reload schema';
-- ══════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════════════════════════════════
-- 1. DE DÓNDE VINO CADA NODO
-- ══════════════════════════════════════════════════════════════════════
-- 'catalog' = curado (lo que ya existía). 'demanda' = lo pidió una persona real.
-- Nunca se mezclan sin poder distinguirlos: la trazabilidad es parte del trato.
alter table public.skill_tree_nodes
  add column if not exists origin text not null default 'catalog';

alter table public.skill_tree_nodes
  add column if not exists created_by uuid references public.profiles(id) on delete set null;

do $do$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'skill_tree_nodes_origin_check'
  ) then
    alter table public.skill_tree_nodes
      add constraint skill_tree_nodes_origin_check check (origin in ('catalog', 'demanda'));
  end if;
end;
$do$;

comment on column public.skill_tree_nodes.origin is
  'catalog = nodo curado a mano. demanda = creado al vuelo porque una persona real lo declaró en su CV y pidió probarlo.';

-- Índice para la búsqueda por nombre normalizado (el camino caliente del RPC).
-- NO es único a propósito: el catálogo existente podría tener títulos repetidos y
-- una migración no debe fallar por eso. La unicidad se garantiza en el RPC con un
-- lock por nombre.
create index if not exists idx_skill_nodes_title_norm
  on public.skill_tree_nodes (lower(btrim(title)));

create index if not exists idx_skill_nodes_origin
  on public.skill_tree_nodes (origin, created_by);


-- ══════════════════════════════════════════════════════════════════════
-- 2. CONSEGUIR (O CREAR) EL NODO DE UNA HABILIDAD
-- ══════════════════════════════════════════════════════════════════════
-- Devuelve SIEMPRE json con el motivo en lenguaje claro, para que la app pueda
-- decir la verdad sin adivinar (mismo criterio que omicron_fund_quote).
--
-- ANTIABUSO (es una tabla pública y compartida):
--   • Dedup por nombre normalizado: "Excel", "excel" y " EXCEL " son el mismo nodo.
--   • Lock por nombre: dos personas pidiendo lo mismo a la vez no crean dos filas.
--   • Título validado: 2 a 60 caracteres y tiene que contener letras.
--   • Tope de 20 nodos nuevos por persona por día.
--   • created_by queda registrado: todo nodo creado es auditable.
create or replace function public.omicron_ensure_skill_node(p_title text)
returns json
language plpgsql
volatile
security definer
set search_path = public
as $fn$
declare
  k_cap_diario constant integer := 20;
  v_uid    uuid := auth.uid();
  v_label  text := nullif(btrim(regexp_replace(coalesce(p_title, ''), '\s+', ' ', 'g')), '');
  v_key    text;
  v_id     uuid;
  v_hoy    integer;
begin
  if v_uid is null then
    return json_build_object('ok', false, 'error', 'Necesitás iniciar sesión para dar un examen.');
  end if;

  if v_label is null or length(v_label) < 2 then
    return json_build_object('ok', false, 'error', 'El nombre de la habilidad es demasiado corto.');
  end if;

  if length(v_label) > 60 then
    return json_build_object('ok', false, 'error', 'El nombre de la habilidad es demasiado largo (máximo 60 caracteres).');
  end if;

  -- Tiene que ser una habilidad, no un símbolo o un número suelto.
  if v_label !~ '[[:alpha:]]{2}' then
    return json_build_object('ok', false, 'error', 'Ese nombre no parece una habilidad.');
  end if;

  v_key := lower(v_label);

  -- Serializa por nombre: si dos personas piden "Excel" al mismo tiempo, una
  -- espera a la otra y ambas terminan usando el MISMO nodo.
  perform pg_advisory_xact_lock(hashtext(v_key));

  -- ¿Ya existe? (catálogo curado o creado antes por alguien más)
  select id into v_id
  from public.skill_tree_nodes
  where lower(btrim(title)) = v_key
  order by (origin = 'catalog') desc, created_at asc
  limit 1;

  if v_id is not null then
    return json_build_object(
      'ok', true, 'node_id', v_id, 'title', v_label, 'created', false,
      'motivo', 'Ya existe un examen para esta habilidad.'
    );
  end if;

  -- Tope diario por persona.
  select count(*) into v_hoy
  from public.skill_tree_nodes
  where origin = 'demanda'
    and created_by = v_uid
    and created_at >= date_trunc('day', now());

  if v_hoy >= k_cap_diario then
    return json_build_object(
      'ok', false,
      'error', 'Ya abriste muchos exámenes nuevos hoy. Probá con los que tenés y mañana podés abrir más.'
    );
  end if;

  -- Se crea el nodo. La descripción está redactada para que la IA del simulador
  -- genere un examen útil: pide dominio práctico, no definiciones de memoria.
  insert into public.skill_tree_nodes
    (title, description, category, difficulty_level, pe_reward, estimated_hours,
     icon, color, order_index, origin, created_by)
  values (
    v_label,
    'Competencia profesional declarada por alguien de la red: ' || v_label ||
    '. Evaluar dominio práctico y criterio aplicado a situaciones de trabajo reales, no definiciones de memoria.',
    'SPECIALIZATION',
    3,
    15,
    1,
    'Brain',
    'cyan',
    900,           -- después del catálogo curado en cualquier orden por order_index
    'demanda',
    v_uid
  )
  returning id into v_id;

  return json_build_object(
    'ok', true, 'node_id', v_id, 'title', v_label, 'created', true,
    'motivo', 'Se preparó un examen nuevo para esta habilidad.'
  );
end;
$fn$;

revoke all on function public.omicron_ensure_skill_node(text) from public, anon;
grant execute on function public.omicron_ensure_skill_node(text) to authenticated;


-- ══════════════════════════════════════════════════════════════════════
-- 3. RECARGAR EL ESQUEMA DE LA API
-- ══════════════════════════════════════════════════════════════════════
notify pgrst, 'reload schema';


-- ══════════════════════════════════════════════════════════════════════
-- ADVERTENCIAS
-- ══════════════════════════════════════════════════════════════════════
--
-- ADVERTENCIA 1 — MODERACIÓN. La policy "nodes_read" de skill_tree_nodes es
--   `using (true)`: cualquiera lee la tabla completa. Entonces un título escrito
--   por una persona sería visible para todas. Por eso el cliente FILTRA los
--   nodos origin='demanda' del árbol público (useSkillTreeQuery): existen para
--   que el examen funcione, no para decorar la pantalla de otro. Abrir el árbol
--   comunitario es una decisión de producto que necesita moderación primero.
--
-- ADVERTENCIA 2 — el examen de un nodo creado por demanda lo genera la IA a
--   partir del título y la descripción. Es un examen real y paga real, pero su
--   calidad depende del modelo, no de contenido curado. Si en algún momento se
--   quiere exigir revisión humana antes de que un nodo 'demanda' pueda pagar
--   tokens, el lugar para ese candado es omicron_grant_exam_reward.
--
-- ADVERTENCIA 3 — no se borran nodos 'demanda' en el rollback a propósito:
--   tienen actas_evidencia y user_skill_progress apuntando por FK. Borrarlos
--   sería borrar exámenes que gente real aprobó.
-- ══════════════════════════════════════════════════════════════════════
