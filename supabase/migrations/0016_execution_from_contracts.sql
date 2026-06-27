-- =====================================================================
-- 0016_execution_from_contracts.sql
-- EJECUCIÓN = contratos completados (RELEASED) como vendedor.
-- =====================================================================
create or replace function public.recalc_execution_score(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_count int; v_score numeric;
begin
  select count(*) into v_count
  from public.contracts
  where seller_id = p_user and upper(status) = 'RELEASED';

  v_score := least(100, v_count * 12);  -- ~10 contratos = 100
  update public.profiles set execution_score = v_score where id = p_user;
end; $fn$;

create or replace function public.fn_contract_execution_after()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.seller_id is not null then
    perform public.recalc_execution_score(new.seller_id);
  end if;
  return null;
end; $fn$;

drop trigger if exists trg_contract_execution on public.contracts;
create trigger trg_contract_execution
  after insert or update on public.contracts
  for each row execute function public.fn_contract_execution_after();

do $do$
declare r record;
begin
  for r in (select distinct seller_id from public.contracts where seller_id is not null) loop
    perform public.recalc_execution_score(r.seller_id);
  end loop;
end;
$do$;
