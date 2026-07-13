# Integración Stripe — Ómicron

**Preparación para monetización con dinero real (CLP)**

---

## 📋 ESTADO ACTUAL

- ✅ **Sistema de tokens internos funcionando** (beta)
- ✅ **Estructura de transacciones lista** (`wallet_transactions`)
- ✅ **Escrow implementado** (contratos con fondos bloqueados)
- ⏳ **Stripe pendiente** (activar cuando haya volumen)

---

## 🎯 OBJETIVO

Permitir a los usuarios:
1. **Recargar tokens** con dinero real (tarjeta de crédito/débito, Mercado Pago)
2. **Retirar tokens** a cuenta bancaria chilena
3. **Cumplir con regulaciones** financieras de Chile

---

## 🏗️ ARQUITECTURA

### Flujo de Recarga (comprar tokens)

```
Usuario → Frontend → Edge Function → Stripe Payment Intent → Confirmación
                                    ↓
                              [3 days security hold]
                                    ↓
                           Webhook → Acreditar tokens
```

### Flujo de Retiro (vender tokens)

```
Usuario → Solicita retiro → KYC verificado? → Stripe Transfer → Cuenta bancaria
                              ↓ NO
                         Rechazar (solicitar documentos)
```

---

## 📦 TABLAS NECESARIAS

### 1. `payment_methods`
```sql
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_method_id text not null, -- pm_xxx de Stripe
  card_brand text, -- visa, mastercard, amex
  card_last4 text, -- últimos 4 dígitos
  is_default boolean default false,
  created_at timestamptz not null default now(),
  unique(user_id, stripe_payment_method_id)
);

alter table public.payment_methods enable row level security;

create policy pm_select_own on public.payment_methods
  for select to authenticated using (auth.uid() = user_id);

grant select on public.payment_methods to authenticated;
revoke insert, update, delete on public.payment_methods from authenticated;
```

### 2. `stripe_customers`
```sql
create table if not exists public.stripe_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique, -- cus_xxx
  kyc_verified boolean default false,
  kyc_documents jsonb, -- {rut, nombre, banco, cuenta}
  created_at timestamptz not null default now()
);

alter table public.stripe_customers enable row level security;

create policy sc_select_own on public.stripe_customers
  for select to authenticated using (auth.uid() = user_id);

grant select on public.stripe_customers to authenticated;
revoke insert, update, delete on public.stripe_customers from authenticated;
```

### 3. `payment_intents`
```sql
create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  stripe_payment_intent_id text not null unique, -- pi_xxx
  amount_clp integer not null, -- monto en pesos chilenos
  tokens_amount integer not null, -- tokens que recibirá
  status text not null check (status in ('pending','succeeded','failed','refunded')),
  failure_reason text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.payment_intents enable row level security;

create policy pi_select_own on public.payment_intents
  for select to authenticated using (auth.uid() = user_id);

grant select on public.payment_intents to authenticated;
revoke insert, update, delete on public.payment_intents from authenticated;
```

### 4. `withdrawal_requests`
```sql
create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tokens_amount integer not null check (tokens_amount > 0),
  amount_clp integer not null, -- monto en CLP a recibir
  status text not null default 'pending' check (status in ('pending','processing','completed','rejected')),
  rejection_reason text,
  stripe_transfer_id text, -- tr_xxx
  bank_account jsonb not null, -- {banco, tipo_cuenta, numero_cuenta}
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.withdrawal_requests enable row level security;

create policy wr_select_own on public.withdrawal_requests
  for select to authenticated using (auth.uid() = user_id);

grant select on public.withdrawal_requests to authenticated;
revoke insert, update, delete on public.withdrawal_requests from authenticated;
```

---

## 🔧 EDGE FUNCTIONS

### 1. `supabase/functions/create-payment-intent/index.ts`

```typescript
import Stripe from 'https://esm.sh/stripe@13.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

Deno.serve(async (req) => {
  try {
    const { amount_clp } = await req.json(); // ej: 10000 CLP
    const authHeader = req.headers.get('Authorization')!;
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response('Unauthorized', { status: 401 });

    // Verificar mínimo y máximo
    if (amount_clp < 5000) {
      return new Response(JSON.stringify({ error: 'Monto mínimo: $5.000 CLP' }), { status: 400 });
    }
    if (amount_clp > 1000000) {
      return new Response(JSON.stringify({ error: 'Monto máximo: $1.000.000 CLP' }), { status: 400 });
    }

    // Convertir CLP a tokens (ej: 1000 CLP = 100 tokens)
    const tokens_amount = Math.floor(amount_clp / 10);

    // Obtener o crear cliente Stripe
    let { data: customer } = await supabase
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!customer) {
      const stripeCustomer = await stripe.customers.create({
        email: user.email,
        metadata: { omicron_user_id: user.id },
      });
      await supabase.from('stripe_customers').insert({
        user_id: user.id,
        stripe_customer_id: stripeCustomer.id,
      });
      customer = { stripe_customer_id: stripeCustomer.id };
    }

    // Crear Payment Intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount_clp, // Stripe usa centavos, pero CLP no tiene centavos
      currency: 'clp',
      customer: customer.stripe_customer_id,
      metadata: {
        omicron_user_id: user.id,
        tokens_amount: tokens_amount.toString(),
      },
      description: `Recarga ${tokens_amount} tokens`,
    });

    // Registrar en BD
    await supabase.from('payment_intents').insert({
      user_id: user.id,
      stripe_payment_intent_id: paymentIntent.id,
      amount_clp,
      tokens_amount,
      status: 'pending',
    });

    return new Response(
      JSON.stringify({ 
        client_secret: paymentIntent.client_secret,
        tokens_amount 
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
});
```

