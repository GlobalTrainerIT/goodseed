import { uid } from './utils'
import { seedData } from './seedData'

/**
 * Reactive localStorage-backed store.
 *
 * Each collection is an array kept in memory; writes replace the array reference
 * (so React's useSyncExternalStore detects the change) and persist to localStorage.
 */

const STORAGE_PREFIX = 'goodseed_'
const STORAGE_VERSION = 'goodseed_seeded_v2'

export const COLLECTIONS = [
  'families',
  'users',
  'tasks',
  'completions',
  'rewards',
  'redemptions',
  'shoutouts',
  'goals',
  'announcements',
  'weeklyBosses',
  'trades',
  'notifications',
  'badges',
  'activity',
  'seedPacks',
  'missions',
  'leaderboardSnapshots',
  'memoryVerses',
  'armorPieces',
  'fruitEarned',
  'gratitude',
  'familyAltar',
]

const state = {}
const listeners = new Set()

function readStorage(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
  } catch {
    /* quota or unavailable — keep in memory only */
  }
}

function init() {
  let seeded = false
  try {
    seeded = localStorage.getItem(STORAGE_VERSION) === 'true'
  } catch {
    seeded = false
  }

  if (!seeded) {
    const data = seedData()
    COLLECTIONS.forEach((name) => {
      state[name] = data[name] || []
      writeStorage(name, state[name])
    })
    writeStorage('settings', data.settings)
    state.settings = data.settings
    try {
      localStorage.setItem(STORAGE_VERSION, 'true')
    } catch {
      /* ignore */
    }
  } else {
    COLLECTIONS.forEach((name) => {
      state[name] = readStorage(name) || []
    })
    state.settings = readStorage('settings') || seedData().settings
  }
}

init()

// ---- reactivity ----
let version = 0
export function subscribe(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
export function getVersion() {
  return version
}
function notify() {
  version += 1
  listeners.forEach((l) => l())
}

// ---- sync handlers (registered by sync.js; no-ops without a backend) ----
let syncHandlers = {}
export function registerSyncHandlers(handlers) {
  syncHandlers = handlers || {}
}

// ---- generic CRUD ----
export function getAll(collection) {
  return state[collection] || []
}

export function getById(collection, id) {
  return (state[collection] || []).find((r) => r.id === id) || null
}

export function query(collection, predicate) {
  return (state[collection] || []).filter(predicate)
}

export function create(collection, data) {
  const record = {
    id: uid(collection.slice(0, 3)),
    created_date: new Date().toISOString(),
    ...data,
  }
  state[collection] = [...(state[collection] || []), record]
  writeStorage(collection, state[collection])
  notify()
  syncHandlers.onUpsert?.(collection, record)
  return record
}

export function update(collection, id, patch) {
  let updated = null
  state[collection] = (state[collection] || []).map((r) => {
    if (r.id === id) {
      updated = { ...r, ...(typeof patch === 'function' ? patch(r) : patch) }
      return updated
    }
    return r
  })
  writeStorage(collection, state[collection])
  notify()
  if (updated) syncHandlers.onUpsert?.(collection, updated)
  return updated
}

export function remove(collection, id) {
  state[collection] = (state[collection] || []).filter((r) => r.id !== id)
  writeStorage(collection, state[collection])
  notify()
  syncHandlers.onDelete?.(collection, id)
}

// ---- settings (singleton object) ----
export function getSettings() {
  return state.settings
}
export function updateSettings(patch) {
  state.settings = { ...state.settings, ...patch }
  writeStorage('settings', state.settings)
  notify()
  syncHandlers.onSettings?.(state.settings)
  return state.settings
}

// ---- apply changes coming FROM the remote (never re-pushed) ----
export function applyRemoteUpsert(collection, data) {
  if (!data) return
  if (collection === 'settings') {
    state.settings = data
    writeStorage('settings', state.settings)
  } else {
    const arr = state[collection] || []
    const idx = arr.findIndex((r) => r.id === data.id)
    if (idx >= 0) {
      const copy = arr.slice()
      copy[idx] = data
      state[collection] = copy
    } else {
      state[collection] = [...arr, data]
    }
    writeStorage(collection, state[collection])
  }
  notify()
}

export function applyRemoteDeleteById(id) {
  if (!id) return
  let changed = false
  COLLECTIONS.forEach((name) => {
    const arr = state[name] || []
    if (arr.some((r) => r.id === id)) {
      state[name] = arr.filter((r) => r.id !== id)
      writeStorage(name, state[name])
      changed = true
    }
  })
  if (changed) notify()
}

/** Apply a batch of remote rows (initial load) with a single notify. */
export function bulkApplyRemote(rows) {
  rows.forEach((row) => {
    if (row.collection === 'settings') {
      state.settings = row.data
      return
    }
    const arr = state[row.collection] || []
    const idx = arr.findIndex((r) => r.id === row.data.id)
    if (idx >= 0) arr[idx] = row.data
    else arr.push(row.data)
    state[row.collection] = arr
  })
  COLLECTIONS.forEach((name) => writeStorage(name, state[name]))
  writeStorage('settings', state.settings)
  notify()
}

// ---- danger / utility ----
/** Serialize the entire family dataset for backup/export. */
export function exportData() {
  const data = { __goodseed__: true, version: STORAGE_VERSION, exported_at: new Date().toISOString(), settings: state.settings }
  COLLECTIONS.forEach((name) => {
    data[name] = state[name] || []
  })
  return data
}

/** Restore a dataset previously produced by exportData(). Returns true on success. */
export function importData(data) {
  if (!data || data.__goodseed__ !== true) return false
  COLLECTIONS.forEach((name) => {
    state[name] = Array.isArray(data[name]) ? data[name] : []
    writeStorage(name, state[name])
  })
  if (data.settings) {
    state.settings = data.settings
    writeStorage('settings', state.settings)
  }
  try {
    localStorage.setItem(STORAGE_VERSION, 'true')
  } catch {
    /* ignore */
  }
  notify()
  return true
}

export function resetAll() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.startsWith(STORAGE_PREFIX))
      .forEach((k) => localStorage.removeItem(k))
    localStorage.removeItem(STORAGE_VERSION)
  } catch {
    /* ignore */
  }
  init()
  notify()
}
