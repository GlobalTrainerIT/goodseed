import { useState, useRef } from 'react'
import { Camera, X } from 'lucide-react'
import { Dialog, Button, Textarea, Label } from '@/components/ui'
import { completeTask } from '@/lib/domain'
import { fileToDataUrl } from '@/lib/utils'

/** Lets a child add an optional note + photo proof when submitting a task. */
export default function TaskDoneDialog({ task, childId, open, onClose }) {
  const [note, setNote] = useState('')
  const [photo, setPhoto] = useState(null)
  const [loading, setLoading] = useState(false)
  const fileRef = useRef(null)

  async function pick(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true)
    const url = await fileToDataUrl(file)
    setPhoto(url)
    setLoading(false)
  }

  function submit() {
    completeTask(task.id, childId, note.trim(), photo)
    setNote(''); setPhoto(null)
    onClose()
  }

  if (!task) return null
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Mark "${task.title}" done`}
      description="Add a note or a photo as proof (optional)."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Submit ✅</Button></>}
    >
      <div className="space-y-4">
        <div>
          <Label>Note</Label>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. I finished my whole chapter!" />
        </div>
        <div>
          <Label>Photo proof</Label>
          {photo ? (
            <div className="relative">
              <img src={photo} alt="proof" className="max-h-48 w-full rounded-lg object-cover" />
              <button onClick={() => setPhoto(null)} className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 py-6 text-sm font-medium text-gray-500 hover:border-seed-400 dark:border-gray-700"
            >
              <Camera className="h-5 w-5" /> {loading ? 'Processing…' : 'Add a photo'}
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
        </div>
      </div>
    </Dialog>
  )
}
