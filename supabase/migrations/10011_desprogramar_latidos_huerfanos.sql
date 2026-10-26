-- =====================================================================
-- 10011_desprogramar_latidos_huerfanos.sql — cerrar los latidos antes de
-- borrar las Edge Functions muertas.
--
-- EL HECHO (2026-10-26, leyendo las migraciones que programaron cron):
-- Hay seis Edge Functions que él va a borrar del dashboard (`sync-jobs`,
-- `notify-matches`, `stripe-webhook`, `verificar-pago`, `ghost-approval`,
-- `vault-oracle`). En `src/` tienen cero referencias y ninguna otra Edge
-- Function las llama — pero **no viven solas**: tres de ellas son el destino
-- de latidos de `pg_cron`:
--
--   * `ghost-approval-sweep`  — 0055:59 — `* * * * *`, o sea 1.440 POST por día
--   * `sync-jobs-6h`          — 0072:133 — cada 6 h
--   * `notify-matches-6h`     — 0072:153 — cada 6 h
--
-- Si se borran las funciones sin desprogramar, el cronqueda pegándole a un 404
-- cada minuto: logs sucios, cola de `pg_net` creciendo y cualquier métrica de
-- uso que queramos leer después deja de ser creíble.
--
-- Y el mismo ejercicio destapó algo que nadie midió: **los otros tres jobs
-- también están muertos**, pero por el lado de la base. 10006 dropea en bucle
-- sobre un array de tablas, así que un `grep 'drop table'` no los muestra:
-- en ese array están `knowledge_vault_documents` (10006), `penalties` (10006)
-- y `wallet_transactions` (10007). Son exactamente el insumo de:
--
--   * `vault_depreciation_daily`     — 0026:27 — `apply_vault_depreciation()`
--                                      → `update public.knowledge_vault_documents`
--   * `pmc_recovery_daily`           — 0042:201 — `apply_pmc_recovery()`
--                                      → `update public.penalties`
--   * `token_depreciation_monthly`   — 0045:105 — `apply_token_depreciation()`
--                                      → `insert into public.wallet_transactions`
--
-- Dos de ellos corren a las 03:00 UTC todos los días. Si estuvieron
-- programados, vienen fallando todas las noches desde el recorte y generando
-- filas de error en `cron.job_run_details`.
--
-- POR QUÉ SE DESCUBRE Y NO SE ASUME: todas esas migraciones envolvieron su
-- `cron.schedule()` en `begin ... exception when others then null; end;`, así
-- que la existencia de cada job es un hecho empírico, no una consecuencia del
-- archivo. Esta migración recorre `cron.job` y decide por el **contenido del
-- command** (slug de Edge Function, o tabla que la función llamada necesita),
-- no por el nombre — un job renombrado o duplicado a mano igual cae en la red.
--
-- NO BORRA NINGUNA FUNCIÓN DE LA BASE. `apply_vault_depreciation`,
-- `apply_pmc_recovery` y `apply_token_depreciation` quedan vivas como código
-- muerto y se reportan abajo para que él decida si dropearlas: son tres
-- `create or replace` de una línea, y dropearlas no recupera nada.
--
-- Idempotente: si no hay jobs, no hace nada. Si ya se desprogramó, no encuentra
-- nada que desprogramar.
--
-- Va en: Supabase → SQL editor (corre como postgres).
-- Si pg_cron no está habilitado en este proyecto, el bloque §1-§2 avisa y no
-- toca nada; en ese caso el §3 no tiene tabla de dónde leer y se omite.
-- =====================================================================

-- ══════════════════════════════════════════════════════════════════════
-- 1 y 2. EL RECORRIDO: descubrir, decidir, desprogramar
-- ══════════════════════════════════════════════════════════════════════
do $do$
declare
  r        record;
  v_slug   text;
  v_pair   record;
  v_motivo text;
  v_total  integer := 0;
  v_baja   integer := 0;
  v_quedan integer := 0;
  v_orphan_slugs text[] := array[
    'sync-jobs', 'notify-matches', 'stripe-webhook',
    'verificar-pago', 'ghost-approval', 'vault-oracle'
  ];
