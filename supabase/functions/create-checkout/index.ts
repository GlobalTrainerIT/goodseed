// Creates a Stripe Checkout Session for a GoodSeed Plus subscription.
// Called from the client via supabase.functions.invoke('create-checkout').
//
// Required secrets (set in Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY  — your Stripe secret key (sk_live_… or sk_test_…)
//   STRIPE_PRICE_ID    — the recurring Price ID for the Plus plan (price_…)
import Stripe from 'npm:stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

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
    const { family_id, family_name, success_url, cancel_url } = await req.json()
    if (!family_id) return json({ error: 'family_id is required' }, 400)

    const price = Deno.env.get('STRIPE_PRICE_ID')
    if (!price) return json({ error: 'STRIPE_PRICE_ID not configured' }, 500)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: family_id,
      metadata: { family_id, family_name: family_name ?? '' },
      subscription_data: { metadata: { family_id } },
      allow_promotion_codes: true,
      success_url: success_url ?? 'https://goodseed-family.netlify.app/Settings?upgraded=1',
      cancel_url: cancel_url ?? 'https://goodseed-family.netlify.app/Settings',
    })

    return json({ url: session.url })
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500)
  }
})
