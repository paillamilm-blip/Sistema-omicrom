-- =====================================================================
-- 10010_convalidar_sin_boveda.sql — La Bóveda ya no puede convalidarse
--
-- EL HECHO (2026-10-24, buscando qué rompió 10006):
-- `0048_convalidar_credencial.sql` tiene cuatro tipos de credencial:
-- cv, title, year y **vault** ("aporte declarado a la Bóveda"). La Bóveda
-- —`knowledge_vault_documents`, `vault_queries`, `content_lineage`— fue
-- dropeada por 10006. El `elsif p_kind='vault'` no tocaba esas tablas:
-- solo sumaba +3 a `traditional_score` y anotaba
-- `Convalidación: vault` en `reputation_history`. O sea que la RPC nunca
-- dejó de funcionar; lo que hizo fue **fabricar reputación sobre una
-- función que ya no existe**.
--
-- Y no era hipotético: el frontend la llamaba sola. En
-- `useGemeloActivation.ts` (rama fase-6-recorte-datos) la cadena de
-- autoconvalidación disparaba title → year → vault en cuanto el usuario
-- guardaba su CV, sin que él declarara ningún aporte. El paso vault
-- salió del código en esta misma Fase 6C; esta migración cierra el lado
-- del servidor para que un bundle viejo —o cualquier llamada directa—
-- no pueda seguir acreditando el aporte inexistente.
--
-- DECISIÓN DE DISEÑO: no borramos los `reputation_history` ya escritos.
-- Son el rastro auditable de lo que pasó, y la promesa del producto es
-- que la reputación se puede revisar. Sí se reporta abajo cuántos
-- perfiles llevan ese crédito, para que el recorte de esos puntos se
-- decida con nombres encima de la mesa (misma regla que 10008).
--
-- Idempotente: `create or replace`.
-- =====================================================================

-- ══════════════════════════════════════════════════════════════════════
-- 1. LA FUNCIÓN, sin la rama vault
-- ══════════════════════════════════════════════════════════════════════
create or replace function public.convalidar_credencial(p_kind text)
returns json
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  d_trad numeric := 0;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  -- Todos los tipos son CREDENCIALES autodeclaradas → 20% (traditional_score).
  if p_kind = 'cv' then
    d_trad := 6;                     -- CV
  elsif p_kind = 'title' then
    d_trad := 5;                     -- título académico
  elsif p_kind = 'year' then
    d_trad := 4;                     -- año de experiencia declarado
  else
    -- 'vault' cae acá desde la Fase 6. El mensaje nombra la razón real para
    -- que un log o un toast no parezca un error del usuario.
    if p_kind = 'vault' then
      return json_build_object('ok', false, 'error', 'la Bóveda salió del producto');
    end if;
    return json_build_object('ok', false, 'error', 'tipo inválido');
  end if;

  -- Aditivo, no destructivo, con tope de convalidación (60).
  update public.profiles set
    traditional_score = greatest(coalesce(traditional_score, 0),
                                 least(60, coalesce(traditional_score, 0) + d_trad))
  where id = uid;
  -- → el trigger recalc_reputation (0050) actualiza reputation_score.

  -- Auditoría best-effort (no crítica si el esquema difiere).
  begin
    insert into public.reputation_history(user_id, reason)
    values (uid, 'Convalidación: ' || p_kind);
  exception when others then
    null;
  end;

  return json_build_object(
    'ok', true,
    'reputation', (select reputation_score from public.profiles where id = uid)
  );
end;
$fn$;

revoke all on function public.convalidar_credencial(text) from public, anon;
grant execute on function public.convalidar_credencial(text) to authenticated;

notify pgrst, 'reload schema';

-- ══════════════════════════════════════════════════════════════════════
-- 2. EL INVENTARIO: quién quedó con crédito por una Bóveda que no existe
-- ══════════════════════════════════════════════════════════════════════
-- Corre como postgres en el SQL editor, así que salta RLS y ve el total.
-- 3 puntos de traditional_score por fila (de un tope de 60).
do $do$
declare
  v_n integer;
begin
  select count(*) into v_n
    from public.reputation_history
   where reason = 'Convalidación: vault';

  raise warning '[10010] Convalidaciones de Bóveda en el historial: % fila(s).', v_n;

  if v_n > 0 then
    raise warning '[10010] Perfiles con +3 de traditional_score por aporte inexistente: %',
      (select coalesce(string_agg(x, ', '), 'ninguno')
         from (select coalesce(p.full_name, p.username, left(h.user_id::text, 8)) ||
                      ' (trad ' || coalesce(p.traditional_score, 0) ||
                      ', rep '  || coalesce(p.reputation_score, 0) || ')' as x
                 from public.reputation_history h
                 left join public.profiles p on p.id = h.user_id
                where h.reason = 'Convalidación: vault'
                group by p.full_name, p.username, h.user_id, p.traditional_score, p.reputation_score
              ) s);
    raise notice '[10010] No se tocó ningún puntaje. Bajar esos 3 puntos es una decisión de producto, no de esta migración.';
  end if;
end;
$do$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. VERIFICACIÓN (una sola sentencia, lectura)
-- ══════════════════════════════════════════════════════════════════════
-- Espera `t` en las tres columnas: vault ahora rebotaba con mensaje propio,
-- y cv/title/year siguen sumando.
select position('la Bóveda salió del producto' in pg_get_functiondef('public.convalidar_credencial(text)'::regprocedure)) > 0
       as vault_rechazado,
       position('''cv''' in pg_get_functiondef('public.convalidar_credencial(text)'::regprocedure)) > 0
       as cv_sigue,
       position('''year''' in pg_get_functiondef('public.convalidar_credencial(text)'::regprocedure)) > 0
       as year_sigue;
