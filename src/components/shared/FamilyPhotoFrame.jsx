import { useEffect, useState } from 'react'
import { useSettings } from '@/lib/hooks'
import { useFamilyPhotos } from '@/lib/familyPhotos'

// A rotating photo frame for the kitchen board — the classic Skylight touch.
// Cross-fades through the family's local photos every few seconds.
export default function FamilyPhotoFrame({ intervalMs = 7000 }) {
  const settings = useSettings()
  const photos = useFamilyPhotos()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (photos.length <= 1) return
    const t = setInterval(() => setIdx((i) => (i + 1) % photos.length), intervalMs)
    return () => clearInterval(t)
  }, [photos.length, intervalMs])

  // Keep the index valid if photos shrink.
  useEffect(() => {
    if (idx >= photos.length) setIdx(0)
  }, [photos.length, idx])

  if (settings.photosEnabled === false || photos.length === 0) return null
  const current = photos[Math.min(idx, photos.length - 1)]

  return (
    <div className="mt-6 overflow-hidden rounded-3xl bg-black/20 shadow-lg backdrop-blur">
      <div className="relative h-56 w-full sm:h-72 lg:h-80">
        {photos.map((p, i) => (
          <img
            key={p.id}
            src={p.url}
            alt="Family"
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ${i === Math.min(idx, photos.length - 1) ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
        {current?.caption && (
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
            <p className="text-lg font-bold text-white">{current.caption}</p>
          </div>
        )}
        {photos.length > 1 && (
          <div className="absolute bottom-3 right-3 flex gap-1">
            {photos.map((p, i) => (
              <span key={p.id} className={`h-1.5 w-1.5 rounded-full ${i === Math.min(idx, photos.length - 1) ? 'bg-white' : 'bg-white/40'}`} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
