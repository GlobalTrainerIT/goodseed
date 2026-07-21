import { useState } from 'react'
import { Heart, Send } from 'lucide-react'
import { Card, Button, Input, Badge } from '@/components/ui'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import { addGratitude, gratitudeForChild, gratitudeStreakDays, gratitudeEnabled, seedLabel } from '@/lib/domain'
import { formatDate } from '@/lib/utils'
import { toast } from '@/lib/toast'

const KINDS = [
  { id: 'thankful', label: '💛 Thankful for', emoji: '💛', placeholder: 'e.g. my family, sunshine, my dog…' },
  { id: 'prayer', label: '🙏 Prayed for', emoji: '🙏', placeholder: 'e.g. Grandma, my friend who is sick…' },
]

// The gratitude jar: a daily reflection habit. When `interactive`, a child adds
// their own note (or a parent adds one for them); otherwise it's a read-only
// display of the jar. The first note each day grows a daily streak.
export default function GratitudeJar({ childId, interactive = false }) {
  const me = useCurrentUser()
  const settings = useSettings()
  useCollection('gratitude') // re-render as notes are added
  const [kind, setKind] = useState('thankful')
  const [text, setText] = useState('')

  if (settings.gratitudeEnabled === false || !childId) return null

  const notes = gratitudeForChild(childId, 12)
  const streak = gratitudeStreakDays(childId)

  function add() {
    const t = text.trim()
    if (!t) return
    const r = addGratitude(childId, kind, t, me?.id)
    setText('')
    if (r) {
      toast({
        title: kind === 'prayer' ? 'Prayer added 🙏' : 'Added to your jar 💛',
        message: r.awarded ? `+${r.awarded} ${seedLabel().toLowerCase()}${r.streak > 1 ? ` · 🔥 ${r.streak} days` : ''}` : (r.streak > 1 ? `🔥 ${r.streak} days` : ''),
        emoji: '🫙',
      })
    }
  }

  return (
    <Card className="overflow-hidden border-amber-100 bg-gradient-to-br from-amber-50 to-white p-5 dark:border-amber-900/40 dark:from-amber-900/15 dark:to-gray-900">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
          <Heart className="h-5 w-5" />
          <span className="text-sm font-bold uppercase tracking-wide">Gratitude Jar</span>
        </div>
        {streak > 0 && <Badge variant="yellow">🔥 {streak} day{streak === 1 ? '' : 's'}</Badge>}
      </div>

      {interactive && (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            {KINDS.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-semibold transition ${kind === k.id ? 'bg-amber-500 text-white' : 'bg-amber-100/70 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200'}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <div className="flex items-end gap-2">
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={140}
              placeholder={KINDS.find((k) => k.id === kind).placeholder}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
            />
            <Button onClick={add} disabled={!text.trim()}><Send className="h-4 w-4" /> Add</Button>
          </div>
        </div>
      )}

      <div className="mt-4">
        {notes.length === 0 ? (
          <p className="rounded-lg bg-white/60 p-3 text-sm text-gray-500 dark:bg-gray-900/40 dark:text-gray-400">
            {interactive ? 'Add your first note — what are you thankful for today?' : 'The jar is empty so far.'}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {notes.map((n) => (
              <div key={n.id} className="max-w-full rounded-xl border border-amber-100 bg-white px-3 py-2 dark:border-amber-900/30 dark:bg-gray-900">
                <p className="text-sm text-gray-800 dark:text-gray-100">
                  <span className="mr-1">{n.kind === 'prayer' ? '🙏' : '💛'}</span>{n.text}
                </p>
                <p className="mt-0.5 text-[11px] text-gray-400">{n.created_date ? formatDate(n.created_date, 'MMM d') : ''}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  )
}
