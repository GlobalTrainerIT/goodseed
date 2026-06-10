import { useState } from 'react'
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameMonth, isSameDay, addMonths } from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'
import { TASK_CATEGORIES } from '@/lib/constants'
import { safeParseDate, cn } from '@/lib/utils'

export default function TaskCalendar({ tasks, onOpen }) {
  const [cursor, setCursor] = useState(new Date())
  const monthStart = startOfMonth(cursor)
  const monthEnd = endOfMonth(cursor)
  const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) })

  function tasksOn(day) {
    return tasks.filter((t) => t.due_date && isSameDay(safeParseDate(t.due_date), day))
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between">
        <button onClick={() => setCursor(addMonths(cursor, -1))} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h3 className="font-bold text-gray-900 dark:text-gray-100">{format(cursor, 'MMMM yyyy')}</h3>
        <button onClick={() => setCursor(addMonths(cursor, 1))} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-gray-400">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dayTasks = tasksOn(day)
          const inMonth = isSameMonth(day, cursor)
          const today = isSameDay(day, new Date())
          return (
            <div
              key={day.toISOString()}
              className={cn(
                'min-h-[64px] rounded-lg border p-1 text-left',
                inMonth ? 'border-gray-100 dark:border-gray-800' : 'border-transparent opacity-40',
                today && 'ring-2 ring-seed-400'
              )}
            >
              <div className="text-xs font-semibold text-gray-500">{format(day, 'd')}</div>
              <div className="mt-0.5 space-y-0.5">
                {dayTasks.slice(0, 3).map((t) => {
                  const cat = TASK_CATEGORIES[t.category] || TASK_CATEGORIES.other
                  return (
                    <button
                      key={t.id}
                      onClick={() => onOpen?.(t)}
                      className="flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] font-medium text-white"
                      style={{ backgroundColor: cat.color }}
                      title={t.title}
                    >
                      <span>{cat.emoji}</span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  )
                })}
                {dayTasks.length > 3 && <p className="text-[10px] text-gray-400">+{dayTasks.length - 3} more</p>}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
