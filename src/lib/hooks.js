import { useSyncExternalStore, useCallback } from 'react'
import { subscribe, getVersion, getAll, getById, getSettings } from './db'
import { subscribeAuth, getCurrentUser, getCurrentUserId } from './auth'

/** Subscribe to both data and auth changes so any mutation re-renders. */
function subscribeBoth(cb) {
  const a = subscribe(cb)
  const b = subscribeAuth(cb)
  return () => {
    a()
    b()
  }
}

/** Reactive list for a collection, with an optional filter/sort applied. */
export function useCollection(collection, transform) {
  // Version-based snapshot keeps useSyncExternalStore stable between writes.
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)
  const list = getAll(collection)
  return transform ? transform(list, version) : list
}

export function useRecord(collection, id) {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  return id ? getById(collection, id) : null
}

export function useSettings() {
  useSyncExternalStore(subscribe, getVersion, getVersion)
  return getSettings()
}

export function useCurrentUser() {
  const sub = useCallback((cb) => subscribeBoth(cb), [])
  useSyncExternalStore(sub, getCurrentUserId, getCurrentUserId)
  // Also re-read on data version so balance updates flow through.
  useSyncExternalStore(subscribe, getVersion, getVersion)
  return getCurrentUser()
}
