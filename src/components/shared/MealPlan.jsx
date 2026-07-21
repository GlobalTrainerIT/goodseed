import { useState, useEffect } from 'react'
import { UtensilsCrossed } from 'lucide-react'
import { Card } from '@/components/ui'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import { mealsForDate, setMeal } from '@/lib/domain'
import { MEAL_TYPES, weekDates, weekdayLabel, todayKey } from '@/lib/meals'

// The weekly family meal plan. Parents type a meal into each day's slots; kids
// and the kitchen board see a read-only plan. This week only, rolling forward.
export default function MealPlan({ familyId, canEdit = false }) {
  const settings = useSettings()
  useCollection('meals') // re-render as slots change
  if (settings.mealsEnabled === false || !familyId) return null

  const days = weekDates()
  const today = todayKey()

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 text-orange-700 dark:text-orange-300">
        <UtensilsCrossed className="h-5 w-5" />
        <span className="text-sm font-bold uppercase tracking-wide">Meal Plan · This Week</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {days.map((date) => (
          <DayCard key={date} familyId={familyId} date={date} meals={mealsForDate(familyId, date)} isToday={date === today} canEdit={canEdit} />
        ))}
      </div>
    </Card>
  )
}

function DayCard({ familyId, date, meals, isToday, canEdit }) {
  const filled = MEAL_TYPES.some((t) => meals[t.id])
  if (!canEdit && !filled) {
    return (
      <div className={`rounded-xl border p-3 ${isToday ? 'border-orange-300 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/15' : 'border-gray-100 dark:border-gray-800'}`}>
        <p className={`text-xs font-bold uppercase tracking-wide ${isToday ? 'text-orange-700 dark:text-orange-300' : 'text-gray-400'}`}>{weekdayLabel(date)}</p>
        <p className="mt-1 text-sm text-gray-400">—</p>
      </div>
    )
  }
  return (
    <div className={`rounded-xl border p-3 ${isToday ? 'border-orange-300 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-900/15' : 'border-gray-100 dark:border-gray-800'}`}>
      <p className={`mb-1.5 text-xs font-bold uppercase tracking-wide ${isToday ? 'text-orange-700 dark:text-orange-300' : 'text-gray-400'}`}>
        {weekdayLabel(date)}{isToday ? ' · Today' : ''}
      </p>
      <div className="space-y-1">
        {MEAL_TYPES.map((t) => (
          <MealSlot key={t.id} familyId={familyId} date={date} type={t} value={meals[t.id] || ''} canEdit={canEdit} />
        ))}
      </div>
    </div>
  )
}

function MealSlot({ familyId, date, type, value, canEdit }) {
  const user = useCurrentUser()
  const [v, setV] = useState(value)
  useEffect(() => { setV(value) }, [value])

  if (!canEdit) {
    if (!value) return null
    return <p className="text-sm text-gray-700 dark:text-gray-200"><span className="mr-1">{type.emoji}</span>{value}</p>
  }

  function save() {
    if (v.trim() !== value) setMeal(familyId, date, type.id, v, user?.id)
  }

  return (
    <div className="flex items-center gap-1.5">
      <span title={type.label} className="text-sm">{type.emoji}</span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur() }}
        placeholder={type.label}
        maxLength={80}
        className="w-full rounded-md border border-transparent bg-gray-50 px-2 py-1 text-sm text-gray-800 placeholder:text-gray-300 hover:border-gray-200 focus:border-orange-300 focus:bg-white focus:outline-none dark:bg-gray-800 dark:text-gray-100 dark:placeholder:text-gray-600 dark:hover:border-gray-700 dark:focus:bg-gray-900"
      />
    </div>
  )
}
