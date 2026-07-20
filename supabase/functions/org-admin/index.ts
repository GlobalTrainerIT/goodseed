// org-admin — read-only roll-up for a church/school/YMCA administrator.
//
// Gated by the org's SEPARATE admin_key (not the join code, which every leader
// holds). Shows the pastor/principal all the groups their deal covers, grouped
// by leader, with kid counts and points — the thing that makes the org tier a
// real product rather than "buy some seats."
//
// action "overview" { admin_key } → { org, leaders[], stats }
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json().catch(() => ({}))
    if (body.action !== 'overview') return json({ error: 'unknown action' }, 400)
    const adminKey = String(body.admin_key || '').trim().toUpperCase()
    if (!adminKey) return json({ error: 'admin_key required' }, 400)

    const { data: org } = await admin
      .from('organizations').select('*').eq('admin_key', adminKey).maybeSingle()
    if (!org || org.revoked) return json({ error: 'not_found' }, 404)

    // Groups this org covers = active subscriptions with this org_id.
    const { data: subs } = await admin
      .from('subscriptions').select('family_id, status, current_period_end')
      .eq('org_id', org.id)
    const now = Date.now()
    const familyIds = (subs || [])
      .filter((s) => s.status === 'active' && (!s.current_period_end || new Date(s.current_period_end).getTime() > now))
      .map((s) => s.family_id)

    if (!familyIds.length) {
      return json({
        org: { name: org.name, active_until: org.active_until, group_cap: org.group_cap, code: org.code },
        leaders: [],
        stats: { leaders: 0, groups: 0, kids: 0, points: 0 },
      })
    }

    const [famRes, userRes] = await Promise.all([
      admin.from('records').select('family_id, data, updated_at').eq('collection', 'families').in('family_id', familyIds),
      admin.from('records').select('family_id, data').eq('collection', 'users').in('family_id', familyIds),
    ])

    const kidCount: Record<string, number> = {}
    const pointSum: Record<string, number> = {}
    const leaderName: Record<string, string> = {}
    for (const u of userRes.data || []) {
      const d = (u.data || {}) as Record<string, unknown>
      if (d.role === 'child') {
        kidCount[u.family_id] = (kidCount[u.family_id] || 0) + 1
        pointSum[u.family_id] = (pointSum[u.family_id] || 0) + (Number(d.total_seeds_earned) || 0)
      } else if (d.role === 'parent' && !leaderName[u.family_id]) {
        leaderName[u.family_id] = String(d.full_name || 'Leader')
      }
    }

    const groups = (famRes.data || []).map((f) => {
      const d = (f.data || {}) as Record<string, unknown>
      return {
        family_id: f.family_id,
        name: d.name || 'Group',
        group_type: d.group_type || null,
        owner_key: d.owner_key || f.family_id, // group by leader; fall back to self
        leader: leaderName[f.family_id] || 'Leader',
        kids: kidCount[f.family_id] || 0,
        points: pointSum[f.family_id] || 0,
        last_active: f.updated_at,
      }
    })

    // Group by leader (owner_key) — a coach may run several teams.
    const byLeader: Record<string, any> = {}
    for (const g of groups) {
      const k = g.owner_key
      if (!byLeader[k]) byLeader[k] = { leader: g.leader, teams: [], kids: 0, points: 0 }
      byLeader[k].teams.push({ name: g.name, group_type: g.group_type, kids: g.kids, points: g.points, last_active: g.last_active })
      byLeader[k].kids += g.kids
      byLeader[k].points += g.points
      if (g.leader && g.leader !== 'Leader') byLeader[k].leader = g.leader
    }
    const leaders = Object.values(byLeader).sort((a: any, b: any) => b.kids - a.kids)

    return json({
      org: { name: org.name, active_until: org.active_until, group_cap: org.group_cap, code: org.code },
      leaders,
      stats: {
        leaders: leaders.length,
        groups: groups.length,
        kids: groups.reduce((s, g) => s + g.kids, 0),
        points: groups.reduce((s, g) => s + g.points, 0),
      },
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
