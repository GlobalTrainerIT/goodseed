// Stripe webhook → makes a family's plan server-authoritative.
// Verifies the Stripe signature, then upserts the subscriptions table using the
// service role (which bypasses RLS), so clients can never grant themselves Plus.
//
// Required secrets (Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY      — Stripe secret key
//   STRIPE_WEBHOOK_SECRET  — the signing secret for this webhook endpoint (whsec_…)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are provided automatically.
import Stripe from 'npm:stripe@14'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function setPlan(familyId: string, plan: string, status: string, sub: any) {
  await supabase.from('subscriptions').upsert({
    family_id: familyId,
    plan,
    status,
    stripe_customer_id: sub?.customer ?? null,
    stripe_subscription_id: sub?.id ?? null,
    current_period_end: sub?.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null,
    updated_at: new Date().toISOString(),
  })
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      sig ?? '',
      Deno.env.get('STRIPE_WEBHOOK_SECRET') ?? ''
    )
  } catch (e) {
    return new Response(`Webhook Error: ${String(e?.message ?? e)}`, { status: 400 })
  }

  try {
    const obj: any = event.data.object
    if (event.type === 'checkout.session.completed') {
      const familyId = obj.client_reference_id || obj.metadata?.family_id
      if (familyId) {
        const sub = obj.subscription ? await stripe.subscriptions.retrieve(obj.subscription) : null
        await setPlan(familyId, 'plus', 'active', sub)
      }
    } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
      const familyId = obj.metadata?.family_id
      if (familyId) {
        const active = obj.status === 'active' || obj.status === 'trialing'
        await setPlan(familyId, active ? 'plus' : 'free', obj.status, obj)
      }
    }
  } catch (e) {
    return new Response(`Handler Error: ${String(e?.message ?? e)}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
