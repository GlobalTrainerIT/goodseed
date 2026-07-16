import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Minus, UserPlus, Trash2, Trophy, Copy, CheckSquare, X, Sparkles, Settings2, Camera, Monitor } from 'lucide-react'
import { Card, Button, Input, Label, Dialog, Badge } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useRecord, useSettings } from '@/lib/hooks'
import { create, remove, getById, updateSettings } from '@/lib/db'
import { awardSeeds, deductSeeds, seedLabel } from '@/lib/domain'
import { canAddChild, trialDaysLeft, teamsActive, groupTypeOf } from '@/lib/plan'
import { AVATAR_EMOJIS, AVATAR_COLORS, DEFAULT_POINT_PRESETS } from '@/lib/constants'
import { useRosterPhoto, setRosterPhoto, removeRosterPhoto } from '@/lib/rosterPhotos'
import { fileToDataUrl } from '@/lib/utils'
import { toast } from '@/lib/toast'

const QUICK_AWARD = [1, 2, 5, 10]
const QUICK_DEDUCT = [1, 5]

function usePresets() {
  const settings = useSettings()
  return settings.pointPresets ?? DEFAULT_POINT_PRESETS
}

// Award (or dock, floored at zero) points to one kid. Returns false if a
// deduction couldn't happen because the balance was already zero.
function applyOne(kidId, amount, reason) {
  if (amount > 0) {
    awardSeeds(kidId, amount, reason || null, null)
    return true
  }
  const bal = getById('users', kidId)?.seed_balance || 0
  const dock = Math.min(-amount, bal)
  if (dock <= 0) return false
  return deductSeeds(kidId, dock, reason || null)
}

export default function Roster() {
  const user = useCurrentUser()
  const group = useRecord('families', user?.family_id)
  const navigate = useNavigate()
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  const presets = usePresets()
  const [pointsFor, setPointsFor] = useState(null) // kid receiving points (single mode)
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState(null)
  const [photoFor, setPhotoFor] = useState(null) // kid whose photo is being edited
  const [editingBehaviors, setEditingBehaviors] = useState(false)

  // Multi-select ("give the whole group a point") mode
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState(() => new Set())

  const daysLeft = trialDaysLeft(group)
  const active = teamsActive(group) || group?.plan === 'teams'
  const type = groupTypeOf(group)

  function copyCode() {
    navigator.clipboard?.writeText(group.invite_code)
    toast({ title: 'Code copied!', message: 'Share it with a co-leader to run points together.', emoji: '📋' })
  }

  function toggleSelect(id) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }
  function exitSelect() {
    setSelectMode(false)
    setSelected(new Set())
  }

  // Award/dock to everyone currently selected.
  function applyToSelected(amount, reason) {
    if (!active) {
      toast({ title: 'Trial ended', message: 'Subscribe to Teams in Settings to keep awarding points.', emoji: '🔒' })
      return
    }
    const ids = [...selected]
    if (!ids.length) return
    let hits = 0
    ids.forEach((id) => { if (applyOne(id, amount, reason)) hits += 1 })
    const label = seedLabel().toLowerCase()
    toast({
      title: `${amount > 0 ? '+' : ''}${amount} to ${hits} ${hits === 1 ? 'kid' : 'kids'}`,
      message: reason || (amount > 0 ? 'Nice work, team!' : ''),
      emoji: amount > 0 ? '🌟' : '📉',
    })
    setSelected(new Set()) // ready for the next batch; stay in select mode
  }

  if (!group) return null

  const allSelected = kids.length > 0 && selected.size === kids.length

  return (
    <div className="mx-auto max-w-4xl pb-28">
      <PageHeader
        title={`${type.emoji} ${group.name}`}
        subtitle={
          selectMode
            ? `${selected.size} selected · tap kids, then choose points below`
            : `${kids.length} on the roster · tap anyone to give or take ${seedLabel().toLowerCase()}`
        }
        actions={
          selectMode ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={() => setSelected(allSelected ? new Set() : new Set(kids.map((k) => k.id)))}>
                {allSelected ? 'Clear all' : 'Select all'}
              </Button>
              <Button variant="outline" onClick={exitSelect}><X className="h-4 w-4" /> Done</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              {kids.length > 0 && (
                <Button variant="secondary" onClick={() => setSelectMode(true)}><CheckSquare className="h-4 w-4" /> Select</Button>
              )}
              <Button variant="secondary" onClick={() => navigate('/Display')}><Monitor className="h-4 w-4" /> Big screen</Button>
              <Button variant="secondary" onClick={() => navigate('/Leaderboard')}><Trophy className="h-4 w-4" /> Leaderboard</Button>
              <Button onClick={() => setAdding(true)}><UserPlus className="h-4 w-4" /> Add</Button>
            </div>
          )
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
            <KidCard
              key={kid.id}
              kid={kid}
              selectMode={selectMode}
              selected={selected.has(kid.id)}
              onTap={() => (selectMode ? toggleSelect(kid.id) : setPointsFor(kid))}
              onPhoto={() => setPhotoFor(kid)}
              onRemove={() => setRemoving(kid)}
            />
          ))}
        </div>
      )}

      {!selectMode && (
        <Card className="mt-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Co-leader code</p>
            <p className="text-xs text-gray-400">Another coach or assistant can join from their device with this code.</p>
          </div>
          <button onClick={copyCode} className="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-1.5 font-mono text-base font-bold tracking-widest text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200">
            {group.invite_code} <Copy className="h-4 w-4 text-gray-400" />
          </button>
        </Card>
      )}

      {/* Bulk action bar — sits above the mobile tab bar / beside the desktop sidebar */}
      {selectMode && selected.size > 0 && (
        <div className="fixed inset-x-0 bottom-16 z-40 border-t border-gray-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur lg:bottom-0 lg:left-[280px] dark:border-gray-800 dark:bg-gray-900/95">
          <div className="mx-auto flex max-w-4xl flex-col gap-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{selected.size} selected</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_AWARD.map((n) => (
                  <button key={n} onClick={() => applyToSelected(n, null)} className="rounded-lg bg-seed-600 px-3 py-1.5 text-sm font-bold text-white hover:bg-seed-700">+{n}</button>
                ))}
                {QUICK_DEDUCT.map((n) => (
                  <button key={n} onClick={() => applyToSelected(-n, null)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-bold text-red-600 hover:bg-red-50 dark:border-red-900">−{n}</button>
                ))}
              </div>
            </div>
            {presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button key={p.id} onClick={() => applyToSelected(p.amount, p.label)} className={`rounded-full px-3 py-1 text-xs font-semibold ${p.amount >= 0 ? 'bg-seed-100 text-seed-800 hover:bg-seed-200 dark:bg-seed-900/40 dark:text-seed-200' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'}`}>
                    {p.label} {p.amount >= 0 ? '+' : ''}{p.amount}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <PointsDialog kid={pointsFor} active={active} presets={presets} onEditBehaviors={() => { setPointsFor(null); setEditingBehaviors(true) }} onClose={() => setPointsFor(null)} />
      <AddKidDialog open={adding} group={group} kidCount={kids.length} onClose={() => setAdding(false)} />
      <RemoveKidDialog kid={removing} onClose={() => setRemoving(null)} />
      <PhotoDialog kid={photoFor} onClose={() => setPhotoFor(null)} />
      <BehaviorsDialog open={editingBehaviors} presets={presets} onClose={() => setEditingBehaviors(false)} />
    </div>
  )
}

