import { useState } from 'react'
import { ArrowLeftRight, Plus, Check, X } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button, Tabs, Dialog, Input, Select, Label, Badge } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import StatusBadge from '@/components/shared/StatusBadge'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { create, update, getById } from '@/lib/db'
import { relativeTime } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { notify, addActivity } from '@/lib/domain'

export default function TradingPost() {
  const user = useCurrentUser()
  const trades = useCollection('trades')
  const users = useCollection('users')
  const [tab, setTab] = useState('active')
  const [proposeOpen, setProposeOpen] = useState(false)

  const isChild = user?.role === 'child'
  const children = users.filter((u) => u.family_id === user?.family_id && u.role === 'child')
  const famTrades = trades.filter((t) => t.family_id === user?.family_id)
  const active = famTrades.filter((t) => t.status === 'pending')
  const history = famTrades.filter((t) => t.status !== 'pending')
  const list = tab === 'active' ? active : history

  function resolve(trade, approve) {
    update('trades', trade.id, { status: approve ? 'completed' : 'rejected', resolved_date: new Date().toISOString() })
    const from = getById('users', trade.from_child_id)
    const to = getById('users', trade.to_child_id)
    if (approve) {
      addActivity(user.family_id, trade.from_child_id, 'reward_redeemed', `${from?.full_name} traded with ${to?.full_name} 🤝`, 0)
      notify(trade.from_child_id, 'family', 'Trade approved! 🤝', `Your trade with ${to?.full_name} is complete.`, '/TradingPost')
    } else {
      notify(trade.from_child_id, 'family', 'Trade declined', 'A parent declined your trade.', '/TradingPost')
    }
    toast({ title: approve ? 'Trade approved!' : 'Trade rejected', emoji: approve ? '🤝' : '↩️', type: approve ? 'success' : 'info' })
  }

  return (
    <div>
      <PageHeader
        title="🏪 Trading Post"
        subtitle={isChild ? 'Propose a trade with a sibling' : 'Review and approve trades between family members'}
        actions={isChild && children.length > 1 && <Button onClick={() => setProposeOpen(true)}><Plus className="h-4 w-4" /> Propose Trade</Button>}
      />

      <Tabs
        tabs={[{ value: 'active', label: 'Active', count: active.length }, { value: 'history', label: 'History', count: history.length }]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<ArrowLeftRight className="h-6 w-6 text-seed-500" />}
          title={tab === 'active' ? 'No active trades' : 'No trade history'}
          description="Children can propose trades with each other. Trades require a parent's approval before completing."
        />
      ) : (
        <div className="space-y-3">
          {list.map((t) => {
            const from = getById('users', t.from_child_id)
            const to = getById('users', t.to_child_id)
            return (
              <Card key={t.id} className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar user={from} size="sm" />
                    <ArrowLeftRight className="h-4 w-4 text-gray-400" />
                    <Avatar user={to} size="sm" />
                  </div>
                  <StatusBadge status={t.status === 'completed' ? 'completed' : t.status} />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                    <p className="text-xs text-gray-400">{from?.full_name} offers</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{t.item_offered}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                    <p className="text-xs text-gray-400">wants from {to?.full_name}</p>
                    <p className="font-semibold text-gray-800 dark:text-gray-200">{t.item_requested}</p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-gray-400">{relativeTime(t.created_date)}</p>
                {t.status === 'pending' && !isChild && (
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" onClick={() => resolve(t, true)}><Check className="h-4 w-4" /> Approve</Button>
                    <Button size="sm" variant="danger" className="flex-1" onClick={() => resolve(t, false)}><X className="h-4 w-4" /> Reject</Button>
                  </div>
                )}
                {t.status === 'pending' && isChild && <Badge variant="yellow" className="mt-3">Waiting for parent approval</Badge>}
              </Card>
            )
          })}
        </div>
      )}

      {isChild && <ProposeDialog open={proposeOpen} onClose={() => setProposeOpen(false)} user={user} siblings={children.filter((c) => c.id !== user.id)} />}
    </div>
  )
}

function ProposeDialog({ open, onClose, user, siblings }) {
  const [toId, setToId] = useState('')
  const [offered, setOffered] = useState('')
  const [requested, setRequested] = useState('')

  function submit() {
    if (!toId || !offered.trim() || !requested.trim()) return
    create('trades', {
      family_id: user.family_id, from_child_id: user.id, to_child_id: toId,
      item_offered: offered.trim(), item_requested: requested.trim(),
      status: 'pending', parent_approval_required: true, resolved_date: null,
    })
    notify(user.id, 'family', 'Trade proposed', 'Your trade is pending parent approval.', '/TradingPost')
    toast({ title: 'Trade proposed!', message: 'Waiting for a parent to approve.', emoji: '🤝' })
    setToId(''); setOffered(''); setRequested('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Propose a Trade" description="Offer something to a sibling."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit} disabled={!toId || !offered.trim() || !requested.trim()}>Propose</Button></>}>
      <div className="space-y-4">
        <div>
          <Label>Trade with</Label>
          <Select value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">Choose a sibling…</option>
            {siblings.map((s) => <option key={s.id} value={s.id}>{s.avatar_emoji} {s.full_name}</option>)}
          </Select>
        </div>
        <div><Label>You offer</Label><Input value={offered} onChange={(e) => setOffered(e.target.value)} placeholder="e.g. my dinosaur sticker" /></div>
        <div><Label>You want</Label><Input value={requested} onChange={(e) => setRequested(e.target.value)} placeholder="e.g. their rainbow eraser" /></div>
      </div>
    </Dialog>
  )
}
