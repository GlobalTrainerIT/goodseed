import { useState } from 'react'
import { Dialog } from '@/components/ui'

/** Small photo-proof thumbnail that opens full-size on click. */
export default function PhotoProof({ src, className = '' }) {
  const [open, setOpen] = useState(false)
  if (!src) return null
  return (
    <>
      <button onClick={() => setOpen(true)} className={`block ${className}`} title="View photo proof">
        <img src={src} alt="Task proof" className="h-14 w-14 rounded-lg object-cover ring-1 ring-gray-200 dark:ring-gray-700" />
      </button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Photo proof">
        <img src={src} alt="Task proof" className="mx-auto max-h-[60vh] rounded-lg object-contain" />
      </Dialog>
    </>
  )
}
