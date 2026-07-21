// org-invoice — creates a Stripe invoice (ACH-enabled) for an Organization deal.
//
// Owner-only: gated by the same owner admin key as admin-api (x-admin-key →
// sha256 → admin_config.key_hash). Pricing is server-authoritative ($2/child/mo
// or $20/child/yr) so a caller can't set their own amount.
//
// Deliberately reads a DEDICATED secret, STRIPE_INVOICE_SECRET_KEY, NOT the
// live checkout key — set it to a Stripe TEST key (sk_test_…) to trial org
// billing without any risk to live Plus/Teams checkout, then swap to sk_live_…
// when you go live. ACH must be enabled in the Stripe dashboard for the hosted
// invoice to offer bank payments.
//
// action "create_invoice" { org_id, contact_email, children, period } →
//   { hosted_invoice_url, status, invoice_id, amount }
import Stripe from 'npm:stripe@14'
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
)

// Canonical per-child rates in cents. Server-authoritative — never trust a
// client-supplied amount.
const RATE_CENTS = { monthly: 200, annual: 2000 } as const

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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    // ---- owner auth (same gate as admin-api) ----
    const key = req.headers.get('x-admin-key') || ''
    const { data: cfg } = await supabase.from('admin_config').select('key_hash').eq('id', 1).single()
    if (!cfg?.key_hash || !key || (await sha256(key)) !== cfg.key_hash) {
      return json({ error: 'unauthorized' }, 401)
    }

    const secret = Deno.env.get('STRIPE_INVOICE_SECRET_KEY')
    if (!secret) {
      return json({ error: 'STRIPE_INVOICE_SECRET_KEY is not set. Add it (a Stripe test key to start) in Supabase → Edge Functions → Secrets.' }, 500)
    }
    const stripe = new Stripe(secret, { apiVersion: '2024-06-20' })

    const body = await req.json().catch(() => ({}))
    if (body.action !== 'create_invoice') return json({ error: 'unknown action' }, 400)

    const orgId = String(body.org_id || '')
    const email = String(body.contact_email || '').trim()
    const children = Math.max(1, Math.min(100000, Math.floor(Number(body.children) || 0)))
    const period = body.period === 'annual' ? 'annual' : 'monthly'
    if (!orgId) return json({ error: 'org_id required' }, 400)
    if (!email || !email.includes('@')) return json({ error: 'a valid contact_email is required' }, 400)
    if (!children) return json({ error: 'children must be at least 1' }, 400)

    const { data: org } = await supabase.from('organizations').select('*').eq('id', orgId).maybeSingle()
    if (!org) return json({ error: 'org not found' }, 404)

    const unit = RATE_CENTS[period]
    const amount = unit * children
    const periodLabel = period === 'annual' ? 'year' : 'month'

    // Reuse or create the org's Stripe customer.
    let customerId: string = org.stripe_customer_id || ''
    if (customerId) {
      // If the email changed, keep Stripe in sync.
      try { await stripe.customers.update(customerId, { email }) } catch { customerId = '' }
    }
    if (!customerId) {
      const customer = await stripe.customers.create({ name: org.name, email, metadata: { org_id: orgId, org_code: org.code } })
      customerId = customer.id
    }

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
      payment_settings: { payment_method_types: ['us_bank_account', 'card'] }, // ACH + card fallback
      metadata: { org_id: orgId, children: String(children), period },
    })

    // One line item: N children × the per-child rate, explicitly on THIS invoice.
    await stripe.invoiceItems.create({
      customer: customerId,
      invoice: invoice.id,
      currency: 'usd',
      unit_amount: unit,
      quantity: children,
      description: `GoodSeed Organization — ${children} × $${(unit / 100).toFixed(2)}/child/${periodLabel} (${org.name})`,
    })

    const finalized = await stripe.invoices.finalizeInvoice(invoice.id)
    // Email it to the org (send_invoice collection method → Stripe sends a
    // hosted, payable invoice). Non-fatal if sending is disabled in test mode.
    try { await stripe.invoices.sendInvoice(finalized.id) } catch { /* ignore */ }

    // Report what Stripe ACTUALLY billed, not just what we computed — a
    // mismatch (e.g. an unattached line item) must never pass silently.
    const amountDue = finalized.amount_due ?? 0
    const billing = {
      last_invoice_id: finalized.id,
      last_invoice_url: finalized.hosted_invoice_url,
      last_status: finalized.status,
      children,
      period,
      amount,
      amount_due: amountDue,
      at: new Date().toISOString(),
    }
    await supabase.from('organizations').update({ stripe_customer_id: customerId, contact_email: email, billing }).eq('id', orgId)

    return json({
      hosted_invoice_url: finalized.hosted_invoice_url,
      status: finalized.status,
      invoice_id: finalized.id,
      amount,
      amount_due: amountDue,
      mismatch: amountDue !== amount, // surfaced in the console if Stripe disagrees
    })
  } catch (e) {
    return json({ error: String((e as { message?: string })?.message ?? e) }, 500)
  }
})
