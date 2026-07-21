import { useState } from 'react'
import { Button, Input, Textarea, Label, Dialog } from '@/components/ui'
import { useCurrentUser } from '@/lib/hooks'
import { create } from '@/lib/db'
import { todayValue } from '@/lib/events'
import { toast } from '@/lib/toast'

// Shared dialog to add a family calendar event (a dated announcement). Used by
// the dashboard agenda and the month-grid Calendar page. `defaultDate` seeds the
// date field ('YYYY-MM-DD').
export default function AddEventDialog({ open, familyId, defaultDate, onClose }) {
  const user = useCurrentUser()
  const [title, setTitle] = useState('')
  const [date, setDate] = useState(defaultDate || todayValue())
  const [time, setTime] = useState('')
  const [notes, setNotes] = useState('')
  const [weekly, setWeekly] = useState(false)

  function save() {
    if (!title.trim() || !date) return
    create('announcements', {
      family_id: familyId,
      title: title.trim(),
      message: notes.trim(),
      event_date: date,
      event_time: time.trim(),
      repeat: weekly ? 'weekly' : 'none',
      is_pinned: false,
      created_by: user?.id,
      created_at: new Date().toISOString(),
    })
    toast({ title: 'Event added!', message: 'It shows on your dashboard, calendar, and kitchen board.', emoji: '📅' })
    setTitle(''); setTime(''); setNotes(''); setDate(defaultDate || todayValue()); setWeekly(false)
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
        <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={weekly} onChange={(e) => setWeekly(e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-seed-600" />
          Repeat every week
        </label>
      </div>
    </Dialog>
  )
}
