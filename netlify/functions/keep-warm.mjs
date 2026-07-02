// Scheduled keep-warm ping so the free-tier Supabase project never auto-pauses
// (idle projects sleep after ~1 week and cold-start with 503s — this was the
// original "sync is broken" incident). Runs daily via Netlify Scheduled
// Functions; the query is RLS-scoped so it returns no data, but it still wakes
// the database.
const SUPABASE_URL = 'https://jedqarsyvrpicvlztyrm.supabase.co'
const ANON_KEY = 'sb_publishable_DX-QsiePkj_AmvaGDnoxXw_9y1CM87H' // public by design

export default async () => {
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/records?select=id&limit=1`, {
      headers: { apikey: ANON_KEY },
    })
    console.log(`[keep-warm] supabase ping → ${res.status}`)
  } catch (e) {
    console.error('[keep-warm] ping failed', e)
  }
  return new Response('ok')
}

export const config = {
  schedule: '@daily',
}
