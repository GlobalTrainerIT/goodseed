import { useSyncExternalStore } from 'react'

const KEY = 'goodseed_theme'
const listeners = new Set()

function current() {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export function setTheme(theme) {
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    /* ignore */
  }
  if (theme === 'dark') document.documentElement.classList.add('dark')
  else document.documentElement.classList.remove('dark')
  listeners.forEach((l) => l())
}

export function toggleTheme() {
  setTheme(current() === 'dark' ? 'light' : 'dark')
}

function subscribe(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function useTheme() {
  return useSyncExternalStore(subscribe, current, current)
}
