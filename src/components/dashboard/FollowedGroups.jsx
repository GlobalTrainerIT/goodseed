import { useEffect, useState, useCallback } from 'react'
import { Users, Plus, RefreshCw, X, Trophy } from 'lucide-react'
import { Card, Button, Input, Label, Dialog, Badge } from '@/components/ui'
import { fetchLinkPreview, useFollowedGroups, addFollowedGroup, removeFollowedGroup } from '@/lib/groupLink'
import { toast } from '@/lib/toast'

// Parent-side: follow a child's team/class by code and see their group points
// and announcements at home. Read-only — this never joins the group or mixes
// with family Seeds.
export default function FollowedGroups() {
  const followed = useFollowedGroups()
  const [adding, setAdding] = useState(false)

  if (followed.length === 0) {
    return (
      <>
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40"><Users className="h-5 w-5 text-blue-600" /></span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Following a team or class?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Got a code from a coach or teacher? See your child's points here.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add a group</Button>
        </Card>
        <FollowDialog open={adding} onClose={() => setAdding(false)} />
      </>
    )
  }

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Teams &amp; classes</h2>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm font-medium text-seed-700 hover:text-seed-800 dark:text-seed-400">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="space-y-3">
        {followed.map((f) => <FollowedCard key={f.code} entry={f} />)}
      </div>
      <FollowDialog open={adding} onClose={() => setAdding(false)} />
    </div>
  )
}

function FollowedCard({ entry }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  const refresh = useCallback(async () => {
    setLoading(true)
    const r = await fetchLinkPreview(entry.code)
    setLoading(false)
    if (r?.error) setErr(r.error === 'not_found' || r.error === 'child_removed' ? 'This group is no longer sharing.' : r.error)
    else { setErr(''); setData(r) }
  }, [entry.code])

  useEffect(() => { refresh() }, [refresh])

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 dark:text-gray-100">{data?.group_name || entry.groupName}</p>
          <p className="text-xs text-gray-400">{entry.childName}</p>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={refresh} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { removeFollowedGroup(entry.code); toast({ title: 'Unfollowed', emoji: '👋' }) }}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            aria-label="Unfollow"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {err ? (
        <p className="mt-2 text-sm text-gray-400">{err}</p>
      ) : data ? (
        <>
          <div className="mt-3 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              <span className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{data.points}</span>
              <span className="text-sm text-gray-400">points</span>
            </div>
            <Badge variant="green">#{data.rank} of {data.total_kids}</Badge>
          </div>
          {data.announcements?.length > 0 && (
            <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 dark:border-gray-800">
              {data.announcements.slice(0, 3).map((a, i) => (
                <p key={i} className="text-sm text-gray-600 dark:text-gray-300">
                  {a.is_pinned && '📌 '}<b>{a.title}</b>{a.message ? ` — ${a.message}` : ''}
                </p>
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm text-gray-400">Loading…</p>
      )}
    </Card>
  )
}

function FollowDialog({ open, onClose }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const r = await fetchLinkPreview(code)
    setBusy(false)
    if (r?.error) {
      setError(r.error === 'not_found' ? "That code didn't match a group. Double-check it with the coach." : r.error)
      return
    }
    addFollowedGroup({ code: code.trim().toUpperCase(), childName: r.child_name, groupName: r.group_name })
    toast({ title: `Following ${r.group_name}!`, emoji: '🎉' })
    setCode('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Follow a group" description="Enter the code a coach or teacher shared with you.">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label>Group code</Label>
          <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. TML7K2" maxLength={8} className="text-center text-lg font-bold tracking-widest" autoFocus />
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
        <Button type="submit" className="w-full" disabled={!code.trim() || busy}>{busy ? 'Checking…' : 'Follow'}</Button>
      </form>
    </Dialog>
  )
}
