import { Loader2 } from 'lucide-react'

export default function LoadingSpinner({ label = 'Loading…' }) {
  return (
    <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-gray-400">
      <Loader2 className="h-8 w-8 animate-spin text-seed-500" />
      <span className="text-sm">{label}</span>
    </div>
  )
}
