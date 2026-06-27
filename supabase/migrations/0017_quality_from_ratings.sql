-- =====================================================================
-- 0017_quality_from_ratings.sql
-- CALIDAD = promedio de calificaciones (1-5) que el comprador deja al
-- aprobar un contrato. Sin calificaciones -> 50 (neutral).
-- =====================================================================
alter table public.contracts add column if not exists rating         int check (rating between 1 and 5);
alter table public.contracts add column if not exists rating_comment text;
alter table public.contracts add column if not exists rated_at       timestamptz;

create or replace function public.recalc_quality_score(p_user uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_avg numeric;
begin
  select avg(rating) into v_avg
  from public.contracts
  where seller_id = p_user and rating is not null;

  update public.profiles
  set quality_score = case when v_avg is null then 50 else round(v_avg / 5.0 * 100, 2) end
  where id = p_user;
end; $fn$;

-- RPC: el comprador califica un contrato completado
create or replace function public.rate_contract(p_contract_id uuid, p_stars int, p_comment text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_seller uuid; v_buyer uuid; v_status text;
begin
  select seller_id, buyer_id, upper(status) into v_seller, v_buyer, v_status
  from public.contracts where id = p_contract_id;

  if v_buyer is null then raise exception 'Contrato no existe'; end if;
  if auth.uid() <> v_buyer then raise exception 'Solo el comprador puede calificar'; end if;
  if v_status <> 'RELEASED' then raise exception 'Solo se califican contratos completados'; end if;
  if p_stars < 1 or p_stars > 5 then raise exception 'La calificacion debe ser 1-5'; end if;

  update public.contracts
  set rating = p_stars, rating_comment = p_comment, rated_at = now()
  where id = p_contract_id;

  perform public.recalc_quality_score(v_seller);
end; $fn$;

grant execute on function public.rate_contract(uuid, int, text) to authenticated;

do $do$
declare r record;
begin
  for r in (select distinct seller_id from public.contracts where seller_id is not null) loop
    perform public.recalc_quality_score(r.seller_id);
  end loop;
end;
$do$;
