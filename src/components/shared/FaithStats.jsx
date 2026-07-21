import { Card } from '@/components/ui'
import { useRecord, useCollection, useSettings } from '@/lib/hooks'
import { faithStats } from '@/lib/domain'
import { journeyProgress } from '@/lib/journey'

// A compact "Faith Journey" summary of a child's devotional progress across all
// the faith features. Read-only; shown on the child's profile.
export default function FaithStats({ childId }) {
  const settings = useSettings()
  const child = useRecord('users', childId)
  // Subscribe to every faith collection so the tiles stay live.
  useCollection('memoryVerses')
  useCollection('fruitEarned')
  useCollection('armorPieces')
  useCollection('gratitude')
  useCollection('familyAltar')

  if (!child) return null
  const s = faithStats(childId)
  const jp = journeyProgress(s.totalEarned)

  // Only surface tiles for features that are enabled.
  const tiles = [
    settings.memoryVerseEnabled !== false && { icon: '📖', label: 'Verses memorized', value: s.verses, sub: s.memoryStreak > 1 ? `🔥 ${s.memoryStreak} wks` : null },
    settings.armorEnabled !== false && { icon: '🛡️', label: 'Armor of God', value: `${s.armorInSuit}/7`, sub: s.armorSuits > 0 ? `⚔️ ${s.armorSuits} suit${s.armorSuits === 1 ? '' : 's'}` : null },
    settings.fruitGardenEnabled !== false && { icon: '🌳', label: 'Fruits shown', value: `${s.fruits}/${s.fruitsTotal}`, sub: s.fruits >= s.fruitsTotal ? 'Flourishing!' : null },
    settings.gratitudeEnabled !== false && { icon: '💛', label: 'Gratitude notes', value: s.gratitude, sub: s.gratitudeStreak > 1 ? `🔥 ${s.gratitudeStreak} days` : null },
    settings.journeyEnabled !== false && { icon: '🗺️', label: 'Bible journey', value: `${jp.reachedCount}/${jp.total}`, sub: jp.current.name },
    settings.altarEnabled !== false && { icon: '🕯️', label: 'Family Altar', value: s.altarWeeks, sub: s.altarWeeks === 1 ? 'week' : 'weeks' },
  ].filter(Boolean)

  if (tiles.length === 0) return null

  return (
    <Card className="p-5">
      <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">🕊️ Faith Journey</h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl border border-gray-100 p-3 text-center dark:border-gray-800">
            <div className="text-2xl">{t.icon}</div>
            <div className="mt-1 text-xl font-extrabold text-gray-900 dark:text-gray-100">{t.value}</div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">{t.label}</div>
            {t.sub && <div className="mt-0.5 truncate text-xs font-medium text-seed-600 dark:text-seed-400">{t.sub}</div>}
          </div>
        ))}
      </div>
    </Card>
  )
}
