import { useEffect, useState } from 'react'
import { Users, Plus, RefreshCw, X, Trophy, Copy } from 'lucide-react'
import { Card, Button, Input, Label, Dialog, Badge } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection } from '@/lib/hooks'
import {
  fetchLinkPreview, useFollowedData, addFollowedGroup, removeFollowedGroup,
  refreshFollowed, computeRollup,
} from '@/lib/groupLink'
import { levelRank } from '@/lib/faith'
import { ensureKidCode, refreshKidGroups, useKidGroups, regenerateKidCode } from '@/lib/kidCode'
import { toast } from '@/lib/toast'

// Parent-side: follow a child's team/class by code. Points there roll up into
// the child's "total earned everywhere" and grow their level — but are never
// added to spendable home Seeds.
export default function FollowedGroups() {
  const user = useCurrentUser()
  const { followed } = useFollowedData()
  const discovered = useKidGroups()
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
  )
  const [adding, setAdding] = useState(false)

  useEffect(() => { refreshFollowed() }, [followed.length]) // legacy manual follows
  // Auto-discover every group each child is in, via their one permanent code.
  useEffect(() => {
    kids.forEach((k) => ensureKidCode(k))
    refreshKidGroups(kids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kids.length])

  const anyDiscovered = kids.some((k) => (discovered[k.id] || []).length > 0)

  if (followed.length === 0 && !anyDiscovered) {
    return (
      <>
        <Card className="mb-5 p-4">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/40"><Users className="h-5 w-5 text-blue-600" /></span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-gray-900 dark:text-gray-100">In a team, class, or church group?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Give your child's code to their coach or teacher. One code per child — the same one every season, for every group.
              </p>
              <div className="mt-3 space-y-2">
                {kids.map((kid) => <KidCodeRow key={kid.id} kid={kid} />)}
              </div>
              <button onClick={() => setAdding(true)} className="mt-3 text-xs font-medium text-seed-700 hover:underline dark:text-seed-400">
                Got a code from a coach instead? Add it here →
              </button>
            </div>
          </div>
        </Card>
        <FollowDialog open={adding} kids={kids} onClose={() => setAdding(false)} />
      </>
    )
  }

  const kidsWithGroups = kids.filter(
    (k) => followed.some((f) => f.childId === k.id) || (discovered[k.id] || []).length > 0
  )

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

// A child's ONE permanent code — hand it to any coach/teacher, every season.
function KidCodeRow({ kid }) {
  // Mint the code in an effect, never during render — writing to the store
  // mid-render triggers a setState-in-render warning (updates App while
  // rendering this row). The parent's useCollection re-renders us once the
  // code lands on the kid record.
  useEffect(() => {
    if (kid && !kid.kid_code) ensureKidCode(kid)
  }, [kid?.id, kid?.kid_code])
  const code = kid?.kid_code
  if (!code) return null
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-100 p-2 dark:border-gray-800">
      <Avatar user={kid} size="xs" />
      <span className="flex-1 truncate text-sm font-semibold text-gray-800 dark:text-gray-200">{kid.full_name}</span>
      <button
        onClick={() => { navigator.clipboard?.writeText(code); toast({ title: 'Code copied!', message: `${kid.full_name}'s code — give it to their coach.`, emoji: '📋' }) }}
        className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1 font-mono text-sm font-bold tracking-wider text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200"
      >
        {code} <Copy className="h-3 w-3 text-gray-400" />
      </button>
      <button
        onClick={async () => {
          if (!confirm(`Give ${kid.full_name} a new code? Any group using the old one will be disconnected.`)) return
          await regenerateKidCode(kid)
          toast({ title: 'New code created', message: 'Share it with their coaches.', emoji: '🔄' })
        }}
        className="rounded p-1 text-gray-300 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
        aria-label={`New code for ${kid.full_name}`}
      >
        <RefreshCw className="h-3.5 w-3.5" />
      </button>
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
            {/* Auto-linked groups are managed by the coach's roster + the kid's
                code — the parent cuts those by regenerating the code instead. */}
            {!g.auto && (
              <button onClick={() => { removeFollowedGroup(g.code); toast({ title: 'Unfollowed', emoji: '👋' }) }} className="ml-0.5 text-blue-400 hover:text-red-500" aria-label={`Unfollow ${g.name}`}>
                <X className="h-3 w-3" />
              </button>
            )}
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
      <div className="mt-3 border-t border-gray-100 pt-3 dark:border-gray-800">
        <KidCodeRow kid={kid} />
      </div>
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
