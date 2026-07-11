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
--   · Con TOPE → la convalidación por sí sola no supera credenciales=60 /
--     experiencia=70; la reputación alta exige contratos/exámenes reales.
--   · Mueve `traditional_score` (credenciales, 20%) y `experience_score`
--     (experiencia, 80%); el trigger `recalc_reputation` (0009) recalcula
--     `reputation_score` con la regla 80/20 autoritativa.
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
  d_exp  numeric := 0;
begin
  if uid is null then
    return json_build_object('ok', false, 'error', 'sin sesión');
  end if;

  if p_kind = 'cv' then
    d_trad := 6;                     -- CV = credencial
  elsif p_kind = 'title' then
    d_trad := 5;                     -- título = credencial
  elsif p_kind = 'year' then
    d_exp := 4;                      -- año de experiencia
  elsif p_kind = 'vault' then
    d_exp := 3;                      -- aporte a la Bóveda
  else
    return json_build_object('ok', false, 'error', 'tipo inválido');
  end if;

  -- Aditivo, no destructivo, con tope de convalidación (60 / 70).
  update public.profiles set
    traditional_score = greatest(coalesce(traditional_score, 0),
                                 least(60, coalesce(traditional_score, 0) + d_trad)),
    experience_score  = greatest(coalesce(experience_score, 0),
                                 least(70, coalesce(experience_score, 0) + d_exp))
  where id = uid;
  -- → el trigger recalc_reputation (0009) actualiza reputation_score (80/20).

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
