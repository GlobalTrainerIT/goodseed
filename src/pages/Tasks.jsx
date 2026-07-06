import { useState, useMemo } from 'react'
import { Plus, Search, List, LayoutGrid, Calendar as CalendarIcon, Check, X } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button, Input, Tabs, Card } from '@/components/ui'
import TaskCard from '@/components/tasks/TaskCard'
import TaskForm from '@/components/tasks/TaskForm'
import TaskDetailSheet from '@/components/tasks/TaskDetailSheet'
import TaskCalendar from '@/components/tasks/TaskCalendar'
import SortableTaskList from '@/components/tasks/SortableTaskList'
import ChildTaskCard from '@/components/child/ChildTaskCard'
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import Avatar from '@/components/shared/Avatar'
import PhotoProof from '@/components/shared/PhotoProof'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { remove, getById } from '@/lib/db'
import { TASK_CATEGORIES } from '@/lib/constants'
import { taskAppliesTo, approveCompletion, rejectCompletion } from '@/lib/domain'
import { relativeTime, cn } from '@/lib/utils'

export default function Tasks() {
  const user = useCurrentUser()
  const tasks = useCollection('tasks')
  const completions = useCollection('completions')

  const [view, setView] = useState('list')
  const [category, setCategory] = useState('all')
  const [statusTab, setStatusTab] = useState('active')
  const [search, setSearch] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [detail, setDetail] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const famTasks = useMemo(() => tasks.filter((t) => t.family_id === user?.family_id), [tasks, user])

  // ---- child simplified view ----
  if (user?.role === 'child') {
    const myActive = famTasks.filter((t) => t.status === 'active' && taskAppliesTo(t, user.id))
    return (
      <div>
        <PageHeader title="My Tasks" subtitle="Mark a task done to earn seeds 🌱" />
        {myActive.length === 0 ? (
          <EmptyState icon="🎉" title="All done!" description="No tasks assigned right now." />
        ) : (
          <div className="space-y-2.5">
            {myActive.map((t) => <ChildTaskCard key={t.id} task={t} childId={user.id} />)}
          </div>
        )}
      </div>
    )
  }

  // ---- parent view ----
  const pending = completions.filter((c) => c.family_id === user?.family_id && c.status === 'pending_approval')

  const completedTaskIds = new Set(
    completions.filter((c) => c.family_id === user?.family_id && c.status === 'approved').map((c) => c.task_id)
  )

  let visible = famTasks.filter((t) => (statusTab === 'active' ? t.status === 'active' : completedTaskIds.has(t.id)))
  if (category !== 'all') visible = visible.filter((t) => t.category === category)
  if (search.trim()) {
    const q = search.toLowerCase()
    visible = visible.filter((t) => t.title.toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q))
  }
  visible = [...visible].sort((a, b) => (a.sort_order ?? 1e9) - (b.sort_order ?? 1e9) || new Date(a.created_date) - new Date(b.created_date))

  // Drag-reorder only makes sense for the full, unfiltered active list.
  const canReorder = view === 'list' && statusTab === 'active' && category === 'all' && !search.trim()

  const activeCount = famTasks.filter((t) => t.status === 'active').length
  const completedCount = famTasks.filter((t) => completedTaskIds.has(t.id)).length

  const categoryTabs = [
    { value: 'all', label: 'All' },
    ...Object.entries(TASK_CATEGORIES).map(([key, c]) => ({ value: key, label: c.label, emoji: c.emoji })),
  ]

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(t) { setEditing(t); setFormOpen(true) }

  return (
    <div>
      <PageHeader
        title="Tasks"
        subtitle="Assign and manage family tasks"
        actions={
          <>
            <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
              {[['list', List], ['grid', LayoutGrid], ['calendar', CalendarIcon]].map(([v, Icon]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={cn('rounded-md p-1.5', view === v ? 'bg-seed-600 text-white' : 'text-gray-400 hover:text-gray-600')}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
            <Button onClick={openNew}><Plus className="h-4 w-4" /> New Task</Button>
          </>
        }
      />

      {/* Pending approvals */}
      {pending.length > 0 && (
        <Card className="mb-5 border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900/40 dark:bg-amber-900/10">
          <h3 className="mb-3 text-sm font-bold uppercase text-amber-700 dark:text-amber-300">⏳ Pending Approvals ({pending.length})</h3>
          <div className="space-y-2">
            {pending.map((c) => {
              const task = getById('tasks', c.task_id)
              const child = getById('users', c.child_id)
              return (
                <div key={c.id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3 dark:bg-gray-900">
                  <Avatar user={child} size="sm" />
                  {c.photo && <PhotoProof src={c.photo} />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{child?.full_name} · {task?.title}</p>
                    {c.note && <p className="text-xs text-gray-500">"{c.note}"</p>}
                    <p className="text-xs text-gray-400">{relativeTime(c.submitted_date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => approveCompletion(c.id, user.id)}><Check className="h-4 w-4" /> Approve</Button>
                    <Button size="sm" variant="danger" onClick={() => rejectCompletion(c.id, user.id)}><X className="h-4 w-4" /> Reject</Button>
                  </div>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="mb-3">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search tasks…" className="pl-9" />
        </div>
        <Tabs tabs={categoryTabs} value={category} onChange={setCategory} className="mb-3" />
        <Tabs
          tabs={[
            { value: 'active', label: 'Active Tasks', count: activeCount },
            { value: 'completed', label: 'Completed', count: completedCount },
          ]}
          value={statusTab}
          onChange={setStatusTab}
        />
      </div>

      {view === 'calendar' ? (
        <TaskCalendar tasks={visible} onOpen={setDetail} />
      ) : visible.length === 0 ? (
        <EmptyState
          icon="🌱"
          title="No tasks here"
          description="Create your first task to get the family growing."
          action={<Button onClick={openNew}><Plus className="h-4 w-4" /> New Task</Button>}
        />
      ) : canReorder ? (
        <SortableTaskList tasks={visible} onEdit={openEdit} onDelete={setToDelete} onOpen={setDetail} />
      ) : (
        <div className={view === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-3'}>
          {visible.map((t) => (
            <TaskCard key={t.id} task={t} onEdit={openEdit} onDelete={setToDelete} onOpen={setDetail} />
          ))}
        </div>
      )}

      <TaskForm open={formOpen} onClose={() => setFormOpen(false)} task={editing} />
      <TaskDetailSheet
        task={detail}
        open={!!detail}
        onClose={() => setDetail(null)}
        onEdit={(t) => { setDetail(null); openEdit(t) }}
      />
      <DeleteConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        itemName={toDelete?.title}
        onConfirm={() => remove('tasks', toDelete.id)}
      />
    </div>
  )
}
