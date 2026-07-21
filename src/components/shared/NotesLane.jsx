import { useState } from 'react'
import { StickyNote, Plus, Trash2 } from 'lucide-react'
import { Card, Button, Input } from '@/components/ui'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import { familyNotesList, addNote, removeNote } from '@/lib/domain'
import { formatDate } from '@/lib/utils'

// Sticky-note colors — shared with the kitchen board so a note looks the same
// everywhere.
export const NOTE_COLORS = [
  { id: 'yellow', dot: 'bg-amber-300', card: 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/60' },
  { id: 'pink', dot: 'bg-pink-300', card: 'bg-pink-50 border-pink-200 dark:bg-pink-900/20 dark:border-pink-800/60' },
  { id: 'blue', dot: 'bg-sky-300', card: 'bg-sky-50 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800/60' },
  { id: 'green', dot: 'bg-emerald-300', card: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/60' },
]
export function noteCard(colorId) {
  return (NOTE_COLORS.find((c) => c.id === colorId) || NOTE_COLORS[0]).card
}

// The family message board: shared sticky notes anyone in the family can post.
export default function NotesLane({ familyId }) {
  const user = useCurrentUser()
  const settings = useSettings()
  useCollection('familyNotes') // re-render as notes change
  const members = useCollection('users', (all) => all.filter((u) => u.family_id === familyId))
  const [text, setText] = useState('')
  const [color, setColor] = useState('yellow')

  if (settings.notesEnabled === false || !familyId) return null

  const notes = familyNotesList(familyId)
  const nameOf = (id) => members.find((m) => m.id === id)?.full_name || ''

  function add() {
    if (!text.trim()) return
    addNote(familyId, text, color, user?.id)
    setText('')
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center gap-2 text-amber-700 dark:text-amber-300">
        <StickyNote className="h-5 w-5" />
        <span className="text-sm font-bold uppercase tracking-wide">Family Notes</span>
      </div>

      <div className="flex items-end gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Leave a note for the family…"
          maxLength={200}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        <div className="flex flex-shrink-0 items-center gap-1">
          {NOTE_COLORS.map((c) => (
            <button
              key={c.id}
              onClick={() => setColor(c.id)}
              className={`h-6 w-6 rounded-full ${c.dot} ${color === c.id ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-offset-gray-900' : ''}`}
              aria-label={`${c.id} note`}
            />
          ))}
        </div>
        <Button onClick={add} disabled={!text.trim()}><Plus className="h-4 w-4" /> Post</Button>
      </div>

      <div className="mt-4">
        {notes.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">No notes yet — leave the first one above.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {notes.map((n) => (
              <div key={n.id} className={`group relative rounded-xl border p-3 ${noteCard(n.color)}`}>
                <p className="whitespace-pre-wrap break-words text-sm font-medium text-gray-800 dark:text-gray-100">{n.text}</p>
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  {nameOf(n.created_by) && <span className="font-semibold">{nameOf(n.created_by)}</span>}
                  {n.created_at ? ` · ${formatDate(n.created_at, 'MMM d')}` : ''}
                </p>
                <button
                  onClick={() => removeNote(n.id)}
                  className="absolute right-1.5 top-1.5 hidden rounded-lg p-1.5 text-gray-400 hover:bg-black/5 hover:text-red-500 group-hover:block dark:hover:bg-white/10"
                  aria-label="Delete note"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
