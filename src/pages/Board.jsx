import { useState } from 'react'
import { Megaphone, Pin, PinOff, Trash2, Send, Monitor } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, Button, Input, Textarea, Label, Badge } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import { useCurrentUser, useCollection, useRecord } from '@/lib/hooks'
import { create, update, remove } from '@/lib/db'
import { isGroup } from '@/lib/plan'
import { formatDate } from '@/lib/utils'
import { toast } from '@/lib/toast'

// Coach/teacher announcements: post notices (picture day, snacks, wear red for
// Saturday's game). They appear here, on the big-screen /Display, and — once a
// parent links their child — on that family's dashboard at home.
export default function Board() {
  const user = useCurrentUser()
  const group = useRecord('families', user?.family_id)
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  const announcements = useCollection('announcements', (all) =>
    all.filter((a) => a.family_id === user?.family_id)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at))
  )

  function post(e) {
    e.preventDefault()
    if (!title.trim()) return
    create('announcements', {
      family_id: user.family_id,
      title: title.trim(),
      message: message.trim(),
      created_by: user.id,
      is_pinned: false,
      created_at: new Date().toISOString(),
    })
    toast({ title: 'Posted!', message: 'Your group will see it on the board and big screen.', emoji: '📣' })
    setTitle('')
    setMessage('')
  }

  if (!group) return null
  if (!isGroup(group)) {
    return <div className="mx-auto max-w-2xl"><EmptyState icon="📣" title="The board is for teams & classrooms" /></div>
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="📣 Board"
        subtitle="Post notices for your group — picture day, snacks, what to wear."
        actions={<Button variant="secondary" onClick={() => navigate('/Display')}><Monitor className="h-4 w-4" /> Big screen</Button>}
      />

      <Card className="mb-5 p-5">
        <form onSubmit={post} className="space-y-3">
          <div>
            <Label>Announcement</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Picture day is this Saturday!" autoFocus />
          </div>
          <div>
            <Label>Details (optional)</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="e.g. Wear your team jersey. Snacks: the James family." />
          </div>
          <Button type="submit" disabled={!title.trim()}><Send className="h-4 w-4" /> Post to the board</Button>
        </form>
      </Card>

      {announcements.length === 0 ? (
        <EmptyState icon="📣" title="No announcements yet" description="Post your first notice above — it shows here and on the big-screen board." />
      ) : (
        <div className="space-y-3">
          {announcements.map((a) => (
            <Card key={a.id} className={`p-4 ${a.is_pinned ? 'border-amber-300 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-900/10' : ''}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {a.is_pinned && <Badge className="bg-amber-100 text-amber-700">📌 Pinned</Badge>}
                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{a.title}</h3>
                  </div>
                  {a.message && <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{a.message}</p>}
                  <p className="mt-1 text-xs text-gray-400">{a.created_at ? formatDate(a.created_at) : ''}</p>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => update('announcements', a.id, { is_pinned: !a.is_pinned })}
                    className={`rounded-lg p-2 ${a.is_pinned ? 'text-amber-500' : 'text-gray-400'} hover:bg-gray-100 dark:hover:bg-gray-800`}
                    aria-label={a.is_pinned ? 'Unpin' : 'Pin'}
                  >
                    {a.is_pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={() => { remove('announcements', a.id); toast({ title: 'Removed', emoji: '🗑️' }) }}
                    className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
