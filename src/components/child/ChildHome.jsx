import { useMemo } from 'react'
import { Card } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import StreakDisplay from '@/components/gamification/StreakDisplay'
import LevelProgress from '@/components/gamification/LevelProgress'
import ChildTaskCard from './ChildTaskCard'
import EmptyState from '@/components/shared/EmptyState'
import SeedPackReveal from '@/components/gamification/SeedPackReveal'
import { levelRank } from '@/lib/faith'
import { useCollection } from '@/lib/hooks'
import { taskAppliesTo, seedLabel } from '@/lib/domain'
import { getVerseForDate } from '@/lib/verses'
import { useState } from 'react'
import { Gift } from 'lucide-react'

export default function ChildHome({ child }) {
  const tasks = useCollection('tasks')
  const packs = useCollection('seedPacks')
  useCollection('completions') // re-render on completion changes
  const [openPack, setOpenPack] = useState(null)

  const myTasks = useMemo(
    () => tasks.filter((t) => t.family_id === child.family_id && t.status === 'active' && taskAppliesTo(t, child.id)),
    [tasks, child]
  )
  const unopened = packs.filter((p) => p.child_id === child.id && !p.opened)
  const verse = getVerseForDate(new Date())

  return (
    <div className="space-y-5">
      {/* Hero */}
      <Card className="overflow-hidden bg-gradient-to-br from-seed-500 to-seed-700 text-white">
        <div className="flex items-center gap-4 p-5">
          <Avatar user={child} size="xl" className="ring-4 ring-white/30" />
          <div className="flex-1">
            <p className="text-sm font-medium text-white/80">Hi {child.full_name}! 👋</p>
            <p className="text-4xl font-extrabold">🌱 {child.seed_balance || 0}</p>
            <p className="text-sm text-white/80">{seedLabel()} to spend</p>
          </div>
        </div>
        <div className="flex items-center justify-between bg-black/10 px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            🔥 {child.streak_current || 0} day streak
          </div>
          <div className="text-sm font-semibold">{levelRank(child.level || 1).emoji} {levelRank(child.level || 1).name} · Lvl {child.level || 1}</div>
        </div>
      </Card>

      {unopened.length > 0 && (
        <button onClick={() => setOpenPack(unopened[0])} className="w-full">
          <Card className="flex items-center gap-3 border-amber-200 bg-amber-50 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
            <Gift className="h-8 w-8 text-amber-500" />
            <div className="flex-1 text-left">
              <p className="font-bold text-gray-900 dark:text-gray-100">You have {unopened.length} Seed Pack{unopened.length > 1 ? 's' : ''}!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tap to open and reveal a cosmetic.</p>
            </div>
          </Card>
        </button>
      )}

      <Card className="border-seed-100 bg-seed-50/60 p-4 dark:border-seed-900/40 dark:bg-seed-900/10">
        <p className="text-sm italic text-gray-700 dark:text-gray-200">"{verse.verse_text}"</p>
        <p className="mt-1 text-xs font-semibold text-seed-700 dark:text-seed-300">{verse.reference}</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Streak</p>
          <StreakDisplay current={child.streak_current || 0} longest={child.streak_longest || 0} />
        </Card>
        <Card className="p-4">
          <p className="mb-2 text-xs font-semibold uppercase text-gray-400">Level</p>
          <LevelProgress xp={child.xp || 0} />
        </Card>
      </div>

      <div>
        <h2 className="mb-3 text-lg font-bold text-gray-900 dark:text-gray-100">Today's tasks</h2>
        {myTasks.length === 0 ? (
          <EmptyState icon="🎉" title="No tasks right now" description="Enjoy your day!" />
        ) : (
          <div className="space-y-2.5">
            {myTasks.map((t) => (
              <ChildTaskCard key={t.id} task={t} childId={child.id} />
            ))}
          </div>
        )}
      </div>

      <SeedPackReveal open={!!openPack} onClose={() => setOpenPack(null)} pack={openPack} />
    </div>
  )
}
