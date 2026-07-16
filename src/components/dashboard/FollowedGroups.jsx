import { useEffect, useState } from 'react'
import { Users, Plus, RefreshCw, X, Trophy } from 'lucide-react'
import { Card, Button, Input, Label, Dialog, Badge } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection } from '@/lib/hooks'
import {
  fetchLinkPreview, useFollowedData, addFollowedGroup, removeFollowedGroup,
  refreshFollowed, computeRollup,
} from '@/lib/groupLink'
import { levelRank } from '@/lib/faith'
import { toast } from '@/lib/toast'

// Parent-side: follow a child's team/class by code. Points there roll up into
// the child's "total earned everywhere" and grow their level — but are never
// added to spendable home Seeds.
export default function FollowedGroups() {
  const user = useCurrentUser()
  const { followed } = useFollowedData()
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
  )
  const [adding, setAdding] = useState(false)

  useEffect(() => { refreshFollowed() }, [followed.length]) // fetch snapshots for the rollup

  if (followed.length === 0) {
    return (
      <>
        <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40"><Users className="h-5 w-5 text-blue-600" /></span>
            <div>
              <p className="font-semibold text-gray-900 dark:text-gray-100">Following a team or class?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">A coach's code lets your child's school & sports points count toward their total at home.</p>
            </div>
          </div>
          <Button variant="secondary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add a group</Button>
        </Card>
        <FollowDialog open={adding} kids={kids} onClose={() => setAdding(false)} />
      </>
    )
  }

  const kidsWithGroups = kids.filter((k) => followed.some((f) => f.childId === k.id))

  return (
    <div className="mb-5">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-gray-500">Teams &amp; classes</h2>
        <button onClick={() => setAdding(true)} className="flex items-center gap-1 text-sm font-medium text-seed-700 hover:text-seed-800 dark:text-seed-400">
          <Plus className="h-4 w-4" /> Add
        </button>
      </div>
      <div className="space-y-3">
        {kidsWithGroups.map((kid) => <ChildRollupCard key={kid.id} kid={kid} />)}
      </div>
      <FollowDialog open={adding} kids={kids} onClose={() => setAdding(false)} />
    </div>
  )
}

function ChildRollupCard({ kid }) {
  const { followed, snapshots } = useFollowedData()
  const [busy, setBusy] = useState(false)
  const roll = computeRollup(kid) // recomputed as snapshots update
  const mine = followed.filter((f) => f.childId === kid.id)

  async function refresh() {
    setBusy(true)
    await refreshFollowed()
    setBusy(false)
  }

  // Gather announcements across this kid's groups.
  const anns = mine.flatMap((f) => (snapshots[f.code]?.announcements || []).map((a) => ({ ...a, group: snapshots[f.code]?.group_name || f.groupName })))
    .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0)).slice(0, 3)

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <Avatar user={kid} size="md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-gray-900 dark:text-gray-100">{kid.full_name}</p>
            <Badge variant="green">{roll.rank.emoji} {roll.rank.name}</Badge>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            <b className="text-gray-900 dark:text-gray-100">{roll.grandTotal}</b> earned everywhere
          </p>
        </div>
        <button onClick={refresh} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Breakdown: home + each group */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        <span className="rounded-full bg-seed-50 px-2.5 py-1 text-xs font-semibold text-seed-700 dark:bg-seed-900/30 dark:text-seed-300">🏠 Home {roll.homeTotal}</span>
        {roll.groups.map((g) => (
          <span key={g.code} className="flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
            <Trophy className="h-3 w-3" /> {g.name} {g.total == null ? '…' : g.total}
            <button onClick={() => { removeFollowedGroup(g.code); toast({ title: 'Unfollowed', emoji: '👋' }) }} className="ml-0.5 text-blue-400 hover:text-red-500" aria-label={`Unfollow ${g.name}`}>
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>

      {anns.length > 0 && (
        <div className="mt-3 space-y-1 border-t border-gray-100 pt-3 dark:border-gray-800">
          {anns.map((a, i) => (
            <p key={i} className="text-sm text-gray-600 dark:text-gray-300">
              {a.is_pinned && '📌 '}<b>{a.title}</b>{a.message ? ` — ${a.message}` : ''} <span className="text-xs text-gray-400">· {a.group}</span>
            </p>
          ))}
        </div>
      )}
      <p className="mt-2 text-xs text-gray-400">School &amp; sports points grow {kid.full_name}'s total and level — they're not spendable home Seeds.</p>
    </Card>
  )
}

function FollowDialog({ open, kids, onClose }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState(null) // { group_name, child_name } once code validates

  function reset() { setCode(''); setError(''); setPreview(null); setBusy(false) }

  async function check(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const r = await fetchLinkPreview(code)
    setBusy(false)
    if (r?.error) {
      setError(r.error === 'not_found' ? "That code didn't match a group. Double-check it with the coach." : r.error)
      return
    }
    setPreview(r)
  }

  function pickChild(kid) {
    addFollowedGroup({ code: code.trim().toUpperCase(), childId: kid.id, childName: kid.full_name, groupName: preview.group_name })
    refreshFollowed()
    toast({ title: `Following ${preview.group_name}!`, message: `Added to ${kid.full_name}'s total.`, emoji: '🎉' })
    reset()
    onClose()
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose() }} title="Follow a group" description="Enter the code a coach or teacher shared with you.">
      {!preview ? (
        <form onSubmit={check} className="space-y-4">
          <div>
            <Label>Group code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. TML7K2" maxLength={8} className="text-center text-lg font-bold tracking-widest" autoFocus />
          </div>
          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
          <Button type="submit" className="w-full" disabled={!code.trim() || busy}>{busy ? 'Checking…' : 'Next'}</Button>
        </form>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">Found <b>{preview.group_name}</b>. Which of your children is this for?</p>
          <div className="space-y-2">
            {kids.map((kid) => (
              <button key={kid.id} onClick={() => pickChild(kid)} className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition hover:border-seed-400 hover:bg-seed-50 dark:border-gray-800 dark:hover:bg-gray-800">
                <Avatar user={kid} size="sm" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">{kid.full_name}</span>
              </button>
            ))}
            {kids.length === 0 && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">Add a child to your family first, then follow their group.</p>}
          </div>
        </div>
      )}
    </Dialog>
  )
}
