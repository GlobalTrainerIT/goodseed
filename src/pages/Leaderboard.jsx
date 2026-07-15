import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useRecord, useSettings } from '@/lib/hooks'
import { updateSettings } from '@/lib/db'
import { seedLabel } from '@/lib/domain'
import { groupTypeOf } from '@/lib/plan'

const MEDALS = ['🥇', '🥈', '🥉']
const MODES = [
  { id: 'full', label: 'Full ranking' },
  { id: 'top3', label: 'Top 3 + most improved' },
  { id: 'total', label: 'Group total only' },
]

export default function Leaderboard() {
  const user = useCurrentUser()
  const group = useRecord('families', user?.family_id)
  const settings = useSettings()
  const navigate = useNavigate()
  const isParent = user?.role === 'parent'

  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
      .sort((a, b) => (b.seed_balance || 0) - (a.seed_balance || 0))
  )

  // Points gained in the last 7 days, from the activity log.
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const recent = useCollection('activity', (all) =>
    all.filter(
      (a) =>
        a.family_id === user?.family_id &&
        a.seeds_delta > 0 &&
        new Date(a.timestamp).getTime() >= weekAgo
    )
  )
  const gainedThisWeek = useMemo(() => {
    const byKid = {}
    recent.forEach((a) => { byKid[a.user_id] = (byKid[a.user_id] || 0) + a.seeds_delta })
    return byKid
  }, [recent])

  const mostImproved = useMemo(() => {
    let best = null
    kids.forEach((k) => {
      const gain = gainedThisWeek[k.id] || 0
      if (gain > 0 && (!best || gain > best.gain)) best = { kid: k, gain }
    })
    return best
  }, [kids, gainedThisWeek])

  const groupTotal = kids.reduce((sum, k) => sum + (k.seed_balance || 0), 0)
  const mode = settings.leaderboardMode || 'full'
  const type = groupTypeOf(group)

  if (!group) return null

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="🏆 Leaderboard"
        subtitle={`${group.name} · ${groupTotal} total ${seedLabel().toLowerCase()}`}
        actions={
          <Button variant="secondary" onClick={() => navigate('/Roster')}>
            <ArrowLeft className="h-4 w-4" /> Roster
          </Button>
        }
      />

      {isParent && (
        <div className="mb-5 flex flex-wrap gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => updateSettings({ leaderboardMode: m.id })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
                mode === m.id
                  ? 'bg-seed-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300'
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}

      {kids.length === 0 ? (
        <EmptyState icon="🏆" title="No one on the roster yet" description={`Add kids to your ${type.label.toLowerCase()} and the leaderboard fills itself in.`} />
      ) : mode === 'total' ? (
        <Card className="p-10 text-center">
          <p className="text-sm font-bold uppercase tracking-wide text-gray-400">Team total</p>
          <p className="mt-2 text-6xl font-extrabold text-seed-600">🌟 {groupTotal}</p>
          <p className="mt-2 text-gray-500">
            {seedLabel()} earned together by {kids.length} kids. Every point counts!
          </p>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {(mode === 'top3' ? kids.slice(0, 3) : kids).map((kid, i) => (
              <Card
                key={kid.id}
                className={`flex items-center gap-3 p-3.5 ${i === 0 ? 'border-amber-300 bg-amber-50/60 dark:bg-amber-900/20' : ''}`}
              >
                <span className="w-9 text-center text-xl font-extrabold">
                  {MEDALS[i] || <span className="text-sm text-gray-400">#{i + 1}</span>}
                </span>
                <Avatar user={kid} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-gray-900 dark:text-gray-100">{kid.full_name}</p>
                  {(gainedThisWeek[kid.id] || 0) > 0 && (
                    <p className="text-xs font-medium text-seed-600">+{gainedThisWeek[kid.id]} this week</p>
                  )}
                </div>
                <Badge variant="green" className="text-base font-extrabold">🌟 {kid.seed_balance || 0}</Badge>
              </Card>
            ))}
          </div>

          {mode === 'top3' && mostImproved && (
            <Card className="mt-4 flex items-center gap-3 border-purple-200 bg-purple-50/60 p-3.5 dark:border-purple-900 dark:bg-purple-900/20">
              <span className="flex h-9 w-9 items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600" />
              </span>
              <Avatar user={mostImproved.kid} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-gray-900 dark:text-gray-100">{mostImproved.kid.full_name}</p>
                <p className="text-xs font-semibold uppercase tracking-wide text-purple-600">Most improved</p>
              </div>
              <Badge className="bg-purple-100 text-base font-extrabold text-purple-700">+{mostImproved.gain} this week</Badge>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