// A roster tile. Reads its own local-only photo so a change re-renders just
// this card. The photo never syncs — it lives only on this device.
function KidCard({ kid, selectMode, selected, onTap, onPhoto, onRemove }) {
  const photo = useRosterPhoto(kid.id)
  const shown = photo ? { ...kid, avatar_photo: photo } : kid
  return (
    <button onClick={onTap} className="group text-left">
      <Card className={`relative flex flex-col items-center gap-2 p-4 text-center transition hover:border-seed-400 hover:shadow-md ${selected ? 'border-seed-500 ring-2 ring-seed-400 dark:border-seed-500' : ''}`}>
        {selectMode && (
          <span className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded-full border-2 ${selected ? 'border-seed-500 bg-seed-500 text-white' : 'border-gray-300'}`}>
            {selected && <CheckSquare className="h-3 w-3" />}
          </span>
        )}
        <div className="relative">
          <Avatar user={shown} size="lg" />
          {!selectMode && (
            <span
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onPhoto() }}
              className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-gray-600 text-white shadow hover:bg-gray-700 dark:border-gray-900"
              aria-label={`Photo for ${kid.full_name}`}
            >
              <Camera className="h-3 w-3" />
            </span>
          )}
        </div>
        <p className="w-full truncate font-bold text-gray-900 dark:text-gray-100">{kid.full_name}</p>
        <Badge variant="green" className="text-sm font-extrabold">🌟 {kid.seed_balance || 0}</Badge>
        {!selectMode && (
          <span
            role="button"
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onRemove() }}
            className="absolute right-2 top-2 hidden rounded-full p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500 group-hover:block"
            aria-label={`Remove ${kid.full_name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        )}
      </Card>
    </button>
  )
}

// Local-only photo editor for a roster kid. Downscaled to 256px and stored on
// this device only — never uploaded, never synced. See src/lib/rosterPhotos.js.
function PhotoDialog({ kid, onClose }) {
  const photo = useRosterPhoto(kid?.id)
  const fileRef = useRef(null)
  const [busy, setBusy] = useState(false)

  async function pick(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    const url = await fileToDataUrl(file, 256, 0.75)
    setBusy(false)
    if (url) {
      setRosterPhoto(kid.id, url)
      toast({ title: 'Photo added', message: 'Saved on this device only.', emoji: '📸' })
    } else {
      toast({ title: "Couldn't read that image", type: 'error' })
    }
  }

  if (!kid) return null
  return (
    <Dialog
      open={!!kid}
      onClose={onClose}
      title={`Photo — ${kid.full_name}`}
      description="Helps you match names to faces on your roster."
      footer={<Button onClick={onClose}>Done</Button>}
    >
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <Avatar user={photo ? { ...kid, avatar_photo: photo } : kid} size="xl" />
          <div className="flex flex-col gap-2">
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pick} />
            <Button variant="secondary" onClick={() => fileRef.current?.click()} disabled={busy}>
              <Camera className="h-4 w-4" /> {busy ? 'Loading…' : photo ? 'Change photo' : 'Choose photo'}
            </Button>
            {photo && (
              <Button
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900"
                onClick={() => { removeRosterPhoto(kid.id); toast({ title: 'Photo removed', emoji: '🗑️' }) }}
              >
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            )}
          </div>
        </div>
        <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
          🔒 Photos stay on <b>this device only</b> — they're never uploaded or synced, and no one else can see them. Please follow your organization's policy on photographing children.
        </p>
      </div>
    </Dialog>
  )
}

