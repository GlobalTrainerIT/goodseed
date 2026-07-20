// leader-coverage — "coverage follows the leader, not the team."
//
// A coach can run several teams/classes (all share one owner_key). This spreads
// whatever real coverage the leader has — a paid Stripe subscription OR an org
// deal — across ALL of their teams, so one $119 (or one org code) covers
// everything the person runs. If the leader has no coverage, propagated rows
// are cancelled; each team then falls back to its own time-based trial.
//
// action "sync" { group_family_id } — caller must be a member of that group.
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

function activeUnexpired(s: any) {
  const okStatus = s.status === 'active' || s.status === 'trialing'
  const notExpired = !s.current_period_end || new Date(s.current_period_end).getTime() > Date.now()
  return okStatus && notExpired
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json().catch(() => ({}))
    if (body.action !== 'sync') return json({ error: 'unknown action' }, 400)
    const groupFamilyId = String(body.group_family_id || '')
    if (!groupFamilyId) return json({ error: 'group_family_id required' }, 400)

    if (!(await callerIsMember(req, groupFamilyId))) return json({ error: 'forbidden' }, 403)

    // Find this group's owner_key, then every team that shares it.
    const { data: self } = await admin
      .from('records').select('data').eq('collection', 'families').eq('family_id', groupFamilyId).maybeSingle()
    const ownerKey = (self?.data as Record<string, unknown>)?.owner_key
    if (!ownerKey) return json({ ok: true, covered: 0, source: 'none' }) // pre-owner_key group

    const { data: fams } = await admin
      .from('records').select('family_id').eq('collection', 'families').eq('data->>owner_key', ownerKey)
    const teamIds: string[] = (fams || []).map((f) => f.family_id)
    if (!teamIds.length) return json({ ok: true, covered: 0, source: 'none' })

    const { data: subs } = await admin
      .from('subscriptions').select('*').in('family_id', teamIds)
    const subByFam: Record<string, any> = {}
    for (const s of subs || []) subByFam[s.family_id] = s

    // ORIGIN = the leader's real, non-propagated coverage. Prefer a paid Stripe
    // subscription, else an org deal, else an owner comp.
    const origins = (subs || []).filter((s) => !s.propagated && activeUnexpired(s))
    const origin =
      origins.find((s) => s.stripe_subscription_id) ||
      origins.find((s) => s.org_id) ||
      origins[0] ||
      null

    if (!origin) {
      // No coverage anywhere: cancel any rows we previously propagated. Teams
      // then rely on their own trial (a time-based, row-less state).
      const toDrop = (subs || []).filter((s) => s.propagated && s.status !== 'canceled')
      for (const s of toDrop) {
        await admin.from('subscriptions').update({ status: 'canceled', updated_at: new Date().toISOString() })
          .eq('family_id', s.family_id)
      }
      return json({ ok: true, covered: 0, source: 'none', cleared: toDrop.length })
    }

    const source = origin.stripe_subscription_id ? 'stripe' : origin.org_id ? 'org' : 'comp'
    const note = source === 'org' ? (origin.note || 'Covered by your organization') : "Covered by your team's subscription"

    // Write/refresh a propagated row for every team that lacks its OWN
    // (non-propagated) active coverage.
    let covered = 0
    for (const famId of teamIds) {
      const existing = subByFam[famId]
      if (existing && !existing.propagated && activeUnexpired(existing)) continue // has its own — leave it
      if (famId === origin.family_id) continue
      await admin.from('subscriptions').upsert({
        family_id: famId,
        plan: 'teams',
        status: 'active',
        comped: true,
        propagated: true,
        org_id: origin.org_id ?? null,
        note,
        current_period_end: origin.current_period_end,
        updated_at: new Date().toISOString(),
      })
      covered += 1
    }

    return json({ ok: true, covered, source })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
