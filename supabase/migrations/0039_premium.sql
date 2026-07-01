-- =====================================================================
-- 0039_premium.sql — Ómicrom Premium (gating de las funciones de IA)
-- Las funciones de IA (Coach, Tutor, Examinador, Carta, Asesor, Oráculo,
-- Redactor, Relator) son parte de la experiencia PREMIUM de pago.
-- Este flag habilita/deshabilita premium por usuario. El día que integres
-- la pasarela de pago, solo conectas el cobro a este flag.
-- Idempotente.
-- =====================================================================

alter table public.profiles add column if not exists is_premium boolean not null default false;

notify pgrst, 'reload schema';
