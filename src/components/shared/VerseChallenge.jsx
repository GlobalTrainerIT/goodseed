import { BookOpen, Check } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { useCurrentUser, useCollection, useRecord, useSettings } from '@/lib/hooks'
import { useRosterPhoto } from '@/lib/rosterPhotos'
import { getVerseForWeek } from '@/lib/verses'
import {
  verseMemorizedThisWeek,
  memoryStreakWeeks,
  markVerseMemorized,
  unmarkVerseMemorized,
  memoryVerseReward,
  seedLabel,
} from '@/lib/domain'
import { isGroup, teamsActive } from '@/lib/plan'
import { toast } from '@/lib/toast'

// The "Verse of the Week" memory challenge. Shows the week's verse and lets a
// coach (group) or parent (family) tap each child to mark them as having
// memorized it — awarding seeds and growing a consecutive-week streak. Reused on
// the coach Roster and the family Dashboard.
export default function VerseChallenge({ familyId }) {
  const user = useCurrentUser()
  const settings = useSettings()
  const family = useRecord('families', familyId)
  const kids = useCollection('users', (all) =>
    all
      .filter((u) => u.family_id === familyId && u.role === 'child')
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  useCollection('memoryVerses') // re-render as kids are marked/un-marked

  if (settings.memoryVerseEnabled === false) return null

  const verse = getVerseForWeek(new Date())
  const group = isGroup(family)
  const active = !group || teamsActive(family) // groups must be inside trial/Teams
  const reward = memoryVerseReward()
  const doneCount = kids.filter((k) => verseMemorizedThisWeek(k.id)).length

  function toggle(kid) {
    if (verseMemorizedThisWeek(kid.id)) {
      unmarkVerseMemorized(kid.id)
      toast({ title: `Un-marked ${kid.full_name}`, emoji: '↩️', type: 'info' })
      return
    }
    if (!active) {
      toast({ title: 'Trial ended', message: 'Subscribe to Teams in Settings to keep awarding points.', emoji: '🔒' })
      return
    }
    const r = markVerseMemorized(kid.id, user?.id)
    toast({
      title: `${kid.full_name} memorized it! 📖`,
      message: r?.reward ? `+${r.reward} ${seedLabel().toLowerCase()}${r.streak > 1 ? ` · 🔥 ${r.streak} weeks` : ''}` : (r?.streak > 1 ? `🔥 ${r.streak} weeks running` : ''),
      emoji: '📖',
    })
  }

  return (
    <Card className="overflow-hidden border-seed-100 bg-gradient-to-br from-seed-50 to-white dark:border-seed-900/50 dark:from-seed-900/20 dark:to-gray-900">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-seed-700 dark:text-seed-300">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Verse of the Week</span>
          </div>
          {kids.length > 0 && (
            <span className="text-xs font-semibold text-gray-400">
              {doneCount}/{kids.length} memorized
            </span>
          )}
        </div>

        <p className="text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-100">"{verse.verse_text}"</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="green">{verse.reference}</Badge>
          <Badge variant="gray">{verse.translation}</Badge>
          {reward > 0 && <Badge variant="green">+{reward} for memorizing</Badge>}
        </div>

        {kids.length === 0 ? (
          <div className="mt-4">
            <EmptyState icon="📖" title="Add kids to run the challenge" description="Once your roster has kids, tap each one who memorized this week's verse." />
          </div>
        ) : (
          <div className="mt-4">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Tap each child who memorized it this week
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {kids.map((kid) => (
                <KidChip key={kid.id} kid={kid} done={verseMemorizedThisWeek(kid.id)} streak={memoryStreakWeeks(kid.id)} onToggle={() => toggle(kid)} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}

function KidChip({ kid, done, streak, onToggle }) {
  const photo = useRosterPhoto(kid.id)
  const shown = photo ? { ...kid, avatar_photo: photo } : kid
  return (
    <button
      onClick={onToggle}
      className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${
        done
          ? 'border-seed-400 bg-seed-50 dark:border-seed-600 dark:bg-seed-900/30'
          : 'border-gray-200 bg-white hover:border-seed-300 dark:border-gray-800 dark:bg-gray-900'
      }`}
      aria-pressed={done}
    >
      <Avatar user={shown} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-gray-900 dark:text-gray-100">{kid.full_name}</p>
        {streak > 1 ? (
          <p className="text-xs font-semibold text-amber-600 dark:text-amber-400">🔥 {streak} weeks in a row</p>
        ) : (
          <p className="text-xs text-gray-400">{done ? 'Memorized this week' : 'Not yet'}</p>
        )}
      </div>
      <span
        className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${
          done ? 'border-seed-500 bg-seed-500 text-white' : 'border-gray-300 text-transparent dark:border-gray-600'
        }`}
      >
        <Check className="h-4 w-4" />
      </span>
    </button>
  )
}
