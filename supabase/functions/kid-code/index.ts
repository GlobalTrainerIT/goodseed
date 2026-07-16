// kid-code — one permanent code per child, reused for every group they join.
//
// A parent hands their child's code (GS-XXXXXX) to a coach/teacher. The coach
// resolves it to add that child to their roster; the link is then visible from
// both sides. The parent's app lists all of a child's groups by the same code.
//
// Actions:
//   resolve { code }  → { home_family_id, home_child_id, child_name }
//       Code-gated: a coach needs the child's first name to add them. Returns
//       nothing else about the family.
//   groups  { code }  → [{ group_name, points, total_earned, rank, ... }]
//       Additionally requires the CALLER to be a member of the child's home
//       family, so a coach holding the code can't snoop the kid's other groups.
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

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

async function findChildByCode(code: string) {
  const { data } = await admin
    .from('records').select('id, family_id, data')
    .eq('collection', 'users').eq('data->>kid_code', code).maybeSingle()
  return data
}

// Is the caller (via their JWT) a member of this family?
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
    if (!code) return json({ error: 'code required' }, 400)

    const child = await findChildByCode(code)
    if (!child) return json({ error: 'not_found' }, 404)
    const childData = (child.data || {}) as Record<string, unknown>

    // ---- resolve: a coach turning a code into a name to add to their roster
    if (body.action === 'resolve') {
      return json({
        home_family_id: child.family_id,
        home_child_id: child.id,
        child_name: childData.full_name || 'Child',
      })
    }

    // ---- groups: the parent's view of every group this child is in
    if (body.action === 'groups') {
      if (!(await callerIsMember(req, child.family_id))) return json({ error: 'forbidden' }, 403)

      const { data: links } = await admin
        .from('kid_links').select('group_family_id, group_child_id, group_name')
        .eq('kid_code', code).eq('revoked', false)
      if (!links?.length) return json({ groups: [] })

      const groups = await Promise.all(
        links.map(async (l) => {
          const [famRes, kidsRes, annRes] = await Promise.all([
            admin.from('records').select('data').eq('collection', 'families').eq('family_id', l.group_family_id).maybeSingle(),
            admin.from('records').select('id, data').eq('collection', 'users').eq('family_id', l.group_family_id),
            admin.from('records').select('data').eq('collection', 'announcements').eq('family_id', l.group_family_id),
          ])
          const kids = (kidsRes.data || [])
            .filter((u) => (u.data as Record<string, unknown>)?.role === 'child')
            .map((u) => ({
              id: u.id,
              points: Number((u.data as Record<string, unknown>)?.seed_balance) || 0,
              total_earned: Number((u.data as Record<string, unknown>)?.total_seeds_earned) || 0,
            }))
            .sort((a, b) => b.points - a.points)
          const idx = kids.findIndex((k) => k.id === l.group_child_id)
          if (idx === -1) return null // removed from the roster
          const announcements = (annRes.data || [])
            .map((a) => a.data as Record<string, unknown>)
            .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)))
            .slice(0, 5)
            .map((a) => ({ title: a.title, message: a.message, is_pinned: !!a.is_pinned }))
          return {
            group_family_id: l.group_family_id,
            group_name: (famRes.data?.data as Record<string, unknown>)?.name || l.group_name || 'Group',
            group_type: (famRes.data?.data as Record<string, unknown>)?.group_type || null,
            points: kids[idx].points,
            total_earned: kids[idx].total_earned,
            rank: idx + 1,
            total_kids: kids.length,
            announcements,
          }
        })
      )
      return json({ groups: groups.filter(Boolean) })
    }

    return json({ error: 'unknown action' }, 400)
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
