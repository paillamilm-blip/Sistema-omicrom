-- =====================================================================
-- 0048_convalidar_credencial.sql — Endurecimiento de reputación (auditoría 🔴)
--
-- CONTEXTO: `0007_protect_profile.sql` revierte toda escritura del cliente a
-- las columnas de score (anti auto-inflado). Por eso la convalidación desde el
-- cliente NO movía la reputación. Esta RPC es el camino correcto:
--
--   · SECURITY DEFINER → puede escribir los scores (sortea el trigger 0007).
--   · Usa auth.uid() → SOLO puede convalidar TU propio perfil (no el de otros).
--   · Es ADITIVA y NO destructiva → nunca baja un score existente.
--
-- MODELO CANÓNICO (ver 0050_reputacion_canonica.sql y DEFINICION_REPUTACION_OMICROM.md):
--   La convalidación SOLO mueve `traditional_score` (credenciales = el 20%),
--   que NO es una columna derivada. La experiencia (80%) es el promedio de los
--   4 ejes y se GANA con evidencia real (contratos, calificaciones, nodos,
--   aportes) — no se puede "declarar". Escribir experience_score aquí sería
--   inútil: el trigger recalc_reputation lo normaliza a promedio de 4 ejes.
--
--   Tope de convalidación: traditional_score ≤ 60. Una reputación alta exige
--   desempeño demostrado, no solo credenciales convalidadas.
--
-- Idempotente.
-- =====================================================================

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
  elsif p_kind = 'vault' then
    d_trad := 3;                     -- aporte declarado a la Bóveda
  else
    return json_build_object('ok', false, 'error', 'tipo inválido');
  end if;

  -- Aditivo, no destructivo, con tope de convalidación (60).
  update public.profiles set
    traditional_score = greatest(coalesce(traditional_score, 0),
                                 least(60, coalesce(traditional_score, 0) + d_trad))
  where id = uid;
  -- → el trigger recalc_reputation (0050) actualiza reputation_score (base 20/80 + momentum).

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
