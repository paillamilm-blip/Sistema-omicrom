-- 0061_fix_credit_tokens_external_ref.sql
-- Arregla la acreditación de tokens tras un pago con Stripe.
--
-- PROBLEMA: la columna wallet_transactions.reference_id es de tipo UUID, pero
-- los identificadores de pago de Stripe (pi_..., cs_...) son TEXTO. La función
-- credit_tokens_from_payment intentaba guardar el id de Stripe en esa columna
-- UUID, lo que hacía fallar la inserción (error 500) y los tokens nunca se
-- acreditaban al usuario.
--
-- SOLUCIÓN: se agrega una columna de texto `external_ref` para la referencia
-- externa (pagos), y se reescribe la función para usarla tanto en el chequeo
-- de idempotencia como al registrar la transacción. Además guarda el saldo
-- resultante en balance_after.
--
-- Ya aplicada y verificada en producción (prueba con ROLLBACK: acreditó 5000
-- tokens y registró la transacción correctamente).

ALTER TABLE public.wallet_transactions ADD COLUMN IF NOT EXISTS external_ref text;
CREATE INDEX IF NOT EXISTS idx_wallet_tx_external_ref
  ON public.wallet_transactions(external_ref) WHERE external_ref IS NOT NULL;

CREATE OR REPLACE FUNCTION public.credit_tokens_from_payment(p_user_id uuid, p_tokens integer, p_payment_intent_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_balance bigint;
begin
  -- Idempotencia: si ya se acreditó este pago, salir.
  if exists (select 1 from public.wallet_transactions
             where external_ref = p_payment_intent_id and transaction_type = 'purchase') then
    return;
  end if;

  -- Acreditar tokens y capturar el nuevo saldo.
  update public.profiles
  set token_balance = coalesce(token_balance, 0) + p_tokens
  where id = p_user_id
  returning token_balance into v_balance;

  -- Registrar la transacción (referencia de Stripe como texto en external_ref).
  insert into public.wallet_transactions (
    user_id, transaction_type, amount, description, external_ref, balance_after
  ) values (
    p_user_id, 'purchase', p_tokens, 'Recarga con Stripe', p_payment_intent_id, v_balance
  );
end; $function$;

-- Solo el backend (service_role) puede ejecutarla.
REVOKE ALL ON FUNCTION public.credit_tokens_from_payment(uuid,integer,text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.credit_tokens_from_payment(uuid,integer,text) TO service_role;
