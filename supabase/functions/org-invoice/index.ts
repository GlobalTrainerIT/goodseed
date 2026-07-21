// org-invoice — Organization billing for GoodSeed (owner-only).
//
// Gated by the same owner admin key as admin-api (x-admin-key → sha256 →
// admin_config.key_hash). Pricing is server-authoritative ($2/child/mo,
// $20/child/yr) so a caller can never set their own amount.
//
// Reads a DEDICATED secret, STRIPE_INVOICE_SECRET_KEY — NOT the live checkout
// key — so org billing can be trialled with sk_test_… without any risk to live
// Plus/Teams checkout. Swap to sk_live_… to go live.
//
// Actions:
//   set_seats                { org_id, student_seats }        → contracted seats
//   setup_prices             {}                               → creates the two
//       recurring per-child prices once and stores their ids in admin_config
//   create_invoice           { org_id, contact_email, children, period }
//       → one-off invoice payable by ACH/card (for PO / net-30 schools)
//   create_subscription_link { org_id, contact_email, period }
//       → Stripe Checkout link (subscription + ACH mandate) to email the org;
//         once they authorize, Stripe auto-debits every period.
import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Canonical per-child rates in cents. Server-authoritative.
const RATE_CENTS = { monthly: 200, annual: 2000 } as const
const APP = 'https://goodseed-family.netlify.app'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Reuse the org's Stripe customer, or create one.
async function ensureCustomer(stripe: Stripe, org: Record<string, unknown>, email: string) {
  let customerId = String(org.stripe_customer_id || '')
  if (customerId) {
    try { await stripe.customers.update(customerId, { email }) } catch { customerId = '' }
  }
  if (!customerId) {
    const c = await stripe.customers.create({
      name: String(org.name || 'Organization'),
      email,
      metadata: { org_id: String(org.id), org_code: String(org.code || '') },
    })
    customerId = c.id
  }
  return customerId
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    // ---- owner auth (same gate as admin-api) ----
    const key = req.headers.get('x-admin-key') || ''
    const { data: cfg } = await supabase.from('admin_config').select('*').eq('id', 1).single()
    if (!cfg?.key_hash || !key || (await sha256(key)) !== cfg.key_hash) {
      return json({ error: 'unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '')

    // ---- seats: no Stripe needed ----
    if (action === 'set_seats') {
      const orgId = String(body.org_id || '')
      if (!orgId) return json({ error: 'org_id required' }, 400)
      const seats = Math.max(0, Math.min(100000, Math.floor(Number(body.student_seats) || 0)))
      const { error } = await supabase.from('organizations').update({ student_seats: seats }).eq('id', orgId)
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, student_seats: seats })
    }

    // ---- everything below needs Stripe ----
    const secret = Deno.env.get('STRIPE_INVOICE_SECRET_KEY')
    if (!secret) {
      return json({ error: 'STRIPE_INVOICE_SECRET_KEY is not set. Add it (a Stripe test key to start) in Supabase → Edge Functions → Secrets.' }, 500)
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' })

    // ---- one-time: create the two recurring per-child prices ----
    if (action === 'setup_prices') {
      if (cfg.org_price_monthly && cfg.org_price_annual && !body.force) {
        return json({ monthly: cfg.org_price_monthly, annual: cfg.org_price_annual, reused: true })
      }
      const product = await stripe.products.create({
        name: 'GoodSeed Organization (per child)',
        description: 'Per-child seat for a GoodSeed organization. All leaders included.',
        metadata: { goodseed: 'org_seat' },
      })
      const monthly = await stripe.prices.create({
        product: product.id, currency: 'usd', unit_amount: RATE_CENTS.monthly,
        recurring: { interval: 'month' }, nickname: 'Org — $2 per child / month',
      })
      const annual = await stripe.prices.create({
        product: product.id, currency: 'usd', unit_amount: RATE_CENTS.annual,
        recurring: { interval: 'year' }, nickname: 'Org — $20 per child / year',
      })
      await supabase.from('admin_config')
        .update({ org_price_monthly: monthly.id, org_price_annual: annual.id }).eq('id', 1)
      return json({ monthly: monthly.id, annual: annual.id, product: product.id, reused: false })
    }

    // Shared org lookup for the remaining actions.
    const orgId = String(body.org_id || '')
    const email = String(body.contact_email || '').trim()
    if (!orgId) return json({ error: 'org_id required' }, 400)
    if (!email || !email.includes('@')) return json({ error: 'a valid contact_email is required' }, 400)
    const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle()
    if (!org) return json({ error: 'org not found' }, 404)
    const period = body.period === 'monthly' ? 'monthly' : 'annual'
    const periodLabel = period === 'annual' ? 'year' : 'month'

    // ---- recurring subscription paid by ACH (the automatic path) ----
    if (action === 'create_subscription_link') {
      const priceId = period === 'annual' ? cfg.org_price_annual : cfg.org_price_monthly
      if (!priceId) return json({ error: 'Run "Set up billing prices" first.' }, 400)
      const seats = Math.max(1, Math.floor(Number(body.student_seats ?? org.student_seats) || 0))
      if (!seats) return json({ error: 'Set the org\'s student seats first.' }, 400)

      const customerId = await ensureCustomer(stripe, org, email)
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer: customerId,
        line_items: [{ price: priceId, quantity: seats }],
        payment_method_types: ['us_bank_account', 'card'],
        success_url: `${APP}/OrgAdmin?subscribed=1`,
        cancel_url: `${APP}/OrgAdmin`,
        subscription_data: { metadata: { org_id: orgId, seats: String(seats), period } },
        metadata: { org_id: orgId, seats: String(seats), period },
      })

      const billing = {
        ...(org.billing || {}),
        subscription_checkout_url: session.url,
        subscription_seats: seats,
        subscription_period: period,
        subscription_status: 'awaiting_authorization',
        at: new Date().toISOString(),
      }
      await supabase.from('organizations')
        .update({ stripe_customer_id: customerId, contact_email: email, billing }).eq('id', orgId)

      return json({ url: session.url, seats, period, amount: (period === 'annual' ? RATE_CENTS.annual : RATE_CENTS.monthly) * seats })
    }

    // ---- one-off invoice (PO / net-30 schools) ----
    if (action === 'create_invoice') {
      const children = Math.max(1, Math.min(100000, Math.floor(Number(body.children) || 0)))
      if (!children) return json({ error: 'children must be at least 1' }, 400)
      const unit = RATE_CENTS[period]
      const amount = unit * children
      const customerId = await ensureCustomer(stripe, org, email)

      // Create the DRAFT invoice first, then attach the line item to it by id.
      // Modern Stripe API versions do NOT sweep pending invoice items into a new
      // invoice (pending_invoice_items_behavior defaults to 'exclude'), so the
      // old create-item-then-invoice order silently produced $0.00 invoices.
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        days_until_due: 30,
        auto_advance: false,
        description: `GoodSeed for ${org.name} — ${children} children, billed per ${periodLabel}.`,
        payment_settings: { payment_method_types: ['us_bank_account', 'card'] },
        metadata: { org_id: orgId, children: String(children), period },
      })
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: invoice.id,
        currency: 'usd',
        unit_amount: unit,
        quantity: children,
        description: `GoodSeed Organization — ${children} × $${(unit / 100).toFixed(2)}/child/${periodLabel} (${org.name})`,
      })

      const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
      try { await stripe.invoices.sendInvoice(finalized.id) } catch { /* ignore */ }

      // Report what Stripe ACTUALLY billed, not just what we computed — a
      // mismatch (e.g. an unattached line item) must never pass silently.
      const amountDue = finalized.amount_due ?? 0
      const billing = {
        ...(org.billing || {}),
        last_invoice_id: finalized.id,
        last_invoice_url: finalized.hosted_invoice_url,
        last_status: finalized.status,
        children,
        period,
        amount,
        amount_due: amountDue,
        at: new Date().toISOString(),
      }
      await supabase.from('organizations')
        .update({ stripe_customer_id: customerId, contact_email: email, billing }).eq('id', orgId)

      return json({
        hosted_invoice_url: finalized.hosted_invoice_url,
        status: finalized.status,
        invoice_id: finalized.id,
        amount,
        amount_due: amountDue,
        mismatch: amountDue !== amount,
      })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String((e as { message?: string })?.message ?? e) }, 500)
  }
})
