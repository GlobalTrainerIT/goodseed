import { parseISO, isValid, format, startOfDay, differenceInCalendarDays } from 'date-fns'

// The family calendar rides the announcements layer: an announcement with an
// `event_date` ('YYYY-MM-DD') is a dated event. `event_time` is a free label
// ('9:00 AM', 'All day'). Because events are announcements, a coach's dated post
// flows to a following family through the same group-link channel as notices.

export function isEvent(a) {
  return !!a?.event_date
}

/** Parse an event's date to a local Date (midnight), or null. */
export function eventDate(a) {
  if (!a?.event_date) return null
  const d = parseISO(a.event_date)
  return isValid(d) ? d : null
}

/** Dated events within the next `days`, soonest first. Undated notices excluded. */
export function upcomingEvents(list, { days = 21, now = new Date() } = {}) {
  const today = startOfDay(now)
  return list
    .filter((a) => {
      const d = eventDate(a)
      if (!d) return false
      const diff = differenceInCalendarDays(d, today)
      return diff >= 0 && diff <= days
    })
    .sort((x, y) => x.event_date.localeCompare(y.event_date) || (x.event_time || '').localeCompare(y.event_time || ''))
}

/** Group a sorted event list by day: [{ key, date, label, events }]. */
export function groupByDay(events, now = new Date()) {
  const out = []
  const byKey = {}
  events.forEach((e) => {
    const d = eventDate(e)
    if (!d) return
    const key = e.event_date
    if (!byKey[key]) {
      byKey[key] = { key, date: d, label: dayLabel(d, now), events: [] }
      out.push(byKey[key])
    }
    byKey[key].events.push(e)
  })
  return out
}

/** Friendly relative day label: Today / Tomorrow / Wed, Jul 22. */
export function dayLabel(d, now = new Date()) {
  const diff = differenceInCalendarDays(d, startOfDay(now))
  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  return format(d, 'EEE, MMM d')
}

/** Today's date as a form default value ('YYYY-MM-DD'). */
export function todayValue(now = new Date()) {
  return format(now, 'yyyy-MM-dd')
}