begin
  if to_regclass('cron.job') is null then
    raise warning '[10011] pg_cron no está instalado/habilitado en este proyecto: no hay latidos que desprogramar. Pasá directo al borrado de las Edge Functions.';
    return;
  end if;

  select count(*) into v_total from cron.job;
  raise warning '[10011] Jobs programados encontrados: %.', v_total;

  if v_total = 0 then
    raise warning '[10011] La cola está vacía: los `cron.schedule()` de 0026/0042/0045/0055/0072 nunca llegaron a ejecutarse (fallaron en silencio dentro de su propio exception). No hay nada que desprogramar.';
    return;
  end if;

  for r in select jobid, jobname, schedule, command from cron.job order by jobname loop
    v_motivo := null;

    -- (A) latido que apunta a una Edge Function que se va a borrar
    foreach v_slug in array v_orphan_slugs loop
      if r.command ~* ('/functions/v1/' || v_slug) then
        v_motivo := 'apunta a la Edge Function `' || v_slug || '`, que sale del producto';
        exit;
      end if;
    end loop;

    -- (B) job de SQL cuyo insumo fue dropeado por el recorte
    if v_motivo is null then
      for v_pair in
        select f, t from (values
          ('apply_vault_depreciation',   'public.knowledge_vault_documents'),
          ('apply_token_depreciation',   'public.wallet_transactions'),
          ('apply_pmc_recovery',         'public.penalties')
        ) as x(f, t)
      loop
        if position(v_pair.f in r.command) > 0 and to_regclass(v_pair.t) is null then
          v_motivo := 'invoca `' || v_pair.f || '()`, cuya tabla `' || v_pair.t || '` ya no existe';
          exit;
        end if;
      end loop;
    end if;

    if v_motivo is not null then
      begin
        perform cron.unschedule(r.jobid);
        v_baja := v_baja + 1;
        raise warning '[10011] DESPROGRAMADO `%s` (jobid %, "%") — %.',
          r.jobname, r.jobid, r.schedule, v_motivo;
      exception when others then
        raise warning '[10011] No se pudo desprogramar `%s` (jobid %): %', r.jobname, r.jobid, sqlerrm;
      end;
    else
      v_quedan := v_quedan + 1;
      raise notice '[10011] queda programado: `%s` ("%") → %',
        r.jobname, r.schedule, left(regexp_replace(r.command, '\s+', ' ', 'g'), 90);
    end if;
  end loop;

  raise warning '[10011] Resumen: % job(s) desprogramado(s), % quedan en pie, % había en total.', v_baja, v_quedan, v_total;

  -- Las funciones de devaluación quedan vivas como código muerto. Se reportan,
  -- no se dropean: recuperar esas líneas no suma nada y sí puede romper un
  -- restore de respaldo.
  if to_regprocedure('public.apply_vault_depreciation()') is not null
     or to_regprocedure('public.apply_token_depreciation()') is not null
     or to_regprocedure('public.apply_pmc_recovery()') is not null then
    raise notice '[10011] Código muerto en la base (se decide aparte, no se toca acá): %',
      (select coalesce(string_agg(f, ', '), 'ninguno') from (
         select 'apply_vault_depreciation()'  as f where to_regprocedure('public.apply_vault_depreciation()')  is not null
         union all select 'apply_token_depreciation()'  where to_regprocedure('public.apply_token_depreciation()')  is not null
         union all select 'apply_pmc_recovery()'        where to_regprocedure('public.apply_pmc_recovery()')        is not null
       ) s);
  end if;
end;
$do$;

-- ══════════════════════════════════════════════════════════════════════
-- 3. VERIFICACIÓN (una sola sentencia, lectura)
-- ══════════════════════════════════════════════════════════════════════
-- Espera `0` en latidos_huerfanos. `jobs_restantes` tiene que ser la lista de
-- lo que el producto sí usa hoy.
select
  coalesce(
    (select string_agg(jobname, ', ' order by jobname) from cron.job),
    '(la cola quedó vacía)'
  ) as jobs_restantes,
  (select count(*) from cron.job) as total,
  (select count(*) from cron.job
    where command ~* '/functions/v1/(sync-jobs|notify-matches|stripe-webhook|verificar-pago|ghost-approval|vault-oracle)'
  ) as latidos_huerfanos;
