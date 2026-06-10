import { useState, useEffect } from 'react'
import { Dialog, Button, Input, Textarea, Select, Label, Toggle } from '@/components/ui'
import { EmojiPicker } from '@/components/shared/EmojiPicker'
import { REWARD_CATEGORIES, REWARD_EMOJIS } from '@/lib/constants'
import { create, update } from '@/lib/db'
import { useCurrentUser } from '@/lib/hooks'
import { toast } from '@/lib/toast'
import { clamp } from '@/lib/utils'

const EMPTY = {
  title: '',
  description: '',
  category: 'screen_time',
  seed_cost: 10,
  emoji_icon: '🎁',
  is_available: true,
}

export default function RewardForm({ open, onClose, reward }) {
  const user = useCurrentUser()
  const [form, setForm] = useState(EMPTY)
  const [error, setError] = useState('')

  useEffect(() => {
    if (open) {
      setError('')
      setForm(reward ? { ...reward } : EMPTY)
    }
  }, [open, reward])

  function set(key, val) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  function save() {
    if (!form.title.trim()) return setError('Please enter a title.')
    const payload = {
      family_id: user.family_id,
      title: form.title.trim(),
      description: form.description.trim(),
      category: form.category,
      seed_cost: clamp(Number(form.seed_cost) || 1, 1, 9999),
      emoji_icon: form.emoji_icon,
      is_available: form.is_available,
    }
    if (reward) {
      update('rewards', reward.id, payload)
      toast({ title: 'Reward updated!', emoji: '✏️' })
    } else {
      create('rewards', { ...payload, created_by: user.id })
      toast({ title: 'Reward created!', emoji: '🎁' })
    }
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={reward ? 'Edit Reward' : 'New Reward'}
      description="Something children can redeem with their seeds."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="purple" onClick={save}>{reward ? 'Save changes' : 'Create reward'}</Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30">{error}</p>}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-3xl dark:bg-purple-900/30">
            {form.emoji_icon}
          </div>
          <div className="flex-1">
            <Label>Title *</Label>
            <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Extra screen time" autoFocus />
          </div>
        </div>
        <div>
          <Label>Description</Label>
          <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional details…" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Category</Label>
            <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
              {Object.entries(REWARD_CATEGORIES).map(([key, c]) => (
                <option key={key} value={key}>{c.emoji} {c.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <Label>Seed cost *</Label>
            <Input type="number" min={1} value={form.seed_cost} onChange={(e) => set('seed_cost', e.target.value)} />
          </div>
        </div>
        <div>
          <Label>Icon</Label>
          <EmojiPicker value={form.emoji_icon} onChange={(emoji) => set('emoji_icon', emoji)} options={REWARD_EMOJIS} />
        </div>
        <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-800">
          <div>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200">Available</p>
            <p className="text-xs text-gray-400">Children can only redeem available rewards.</p>
          </div>
          <Toggle checked={form.is_available} onChange={(v) => set('is_available', v)} />
        </div>
      </div>
    </Dialog>
  )
}
