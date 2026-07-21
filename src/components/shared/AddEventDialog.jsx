import { useState, useEffect } from 'react'
import { Button, Input, Textarea, Label, Dialog } from '@/components/ui'
import { useCurrentUser } from '@/lib/hooks'
import { create, update, remove } from '@/lib/db'
import { todayValue } from '@/lib/events'
import { toast } from '@/lib/toast'

// Shared dialog to add OR edit a family calendar event (a dated announcement).
// Pass `event` to edit an existing one (adds Delete + saves in place); pass
// `defaultDate` to seed the date when adding. Used by the dashboard agenda and
// the month-grid Calendar page.
export default function AddEventDialog({ open, familyId, event, defaultDate, onClose }) {
  const user = useCurrentUser()
  const editing = !!event
  const [title, setTitle] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [weekly, setWeekly] = useState(false)

  // Seed the fields whenever the dialog opens (from the event when editing, or
  // the defaults when adding).
  useEffect(() => {
    if (!open) return
    if (event) {
      setTitle(event.title || '')
      setDate(event.event_date || todayValue())
      setTime(event.event_time || '')
      setNotes(event.message || '')
      setWeekly(event.repeat === 'weekly')
    } else {
      setTitle('')
      setDate(defaultDate || todayValue())
      setTime('')
      setNotes('')
      setWeekly(false)
    }
  }, [open, event, defaultDate])

  function save() {
    if (!title.trim() || !date) return
    const payload = { title: title.trim(), message: notes.trim(), event_date: date, event_time: time.trim(), repeat: weekly ? 'weekly' : 'none' }
    if (editing) {
      update('announcements', event.id, payload)
      toast({ title: 'Event updated', emoji: '📅' })
    } else {
      create('announcements', { family_id: familyId, ...payload, is_pinned: false, created_by: user?.id, created_at: new Date().toISOString() })
      toast({ title: 'Event added!', message: 'It shows on your dashboard, calendar, and kitchen board.', emoji: '📅' })
    }
    onClose()
  }

  function del() {
    remove('announcements', event.id)
    toast({ title: 'Event removed', emoji: '🗑️' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? 'Edit event' : 'Add a family event'}
      description={editing ? (weekly ? 'This event repeats weekly — changes apply to the whole series.' : 'Update the details below.') : 'Games, appointments, birthdays — anything to keep on the family calendar.'}
      footer={
        <>
          {editing && (
            <Button variant="outline" onClick={del} className="mr-auto border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900">
              Delete
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!title.trim() || !date}>{editing ? 'Save' : 'Add event'}</Button>
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
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-seed-600" />
          Repeat every week
        </label>
      </div>
    </Dialog>
  )
}
