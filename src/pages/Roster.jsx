import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, UserPlus, Trash2, Trophy, Copy } from 'lucide-react'
import { Card, Button, Input, Label, Dialog, Badge } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useRecord } from '@/lib/hooks'
import { create, remove } from '@/lib/db'
import { awardSeeds, deductSeeds, seedLabel } from '@/lib/domain'
import { canAddChild, trialDaysLeft, teamsActive, groupTypeOf } from '@/lib/plan'
import { AVATAR_EMOJIS, AVATAR_COLORS } from '@/lib/constants'
import { toast } from '@/lib/toast'

const QUICK_AWARD = [1, 2, 5, 10]
const QUICK_DEDUCT = [1, 5]

export default function Roster() {
  const user = useCurrentUser()
  const group = useRecord('families', user?.family_id)
  const navigate = useNavigate()
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  const [pointsFor, setPointsFor] = useState(null) // kid receiving points
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)

  const daysLeft = trialDaysLeft(group)
  const type = groupTypeOf(group)

  function copyCode() {
    navigator.clipboard?.writeText(group.invite_code)
    toast({ title: 'Code copied!', message: 'Share it with a co-leader to run points together.', emoji: '📋' })
  }

  if (!group) return null

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title={`${type.emoji} ${group.name}`}
        subtitle={`${kids.length} on the roster · tap anyone to give or take ${seedLabel().toLowerCase()}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => navigate('/Leaderboard')}>
              <Trophy className="h-4 w-4" /> Leaderboard
            </Button>
            <Button onClick={() => setAdding(true)}>
              <UserPlus className="h-4 w-4" /> Add
            </Button>
          </div>
        }
      />

      {group.plan !== 'teams' && (
        <div className={`mb-5 rounded-xl px-4 py-2.5 text-sm font-medium ${daysLeft > 0 ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' : 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300'}`}>
          {daysLeft > 0
            ? `✨ Teams trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left, everything unlocked.`
            : '⚠️ Your Teams trial has ended. Your roster is safe — subscribe in Settings to keep awarding points.'}
        </div>
      )}

      {kids.length === 0 ? (
        <EmptyState
          icon="🧑‍🏫"
          title="Build your roster"
          description={`Add the kids in your ${type.label.toLowerCase()} — just a first name is all you need. No accounts, emails, or devices required.`}
          action={<Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add your first kid</Button>}
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {kids.map((kid) => (
            <button key={kid.id} onClick={() => setPointsFor(kid)} className="group text-left">
              <Card className="relative flex flex-col items-center gap-2 p-4 text-center transition hover:border-seed-400 hover:shadow-md">
                <Avatar user={kid} size="lg" />
                <p className="w-full truncate font-bold text-gray-900 dark:text-gray-100">{kid.full_name}</p>
                <Badge variant="green" className="text-sm font-extrabold">🌟 {kid.seed_balance || 0}</Badge>
                <span
                  role="button"
                  tabIndex={-1}
                  onClick={(e) => { e.stopPropagation(); setRemoving(kid) }}
                  className="absolute right-2 top-2 hidden rounded-full p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
                  aria-label={`Remove ${kid.full_name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </Card>
            </button>
          ))}
        </div>
      )}

      <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Co-leader code</p>
          <p className="text-xs text-gray-400">Another coach or assistant can join from their device with this code.</p>
        </div>
        <button onClick={copyCode} className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-base font-bold tracking-widest text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">
          {group.invite_code} <Copy className="h-4 w-4 text-gray-400" />
        </button>
      </Card>

      <PointsDialog kid={pointsFor} group={group} onClose={() => setPointsFor(null)} />
      <AddKidDialog open={adding} group={group} kidCount={kids.length} onClose={() => setAdding(false)} />
      <RemoveKidDialog kid={removing} onClose={() => setRemoving(null)} />
    </div>
  )
}

