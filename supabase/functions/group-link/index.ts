// group-link — lets a parent's family app view a linked child's group points
// and announcements, WITHOUT joining the group (RLS stays intact).
//
// The coach shares a per-kid link code; the parent enters it at home. This
// function (service role) verifies the code and returns read-only data only —
// it can never write group data, and a parent never gains group membership.
//
// action "preview" { code } → { group_name, child_name, points, rank,
//   total_kids, announcements[] }.  Gated purely by a valid, non-revoked code.
import { createClient } from 'npm:@supabase/supabase-js@2'

const supabase = createClient(
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

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  try {
    const body = await req.json().catch(() => ({}))
    if (body.action !== 'preview') return json({ error: 'unknown action' }, 400)

    const code = String(body.code || '').trim().toUpperCase()
    if (!code) return json({ error: 'code required' }, 400)

    const { data: link } = await supabase
      .from('group_links').select('family_id, child_id, child_name, revoked')
      .eq('code', code).maybeSingle()
    if (!link || link.revoked) return json({ error: 'not_found' }, 404)

    const [famRes, kidsRes, annRes] = await Promise.all([
      supabase.from('records').select('data').eq('collection', 'families').eq('family_id', link.family_id).maybeSingle(),
      supabase.from('records').select('id, data').eq('collection', 'users').eq('family_id', link.family_id),
      supabase.from('records').select('data').eq('collection', 'announcements').eq('family_id', link.family_id),
    ])

    const kids = (kidsRes.data || [])
      .filter((u) => (u.data as Record<string, unknown>)?.role === 'child')
      .map((u) => ({ id: u.id, points: Number((u.data as Record<string, unknown>)?.seed_balance) || 0, name: (u.data as Record<string, unknown>)?.full_name }))
      .sort((a, b) => b.points - a.points)

    const idx = kids.findIndex((k) => k.id === link.child_id)
    if (idx === -1) return json({ error: 'child_removed' }, 404)

    const announcements = (annRes.data || [])
      .map((a) => a.data as Record<string, unknown>)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 10)
      .map((a) => ({ title: a.title, message: a.message, is_pinned: !!a.is_pinned, created_at: a.created_at }))

    return json({
      group_name: (famRes.data?.data as Record<string, unknown>)?.name || 'Group',
      child_name: link.child_name || kids[idx].name,
      points: kids[idx].points,
      rank: idx + 1,
      total_kids: kids.length,
      announcements,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
