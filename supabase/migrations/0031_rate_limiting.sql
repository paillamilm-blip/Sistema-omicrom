-- ════════════════════════════════════════════════════════════════════════
-- 0031_rate_limiting.sql
-- Rate limiting anti-spam para Edge Functions (ventana fija, atómico).
-- Idempotente. Ejecutar en el SQL Editor de Supabase.
-- ════════════════════════════════════════════════════════════════════════

create table if not exists public.rate_limits (
  bucket        text        not null,   -- nombre del endpoint (ej. 'run-code')
  identifier    text        not null,   -- user_id o IP
  window_start  timestamptz not null,   -- inicio de la ventana fija
  count         integer     not null default 0,
  primary key (bucket, identifier, window_start)
);

-- La tabla es interna (solo la usa el limitador vía SECURITY DEFINER).
alter table public.rate_limits enable row level security;
-- Sin políticas => nadie puede leerla/escribirla directamente (ni anon ni authenticated).
-- El acceso ocurre exclusivamente a través de la función check_rate_limit.

-- ── Función atómica: incrementa el contador de la ventana actual y dice si
--    la solicitud está permitida. Devuelve jsonb {allowed, count, limit, reset_at}.
create or replace function public.check_rate_limit(
  p_bucket     text,
  p_identifier text,
  p_limit      integer,
  p_window_sec integer
) returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_epoch  bigint      := floor(extract(epoch from now()))::bigint;
  v_window timestamptz := to_timestamp((v_epoch / p_window_sec) * p_window_sec);
  v_count  integer;
begin
  insert into public.rate_limits (bucket, identifier, window_start, count)
  values (p_bucket, p_identifier, v_window, 1)
  on conflict (bucket, identifier, window_start)
  do update set count = public.rate_limits.count + 1
  returning count into v_count;

  -- Limpieza oportunista de ventanas viejas (mantiene la tabla pequeña).
  if (v_epoch % 50) = 0 then
    delete from public.rate_limits
    where window_start < now() - interval '1 hour';
  end if;

  return jsonb_build_object(
    'allowed',  v_count <= p_limit,
    'count',    v_count,
    'limit',    p_limit,
    'reset_at', v_window + make_interval(secs => p_window_sec)
  );
end;
$fn$;

-- Solo el service_role (Edge Functions) ejecuta el limitador.
revoke all on function public.check_rate_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_rate_limit(text, text, integer, integer) to service_role;
