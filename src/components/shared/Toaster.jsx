import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { useToasts, dismissToast } from '@/lib/toast'
import { cn } from '@/lib/utils'

const ICONS = {
  success: <CheckCircle2 className="h-5 w-5 text-seed-600" />,
  error: <XCircle className="h-5 w-5 text-red-600" />,
  info: <Info className="h-5 w-5 text-blue-600" />,
}

export default function Toaster() {
  const toasts = useToasts()
  if (!toasts.length) return null
  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[60] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border border-gray-100 bg-white p-3.5 shadow-lg animate-pop dark:border-gray-800 dark:bg-gray-900'
          )}
        >
          <div className="mt-0.5 text-xl">{t.emoji || ICONS[t.type] || ICONS.success}</div>
          <div className="min-w-0 flex-1">
            {t.title && <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{t.title}</p>}
            {t.message && <p className="text-sm text-gray-500 dark:text-gray-400">{t.message}</p>}
          </div>
          <button onClick={() => dismissToast(t.id)} className="text-gray-300 hover:text-gray-500">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>,
    document.body
  )
}