function PointsDialog({ kid, group, onClose }) {
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')
  const liveKid = useRecord('users', kid?.id) // live balance while the dialog is open
  const live = liveKid?.seed_balance || 0
  const active = teamsActive(group) || group?.plan === 'teams'

  function give(amount) {
    if (!active) {
      toast({ title: 'Trial ended', message: 'Subscribe to Teams in Settings to keep awarding points.', emoji: '🔒' })
      return
    }
    if (amount > 0) {
      awardSeeds(kid.id, amount, reason.trim() || null, null)
    } else {
      const ok = deductSeeds(kid.id, -amount, reason.trim() || null)
      if (!ok) {
        toast({ title: "Can't go below zero", message: `${kid.full_name} doesn't have that many points.`, emoji: '🤏' })
        return
      }
    }
    toast({
      title: `${amount > 0 ? '+' : ''}${amount} for ${kid.full_name}`,
      message: reason.trim() || (amount > 0 ? 'Nice work!' : ''),
      emoji: amount > 0 ? '🌟' : '📉',
    })
    setReason('')
    setCustom('')
  }

  function giveCustom(sign) {
    const n = Math.abs(parseInt(custom, 10))
    if (!n) return
    give(sign * n)
  }

  if (!kid) return null
  return (
    <Dialog open={!!kid} onClose={onClose} title={kid.full_name} description={`Current balance: ${live} ${seedLabel().toLowerCase()}`}>
      <div className="space-y-4">
        <div>
          <Label>Give {seedLabel().toLowerCase()}</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUICK_AWARD.map((n) => (
              <Button key={n} onClick={() => give(n)} className="min-w-[64px]">
                <Plus className="h-4 w-4" /> {n}
              </Button>
            ))}
          </div>
        </div>
        <div>
          <Label>Take away</Label>
          <div className="mt-1 flex flex-wrap gap-2">
            {QUICK_DEDUCT.map((n) => (
              <Button key={n} variant="outline" onClick={() => give(-n)} className="min-w-[64px] border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900">
                <Minus className="h-4 w-4" /> {n}
              </Button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div className="w-28">
            <Label>Custom</Label>
            <Input type="number" min="1" value={custom} onChange={(e) => setCustom(e.target.value)} placeholder="e.g. 25" />
          </div>
          <Button variant="secondary" onClick={() => giveCustom(1)} disabled={!custom}>+ Give</Button>
          <Button variant="outline" onClick={() => giveCustom(-1)} disabled={!custom}>− Take</Button>
        </div>
        <div>
          <Label>Reason (optional — shows in the activity log)</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Great hustle at practice" />
        </div>
      </div>
    </Dialog>
  )
}

function AddKidDialog({ open, group, kidCount, onClose }) {
  const [name, setName] = useState('')
  const allowed = canAddChild(group, kidCount)

  function save(keepOpen) {
    if (!name.trim() || !allowed) return
    create('users', {
      family_id: group.id,
      full_name: name.trim(),
      email: '',
      role: 'child',
      age: null,
      avatar_emoji: AVATAR_EMOJIS[Math.floor(Math.random() * AVATAR_EMOJIS.length)],
      avatar_bg_color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
      seed_balance: 0,
      total_seeds_earned: 0,
      streak_current: 0,
      streak_longest: 0,
      streak_savers_available: 0,
      xp: 0,
      level: 1,
      managed: true,
    })
    toast({ title: `${name.trim()} added!`, emoji: '🎉' })
    setName('')
    if (!keepOpen) onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Add to roster"
      description="Just a first name — no account, email, or device needed."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Done</Button>
          <Button variant="secondary" onClick={() => save(true)} disabled={!name.trim() || !allowed}>Save & add another</Button>
          <Button onClick={() => save(false)} disabled={!name.trim() || !allowed}>Add</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div>
          <Label>First name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sam" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save(true) } }} />
        </div>
        {!allowed && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/30 dark:text-red-300">
            Your trial has ended — subscribe to Teams in Settings to grow the roster.
          </p>
        )}
      </div>
    </Dialog>
  )
}

function RemoveKidDialog({ kid, onClose }) {
  if (!kid) return null
  return (
    <Dialog
      open={!!kid}
      onClose={onClose}
      title={`Remove ${kid.full_name}?`}
      description="Removes them from the roster and their points history from this group. This can't be undone."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            onClick={() => {
              remove('users', kid.id)
              toast({ title: `${kid.full_name} removed`, emoji: '👋' })
              onClose()
            }}
            className="bg-red-600 hover:bg-red-700"
          >
            Remove
          </Button>
        </>
      }
    />
  )
}
