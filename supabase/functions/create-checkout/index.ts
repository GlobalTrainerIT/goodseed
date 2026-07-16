// Creates a Stripe Checkout Session for a GoodSeed subscription.
// Called from the client via supabase.functions.invoke('create-checkout').
//
// The client asks for a plan by key; the price allowlist below decides what
// can actually be sold — a caller can never check out an arbitrary price.
//
// Required secrets (set in Supabase dashboard → Edge Functions → Secrets):
//   STRIPE_SECRET_KEY  — your Stripe secret key (sk_live_… or sk_test_…)
//   STRIPE_PRICE_ID    — the recurring Price ID for the Plus plan (price_…)
import Stripe from 'npm:stripe@14'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
  apiVersion: '2024-06-20',
})

// Price IDs are public identifiers; the Teams ones are fixed here, Plus stays
// in secrets because it predates this allowlist.
const PRICES: Record<string, string | undefined> = {
  plus: Deno.env.get('STRIPE_PRICE_ID'),
  teams_monthly: 'price_1Ttg1ZC3XE1lnObG71CATYSX', // $12.99/mo
  teams_yearly: 'price_1Ttp2ZC3XE1lnObGwWOxIN0e', // $119/yr (replaced the $99 price)
}

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
    const { family_id, family_name, plan, success_url, cancel_url } = await req.json()
    if (!family_id) return json({ error: 'family_id is required' }, 400)

    const planKey = typeof plan === 'string' && plan in PRICES ? plan : 'plus'
    const price = PRICES[planKey]
    if (!price) return json({ error: `price for plan "${planKey}" not configured` }, 500)

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price, quantity: 1 }],
      client_reference_id: family_id,
      metadata: { family_id, family_name: family_name ?? '', plan: planKey },
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
