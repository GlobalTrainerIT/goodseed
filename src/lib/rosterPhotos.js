// Local-only roster photos for Teams/Classroom groups.
//
// Deliberately NOT stored on the synced `users` record: a child's photo lives
// only in this device's localStorage and never enters the cloud mirror. That
// keeps our "no children's photos in our database" promise intact — coaches
// get faces to match names on their own screen, and nothing leaves the device.
import { useSyncExternalStore } from 'react'

const KEY = 'goodseed_roster_photos'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

let photos = load()
const listeners = new Set()

function emit() {
  try {
    localStorage.setItem(KEY, JSON.stringify(photos))
  } catch {
    /* quota — a photo just won't persist; the app keeps working */
  }
  listeners.forEach((l) => l())
}

export function getRosterPhoto(kidId) {
  return photos[kidId] || null
}

export function setRosterPhoto(kidId, dataUrl) {
  photos = { ...photos, [kidId]: dataUrl }
  emit()
}

export function removeRosterPhoto(kidId) {
  if (!(kidId in photos)) return
  const next = { ...photos }
  delete next[kidId]
  photos = next
  emit()
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

// Reactive read for a single kid's photo.
export function useRosterPhoto(kidId) {
  return useSyncExternalStore(
    subscribe,
    () => photos[kidId] || null,
    () => null
  )
}
