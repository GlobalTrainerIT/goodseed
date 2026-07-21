import { useRef, useState } from 'react'
import { Images, Camera, Trash2 } from 'lucide-react'
import { Card, Button } from '@/components/ui'
import { useSettings } from '@/lib/hooks'
import { useFamilyPhotos, addFamilyPhoto, removeFamilyPhoto, MAX_PHOTOS } from '@/lib/familyPhotos'
import { fileToDataUrl } from '@/lib/utils'
import { toast } from '@/lib/toast'

// Manage the family photos that rotate on the kitchen board. Photos are
// downscaled and kept on this device only — never uploaded or synced.
export default function PhotoLane() {
  const settings = useSettings()
  const photos = useFamilyPhotos()
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  if (settings.photosEnabled === false) return null
  const full = photos.length >= MAX_PHOTOS

  async function pick(e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    let added = 0
    for (const file of files) {
      if (photos.length + added >= MAX_PHOTOS) break
      const url = await fileToDataUrl(file, 800, 0.7)
      if (url) { addFamilyPhoto(url); added += 1 }
    }
    setBusy(false)
    if (added) toast({ title: `Added ${added} photo${added === 1 ? '' : 's'}`, message: 'They’ll rotate on the kitchen board.', emoji: '🖼️' })
    else toast({ title: "Couldn't read those images", type: 'error' })
  }

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300">
          <Images className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Family Photos</span>
        </div>
        <span className="text-xs font-semibold text-gray-400">{photos.length}/{MAX_PHOTOS}</span>
      </div>

      <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={pick} />

      {photos.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 px-6 py-10 text-center hover:border-rose-300 dark:border-gray-700 dark:bg-gray-900/40"
        >
          <Camera className="h-8 w-8 text-rose-400" />
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">{busy ? 'Loading…' : 'Add family photos'}</span>
          <span className="text-xs text-gray-400">They rotate on the kitchen board</span>
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.id} className="group relative aspect-square overflow-hidden rounded-xl">
                <img src={p.url} alt="Family" className="h-full w-full object-cover" />
                <button
                  onClick={() => { removeFamilyPhoto(p.id); toast({ title: 'Photo removed', emoji: '🗑️' }) }}
                  className="absolute right-1 top-1 hidden rounded-full bg-black/50 p-1.5 text-white hover:bg-red-600 group-hover:block"
                  aria-label="Remove photo"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy || full}>
              <Camera className="h-4 w-4" /> {busy ? 'Loading…' : full ? 'Photo limit reached' : 'Add more'}
            </Button>
          </div>
        </>
      )}

      <p className="mt-3 rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        🔒 Photos stay on <b>this device only</b> — never uploaded or synced.
      </p>
    </Card>
  )
}
