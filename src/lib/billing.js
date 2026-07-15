/**
 * Billing entry point. In Phase B this calls a Supabase Edge Function that
 * creates a Stripe Checkout Session and redirects. Until the Stripe keys are
 * configured it degrades to a friendly "coming soon" message, so the upgrade
 * UI is fully usable now and the real checkout is a drop-in.
 */
import { supabase, supabaseEnabled } from './supabase'
import { ensureSession } from './sync'
import { toast } from './toast'

// Checkout runs entirely through the `create-checkout` Edge Function, which holds
// the real Stripe keys server-side. So billing readiness depends only on whether
// the backend is reachable — NOT on any client-side Stripe publishable key (the
// redirect-based Checkout flow doesn't use one). If the function isn't set up,
// the call simply errors and we show a friendly message.
export function billingConfigured() {
  return supabaseEnabled
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
 * Open the Stripe Customer Portal for a Plus family — cancel, update card,
 * view invoices. The edge function verifies the caller is a family member.
 */
export async function openBillingPortal(family) {
  if (!family || !billingConfigured()) return false
  try {
    // Make sure this device's identity is attached before the membership check
    // server-side (avoids a race right after page load).
    await ensureSession()
    const { data, error } = await supabase.functions.invoke('create-portal', {
      body: {
        family_id: family.id,
        return_url: `${window.location.origin}/Settings`,
      },
    })
    if (error) {
      // Surface the function's actual error instead of a generic message.
      let detail = ''
      try {
        detail = (await error.context?.json())?.error || ''
      } catch {
        /* body not JSON */
      }
      if (detail === 'no_subscription') {
        toast({
          title: 'No billing on file',
          message: 'This family has Plus without a paid subscription — nothing to manage.',
          emoji: '🌱',
          type: 'info',
        })
      } else if (detail === 'not_a_member') {
        toast({ title: 'Still connecting…', message: 'Give it a second and try again.', type: 'info' })
      } else {
        toast({ title: 'Could not open billing', message: detail || 'Please try again in a moment.', type: 'error' })
      }
      return false
    }
    if (!data?.url) throw new Error('No portal URL')
    window.location.href = data.url
    return true
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('[billing] portal failed', e)
    toast({ title: 'Could not open billing', message: 'Please try again in a moment.', type: 'error' })
    return false
  }
}

/**
 * Full subscription details for a family (plan, status, renewal date).
 * Returns null when unavailable.
 */
export async function fetchSubscription(familyId) {
  if (!billingConfigured() || !familyId) return null
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('plan,status,current_period_end')
      .eq('family_id', familyId)
      .limit(1)
    if (error || !data || !data.length) return null
    return data[0]
  } catch {
    return null
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
      .select('plan,status,current_period_end,comped')
      .eq('family_id', familyId)
      .limit(1)
    if (error || !data || !data.length) return null
    const row = data[0]
    let active = row.status === 'active' || row.status === 'trialing'
    // Comped (owner-granted) subs have no Stripe webhook to expire them —
    // honor their end date directly. Stripe rows keep webhook-driven status.
    if (active && row.comped && row.current_period_end) {
      active = new Date(row.current_period_end).getTime() > Date.now()
    }
    if (!active) return 'free'
    return row.plan === 'plus' || row.plan === 'teams' ? row.plan : 'free'
  } catch {
    return null
  }
}
