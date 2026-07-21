import { parseISO, isValid, format, startOfDay, differenceInCalendarDays, addDays, isAfter, isBefore } from 'date-fns'

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

/**
 * Expand a list into concrete event occurrences within [from, to] (inclusive),
 * unrolling weekly-recurring events (`repeat: 'weekly'`). Each occurrence is a
 * shallow copy carrying its own `event_date`.
 */
export function expandInRange(list, from, to) {
  const fromD = startOfDay(from)
  const toD = startOfDay(to)
  const out = []
  list.forEach((a) => {
    const base = eventDate(a)
    if (!base) return
    if (a.repeat === 'weekly') {
      let d = base
      if (isBefore(d, fromD)) {
        const weeks = Math.ceil(differenceInCalendarDays(fromD, d) / 7)
        d = addDays(base, weeks * 7)
      }
      while (!isAfter(d, toD)) {
        if (!isBefore(d, fromD)) out.push({ ...a, event_date: format(d, 'yyyy-MM-dd'), _occurrence: true })
        d = addDays(d, 7)
      }
    } else if (!isBefore(base, fromD) && !isAfter(base, toD)) {
      out.push(a)
    }
  })
  return out.sort((x, y) => x.event_date.localeCompare(y.event_date) || (x.event_time || '').localeCompare(y.event_time || ''))
}

/** Dated events within the next `days`, soonest first (recurrences expanded). */
export function upcomingEvents(list, { days = 21, now = new Date() } = {}) {
  return expandInRange(list, now, addDays(startOfDay(now), days))
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
