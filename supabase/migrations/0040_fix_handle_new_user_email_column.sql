-- =====================================================================
-- 0040_fix_handle_new_user_email_column.sql
-- FIX CRÍTICO: el trigger handle_new_user() (creado en 0001_core.sql)
-- intenta insertar en public.profiles una columna "email" que NUNCA
-- existió en el esquema real de producción (ver supabase/schema.sql,
-- la fuente de verdad). Esto abortaba la transacción con:
--   42703  column "email" of relation "profiles" does not exist
-- y Supabase Auth respondía 500 Internal Server Error en cada intento
-- de registro (POST /auth/v1/signup), impidiendo crear cuentas nuevas.
--
-- Este fix redefine la función para que NO referencie la columna
-- "email" (el email del usuario ya vive en auth.users; no se duplica
-- en profiles). Idempotente — seguro de correr varias veces.
-- =====================================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username, full_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- El trigger ya existe (creado en 0001_core.sql); solo se actualiza el
-- cuerpo de la función. Se re-declara aquí por completitud/idempotencia.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

notify pgrst, 'reload schema';
