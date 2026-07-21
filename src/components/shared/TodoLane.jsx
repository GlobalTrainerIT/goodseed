import { useState } from 'react'
import { ListTodo, Plus, Trash2, Check } from 'lucide-react'
import { Card, Button, Input, Select, Badge } from '@/components/ui'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import { familyTodos, addTodo, toggleTodo, removeTodo, clearDoneTodos } from '@/lib/domain'

// A shared family checklist for the command-center. Anyone in the family can add
// items, check them off, assign them to a person, and clear finished ones. This
// is intentionally separate from Tasks (the seed-earning chore engine).
export default function TodoLane({ familyId }) {
  const user = useCurrentUser()
  const settings = useSettings()
  useCollection('todos') // re-render as items change
  const members = useCollection('users', (all) => all.filter((u) => u.family_id === familyId))
  const [text, setText] = useState('')
  const [assignee, setAssignee] = useState('')

  if (settings.todosEnabled === false || !familyId) return null

  const todos = familyTodos(familyId)
  const openCount = todos.filter((t) => !t.done).length
  const doneCount = todos.length - openCount
  const nameOf = (id) => members.find((m) => m.id === id)?.full_name || ''

  function add() {
    if (!text.trim()) return
    addTodo(familyId, text, assignee || null, user?.id)
    setText('')
    setAssignee('')
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-teal-700 dark:text-teal-300">
          <ListTodo className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Family To-Do</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={openCount > 0 ? 'green' : 'gray'}>{openCount} to do</Badge>
          {doneCount > 0 && (
            <button onClick={() => clearDoneTodos(familyId)} className="text-xs font-semibold text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              Clear done
            </button>
          )}
        </div>
      </div>

      <div className="flex items-end gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a to-do… e.g. Buy groceries"
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
        {members.length > 0 && (
          <Select className="w-32 flex-shrink-0" value={assignee} onChange={(e) => setAssignee(e.target.value)}>
            <option value="">Anyone</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </Select>
        )}
        <Button onClick={add} disabled={!text.trim()}><Plus className="h-4 w-4" /> Add</Button>
      </div>

      <div className="mt-4 space-y-1.5">
        {todos.length === 0 ? (
          <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">Nothing on the list — add the family's shared reminders above.</p>
        ) : (
          todos.map((t) => (
            <div key={t.id} className="group flex items-center gap-3 rounded-xl border border-gray-100 p-2.5 dark:border-gray-800">
              <button
                onClick={() => toggleTodo(t.id, user?.id)}
                className={`flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border-2 ${t.done ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-300 text-transparent hover:border-teal-400 dark:border-gray-600'}`}
                aria-label={t.done ? 'Mark not done' : 'Mark done'}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <span className={`flex-1 text-sm ${t.done ? 'text-gray-400 line-through' : 'font-medium text-gray-800 dark:text-gray-100'}`}>{t.text}</span>
              {t.assigned_to && nameOf(t.assigned_to) && <Badge variant="blue">{nameOf(t.assigned_to)}</Badge>}
              <button
                onClick={() => removeTodo(t.id)}
                className="rounded-lg p-1.5 text-gray-300 opacity-0 hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