function PointsDialog({ kid, active, presets, onEditBehaviors, onClose }) {
  const [reason, setReason] = useState('')
  const [custom, setCustom] = useState('')
  const liveKid = useRecord('users', kid?.id) // live balance while the dialog is open
  const live = liveKid?.seed_balance || 0

  function give(amount, presetReason) {
    if (!active) {
      toast({ title: 'Trial ended', message: 'Subscribe to Teams in Settings to keep awarding points.', emoji: '🔒' })
      return
    }
    const why = (presetReason || reason).trim() || null
    const ok = applyOne(kid.id, amount, why)
    if (!ok && amount < 0) {
      toast({ title: "Can't go below zero", message: `${kid.full_name} is already at 0.`, emoji: '🤏' })
      return
    }
    toast({
      title: `${amount > 0 ? '+' : ''}${amount} for ${kid.full_name}`,
      message: why || (amount > 0 ? 'Nice work!' : ''),
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
        {presets.length > 0 && (
          <div>
            <div className="flex items-center justify-between">
              <Label>Behaviors — one tap to award</Label>
              <button onClick={onEditBehaviors} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-seed-600">
                <Settings2 className="h-3.5 w-3.5" /> Edit
              </button>
            </div>
            <div className="mt-1 flex flex-wrap gap-2">
              {presets.map((p) => (
                <button key={p.id} onClick={() => give(p.amount, p.label)} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${p.amount >= 0 ? 'bg-seed-100 text-seed-800 hover:bg-seed-200 dark:bg-seed-900/40 dark:text-seed-200' : 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300'}`}>
                  {p.label} {p.amount >= 0 ? '+' : ''}{p.amount}
                </button>
              ))}
            </div>
          </div>
        )}
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

function BehaviorsDialog({ open, presets, onClose }) {
  const [rows, setRows] = useState(presets)
  const [label, setLabel] = useState('')
  const [amount, setAmount] = useState('1')

  // Re-seed local edits whenever the dialog is (re)opened.
  useEffect(() => { if (open) setRows(presets) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  function add() {
    const l = label.trim()
    const n = parseInt(amount, 10)
    if (!l || !n) return
    setRows((r) => [...r, { id: `p${Date.now()}`, label: l, amount: n }])
    setLabel('')
    setAmount('1')
  }
  function del(id) {
    setRows((r) => r.filter((x) => x.id !== id))
  }
  function save() {
    updateSettings({ pointPresets: rows })
    toast({ title: 'Behaviors saved', emoji: '✅' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Edit behaviors"
      description="One-tap buttons for the points you award most. Use a negative number to dock points."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="space-y-2">
          {rows.map((p) => (
            <div key={p.id} className="flex items-center gap-2 rounded-lg border border-gray-100 p-2 dark:border-gray-800">
              <span className={`flex-1 text-sm font-semibold ${p.amount < 0 ? 'text-red-600' : 'text-gray-800 dark:text-gray-200'}`}>{p.label}</span>
              <Badge variant={p.amount >= 0 ? 'green' : 'gray'}>{p.amount >= 0 ? '+' : ''}{p.amount}</Badge>
              <button onClick={() => del(p.id)} className="rounded p-1 text-gray-300 hover:bg-red-50 hover:text-red-500" aria-label={`Remove ${p.label}`}>
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {rows.length === 0 && <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">No behaviors yet — add one below.</p>}
        </div>
        <div className="flex items-end gap-2 border-t border-gray-100 pt-3 dark:border-gray-800">
          <div className="flex-1">
            <Label>New behavior</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Cleaned up"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); add() } }} />
          </div>
          <div className="w-20">
            <Label>Points</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button variant="secondary" onClick={add} disabled={!label.trim()}><Sparkles className="h-4 w-4" /> Add</Button>
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