### 2. `supabase/functions/stripe-webhook/index.ts`

```typescript
import Stripe from 'https://esm.sh/stripe@13.0.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

Deno.serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  if (!signature) return new Response('No signature', { status: 400 });

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Service role para escribir
  );

  // Manejar evento payment_intent.succeeded
  if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const user_id = paymentIntent.metadata.omicron_user_id;
    const tokens_amount = parseInt(paymentIntent.metadata.tokens_amount);

    // Actualizar estado del payment intent
    await supabase
      .from('payment_intents')
      .update({ status: 'succeeded', completed_at: new Date().toISOString() })
      .eq('stripe_payment_intent_id', paymentIntent.id);

    // Acreditar tokens al usuario
    await supabase.rpc('credit_tokens_from_payment', {
      p_user_id: user_id,
      p_tokens: tokens_amount,
      p_payment_intent_id: paymentIntent.id,
    });
  }

  // Manejar evento payment_intent.payment_failed
  if (event.type === 'payment_intent.payment_failed') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    await supabase
      .from('payment_intents')
      .update({ 
        status: 'failed', 
        failure_reason: paymentIntent.last_payment_error?.message || 'Unknown',
        completed_at: new Date().toISOString()
      })
      .eq('stripe_payment_intent_id', paymentIntent.id);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});
```

### 3. RPC Helper: `credit_tokens_from_payment`

```sql
create or replace function public.credit_tokens_from_payment(
  p_user_id uuid,
  p_tokens integer,
  p_payment_intent_id text
)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  -- Prevenir doble acreditación
  if exists (select 1 from wallet_transactions 
             where reference_id = p_payment_intent_id 
             and transaction_type = 'purchase') then
    return; -- ya procesado
  end if;

  -- Acreditar tokens
  update profiles 
  set token_balance = coalesce(token_balance, 0) + p_tokens
  where id = p_user_id;

  -- Registrar transacción
  insert into wallet_transactions (
    user_id, 
    transaction_type, 
    amount, 
    description, 
    reference_id
  ) values (
    p_user_id, 
    'purchase', 
    p_tokens, 
    'Recarga con Stripe', 
    p_payment_intent_id
  );
end; $fn$;
```

---

## 🔐 KYC (Know Your Customer)

Para retiros > $100.000 CLP, solicitar:

1. **RUT** (verificar con API Servicio de Impuestos Internos)
2. **Nombre completo**
3. **Banco** (lista pre-aprobada)
4. **Tipo de cuenta** (Corriente / Vista / RUT)
5. **Número de cuenta**

Guardar en `stripe_customers.kyc_documents` como JSONB encriptado.

---

## 💰 TASA DE CONVERSIÓN

**Propuesta inicial:**
- **Recarga:** 100 CLP = 10 tokens (10:1)
- **Retiro:** 10 tokens = 90 CLP (comisión 10%)

Ajustar según:
- Costos Stripe (1.5% + $15 CLP por transacción en Chile)
- Comisión plataforma (ya cobrada en contratos)
- Volumen de transacciones

---

## 📊 LÍMITES SUGERIDOS

### Recarga
- **Mínimo:** $5.000 CLP
- **Máximo por transacción:** $1.000.000 CLP
- **Máximo diario:** $5.000.000 CLP (sin KYC), ilimitado (con KYC)

### Retiro
- **Mínimo:** $10.000 CLP (1.000 tokens)
- **Máximo sin KYC:** $100.000 CLP
- **Máximo con KYC:** $10.000.000 CLP mensual

---

## 🚀 PLAN DE ACTIVACIÓN

### Fase 1: Preparación (AHORA)
- ✅ Crear tablas en migración `0053_stripe_integration.sql`
- ✅ Documentar arquitectura (este archivo)
- ✅ Crear Edge Functions (desactivadas)

### Fase 2: Testing (cuando haya 100+ usuarios activos)
- [ ] Activar Stripe en modo test
- [ ] Probar recarga con tarjeta de prueba
- [ ] Verificar webhook recibe eventos correctamente
- [ ] Probar retiro a cuenta bancaria de prueba

### Fase 3: Lanzamiento (cuando haya 500+ usuarios activos)
- [ ] Activar Stripe en modo producción
- [ ] Configurar webhook en Stripe Dashboard
- [ ] Comunicar tasas de conversión a usuarios (30 días previo)
- [ ] Activar flujo de recarga en frontend
- [ ] Activar flujo de retiro (con KYC)

---

## 🔗 RECURSOS

- **Stripe Chile:** https://stripe.com/cl
- **Stripe Docs:** https://stripe.com/docs/payments/payment-intents
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Stripe Testing:** https://stripe.com/docs/testing

---

## ⚠️ NOTAS IMPORTANTES

1. **NO activar hasta tener volumen:** Stripe cobra por transacción, no tiene sentido con 10 usuarios.
2. **Cumplimiento legal:** consultar con abogado sobre obligaciones tributarias (boletas, IVA).
3. **Stripe Connect:** si quieres que usuarios reciban pagos directos (sin pasar por tokens), necesitas Stripe Connect (más complejo).
4. **Alternativas:** Mercado Pago (más popular en Chile), Flow, Transbank.

---

**Documento creado:** 9 de julio de 2026  
**Estado:** Preparado, pendiente de activación
