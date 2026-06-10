import { useState, useMemo } from 'react'
import { Plus } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Button, Tabs, Card } from '@/components/ui'
import RewardCard from '@/components/rewards/RewardCard'
import RewardForm from '@/components/rewards/RewardForm'
import RedemptionList from '@/components/rewards/RedemptionList'
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import SeedBadge from '@/components/shared/SeedBadge'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { remove } from '@/lib/db'
import { REWARD_CATEGORIES } from '@/lib/constants'
import { requestRedemption, seedLabel } from '@/lib/domain'

export default function Rewards() {
  const user = useCurrentUser()
  const rewards = useCollection('rewards')
  const redemptions = useCollection('redemptions')

  const [category, setCategory] = useState('all')
  const [availTab, setAvailTab] = useState('available')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [toDelete, setToDelete] = useState(null)

  const famRewards = useMemo(() => rewards.filter((r) => r.family_id === user?.family_id), [rewards, user])

  // ---- child shop view ----
  if (user?.role === 'child') {
    const myPending = redemptions.filter((r) => r.child_id === user.id && r.status === 'pending')
    const available = famRewards.filter((r) => r.is_available)
    return (
      <div>
        <PageHeader
          title="🛍️ Rewards Shop"
          subtitle="Spend your seeds on something fun"
          actions={<SeedBadge amount={user.seed_balance || 0} size="md" />}
        />
        {available.length === 0 ? (
          <EmptyState icon="🎁" title="No rewards yet" description="Ask a parent to add some rewards." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((r) => {
              const cat = REWARD_CATEGORIES[r.category] || REWARD_CATEGORIES.other
              const pending = myPending.find((p) => p.reward_id === r.id)
              const affordable = (user.seed_balance || 0) >= r.seed_cost
              return (
                <Card key={r.id} className="flex flex-col p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl text-3xl" style={{ backgroundColor: cat.color + '22' }}>
                      {r.emoji_icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 dark:text-gray-100">{r.title}</p>
                      {r.description && <p className="line-clamp-1 text-xs text-gray-400">{r.description}</p>}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <SeedBadge amount={r.seed_cost} />
                    {pending ? (
                      <Button size="sm" variant="outline" disabled>Requested ⏳</Button>
                    ) : (
                      <Button size="sm" variant="purple" disabled={!affordable} onClick={() => requestRedemption(r.id, user.id)}>
                        {affordable ? 'Redeem' : 'Need more 🌱'}
                      </Button>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ---- parent view ----
  const pendingRedemptions = redemptions.filter((r) => r.family_id === user?.family_id && r.status === 'pending')

  let visible = famRewards.filter((r) => (availTab === 'available' ? r.is_available : !r.is_available))
  if (category !== 'all') visible = visible.filter((r) => r.category === category)

  const categoryTabs = [
    { value: 'all', label: 'All' },
    ...Object.entries(REWARD_CATEGORIES).map(([key, c]) => ({ value: key, label: c.label, emoji: c.emoji })),
  ]

  function openNew() { setEditing(null); setFormOpen(true) }
  function openEdit(r) { setEditing(r); setFormOpen(true) }

  return (
    <div>
      <PageHeader
        title="Rewards"
        subtitle="Create and manage family rewards"
        actions={<Button variant="purple" onClick={openNew}><Plus className="h-4 w-4" /> New Reward</Button>}
      />

      <RedemptionList redemptions={pendingRedemptions} />

      <Tabs tabs={categoryTabs} value={category} onChange={setCategory} className="mb-3" />
      <Tabs
        tabs={[
          { value: 'available', label: 'Available', count: famRewards.filter((r) => r.is_available).length },
          { value: 'unavailable', label: 'Unavailable', count: famRewards.filter((r) => !r.is_available).length },
        ]}
        value={availTab}
        onChange={setAvailTab}
        className="mb-4"
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="🎁"
          title="No rewards here"
          description="Create rewards children can redeem with their seeds."
          action={<Button variant="purple" onClick={openNew}><Plus className="h-4 w-4" /> New Reward</Button>}
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {visible.map((r) => <RewardCard key={r.id} reward={r} onEdit={openEdit} onDelete={setToDelete} />)}
        </div>
      )}

      <RewardForm open={formOpen} onClose={() => setFormOpen(false)} reward={editing} />
      <DeleteConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} itemName={toDelete?.title} onConfirm={() => remove('rewards', toDelete.id)} />
    </div>
  )
}
