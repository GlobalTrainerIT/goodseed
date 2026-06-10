import { BADGE_DEFS } from '@/lib/badges'
import { cn, formatDate } from '@/lib/utils'

export default function BadgeGrid({ earnedBadges = [] }) {
  const earnedMap = new Map(earnedBadges.map((b) => [b.badge_type, b]))
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {BADGE_DEFS.map((def) => {
        const earned = earnedMap.get(def.badge_type)
        return (
          <div
            key={def.badge_type}
            title={earned ? `${def.title} — earned ${formatDate(earned.earned_date)}` : `${def.title} (locked): ${def.description}`}
            className={cn(
              'flex flex-col items-center gap-1 rounded-xl border p-3 text-center transition',
              earned
                ? 'border-seed-200 bg-seed-50 dark:border-seed-800 dark:bg-seed-900/20'
                : 'border-gray-100 bg-gray-50 opacity-60 grayscale dark:border-gray-800 dark:bg-gray-800/40'
            )}
          >
            <div className="text-3xl">{def.icon_emoji}</div>
            <p className="text-xs font-bold leading-tight text-gray-800 dark:text-gray-200">{def.title}</p>
            {!earned && <p className="text-[10px] text-gray-400">Locked</p>}
          </div>
        )
      })}
    </div>
  )
}
