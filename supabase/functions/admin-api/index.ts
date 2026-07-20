// GoodSeed admin API — owner-only visibility & plan management.
//
// Auth: callers must present the owner's admin key (x-admin-key header),
// verified against a SHA-256 hash in admin_config. Runs with the service
// role, so it sees all families/groups regardless of RLS.
//
// Actions:
//   overview            → stats + per-family/group table (kids, devices, plan)
//   grant               → comp a family/group a free period (plan + days)
//   revoke              → remove a comped subscription (never touches Stripe rows)
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const PRICES: Record<string, number> = { plus: 4.99, teams: 12.99 }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

async function sha256(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const key = req.headers.get('x-admin-key') || ''
    const { data: cfg } = await supabase.from('admin_config').select('key_hash').eq('id', 1).single()
    if (!cfg?.key_hash || !key || (await sha256(key)) !== cfg.key_hash) {
      return json({ error: 'unauthorized' }, 401)
    }

    const body = await req.json().catch(() => ({}))
    const action = body.action as string

    if (action === 'overview') {
      const [famRes, userRes, subRes, memberRes, waitRes] = await Promise.all([
        supabase.from('records').select('family_id, data, updated_at').eq('collection', 'families'),
        supabase.from('records').select('family_id, data').eq('collection', 'users'),
        supabase.from('subscriptions').select('family_id, plan, status, current_period_end, comped, note, stripe_subscription_id, org_id'),
        supabase.from('family_members').select('family_id'),
        supabase.from('waitlist').select('created_at, role').order('created_at', { ascending: false }),
      ])

      const users = userRes.data || []
      const subs = subRes.data || []
      const members = memberRes.data || []
      const kidCount: Record<string, number> = {}
      const leaderCount: Record<string, number> = {}
      for (const u of users) {
        const role = (u.data as Record<string, unknown>)?.role
        if (role === 'child') kidCount[u.family_id] = (kidCount[u.family_id] || 0) + 1
        else if (role === 'parent') leaderCount[u.family_id] = (leaderCount[u.family_id] || 0) + 1
      }
      const deviceCount: Record<string, number> = {}
      for (const m of members) deviceCount[m.family_id] = (deviceCount[m.family_id] || 0) + 1
      const subByFamily: Record<string, (typeof subs)[number]> = {}
      for (const s of subs) subByFamily[s.family_id] = s

      const families = (famRes.data || []).map((f) => {
        const d = (f.data || {}) as Record<string, unknown>
        return {
          family_id: f.family_id,
          name: d.name || '(unnamed)',
          kind: d.kind === 'group' ? 'group' : 'family',
          group_type: d.group_type || null,
          plan: d.plan || 'free',
          created_at: d.created_date || d.created_at || null,
          kids: kidCount[f.family_id] || 0,
          leaders: leaderCount[f.family_id] || 0,
          devices: deviceCount[f.family_id] || 0,
          last_active: f.updated_at,
          sub: subByFamily[f.family_id] || null,
        }
      }).sort((a, b) => (b.last_active || '').localeCompare(a.last_active || ''))

      const now = Date.now()
      const activeSubs = subs.filter(
        (s) =>
          (s.status === 'active' || s.status === 'trialing') &&
          (!s.current_period_end || new Date(s.current_period_end).getTime() > now)
      )
      const mrr = activeSubs
        .filter((s) => !s.comped)
        .reduce((sum, s) => sum + (PRICES[s.plan] || 0), 0)

      // Organizations (churches/schools/YMCAs) + how many groups each covers.
      const { data: orgs } = await supabase
        .from('organizations').select('*').order('created_at', { ascending: false })
      const coveredCounts: Record<string, number> = {}
      for (const s of subs) if (s.org_id) coveredCounts[s.org_id] = (coveredCounts[s.org_id] || 0) + 1
      const organizations = (orgs || []).map((o) => ({
        ...o,
        groups_covered: coveredCounts[o.id] || 0,
        expired: new Date(o.active_until).getTime() <= Date.now(),
      }))

      return json({
        stats: {
          families: families.filter((f) => f.kind === 'family').length,
          groups: families.filter((f) => f.kind === 'group').length,
          kids: users.filter((u) => (u.data as Record<string, unknown>)?.role === 'child').length,
          devices: members.length,
          active_subs: activeSubs.length,
          comped_subs: activeSubs.filter((s) => s.comped).length,
          est_mrr: Math.round(mrr * 100) / 100,
          waitlist: (waitRes.data || []).length,
          orgs: organizations.filter((o) => !o.revoked && !o.expired).length,
        },
        families,
        organizations,
        waitlist: waitRes.data || [],
      })
    }

    // ---- create an organization (invoiced deal → code its leaders enter)
    if (action === 'create_org') {
      const name = String(body.name || '').trim()
      const days = Math.min(1095, Math.max(1, Number(body.days) || 365))
      if (!name) return json({ error: 'name required' }, 400)
      // Unambiguous characters only — the join code gets read off a phone/slide.
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      const rand = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
      const code = `ORG-${rand(5)}`          // leaders enter this to self-cover
      const adminKey = `OADM-${rand(8)}`      // ONLY the administrator gets this
      const { error } = await supabase.from('organizations').insert({
        name,
        code,
        admin_key: adminKey,
        active_until: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
        group_cap: body.group_cap ? Number(body.group_cap) : null,
        note: String(body.note || ''),
      })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, code, admin_key: adminKey })
    }

    // ---- end an org's coverage: revoke it AND drop the groups it covered
    if (action === 'revoke_org') {
      const org_id = String(body.org_id || '')
      if (!org_id) return json({ error: 'org_id required' }, 400)
      await supabase.from('organizations').update({ revoked: true }).eq('id', org_id)
      await supabase.from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('org_id', org_id)
      return json({ ok: true })
    }

    if (action === 'grant') {
      const family_id = String(body.family_id || '')
      const plan = body.plan === 'teams' ? 'teams' : 'plus'
      const days = Math.min(365, Math.max(1, Number(body.days) || 30))
      if (!family_id) return json({ error: 'family_id required' }, 400)

      // Never overwrite a real Stripe subscription with a comp.
      const { data: existing } = await supabase
        .from('subscriptions').select('stripe_subscription_id, comped')
        .eq('family_id', family_id).maybeSingle()
      if (existing?.stripe_subscription_id) {
        return json({ error: 'family has a real Stripe subscription — nothing to comp' }, 409)
      }

      const ends = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
      const { error } = await supabase.from('subscriptions').upsert({
        family_id,
        plan,
        status: 'active',
        comped: true,
        note: String(body.note || `comped ${days}d by owner`),
        current_period_end: ends,
        updated_at: new Date().toISOString(),
      })
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true, plan, ends })
    }

    if (action === 'revoke') {
      const family_id = String(body.family_id || '')
      if (!family_id) return json({ error: 'family_id required' }, 400)
      // Mark canceled rather than delete: clients poll this row to learn they
      // were downgraded (a missing row reads as "no news", not "canceled").
      const { error } = await supabase
        .from('subscriptions')
        .update({ status: 'canceled', updated_at: new Date().toISOString() })
        .eq('family_id', family_id).eq('comped', true) // comped rows only — Stripe rows untouchable
      if (error) return json({ error: error.message }, 500)
      return json({ ok: true })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
