/**
 * Billing entry point. In Phase B this calls a Supabase Edge Function that
 * creates a Stripe Checkout Session and redirects. Until the Stripe keys are
 * configured it degrades to a friendly "coming soon" message, so the upgrade
 * UI is fully usable now and the real checkout is a drop-in.
 */
import { supabase, supabaseEnabled } from './supabase'
import { toast } from './toast'

const STRIPE_READY = Boolean(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY)

export function billingConfigured() {
  return STRIPE_READY && supabaseEnabled
}

/**
 * Start the Plus checkout for a family. Returns true if a redirect was started.
 */
export async function startCheckout(family) {
  if (!family) return false
  if (!billingConfigured()) {
    toast({
      title: 'Plus is almost here 🌱',
      message: 'Card checkout is being set up. Hang tight!',
      emoji: '⏳',
      type: 'info',
    })
    return false
  }
  try {
    const { data, error } = await supabase.functions.invoke('create-checkout', {
      body: {
        family_id: family.id,
        family_name: family.name,
        success_url: `${window.location.origin}/Settings?upgraded=1`,
        cancel_url: `${window.location.origin}/Settings`,
      },
    })
    if (error || !data?.url) throw error || new Error('No checkout URL')
    window.location.href = data.url
    return true
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[billing] checkout failed', e)
    toast({ title: 'Could not start checkout', message: 'Please try again.', type: 'error' })
    return false
  }
}

/**
 * Read a family's plan from the server (subscriptions table), so it can't be
 * faked locally. Returns 'free' | 'plus' (defaults to family.plan / 'free' if
 * the backend or table isn't reachable). Used on load to reconcile plan state.
 */
export async function fetchServerPlan(familyId) {
  // Only meaningful once billing is live (the subscriptions table exists in
  // Phase B). Skipping avoids a failed request on every load before then.
  if (!billingConfigured() || !familyId) return null
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan,status')
      .eq('family_id', familyId)
      .limit(1)
    if (error || !data || !data.length) return null
    const row = data[0]
    return row.status === 'active' && row.plan === 'plus' ? 'plus' : 'free'
  } catch {
    return null
  }
}
