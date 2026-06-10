import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical } from 'lucide-react'
import TaskCard from './TaskCard'
import { reorderTasks } from '@/lib/domain'

function SortableItem({ task, onEdit, onDelete, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, zIndex: isDragging ? 10 : 'auto' }
  return (
    <div ref={setNodeRef} style={style} className="relative flex items-stretch gap-1">
      <button
        {...attributes}
        {...listeners}
        className="flex w-7 cursor-grab touch-none items-center justify-center rounded-lg text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        title="Drag to reorder"
        aria-label="Drag to reorder"
      >
        <GripVertical className="h-5 w-5" />
      </button>
      <div className="flex-1">
        <TaskCard task={task} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} />
      </div>
    </div>
  )
}

export default function SortableTaskList({ tasks, onEdit, onDelete, onOpen }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function handleDragEnd(event) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const ids = tasks.map((t) => t.id)
    const next = arrayMove(ids, ids.indexOf(active.id), ids.indexOf(over.id))
    reorderTasks(next)
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-3">
          {tasks.map((t) => (
            <SortableItem key={t.id} task={t} onEdit={onEdit} onDelete={onDelete} onOpen={onOpen} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
