-- =====================================================================
-- 0041_login_by_username.sql
-- Permite iniciar sesión con "usuario" (no solo email), como muestra la
-- UI de AuthOverlay.tsx (etiqueta "Usuario" en el login, para mitigar
-- enumeración de cuentas).
--
-- profiles NO tiene columna "email" (ver schema.sql) — el email real
-- vive únicamente en auth.users, que el navegador no puede consultar
-- directamente por RLS. Esta función RPC (security definer) resuelve
-- username -> email de forma controlada, solo para el flujo de login.
--
-- Devuelve NULL si el username no existe (el cliente debe tratar ese
-- caso como "credenciales inválidas", sin revelar si el usuario existe).
-- =====================================================================

create or replace function public.get_email_for_login(p_identifier text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text;
begin
  select u.email into v_email
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(p.username) = lower(trim(p_identifier))
  limit 1;

  return v_email;
end;
$$;

-- Solo expone email si el username coincide; no permite listar ni
-- enumerar usuarios de otra forma. Debe ser accesible sin sesión
-- (anon) porque se usa ANTES de autenticar.
revoke all on function public.get_email_for_login(text) from public;
grant execute on function public.get_email_for_login(text) to anon, authenticated;

notify pgrst, 'reload schema';
