import { useState } from 'react'
import { CalendarDays, Plus, Trash2, Clock } from 'lucide-react'
import { Card, Button, Input, Textarea, Label, Dialog, Badge } from '@/components/ui'
import { useCurrentUser, useCollection } from '@/lib/hooks'
import { useFollowedData } from '@/lib/groupLink'
import { create, remove } from '@/lib/db'
import { upcomingEvents, groupByDay, todayValue } from '@/lib/events'
import { toast } from '@/lib/toast'

// The family command-center agenda: upcoming dated events for this family, plus
// events from any group the family follows (a coach's "Saturday game 9am" lands
// here through the same channel as announcements). Parents can add family events.
export default function UpcomingEvents({ familyId, canAdd = false, days = 21 }) {
  const announcements = useCollection('announcements')
  const { followed, snapshots } = useFollowedData()
  const [adding, setAdding] = useState(false)

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
        {canAdd && (
          <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Add event</Button>
        )}
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
                  <EventRow key={e.id || `${e.event_date}-${e.title}`} event={e} canDelete={canAdd && !e._external} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <AddEventDialog open={adding} familyId={familyId} onClose={() => setAdding(false)} />
    </Card>
  )
}

function EventRow({ event, canDelete }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-gray-100 p-2.5 dark:border-gray-800">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{event.title}</p>
          {event.event_time && (
            <span className="flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400">
              <Clock className="h-3 w-3" /> {event.event_time}
            </span>
          )}
          {event._external && <Badge variant="blue">{event.group}</Badge>}
        </div>
        {event.message && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{event.message}</p>}
      </div>
      {canDelete && (
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

function AddEventDialog({ open, familyId, onClose }) {
  const user = useCurrentUser()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(todayValue())
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')

  function save() {
    if (!title.trim() || !date) return
    create('announcements', {
      family_id: familyId,
      title: title.trim(),
      message: notes.trim(),
      event_date: date,
      event_time: time.trim(),
      is_pinned: false,
      created_by: user?.id,
      created_at: new Date().toISOString(),
    })
    toast({ title: 'Event added!', message: 'It shows on your dashboard and kitchen board.', emoji: '📅' })
    setTitle(''); setTime(''); setNotes(''); setDate(todayValue())
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add a family event"
      description="Games, appointments, birthdays — anything to keep on the family calendar."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!title.trim() || !date}>Add event</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>Event</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Soccer game" autoFocus />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          <div>
            <Label>Time (optional)</Label>
            <Input value={time} onChange={(e) => setTime(e.target.value)} placeholder="e.g. 9:00 AM" />
          </div>
        </div>
        <div>
          <Label>Notes (optional)</Label>
          <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="e.g. Wear the blue jersey. Snacks: us." />
        </div>
      </div>
    </Dialog>
  )
}
