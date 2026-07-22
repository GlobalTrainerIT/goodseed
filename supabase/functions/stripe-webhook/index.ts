// Stripe webhook → makes a family's plan AND an organization's coverage
// server-authoritative. Verifies the Stripe signature, then writes with the
// service role (bypassing RLS), so clients can never grant themselves access.
//
// FAMILY / GROUP subscriptions (metadata.family_id) → `subscriptions` table:
//   checkout.session.completed         → plan from price (plus/teams), status=active
//   customer.subscription.updated      → mirror status (plan while active/trialing)
//   customer.subscription.deleted      → plan=free, status=canceled
//   invoice.paid                       → refresh status + renewal date
//   invoice.payment_failed             → status=past_due (app re-gates the plan)
//
// ORGANIZATION subscriptions (metadata.org_id) → `organizations` table:
//   invoice.paid / subscription active  → active_until = paid-through date, so a
//       school's coverage extends itself with each ACH charge (zero-touch).
//   payment_failed / canceled / deleted → status recorded, active_until is NOT
//       extended, so coverage runs out the period they already paid for and then
//       lapses. We never cut a school off mid-period.
//
// MODE AWARENESS: org billing is trialled with a TEST key while Plus/Teams runs
// LIVE. Test events are signed by the test endpoint's secret and their objects
// only exist under the test key, so we verify against either secret and pick the
// matching Stripe client via event.livemode.
//
// Secrets (Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY           — live secret key
//   STRIPE_WEBHOOK_SECRET       — signing secret for the LIVE endpoint (whsec_…)
//   STRIPE_INVOICE_SECRET_KEY   — test secret key (org billing)
//   STRIPE_WEBHOOK_SECRET_TEST  — signing secret for the TEST endpoint (optional)
import Stripe from 'npm:stripe@14'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const liveKey = Deno.env.get('STRIPE_SECRET_KEY') ?? ''
const testKey = Deno.env.get('STRIPE_INVOICE_SECRET_KEY') ?? ''
const stripeLive = new Stripe(liveKey, { apiVersion: '2024-06-20' })
const stripeTest = testKey ? new Stripe(testKey, { apiVersion: '2024-06-20' }) : null
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
  'price_1Ttp2ZC3XE1lnObGwWOxIN0e', // $119/yr (current)
  'price_1Ttg3TC3XE1lnObGx2i9JdBS', // $99/yr — retired, kept so any existing
                                    // annual subscriber still maps to Teams on
                                    // renewal instead of silently dropping.
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

/**
 * Organization subscription → extend coverage. Returns true when the event
 * belongs to an org (so the family path is skipped entirely).
 */
async function applyOrgSubscription(sub: any): Promise<boolean> {
  const orgId = sub?.metadata?.org_id
  if (!orgId) return false

  const { data: org } = await supabase
    .from('organizations').select('billing, active_until').eq('id', orgId).maybeSingle()
  if (!org) return true // it IS an org event; nothing to write

  const active = isActiveStatus(sub?.status)
  const paidThrough = periodEnd(sub)
  const patch: Record<string, unknown> = {
    billing: {
      ...(org.billing || {}),
      subscription_id: sub?.id ?? null,
      subscription_status: sub?.status ?? 'unknown',
      subscription_seats: Number(sub?.metadata?.seats) || null,
      subscription_period: sub?.metadata?.period ?? null,
      paid_through: paidThrough,
      updated_at: new Date().toISOString(),
    },
  }
  const cust = typeof sub?.customer === 'string' ? sub.customer : sub?.customer?.id
  if (cust) patch.stripe_customer_id = cust

  // Only ever EXTEND coverage — never shorten it. A failed payment or a
  // cancellation leaves the school with the period they already paid for.
  if (active && paidThrough && (!org.active_until || new Date(paidThrough) > new Date(org.active_until))) {
    patch.active_until = paidThrough
  }
  await supabase.from('organizations').update(patch).eq('id', orgId)
  return true
}

/**
 * A STANDALONE org invoice was paid (the PO / net-30 path — no subscription
 * attached). Extend coverage by the billed period. Without this, a school that
 * pays by invoice would never have its access extended.
 */
async function extendOrgFromInvoice(orgId: string, invoice: any) {
  const { data: org } = await supabase
    .from('organizations').select('billing, active_until').eq('id', orgId).maybeSingle()
  if (!org) return

  const period = invoice?.metadata?.period === 'monthly' ? 'monthly' : 'annual'
  // Stack onto remaining coverage rather than truncating it.
  const now = new Date()
  const base = org.active_until && new Date(org.active_until) > now ? new Date(org.active_until) : now
  const end = new Date(base)
  if (period === 'monthly') end.setMonth(end.getMonth() + 1)
  else end.setFullYear(end.getFullYear() + 1)

  await supabase.from('organizations').update({
    active_until: end.toISOString(),
    billing: {
      ...(org.billing || {}),
      last_invoice_id: invoice?.id ?? null,
      last_status: 'paid',
      last_invoice_paid_at: now.toISOString(),
      paid_through: end.toISOString(),
      updated_at: now.toISOString(),
    },
  }).eq('id', orgId)
}

async function applySubscription(sub: any, fallbackFamilyId?: string) {
  // Organizations first — their subscriptions carry org_id, not family_id.
  if (await applyOrgSubscription(sub)) return
  const familyId = sub?.metadata?.family_id || fallbackFamilyId
  if (!familyId) return
  const active = isActiveStatus(sub?.status)
  await setPlan(familyId, active ? planFor(sub) : 'free', sub?.status ?? 'unknown', sub)
}

Deno.serve(async (req) => {
  const sig = req.headers.get('stripe-signature')
  const body = await req.text()

  // Verify against the live secret, then the test secret. Signature checking is
  // pure HMAC, so the client instance used here doesn't matter.
  let event: Stripe.Event | null = null
  for (const secret of [Deno.env.get('STRIPE_WEBHOOK_SECRET'), Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST')]) {
    if (!secret) continue
    try {
      event = await stripeLive.webhooks.constructEventAsync(body, sig ?? '', secret)
      break
    } catch { /* try the next secret */ }
  }
  if (!event) {
    // The 400 body reports which secrets are CONFIGURED (never their values), so
    // a rejected delivery distinguishes "secret missing" from "secret wrong"
    // without needing log access. Stripe ignores the body; only we read it.
    return new Response(JSON.stringify({
      error: 'signature verification failed',
      live_secret_set: !!Deno.env.get('STRIPE_WEBHOOK_SECRET'),
      test_secret_set: !!Deno.env.get('STRIPE_WEBHOOK_SECRET_TEST'),
      signature_header_present: !!sig,
    }), { status: 400, headers: { 'Content-Type': 'application/json' } })
  }

  // Objects from a test event only exist under the test key, and vice versa.
  const api = event.livemode ? stripeLive : (stripeTest ?? stripeLive)

  try {
    const obj: any = event.data.object
    switch (event.type) {
      case 'checkout.session.completed': {
        const familyId = obj.client_reference_id || obj.metadata?.family_id
        if (obj.subscription) {
          const sub = await api.subscriptions.retrieve(obj.subscription)
          // An org checkout carries org_id in metadata; applySubscription routes it.
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

        // A standalone ORG invoice (PO / net-30) has no subscription — extend
        // that org's coverage directly. ACH settles days after the invoice is
        // "paid" from the payer's view, so this is when access should start.
        if (!subId && event.type === 'invoice.paid' && obj.metadata?.org_id) {
          await extendOrgFromInvoice(obj.metadata.org_id, obj)
          break
        }

        if (subId) {
          const sub = await api.subscriptions.retrieve(
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
