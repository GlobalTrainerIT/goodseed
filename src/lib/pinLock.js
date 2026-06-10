import { useSyncExternalStore } from 'react'

/**
 * Session-scoped parent-PIN unlock. When the family has a parent PIN enabled,
 * parent pages stay locked until the PIN is entered once per session.
 */
const KEY = 'goodseed_pin_unlocked'
const listeners = new Set()

function read() {
  try {
    return sessionStorage.getItem(KEY) === 'true'
  } catch {
    return false
  }
}

export function unlock() {
  try {
    sessionStorage.setItem(KEY, 'true')
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

export function lock() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l())
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useUnlocked() {
  return useSyncExternalStore(subscribe, read, read)
}
