import { startOfWeek, addDays, format, parseISO, isValid } from 'date-fns'

// The weekly meal plan: one line per (day, meal type) for the family. Days are
// concrete dates ('YYYY-MM-DD') for the current week, so the plan rolls forward
// naturally like the calendar.

export const MEAL_TYPES = [
  { id: 'breakfast', emoji: '🍳', label: 'Breakfast' },
  { id: 'lunch', emoji: '🥪', label: 'Lunch' },
  { id: 'dinner', emoji: '🍽️', label: 'Dinner' },
]

/** The seven date strings of the week containing `now` (Sunday–Saturday). */
export function weekDates(now = new Date()) {
  const start = startOfWeek(now)
  return Array.from({ length: 7 }, (_, i) => format(addDays(start, i), 'yyyy-MM-dd'))
}

/** Short weekday label for a 'YYYY-MM-DD' string (Sun, Mon, …). */
export function weekdayLabel(dateStr) {
  const d = parseISO(dateStr)
  return isValid(d) ? format(d, 'EEE') : ''
}

/** Today's date value ('YYYY-MM-DD'). */
export function todayKey(now = new Date()) {
  return format(now, 'yyyy-MM-dd')
}
