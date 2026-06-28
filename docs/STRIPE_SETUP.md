# GoodSeed Plus — Stripe setup (Phase B activation)

The code + backend are done:
- `subscriptions` table (server-authoritative plan; clients can read, only the
  webhook can write).
- Edge functions **deployed and live**: `create-checkout` and `stripe-webhook`.
- Client checkout + plan reconciliation wired (`src/lib/billing.js`); the
  upgrade UI shows "coming soon" until the keys below are set.

To turn on real billing, do these one-time steps in your **Stripe** dashboard,
**Supabase** dashboard, and **Netlify** dashboard. Nothing here should be pasted
into chat — secret keys go straight into the dashboards.

## 1. Stripe — create the product & price
1. <https://dashboard.stripe.com> → **Products → Add product**.
2. Name **GoodSeed Plus**, **Recurring**, **$4.99 / month** (or your price).
3. Save and copy the **Price ID** (looks like `price_...`).

## 2. Stripe — create the webhook
1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL:
   `https://jedqarsyvrpicvlztyrm.supabase.co/functions/v1/stripe-webhook`
3. Events to send: `checkout.session.completed`,
   `customer.subscription.updated`, `customer.subscription.deleted`.
4. Save, then copy the **Signing secret** (`whsec_...`).

## 3. Supabase — set the function secrets
Supabase dashboard → **Project Settings → Edge Functions → Secrets** (or
**Edge Functions → Manage secrets**). Add:
| Name | Value |
|---|---|
| `STRIPE_SECRET_KEY` | your Stripe **secret** key (`sk_live_…` / `sk_test_…`) |
| `STRIPE_PRICE_ID` | the Price ID from step 1 (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | the signing secret from step 2 (`whsec_…`) |

(`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically.)

## 4. Netlify — set the publishable key, then redeploy
Netlify → site **goodseed-family** → **Environment variables**. Add:
| Name | Value |
|---|---|
| `VITE_STRIPE_PUBLISHABLE_KEY` | your Stripe **publishable** key (`pk_…`, client-safe) |

Then trigger a redeploy (or push any commit). This flips the upgrade button from
"coming soon" to a real Stripe Checkout.

## 5. Test
1. Open the live site → Settings → **Upgrade** → **Upgrade to Plus**.
2. Use a Stripe **test card** `4242 4242 4242 4242` (any future expiry/CVC) if in
   test mode.
3. After payment you land back on Settings; within a moment the plan shows
   **Plus / Active** (the webhook wrote the `subscriptions` row), and cloud sync +
   unlimited children + co-parents unlock.

## Notes
- Plan is **server-authoritative**: the webhook sets it via the service role, and
  RLS blocks clients from writing `subscriptions`, so Plus can't be faked.
- Use Stripe **test mode** keys first to verify end-to-end, then swap to live keys.
- The records-table RLS is still permissive (anyone with the public key can write
  family *records*). That's the remaining security hardening (needs per-user auth)
  — separate from billing, which is already locked down.
