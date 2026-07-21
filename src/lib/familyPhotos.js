// Local-only family photos for the kitchen-board photo frame.
//
// Like roster photos, these live ONLY in this device's localStorage and never
// enter the cloud mirror — keeping photos off our servers. They power a rotating
// frame on the Display board (the classic Skylight touch). Capped so a handful
// of downscaled JPEGs stay well within the localStorage quota.
import { useSyncExternalStore } from 'react'

const KEY = 'goodseed_family_photos'
export const MAX_PHOTOS = 12

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]')
  } catch {
    return []
  }
}

let photos = load()
const listeners = new Set()

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(photos))
  } catch {
    /* quota — the newest photo just won't persist; the app keeps working */
  }
  listeners.forEach((l) => l())
}

// A short id without Date/Math dependencies at module scope (fine in app code).
function makeId() {
  return 'ph_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36)
}

export function addFamilyPhoto(url, caption = '') {
  if (!url) return null
  const rec = { id: makeId(), url, caption: String(caption || '').slice(0, 80) }
  photos = [rec, ...photos].slice(0, MAX_PHOTOS) // newest first, capped
  emit()
  return rec
}

export function removeFamilyPhoto(id) {
  if (!photos.some((p) => p.id === id)) return
  photos = photos.filter((p) => p.id !== id)
  emit()
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getFamilyPhotos() {
  return photos
}

export function useFamilyPhotos() {
  return useSyncExternalStore(subscribe, () => photos, () => photos)
}
