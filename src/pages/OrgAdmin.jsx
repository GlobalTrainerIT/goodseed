import { useEffect, useState, useCallback } from 'react'
import { Building2, RefreshCw, LogOut, Users2, Trophy, Copy } from 'lucide-react'
import { Card, Button, Input, Label, Badge } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { ensureSession } from '@/lib/sync'
import { GROUP_TYPES } from '@/lib/plan'
import { toast } from '@/lib/toast'

// Read-only dashboard for a church/school/YMCA administrator. Reachable only at
// /OrgAdmin with the org's admin key (separate from the leader join code).
const KEY_STORAGE = 'goodseed_org_admin_key'

async function call(adminKey) {
  await ensureSession()
  const { data, error } = await supabase.functions.invoke('org-admin', {
    body: { action: 'overview', admin_key: adminKey },
  })
  if (error) {
    let msg = error.message
    try { const c = await error.context?.json(); if (c?.error) msg = c.error } catch { /* keep */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export default function OrgAdmin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) || '')
  const [draft, setDraft] = useState('')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(async (k = key) => {
    if (!k) return
    setBusy(true); setError('')
    try {
      const res = await call(k)
      setData(res); sessionStorage.setItem(KEY_STORAGE, k); setKey(k)
    } catch (e) {
      const msg = /not_found/i.test(String(e)) ? "That admin key wasn't recognized." : String(e.message || e)
      setError(msg)
      if (/not_found/i.test(String(e))) { sessionStorage.removeItem(KEY_STORAGE); setKey(''); setData(null) }
    } finally { setBusy(false) }
  }, [key])

  useEffect(() => { if (key) refresh(key) /* eslint-disable-next-line */ }, [])

  if (!key || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <Card className="w-full max-w-sm p-6 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seed-600 text-white"><Building2 className="h-5 w-5" /></div>
            <div>
              <p className="font-extrabold text-gray-900 dark:text-gray-100">Organization Dashboard</p>
              <p className="text-xs text-gray-400">For your administrator only</p>
            </div>
          </div>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); refresh(draft.trim().toUpperCase()) }} className="space-y-3">
            <div>
              <Label>Admin key</Label>
              <Input value={draft} onChange={(e) => setDraft(e.target.value.toUpperCase())} placeholder="OADM-…" autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={!draft.trim() || busy}>{busy ? 'Checking…' : 'Open dashboard'}</Button>
          </form>
        </Card>
      </div>
    )
  }

  const { org, leaders, stats } = data

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seed-600 text-white"><Building2 className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">{org.name}</h1>
              <p className="text-xs text-gray-400">Active through {new Date(org.active_until).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refresh()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</Button>
            <Button variant="outline" onClick={() => { sessionStorage.removeItem(KEY_STORAGE); setKey(''); setData(null) }}><LogOut className="h-4 w-4" /> Lock</Button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[['Leaders', stats.leaders], ['Teams & classes', stats.groups], ['Kids', stats.kids], ['Points awarded', stats.points]].map(([label, value]) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            </Card>
          ))}
        </div>

        {/* Distribute code */}
        <Card className="mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Invite your leaders</p>
            <p className="text-xs text-gray-400">Each coach or teacher enters this once in Settings — every team they run is covered, free to them.</p>
          </div>
          <button onClick={() => { navigator.clipboard?.writeText(org.code); toast({ title: 'Code copied', emoji: '📋' }) }}
            className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-base font-bold tracking-widest text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">
            {org.code} <Copy className="h-4 w-4 text-gray-400" />
          </button>
        </Card>

        {leaders.length === 0 ? (
          <Card className="p-8 text-center text-gray-400">No leaders have joined yet. Share your code above to get started.</Card>
        ) : (
          <div className="space-y-3">
            {leaders.map((ld, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users2 className="h-5 w-5 text-seed-600" />
                    <p className="font-bold text-gray-900 dark:text-gray-100">{ld.leader}</p>
                    <Badge variant="gray">{ld.teams.length} {ld.teams.length === 1 ? 'group' : 'groups'}</Badge>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-500">{ld.kids} kids</span>
                    <span className="flex items-center gap-1 font-bold text-gray-900 dark:text-gray-100"><Trophy className="h-4 w-4 text-amber-500" /> {ld.points}</span>
                  </div>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {ld.teams.map((t, j) => {
                    const type = GROUP_TYPES.find((x) => x.id === t.group_type)
                    return (
                      <span key={j} className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">
                        {type?.emoji || '🏅'} {t.name} · {t.kids} kids · {t.points} pts
                      </span>
                    )
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
