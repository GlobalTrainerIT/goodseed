import { Sprout } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import { fruitCounts, awardFruit, fruitGardenEnabled, seedLabel } from '@/lib/domain'
import { FRUIT_OF_SPIRIT } from '@/lib/faith'
import { toast } from '@/lib/toast'

// The Fruit of the Spirit garden: a nine-fruit collectible (Galatians 5:22–23).
// Each fruit lights up as a child shows it; all nine flourishes the tree. When
// `interactive`, a parent/coach taps a fruit to award it.
export default function FruitGarden({ childId, interactive = false }) {
  const me = useCurrentUser()
  const settings = useSettings()
  useCollection('fruitEarned') // re-render as fruits grow

  if (settings.fruitGardenEnabled === false || !childId) return null

  const counts = fruitCounts(childId)
  const distinct = FRUIT_OF_SPIRIT.filter((f) => counts[f.id] > 0).length
  const full = distinct >= FRUIT_OF_SPIRIT.length

  function give(fruit) {
    awardFruit(childId, fruit.id, me?.id)
    toast({ title: `${fruit.label}! 🌱`, message: `+${fruit.amount} ${seedLabel().toLowerCase()}`, emoji: '🌳' })
  }

  return (
    <Card className={`overflow-hidden p-5 ${full ? 'border-seed-300 bg-gradient-to-br from-seed-100 to-white dark:border-seed-700 dark:from-seed-900/30 dark:to-gray-900' : 'border-seed-100 bg-gradient-to-br from-seed-50 to-white dark:border-seed-900/50 dark:from-seed-900/20 dark:to-gray-900'}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-seed-700 dark:text-seed-300">
          <Sprout className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Fruit of the Spirit</span>
        </div>
        <Badge variant={full ? 'green' : 'gray'}>{distinct}/{FRUIT_OF_SPIRIT.length}</Badge>
      </div>

      {full ? (
        <p className="mt-2 text-sm font-semibold text-seed-700 dark:text-seed-300">🌳 A flourishing tree! Every fruit is growing.</p>
      ) : (
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          {interactive ? 'Tap a fruit to celebrate it when you see it in them.' : 'Show each fruit to grow your whole tree.'} — Galatians 5:22–23
        </p>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-5">
        {FRUIT_OF_SPIRIT.map((fruit) => {
          const [emoji, ...name] = fruit.label.split(' ')
          const count = counts[fruit.id] || 0
          const grown = count > 0
          const Tile = interactive ? 'button' : 'div'
          return (
            <Tile
              key={fruit.id}
              {...(interactive ? { onClick: () => give(fruit), type: 'button' } : {})}
              title={name.join(' ')}
              className={`relative flex flex-col items-center gap-1 rounded-xl border p-2.5 transition ${
                grown
                  ? 'border-seed-300 bg-white shadow-sm dark:border-seed-700 dark:bg-gray-900'
                  : 'border-dashed border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
              } ${interactive ? 'hover:border-seed-400 hover:shadow' : ''}`}
            >
              <span className={`text-2xl transition ${grown ? '' : 'opacity-30 grayscale'}`}>{emoji}</span>
              <span className={`text-center text-[11px] font-semibold leading-tight ${grown ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400'}`}>
                {name.join(' ')}
              </span>
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-seed-600 px-1 text-[10px] font-bold text-white">
                  {count}
                </span>
              )}
            </Tile>
          )
        })}
      </div>
    </Card>
  )
}
