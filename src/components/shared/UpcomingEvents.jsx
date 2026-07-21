import { useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Plus, Trash2, Clock } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import { useCollection } from '@/lib/hooks'
import { useFollowedData } from '@/lib/groupLink'
import { remove, getById } from '@/lib/db'
import { upcomingEvents, groupByDay } from '@/lib/events'
import AddEventDialog from '@/components/shared/AddEventDialog'
import { toast } from '@/lib/toast'

// The family command-center agenda: upcoming dated events for this family, plus
// events from any group the family follows (a coach's "Saturday game 9am" lands
// here through the same channel as announcements). Parents can add family events.
export default function UpcomingEvents({ familyId, canAdd = false, days = 21 }) {
  const announcements = useCollection('announcements')
  const { followed, snapshots } = useFollowedData()
  const [adding, setAdding] = useState(false)
  const [editState, setEditState] = useState(null) // { record, occ }

  // Own events open the editor (occurrences resolve to their base record);
  // followed-group events are read-only.
  const openEvent = (e) => setEditState({ record: getById('announcements', e.id) || e, occ: e.event_date })

  const own = announcements.filter((a) => a.family_id === familyId)
  const fromGroups = followed.flatMap((f) =>
    (snapshots[f.code]?.announcements || []).map((a) => ({ ...a, group: snapshots[f.code]?.group_name || f.groupName, _external: true }))
  )
  const events = upcomingEvents([...own, ...fromGroups], { days })
  const days_ = groupByDay(events)

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
          <CalendarDays className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">This Week &amp; Ahead</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/Calendar" className="text-xs font-semibold text-indigo-600 hover:underline dark:text-indigo-400">Full calendar →</Link>
          {canAdd && (
            <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add event</Button>
          )}
        </div>
      </div>

      {days_.length === 0 ? (
        <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          {canAdd ? 'Nothing scheduled yet — add a family event, or follow a group to see their events here.' : 'No upcoming events.'}
        </p>
      ) : (
        <div className="space-y-4">
          {days_.map((day) => (
            <div key={day.key}>
              <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">{day.label}</p>
              <div className="space-y-1.5">
                {day.events.map((e) => (
                  <EventRow
                    key={e.id || `${e.event_date}-${e.title}`}
                    event={e}
                    onEdit={canAdd && !e._external ? () => openEvent(e) : null}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEventDialog open={adding} familyId={familyId} onClose={() => setAdding(false)} />
      <AddEventDialog open={!!editState} familyId={familyId} event={editState?.record} occurrenceDate={editState?.occ} onClose={() => setEditState(null)} />
    </Card>
  )
}

function EventRow({ event, onEdit }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-2.5 dark:border-gray-800">
      <button
        type="button"
        onClick={onEdit || undefined}
        className={`min-w-0 flex-1 text-left ${onEdit ? 'cursor-pointer' : 'cursor-default'}`}
        title={onEdit ? 'Tap to edit' : undefined}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
          {event.event_time && (
            <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Clock className="h-3 w-3" /> {event.event_time}
            </span>
          )}
          {event.repeat === 'weekly' && <Badge variant="gray">↻ weekly</Badge>}
          {event._external && <Badge variant="blue">{event.group}</Badge>}
        </div>
        {event.message && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{event.message}</p>}
      </button>
      {onEdit && (
        <button
          onClick={() => { remove('announcements', event.id); toast({ title: 'Event removed', emoji: '🗑️' }) }}
          className="rounded-lg p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
          aria-label="Delete event"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  )
}
