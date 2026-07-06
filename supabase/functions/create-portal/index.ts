// Creates a Stripe Customer Portal session so a Plus family can manage its
// subscription (cancel, update card, view invoices).
//
// Security: the caller must be an authenticated member of the family — we check
// family_members using the caller's own JWT (RLS lets a user see only their own
// memberships). The Stripe customer id is then looked up server-side.
//
// Required secrets: STRIPE_SECRET_KEY (SUPABASE_* are provided automatically).
import Stripe from 'npm:stripe@14'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', { apiVersion: '2024-06-20' })
const service = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

  try {
    const { family_id, return_url } = await req.json()
    if (!family_id) return json({ error: 'family_id is required' }, 400)

    // Membership check with the caller's own token (RLS-scoped).
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } }
    )
    const { data: membership } = await userClient
      .from('family_members')
      .select('family_id')
      .eq('family_id', family_id)
      .limit(1)
    if (!membership || !membership.length) return json({ error: 'not_a_member' }, 403)

    const { data: subs } = await service
      .from('subscriptions')
      .select('stripe_customer_id')
      .eq('family_id', family_id)
      .limit(1)
    const customer = subs?.[0]?.stripe_customer_id
    if (!customer) return json({ error: 'no_subscription' }, 404)

    const session = await stripe.billingPortal.sessions.create({
      customer,
      return_url: return_url ?? 'https://goodseed-family.netlify.app/Settings',
    })
    return json({ url: session.url })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})
