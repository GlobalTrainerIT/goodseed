import { useState, useEffect } from 'react'
import { Dialog, Button, Input, Textarea, Select, Label, Toggle } from '@/components/ui'
import { TASK_CATEGORIES } from '@/lib/constants'
import { create, update, getAll } from '@/lib/db'
import { useCurrentUser } from '@/lib/hooks'
import { toast } from '@/lib/toast'
import { clamp } from '@/lib/utils'

const EMPTY = {
  title: '',
  description: '',
  category: 'chores',
  seed_value: 1,
  frequency: 'daily',
  due_date: '',
  assigned_children: [],
  requires_approval: true,
}

export default function TaskForm({ open, onClose, task }) {
  const user = useCurrentUser()
  const children = getAll('users').filter((u) => u.family_id === user?.family_id && u.role === 'child')
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(
        task
          ? {
              ...task,
              due_date: task.due_date ? task.due_date.slice(0, 10) : '',
            }
          : EMPTY
      )
    }
  }, [open, task])

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function toggleChild(id) {
    setForm((f) => ({
      ...f,
      assigned_children: f.assigned_children.includes(id)
        ? f.assigned_children.filter((c) => c !== id)
        : [...f.assigned_children, id],
    }))
  }

  function save() {
    if (!form.title.trim()) return setError('Please enter a title.')
    if (!form.category) return setError('Please choose a category.')
    const seeds = clamp(Number(form.seed_value) || 1, 1, 100)
    const payload = {
      family_id: user.family_id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      seed_value: seeds,
      frequency: form.frequency,
      due_date: form.due_date ? new Date(form.due_date + 'T20:00:00').toISOString() : null,
      assigned_children: form.assigned_children,
      requires_approval: form.requires_approval,
      status: 'active',
    }
    if (task) {
      update('tasks', task.id, payload)
      toast({ title: 'Task updated!', emoji: '✏️' })
    } else {
      const maxOrder = getAll('tasks')
        .filter((t) => t.family_id === user.family_id)
        .reduce((m, t) => Math.max(m, t.sort_order ?? 0), -1)
      create('tasks', { ...payload, created_by: user.id, sort_order: maxOrder + 1 })
      toast({ title: 'Task created!', emoji: '✅' })
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? 'Edit Task' : 'New Task'}
      description="Assign a task and reward seeds when it's done."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>{task ? 'Save changes' : 'Create task'}</Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30">{error}</p>}
      <div className="space-y-4">
        <div>
          <Label>Title *</Label>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Tidy your room" autoFocus />
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional details…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category *</Label>
            <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {Object.entries(TASK_CATEGORIES).map(([key, c]) => (
                <option key={key} value={key}>{c.emoji} {c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Seed value (1–100)</Label>
            <Input type="number" min={1} max={100} value={form.seed_value} onChange={(e) => set('seed_value', e.target.value)} />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Frequency</Label>
            <Select value={form.frequency} onChange={(e) => set('frequency', e.target.value)}>
              <option value="once">Once</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </Select>
          </div>
          <div>
            <Label>Due date</Label>
            <Input type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Assign to</Label>
          <p className="mb-2 text-xs text-gray-400">Leave all unchecked to assign to <b>every</b> child.</p>
          <div className="flex flex-wrap gap-2">
            {children.map((c) => {
              const on = form.assigned_children.includes(c.id)
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleChild(c.id)}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition ${
                    on ? 'border-seed-500 bg-seed-50 text-seed-700 dark:bg-seed-900/30' : 'border-gray-200 text-gray-600 dark:border-gray-700 dark:text-gray-300'
                  }`}
                >
                  <span>{c.avatar_emoji}</span> {c.full_name}
                </button>
              )
            })}
            {children.length === 0 && <span className="text-sm text-gray-400">No children yet.</span>}
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Requires parent approval</p>
            <p className="text-xs text-gray-400">If off, seeds are awarded instantly.</p>
          </div>
          <Toggle checked={form.requires_approval} onChange={(v) => set('requires_approval', v)} />
        </div>
      </div>
    </Dialog>
  )
}
