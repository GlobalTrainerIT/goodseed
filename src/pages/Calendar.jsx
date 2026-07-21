import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, Clock } from 'lucide-react'
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval,
  addMonths, format, isSameMonth, isToday, isSameDay,
} from 'date-fns'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button } from '@/components/ui'
import AddEventDialog from '@/components/shared/AddEventDialog'
import { useCurrentUser, useCollection } from '@/lib/hooks'
import { getById } from '@/lib/db'
import { useFollowedData } from '@/lib/groupLink'
import { expandInRange, eventDate, todayValue } from '@/lib/events'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// A month-grid family calendar. Events come from the family's own dated
// announcements plus events from any followed group, with weekly recurrences
// expanded across the visible month.
export default function Calendar() {
  const user = useCurrentUser()
  const announcements = useCollection('announcements', (all) => all.filter((a) => a.family_id === user?.family_id))
  const { followed, snapshots } = useFollowedData()
  const [monthAnchor, setMonthAnchor] = useState(() => startOfMonth(new Date()))
  const [addFor, setAddFor] = useState(null) // 'YYYY-MM-DD' when adding on a day
  const [editEvent, setEditEvent] = useState(null) // base announcement record when editing

  // Open the editor for one of our own events (external group events are
  // read-only). Recurrence occurrences resolve to their base record so edits
  // apply to the whole series, not just one week.
  function openEvent(ev) {
    if (ev._external || !canAdd) return
    setEditEvent(getById('announcements', ev.id) || ev)
  }

  if (!user) return null
  const canAdd = user.role === 'parent'

  const gridStart = startOfWeek(startOfMonth(monthAnchor))
  const gridEnd = endOfWeek(endOfMonth(monthAnchor))
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd })

  const fromGroups = followed.flatMap((f) =>
    (snapshots[f.code]?.announcements || []).map((a) => ({ ...a, group: snapshots[f.code]?.group_name || f.groupName, _external: true }))
  )
  const occurrences = expandInRange([...announcements, ...fromGroups], gridStart, gridEnd)
  const byDay = {}
  occurrences.forEach((e) => {
    const d = eventDate(e)
    if (!d) return
    const key = format(d, 'yyyy-MM-dd')
    ;(byDay[key] = byDay[key] || []).push(e)
  })

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="📅 Family Calendar"
        subtitle="Everything ahead — family events and the groups you follow, all in one place."
        actions={canAdd && <Button onClick={() => setAddFor(todayValue())}><Plus className="h-4 w-4" /> Add event</Button>}
      />

      <Card className="p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{format(monthAnchor, 'MMMM yyyy')}</h2>
          <div className="flex items-center gap-1">
            <Button variant="secondary" size="sm" onClick={() => setMonthAnchor(startOfMonth(new Date()))}>Today</Button>
            <button onClick={() => setMonthAnchor((m) => addMonths(m, -1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous month">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={() => setMonthAnchor((m) => addMonths(m, 1))} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next month">
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {WEEKDAYS.map((d) => (
            <div key={d} className="pb-1 text-center text-xs font-bold uppercase tracking-wide text-gray-400">{d}</div>
          ))}
          {days.map((day) => {
            const key = format(day, 'yyyy-MM-dd')
            const dayEvents = byDay[key] || []
            const inMonth = isSameMonth(day, monthAnchor)
            const today = isToday(day)
            return (
              <button
                key={key}
                onClick={() => canAdd && setAddFor(key)}
                className={`min-h-[74px] rounded-lg border p-1.5 text-left align-top transition sm:min-h-[92px] ${
                  today ? 'border-seed-400 bg-seed-50/60 dark:border-seed-600 dark:bg-seed-900/20' : 'border-gray-100 dark:border-gray-800'
                } ${inMonth ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/60 dark:bg-gray-900/40'} ${canAdd ? 'hover:border-seed-300' : 'cursor-default'}`}
              >
                <div className={`text-xs font-bold ${today ? 'text-seed-700 dark:text-seed-300' : inMonth ? 'text-gray-700 dark:text-gray-200' : 'text-gray-300 dark:text-gray-600'}`}>
                  {format(day, 'd')}
                </div>
                <div className="mt-0.5 space-y-0.5">
                  {dayEvents.slice(0, 3).map((e, i) => (
                    <div
                      key={(e.id || e.title) + i}
                      onClick={(ev) => { ev.stopPropagation(); openEvent(e) }}
                      title={`${e.event_time ? e.event_time + ' · ' : ''}${e.title}${e.group ? ` (${e.group})` : ''}${!e._external && canAdd ? ' — tap to edit' : ''}`}
                      className={`truncate rounded px-1 py-0.5 text-[10px] font-semibold leading-tight ${
                        e._external
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                          : `bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 ${canAdd ? 'hover:bg-indigo-200 dark:hover:bg-indigo-800' : ''}`
                      }`}
                    >
                      {e.event_time ? `${e.event_time} ` : ''}{e.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && <div className="px-1 text-[10px] font-medium text-gray-400">+{dayEvents.length - 3} more</div>}
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      <AddEventDialog open={!!addFor} familyId={user.family_id} defaultDate={addFor} onClose={() => setAddFor(null)} />
      <AddEventDialog open={!!editEvent} familyId={user.family_id} event={editEvent} onClose={() => setEditEvent(null)} />
    </div>
  )
}
