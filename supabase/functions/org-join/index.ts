// org-join — a coach/teacher enters their organization's code and their group
// is covered by that org's deal. Volunteers never pay out of pocket.
//
// Coverage is written as an ordinary `subscriptions` row for the group
// (plan='teams', comped, expiring on the org's renewal date), so every
// existing gate — teamsActive, canAddChild, sync, billing UI — works unchanged.
//
// Guards: the caller must be a member of the group they're covering (so you
// can't cover someone else's group), the org must be active and unrevoked, and
// a group with a REAL Stripe subscription is never overwritten.
import { createClient } from 'npm:@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, 'Content-Type': 'application/json' } })

async function callerIsMember(req: Request, familyId: string) {
  const jwt = (req.headers.get('Authorization') || '').replace('Bearer ', '')
  if (!jwt) return false
  const { data: { user } } = await admin.auth.getUser(jwt)
  if (!user) return false
  const { data } = await admin
    .from('family_members').select('user_id')
    .eq('user_id', user.id).eq('family_id', familyId).maybeSingle()
  return !!data
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json().catch(() => ({}))
    const code = String(body.code || '').trim().toUpperCase()
    const groupFamilyId = String(body.group_family_id || '')
    if (!code || !groupFamilyId) return json({ error: 'code and group_family_id required' }, 400)

    const { data: org } = await admin
      .from('organizations').select('id, name, active_until, group_cap, revoked')
      .eq('code', code).maybeSingle()
    if (!org || org.revoked) return json({ error: 'not_found' }, 404)
    if (new Date(org.active_until).getTime() <= Date.now()) {
      return json({ error: 'org_expired', org_name: org.name }, 403)
    }

    // You may only cover a group you actually lead.
    if (!(await callerIsMember(req, groupFamilyId))) return json({ error: 'forbidden' }, 403)

    // Never clobber a group that's paying Stripe directly.
    const { data: existing } = await admin
      .from('subscriptions').select('stripe_subscription_id, org_id')
      .eq('family_id', groupFamilyId).maybeSingle()
    if (existing?.stripe_subscription_id) {
      return json({ error: 'has_own_subscription' }, 409)
    }

    // Optional seat limit: count groups already covered by this org.
    if (org.group_cap) {
      const { count } = await admin
        .from('subscriptions').select('family_id', { count: 'exact', head: true })
        .eq('org_id', org.id)
      if ((count || 0) >= org.group_cap && existing?.org_id !== org.id) {
        return json({ error: 'org_full', org_name: org.name, cap: org.group_cap }, 409)
      }
    }

    const { error } = await admin.from('subscriptions').upsert({
      family_id: groupFamilyId,
      plan: 'teams',
      status: 'active',
      comped: true,
      org_id: org.id,
      note: `Covered by ${org.name}`,
      current_period_end: org.active_until,
      updated_at: new Date().toISOString(),
    })
    if (error) return json({ error: error.message }, 500)

    return json({ ok: true, org_name: org.name, covered_until: org.active_until })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
