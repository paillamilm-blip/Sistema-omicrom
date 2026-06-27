-- =====================================================================
-- 0010_object_delivery.sql — HALLAZGO #6: botón OBJETAR real
-- RPC segura: el comprador (o vendedor) objeta la entrega durante el
-- Ghost Approval. Abre una disputa Y detiene la liberación automática.
-- =====================================================================

create or replace function public.object_delivery(
  p_contract_id uuid,
  p_reason text default 'Objeción durante Ghost Approval'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  c        record;
  v_other  uuid;
  v_dispute uuid;
begin
  if auth.uid() is null then raise exception 'No autenticado'; end if;

  select * into c from public.contracts where id = p_contract_id for update;
  if c.id is null then raise exception 'Contrato no encontrado'; end if;
  if auth.uid() <> c.buyer_id and auth.uid() <> c.seller_id then
    raise exception 'No autorizado en este contrato';
  end if;
  if c.status <> 'DELIVERED' then
    raise exception 'Solo se puede objetar una entrega en curso';
  end if;

  v_other := case when auth.uid() = c.buyer_id then c.seller_id else c.buyer_id end;

  -- Abre la disputa (esto dispara la asignación de árbitros si tienes ese trigger)
  insert into public.disputes (contract_id, plaintiff_id, defendant_id, reason, status)
  values (
    p_contract_id, auth.uid(), v_other,
    coalesce(nullif(btrim(p_reason), ''), 'Objeción durante Ghost Approval'),
    'OPENED'
  )
  returning id into v_dispute;

  -- Detiene la liberación: marca DISPUTED solo si ningún trigger ya cambió el estado
  update public.contracts
    set status = 'DISPUTED', updated_at = now()
  where id = p_contract_id and status = 'DELIVERED';

  return v_dispute;
end; $$;

grant execute on function public.object_delivery(uuid, text) to authenticated;
