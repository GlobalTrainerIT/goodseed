import { useSyncExternalStore } from 'react'
import { uid } from './utils'

let toasts = []
const listeners = new Set()

function emit() {
  listeners.forEach((l) => l())
}

export function toast({ title, message, type = 'success', emoji, duration = 3500 }) {
  const id = uid('toast')
  toasts = [...toasts, { id, title, message, type, emoji }]
  emit()
  if (duration) {
    setTimeout(() => dismissToast(id), duration)
  }
  return id
}

export function dismissToast(id) {
  toasts = toasts.filter((t) => t.id !== id)
  emit()
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
function snapshot() {
  return toasts
}

export function useToasts() {
  return useSyncExternalStore(subscribe, snapshot, snapshot)
}
