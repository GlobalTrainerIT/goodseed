import { cn } from '@/lib/utils'

export function EmojiPicker({ value, onChange, options }) {
  return (
    <div className="grid grid-cols-8 gap-1.5 sm:grid-cols-10">
      {options.map((emoji) => (
        <button
          key={emoji}
          type="button"
          onClick={() => onChange(emoji)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-lg text-xl transition hover:bg-gray-100 dark:hover:bg-gray-700',
            value === emoji && 'bg-seed-100 ring-2 ring-seed-500 dark:bg-seed-900/40'
          )}
        >
          {emoji}
        </button>
      ))}
    </div>
  )
}

export function ColorPicker({ value, onChange, options }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((color) => (
        <button
          key={color}
          type="button"
          onClick={() => onChange(color)}
          className={cn(
            'h-8 w-8 rounded-full border-2 transition',
            value === color ? 'border-seed-600 ring-2 ring-seed-300' : 'border-white dark:border-gray-700'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  )
}
