// Stripe webhook → makes a family's plan server-authoritative.
// Verifies the Stripe signature, then upserts the subscriptions table using the
// service role (which bypasses RLS), so clients can never grant themselves Plus.
//
// Handles the full lifecycle:
//   checkout.session.completed         → plan from price (plus/teams), status=active
//   customer.subscription.updated      → mirror status (plan while active/trialing)
//   customer.subscription.deleted      → plan=free, status=canceled
//   invoice.paid                       → refresh status + renewal date
//   invoice.payment_failed             → status=past_due (app re-gates the plan)
//
// Note: on newer Stripe API versions `current_period_end` lives on the
// subscription ITEM, not the subscription — we read both.
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

function periodEnd(sub: any): string | null {
  const ts = sub?.items?.data?.[0]?.current_period_end ?? sub?.current_period_end
  return ts ? new Date(ts * 1000).toISOString() : null
}

function isActiveStatus(status: string | undefined): boolean {
  return status === 'active' || status === 'trialing'
}

// Teams price IDs (kept in sync with create-checkout's allowlist) — any other
// recurring price is the Plus plan.
const TEAMS_PRICES = new Set([
  'price_1Ttg1ZC3XE1lnObG71CATYSX', // $12.99/mo
  'price_1Ttg3TC3XE1lnObGx2i9JdBS', // $99/yr
])

function planFor(sub: any): string {
  const priceId = sub?.items?.data?.[0]?.price?.id
  return priceId && TEAMS_PRICES.has(priceId) ? 'teams' : 'plus'
}

async function setPlan(familyId: string, plan: string, status: string, sub: any) {
  await supabase.from('subscriptions').upsert({
    family_id: familyId,
    plan,
    status,
    stripe_customer_id: (typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id) ?? null,
    stripe_subscription_id: sub?.id ?? null,
    current_period_end: periodEnd(sub),
    // A real Stripe subscription always replaces an owner-granted comp — and
    // must never be mistaken for one (comped rows are admin-deletable).
    comped: false,
    note: null,
    updated_at: new Date().toISOString(),
  })
}

async function applySubscription(sub: any, fallbackFamilyId?: string) {
  const familyId = sub?.metadata?.family_id || fallbackFamilyId
  if (!familyId) return
  const active = isActiveStatus(sub?.status)
  await setPlan(familyId, active ? planFor(sub) : 'free', sub?.status ?? 'unknown', sub)
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
    switch (event.type) {
      case 'checkout.session.completed': {
        const familyId = obj.client_reference_id || obj.metadata?.family_id
        if (familyId && obj.subscription) {
          const sub = await stripe.subscriptions.retrieve(obj.subscription)
          await applySubscription(sub, familyId)
        } else if (familyId) {
          await setPlan(familyId, obj.metadata?.plan?.startsWith('teams') ? 'teams' : 'plus', 'active', null)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        await applySubscription(obj)
        break
      }
      case 'invoice.paid':
      case 'invoice.payment_failed': {
        // invoice → its subscription (location varies across API versions)
        const subId =
          obj.subscription ||
          obj.parent?.subscription_details?.subscription ||
          obj.lines?.data?.[0]?.subscription
        if (subId) {
          const sub = await stripe.subscriptions.retrieve(
            typeof subId === 'string' ? subId : subId.id
          )
          await applySubscription(sub)
        }
        break
      }
    }
  } catch (e) {
    return new Response(`Handler Error: ${String(e?.message ?? e)}`, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
