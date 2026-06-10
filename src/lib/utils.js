import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isToday, isTomorrow, isPast, parseISO } from 'date-fns'

/** Tailwind-aware className combiner (shadcn convention). */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

/** Build a route path from a page name, e.g. createPageUrl('Tasks') -> '/Tasks'. */
export function createPageUrl(page) {
  if (!page) return '/'
  return page.startsWith('/') ? page : `/${page}`
}

/** Collision-resistant id without external deps. */
let _counter = 0
export function uid(prefix = 'id') {
  _counter += 1
  const rand = Math.floor(performance.now() * 1000) % 1000000
  return `${prefix}_${Date.now().toString(36)}${_counter.toString(36)}${rand.toString(36)}`
}

export function safeParseDate(value) {
  if (!value) return null
  try {
    const d = typeof value === 'string' ? parseISO(value) : new Date(value)
    return isNaN(d.getTime()) ? null : d
  } catch {
    return null
  }
}

export function formatDate(value, fmt = 'MMM d, yyyy') {
  const d = safeParseDate(value)
  if (!d) return '—'
  try {
    return format(d, fmt)
  } catch {
    return '—'
  }
}

export function relativeTime(value) {
  const d = safeParseDate(value)
  if (!d) return ''
  try {
    return formatDistanceToNow(d, { addSuffix: true })
  } catch {
    return ''
  }
}

export function dueLabel(value) {
  const d = safeParseDate(value)
  if (!d) return null
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'MMM d')
}

export function isOverdue(value) {
  const d = safeParseDate(value)
  if (!d) return false
  return isPast(d) && !isToday(d)
}

export function initials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() || '')
    .join('')
}

/** Generate a 6-char uppercase invite code. */
export function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n))
}

/**
 * Read an image File and return a downscaled JPEG data URL (keeps localStorage
 * small). Resolves to null on failure.
 */
export function fileToDataUrl(file, maxDim = 720, quality = 0.7) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) return resolve(null)
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        try {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height))
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(img.width * scale)
          canvas.height = Math.round(img.height * scale)
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          resolve(canvas.toDataURL('image/jpeg', quality))
        } catch {
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = reader.result
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}
