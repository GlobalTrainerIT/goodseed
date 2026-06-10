import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/* ------------------------------------------------------------------ Button */
const buttonVariants = {
  primary: 'bg-seed-600 text-white hover:bg-seed-700 shadow-sm',
  secondary: 'bg-white text-gray-800 border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700 dark:hover:bg-gray-700',
  purple: 'bg-purple-600 text-white hover:bg-purple-700 shadow-sm',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-sm',
  ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800',
  outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800',
}
const buttonSizes = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
  icon: 'p-2',
}

export function Button({ variant = 'primary', size = 'md', className, children, ...props }) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-seed-500 disabled:cursor-not-allowed disabled:opacity-50',
        buttonVariants[variant],
        buttonSizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* -------------------------------------------------------------------- Card */
export function Card({ className, children, ...props }) {
  return (
    <div
      className={cn(
        'rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
export function CardHeader({ className, children }) {
  return <div className={cn('p-5 pb-0', className)}>{children}</div>
}
export function CardTitle({ className, children }) {
  return <h3 className={cn('text-base font-bold text-gray-900 dark:text-gray-100', className)}>{children}</h3>
}
export function CardContent({ className, children }) {
  return <div className={cn('p-5', className)}>{children}</div>
}

/* ------------------------------------------------------------------- Badge */
const badgeVariants = {
  green: 'bg-seed-100 text-seed-700 dark:bg-seed-900/40 dark:text-seed-300',
  yellow: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  red: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  blue: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  purple: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
}
export function Badge({ variant = 'gray', className, children, style }) {
  return (
    <span
      style={style}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
        badgeVariants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------------ Inputs */
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-seed-500 focus:outline-none focus:ring-2 focus:ring-seed-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
        className
      )}
      {...props}
    />
  )
}
export function Textarea({ className, ...props }) {
  return (
    <textarea
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-seed-500 focus:outline-none focus:ring-2 focus:ring-seed-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
        className
      )}
      {...props}
    />
  )
}
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-seed-500 focus:outline-none focus:ring-2 focus:ring-seed-500/30 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}
export function Label({ className, children, ...props }) {
  return (
    <label className={cn('mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300', className)} {...props}>
      {children}
    </label>
  )
}

/* ------------------------------------------------------------------ Toggle */
export function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={!!checked}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-seed-500 disabled:opacity-50',
        checked ? 'bg-seed-600' : 'bg-gray-300 dark:bg-gray-600'
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}

/* ------------------------------------------------------------------ Dialog */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.()
    }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  const maxW = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size]

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          'relative z-10 w-full overflow-hidden rounded-t-2xl bg-white shadow-xl animate-pop dark:bg-gray-900 sm:rounded-2xl',
          maxW
        )}
      >
        {(title || description) && (
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5 dark:border-gray-800">
            <div>
              {title && <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>}
              {description && <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
            </div>
            <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}
        <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-gray-100 p-4 dark:border-gray-800">{footer}</div>}
      </div>
    </div>,
    document.body
  )
}

/* ------------------------------------------------------------------- Sheet */
export function Sheet({ open, onClose, title, children, side = 'right' }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose?.()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return createPortal(
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={cn(
          'absolute top-0 flex h-full w-full max-w-md flex-col bg-white shadow-xl dark:bg-gray-900',
          side === 'right' ? 'right-0' : 'left-0'
        )}
      >
        <div className="flex items-center justify-between border-b border-gray-100 p-5 dark:border-gray-800">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>,
    document.body
  )
}

/* -------------------------------------------------------------------- Tabs */
export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div className={cn('flex gap-1 overflow-x-auto no-scrollbar', className)}>
      {tabs.map((t) => {
        const active = t.value === value
        return (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-seed-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            )}
          >
            {t.emoji && <span>{t.emoji}</span>}
            {t.label}
            {typeof t.count === 'number' && (
              <span
                className={cn(
                  'rounded-full px-1.5 text-xs font-bold',
                  active ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                )}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/* --------------------------------------------------------------- ProgressBar */
export function ProgressBar({ value, max = 100, className, barClass = 'bg-seed-500' }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0))
  return (
    <div className={cn('h-2.5 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700', className)}>
      <div className={cn('h-full rounded-full transition-all', barClass)} style={{ width: `${pct}%` }} />
    </div>
  )
}
