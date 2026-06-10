import { useState } from 'react'
import { Heart, Plus } from 'lucide-react'
import { Card, CardContent, Button, Dialog, Select, Textarea, Label } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { getById } from '@/lib/db'
import { giveShoutout } from '@/lib/domain'
import { relativeTime } from '@/lib/utils'

export default function ShoutOutCard() {
  const user = useCurrentUser()
  const allUsers = useCollection('users')
  const allShoutouts = useCollection('shoutouts')
  const [open, setOpen] = useState(false)

  const familyUsers = allUsers.filter((u) => u.family_id === user?.family_id)
  const shoutouts = allShoutouts
    .filter((s) => s.family_id === user?.family_id)
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 4)

  const [fromId, setFromId] = useState(user?.id || '')
  const [toId, setToId] = useState('')
  const [message, setMessage] = useState('')
  const [celebrate, setCelebrate] = useState(false)

  function submit() {
    if (!fromId || !toId || !message.trim() || fromId === toId) return
    giveShoutout(user.family_id, fromId, toId, message.trim().slice(0, 200))
    setCelebrate(true)
    setTimeout(() => {
      setCelebrate(false)
      setOpen(false)
      setMessage('')
      setToId('')
    }, 900)
  }

  return (
    <Card className="border-amber-100 bg-amber-50/60 dark:border-amber-900/40 dark:bg-amber-900/10">
      <CardContent>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-gray-100">
            <Heart className="h-5 w-5 text-amber-500" /> Shout-Outs
          </h3>
          <Button size="sm" variant="secondary" onClick={() => { setFromId(user?.id || ''); setOpen(true) }}>
            <Plus className="h-4 w-4" /> Give One
          </Button>
        </div>

        {shoutouts.length === 0 ? (
          <EmptyState icon="💬" title="No shout-outs yet" description="Celebrate someone in your family!" />
        ) : (
          <div className="space-y-2.5">
            {shoutouts.map((s) => {
              const from = getById('users', s.from_user_id)
              const to = getById('users', s.to_user_id)
              return (
                <div key={s.id} className="flex items-start gap-3 rounded-lg bg-white/70 p-3 dark:bg-gray-900/50">
                  <Avatar user={from} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800 dark:text-gray-200">
                      <b>{from?.full_name}</b> → <b>{to?.full_name}</b>
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">"{s.message}"</p>
                    <p className="mt-0.5 text-xs text-gray-400">{relativeTime(s.created_date)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Give a Shout-Out"
        description="Celebrate someone in your family 💛"
        footer={
          <>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={submit} disabled={!toId || !message.trim() || fromId === toId}>
              <Heart className="h-4 w-4" /> Send
            </Button>
          </>
        }
      >
        {celebrate ? (
          <div className="flex flex-col items-center py-8">
            <Heart className="h-16 w-16 animate-pop fill-red-400 text-red-400" />
            <p className="mt-3 font-bold text-gray-700 dark:text-gray-200">Shout-out sent! 💛</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label>From</Label>
              <Select value={fromId} onChange={(e) => setFromId(e.target.value)}>
                {familyUsers.map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>To</Label>
              <Select value={toId} onChange={(e) => setToId(e.target.value)}>
                <option value="">Choose someone…</option>
                {familyUsers.filter((u) => u.id !== fromId).map((u) => (
                  <option key={u.id} value={u.id}>{u.full_name}</option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Message</Label>
              <Textarea rows={3} maxLength={200} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="You did an amazing job today!" />
              <p className="mt-1 text-right text-xs text-gray-400">{message.length}/200</p>
            </div>
          </div>
        )}
      </Dialog>
    </Card>
  )
}
