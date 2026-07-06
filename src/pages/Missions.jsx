import { useState, useEffect, useMemo } from 'react'
import { Plus, Rocket, Trash2, Trophy, Clock, Pencil } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button, Card, ProgressBar, Dialog, Input, Textarea, Label, Badge } from '@/components/ui'
import EmptyState from '@/components/shared/EmptyState'
import SeedBadge from '@/components/shared/SeedBadge'
import Confetti from '@/components/gamification/Confetti'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { create, update, remove, getById } from '@/lib/db'
import { missionProgress, completeMission } from '@/lib/domain'
import { TASK_CATEGORIES } from '@/lib/constants'
import { dueLabel } from '@/lib/utils'

export default function Missions() {
  const user = useCurrentUser()
  const missions = useCollection('missions')
  const tasks = useCollection('tasks')
  useCollection('completions')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [confetti, setConfetti] = useState(false)

  const isParent = user?.role === 'parent'
  const famMissions = useMemo(() => missions.filter((m) => m.family_id === user?.family_id), [missions, user])
  const famTasks = tasks.filter((t) => t.family_id === user?.family_id)

  // auto-complete missions that reach 100% and celebrate
  useEffect(() => {
    try {
      famMissions.forEach((m) => {
        if (m.status === 'active') {
          const { done, total } = missionProgress(m)
          if (total > 0 && done >= total) {
            completeMission(m.id)
            setConfetti(true)
            setTimeout(() => setConfetti(false), 3500)
          }
        }
      })
    } catch (e) {
      console.error(e)
    }
  }, [famMissions])

  return (
    <div>
      <Confetti show={confetti} />
      <PageHeader
        title="🚀 Missions"
        subtitle="Multi-task challenges that unlock bonus seeds"
        actions={isParent && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> New Mission</Button>}
      />

      {famMissions.length === 0 ? (
        <EmptyState
          icon="🚀"
          title="No missions yet"
          description="Missions bundle a few tasks into a challenge that rewards bonus seeds when the whole family completes them."
          action={isParent && <Button onClick={() => setOpen(true)}><Plus className="h-4 w-4" /> Create a Mission</Button>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {famMissions.map((m) => {
            const { done, total } = missionProgress(m)
            const pct = total ? Math.round((done / total) * 100) : 0
            const complete = m.status === 'completed'
            return (
              <Card key={m.id} className={complete ? 'border-seed-300 bg-seed-50/60 dark:border-seed-800 dark:bg-seed-900/10' : ''}>
                <div className="p-5">
                  <div className="mb-2 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 text-2xl dark:bg-purple-900/30">
                        {complete ? '🏆' : '🚀'}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-gray-100">{m.title}</h3>
                        {complete ? <Badge variant="green">Completed</Badge> : <SeedBadge amount={m.seed_bonus} />}
                      </div>
                    </div>
                    {isParent && (
                      <div className="flex gap-1">
                        {!complete && (
                          <button aria-label={`Edit ${m.title}`} onClick={() => { setEditing(m); setOpen(true) }} className="rounded-lg p-1.5 text-gray-400 hover:text-purple-600">
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                        <button aria-label={`Delete ${m.title}`} onClick={() => remove('missions', m.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>
                  {m.description && <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">{m.description}</p>}

                  <div className="mb-1 flex items-center justify-between text-sm font-semibold">
                    <span className="text-gray-700 dark:text-gray-200">{done}/{total} tasks</span>
                    <span className="text-gray-400">{pct}%</span>
                  </div>
                  <ProgressBar value={pct} barClass="bg-gradient-to-r from-purple-500 to-seed-500" />

                  <div className="mt-3 space-y-1">
                    {(m.task_ids || []).map((id) => {
                      const t = getById('tasks', id)
                      if (!t) return null
                      const cat = TASK_CATEGORIES[t.category] || TASK_CATEGORIES.other
                      return (
                        <div key={id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                          <span>{cat.emoji}</span> {t.title}
                        </div>
                      )
                    })}
                  </div>

                  {m.deadline && !complete && (
                    <p className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3 w-3" /> Ends {dueLabel(m.deadline)}
                    </p>
                  )}
                  {complete && (
                    <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-seed-700 dark:text-seed-300">
                      <Trophy className="h-4 w-4" /> Bonus seeds awarded!
                    </p>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {isParent && (
        <MissionForm
          open={open}
          onClose={() => { setOpen(false); setEditing(null) }}
          tasks={famTasks}
          user={user}
          mission={editing}
        />
      )}
    </div>
  )
}

function MissionForm({ open, onClose, tasks, user, mission }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [bonus, setBonus] = useState(10)
  const [deadline, setDeadline] = useState('')
  const [selected, setSelected] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setTitle(mission?.title || '')
      setDescription(mission?.description || '')
      setBonus(mission?.seed_bonus ?? 10)
      setDeadline(mission?.deadline ? mission.deadline.slice(0, 10) : '')
      setSelected(mission?.task_ids || [])
      setError('')
    }
  }, [open, mission])

  function toggle(id) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))
  }

  function save() {
    if (!title.trim()) return setError('Please enter a title.')
    if (selected.length < 2) return setError('Pick at least 2 tasks.')
    const payload = {
      title: title.trim(),
      description: description.trim(),
      task_ids: selected,
      seed_bonus: Number(bonus) || 0,
      deadline: deadline ? new Date(deadline + 'T20:00:00').toISOString() : null,
    }
    if (mission) {
      update('missions', mission.id, payload)
    } else {
      create('missions', { ...payload, family_id: user.family_id, status: 'active', created_by: user.id })
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={mission ? 'Edit Mission' : 'New Mission'}
      description="Bundle 2–5 tasks into a challenge."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>{mission ? 'Save changes' : 'Create mission'}</Button></>}
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30">{error}</p>}
      <div className="space-y-4">
        <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Helpful Week Challenge" autoFocus /></div>
        <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Bonus seeds</Label><Input type="number" min={0} value={bonus} onChange={(e) => setBonus(e.target.value)} /></div>
          <div><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
        </div>
        <div>
          <Label>Tasks (2–5) — {selected.length} selected</Label>
          <div className="max-h-44 space-y-1.5 overflow-y-auto">
            {tasks.map((t) => {
              const cat = TASK_CATEGORIES[t.category] || TASK_CATEGORIES.other
              const on = selected.includes(t.id)
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggle(t.id)}
                  disabled={!on && selected.length >= 5}
                  className={`flex w-full items-center gap-2 rounded-lg border p-2.5 text-left text-sm transition disabled:opacity-40 ${
                    on ? 'border-seed-500 bg-seed-50 dark:bg-seed-900/20' : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <span>{cat.emoji}</span>
                  <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">{t.title}</span>
                  {on && <span className="text-seed-600">✓</span>}
                </button>
              )
            })}
            {tasks.length === 0 && <p className="text-sm text-gray-400">Create some tasks first.</p>}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
