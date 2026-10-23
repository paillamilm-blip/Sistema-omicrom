-- =====================================================================
-- 10004_racha_server.sql — FASE 2: "Una sola racha, vivan donde vivan"
--
-- Hoy la racha se calcula en localStorage (5+ consumidores distintos),
-- así que cada dispositivo muestra un número diferente. La máquina
-- server-side ya existe (daily_activity + get_user_streak, migración
-- 0066) pero está huérfana: nadie la lee.
--
-- Cambios:
--   A) profiles.streak_days: columna que aloja la racha canónica.
--   B) register_daily_activity mantiene streak_days en cada registro.
--      Como es un UPDATE a profiles, la racha viaja por el canal
--      Realtime de perfiles que YA funciona (ProfileContext, debounce
--      300 ms) — sin infraestructura nueva.
--   C) Backfill: los usuarios actuales arrancan con su racha real.
--
-- Idempotente.
-- =====================================================================

-- ── A) Columna de racha canónica ──────────────────────────────────────
alter table public.profiles
  add column if not exists streak_days int not null default 0;

comment on column public.profiles.streak_days is
  'Racha canónica server-side (días consecutivos con actividad). La mantiene register_daily_activity; el cliente solo la lee. Migración 10004.';

-- ── B) register_daily_activity también publica la racha ───────────────
-- (cuerpo idéntico a 0066 + el update final de streak_days)
create or replace function public.register_daily_activity(
  p_challenge boolean default false,
  p_pe int default 0
) returns void language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.daily_activity (user_id, activity_date, challenge_completed, pe_earned)
  values (auth.uid(), current_date, p_challenge, p_pe)
  on conflict (user_id, activity_date)
  do update set
    challenge_completed = coalesce(daily_activity.challenge_completed, false) or p_challenge,
    pe_earned = daily_activity.pe_earned + p_pe;

  update public.push_subscriptions
  set last_active = now()
  where user_id = auth.uid();

  -- APRENDE SUMA / RACHA ÚNICA: publicar la racha en el perfil.
  -- get_user_streak es STABLE y lee daily_activity ya actualizada.
  update public.profiles
  set streak_days = public.get_user_streak(auth.uid())
  where id = auth.uid();
end; $fn$;

grant execute on function public.register_daily_activity(boolean, int) to authenticated;

-- ── C) Backfill para cuentas existentes ───────────────────────────────
update public.profiles p
set streak_days = public.get_user_streak(p.id)
where public.get_user_streak(p.id) > 0;

-- =====================================================================
-- FIN — Verificación: misma cuenta en dos navegadores ⇒ mismo número en
-- StreakBanner tras registrarse la actividad del día (UPDATE a profiles
-- llega por postgres_changes en <1 s).
-- =====================================================================
