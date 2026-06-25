import { useState, useMemo } from 'react'
import { Copy, Link2, UserPlus, Plus, Pin, Trash2, RefreshCw, AlertTriangle } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button, Tabs, Dialog, Input, Textarea, Label, Select } from '@/components/ui'
import { EmojiPicker, ColorPicker } from '@/components/shared/EmojiPicker'
import Avatar from '@/components/shared/Avatar'
import ChildCard from '@/components/family/ChildCard'
import ActivityFeed from '@/components/family/ActivityFeed'
import FamilyGoalCard from '@/components/family/FamilyGoalCard'
import WeeklyBossCard from '@/components/family/WeeklyBossCard'
import AwardSeedsDialog from '@/components/family/AwardSeedsDialog'
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog'
import EmptyState from '@/components/shared/EmptyState'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { create, update, remove, getById, resetAll } from '@/lib/db'
import { contributeToGoal } from '@/lib/domain'
import { AVATAR_EMOJIS, AVATAR_COLORS } from '@/lib/constants'
import { generateInviteCode, relativeTime, formatDate, plural } from '@/lib/utils'
import { toast } from '@/lib/toast'
import { logout } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'

export default function Family() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const users = useCollection('users')
  const activity = useCollection('activity')
  const goals = useCollection('goals')
  const bosses = useCollection('weeklyBosses')
  const announcements = useCollection('announcements')

  const family = getById('families', user?.family_id)
  const children = useMemo(() => users.filter((u) => u.family_id === user?.family_id && u.role === 'child'), [users, user])
  const members = users.filter((u) => u.family_id === user?.family_id)
  const famActivity = activity.filter((a) => a.family_id === user?.family_id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 30)
  const famGoals = goals.filter((g) => g.family_id === user?.family_id)
  const activeBoss = bosses.find((b) => b.family_id === user?.family_id && b.status === 'active') || bosses.find((b) => b.family_id === user?.family_id)
  const famAnnouncements = announcements.filter((a) => a.family_id === user?.family_id).sort((a, b) => (b.is_pinned - a.is_pinned) || (new Date(b.created_date) - new Date(a.created_date)))

  const [tab, setTab] = useState('children')
  const [childOpen, setChildOpen] = useState(false)
  const [awardChild, setAwardChild] = useState(null)
  const [deductChild, setDeductChild] = useState(null)
  const [delChild, setDelChild] = useState(null)
  const [goalOpen, setGoalOpen] = useState(false)
  const [contribGoal, setContribGoal] = useState(null)
  const [bossOpen, setBossOpen] = useState(false)

  if (!family) return null

  function copyCode() {
    navigator.clipboard?.writeText(family.invite_code)
    toast({ title: 'Code copied!', message: family.invite_code, emoji: '📋' })
  }
  function copyLink() {
    const url = `${window.location.origin}/Welcome?join=${family.invite_code}`
    navigator.clipboard?.writeText(url)
    toast({ title: 'Invite link copied!', message: 'Share it with your family.', emoji: '🔗' })
  }

  const tabs = [
    { value: 'children', label: 'Children', count: children.length },
    { value: 'activity', label: 'Activity Feed' },
    { value: 'goals', label: 'Family Goals', count: famGoals.length },
    { value: 'boss', label: 'Weekly Boss' },
    { value: 'announcements', label: 'Announcements', count: famAnnouncements.length },
    { value: 'settings', label: 'Settings' },
  ]

  return (
    <div>
      <PageHeader title={family.name || 'Our Family'} subtitle={`${plural(members.length, 'member')} · ${plural(children.length, 'child', 'children')}`} />

      <Card className="mb-5 overflow-hidden border-seed-100 bg-gradient-to-br from-seed-50 to-white dark:border-seed-900/40 dark:from-seed-900/20 dark:to-gray-900">
        <div className="flex flex-col items-center justify-between gap-3 p-5 sm:flex-row">
          <div className="text-center sm:text-left">
            <p className="text-xs uppercase tracking-wide text-gray-400">Family invite code</p>
            <p className="text-3xl font-extrabold tracking-widest text-seed-700 dark:text-seed-300">{family.invite_code}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={copyCode}><Copy className="h-4 w-4" /> Copy Code</Button>
            <Button onClick={copyLink}><Link2 className="h-4 w-4" /> Invite Member</Button>
          </div>
        </div>
      </Card>

      <Tabs tabs={tabs} value={tab} onChange={setTab} className="mb-5" />

      {tab === 'children' && (
        <div>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button onClick={() => setChildOpen(true)}><UserPlus className="h-4 w-4" /> Add Child (No Device)</Button>
            <Button variant="secondary" onClick={copyLink}><Link2 className="h-4 w-4" /> Invite Child with Device</Button>
          </div>
          {children.length === 0 ? (
            <EmptyState icon="👶" title="No children yet" description="Add a child profile to start assigning tasks." action={<Button onClick={() => setChildOpen(true)}><UserPlus className="h-4 w-4" /> Add Child</Button>} />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {children.map((c) => (
                <ChildCard key={c.id} child={c} onAward={setAwardChild} onDeduct={setDeductChild} onDelete={setDelChild} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'activity' && <ActivityFeed entries={famActivity} />}

      {tab === 'goals' && (
        <div>
          <div className="mb-4"><Button onClick={() => setGoalOpen(true)}><Plus className="h-4 w-4" /> New Goal</Button></div>
          {famGoals.length === 0 ? (
            <EmptyState icon="🎯" title="No family goals" description="Set a shared goal everyone can contribute seeds toward." action={<Button onClick={() => setGoalOpen(true)}><Plus className="h-4 w-4" /> New Goal</Button>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {famGoals.map((g) => <FamilyGoalCard key={g.id} goal={g} onContribute={setContribGoal} onDelete={(goal) => remove('goals', goal.id)} />)}
            </div>
          )}
        </div>
      )}

      {tab === 'boss' && (
        <div>
          <div className="mb-4"><Button onClick={() => setBossOpen(true)}>{activeBoss ? 'Edit Weekly Boss' : 'Create Weekly Boss'}</Button></div>
          {activeBoss ? (
            <div className="max-w-md"><WeeklyBossCard boss={activeBoss} onEdit={() => setBossOpen(true)} /></div>
          ) : (
            <EmptyState icon="🐲" title="No active boss" description="Create a weekly challenge to rally the whole family." action={<Button onClick={() => setBossOpen(true)}>Create Weekly Boss</Button>} />
          )}
        </div>
      )}

      {tab === 'announcements' && (
        <AnnouncementsTab announcements={famAnnouncements} user={user} />
      )}

      {tab === 'settings' && <FamilySettingsTab family={family} onDeleted={() => { resetAll(); logout(); navigate('/Welcome') }} />}

      {/* Dialogs */}
      <AddChildDialog open={childOpen} onClose={() => setChildOpen(false)} user={user} />
      <AwardSeedsDialog open={!!awardChild} onClose={() => setAwardChild(null)} child={awardChild} mode="award" />
      <AwardSeedsDialog open={!!deductChild} onClose={() => setDeductChild(null)} child={deductChild} mode="deduct" />
      <DeleteConfirmDialog open={!!delChild} onClose={() => setDelChild(null)} itemName={delChild?.full_name} message="This removes the child and their data." onConfirm={() => remove('users', delChild.id)} />
      <GoalDialog open={goalOpen} onClose={() => setGoalOpen(false)} user={user} />
      <ContributeDialog open={!!contribGoal} onClose={() => setContribGoal(null)} goal={contribGoal} children={children} />
      <BossDialog open={bossOpen} onClose={() => setBossOpen(false)} user={user} boss={activeBoss} />
    </div>
  )
}

/* ----------------------------------------------------------------- dialogs */
function AddChildDialog({ open, onClose, user }) {
  const [name, setName] = useState('')
  const [age, setAge] = useState('')
  const [emoji, setEmoji] = useState('🚀')
  const [color, setColor] = useState(AVATAR_COLORS[0])

  function save() {
    if (!name.trim()) return
    create('users', {
      family_id: user.family_id, full_name: name.trim(), email: '', role: 'child',
      age: age ? Number(age) : null, avatar_emoji: emoji, avatar_bg_color: color,
      seed_balance: 0, total_seeds_earned: 0, streak_current: 0, streak_longest: 0,
      streak_savers_available: 0, xp: 0, level: 1, managed: true,
    })
    toast({ title: 'Child added!', emoji: '👶' })
    setName(''); setAge(''); setEmoji('🚀'); setColor(AVATAR_COLORS[0])
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="Add Child" description="Create a managed profile (no device needed)."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!name.trim()}>Add child</Button></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Avatar user={{ avatar_emoji: emoji, avatar_bg_color: color }} size="lg" />
          <div className="flex-1"><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Child's name" autoFocus /></div>
          <div className="w-20"><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
        </div>
        <div><Label>Emoji</Label><EmojiPicker value={emoji} onChange={setEmoji} options={AVATAR_EMOJIS} /></div>
        <div><Label>Background color</Label><ColorPicker value={color} onChange={setColor} options={AVATAR_COLORS} /></div>
      </div>
    </Dialog>
  )
}

function GoalDialog({ open, onClose, user }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [target, setTarget] = useState(100)
  const [deadline, setDeadline] = useState('')

  function save() {
    if (!title.trim()) return
    create('goals', {
      family_id: user.family_id, title: title.trim(), description: description.trim(),
      target_seeds: Number(target) || 100, current_seeds: 0, status: 'active',
      deadline: deadline ? new Date(deadline + 'T20:00:00').toISOString() : null,
    })
    toast({ title: 'Goal created!', emoji: '🎯' })
    setTitle(''); setDescription(''); setTarget(100); setDeadline('')
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title="New Family Goal" description="A shared goal everyone contributes toward."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={!title.trim()}>Create goal</Button></>}>
      <div className="space-y-4">
        <div><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Family movie night" autoFocus /></div>
        <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Target seeds</Label><Input type="number" min={1} value={target} onChange={(e) => setTarget(e.target.value)} /></div>
          <div><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
        </div>
      </div>
    </Dialog>
  )
}

function ContributeDialog({ open, onClose, goal, children }) {
  const [childId, setChildId] = useState('')
  const [amount, setAmount] = useState(5)
  const [error, setError] = useState('')

  function submit() {
    setError('')
    if (!childId) return setError('Pick a child.')
    const ok = contributeToGoal(goal.id, childId, Number(amount))
    if (!ok) return setError('Not enough seeds for that contribution.')
    toast({ title: 'Contributed!', emoji: '🎯' })
    onClose()
  }
  if (!goal) return null
  return (
    <Dialog open={open} onClose={onClose} title={`Contribute to "${goal.title}"`}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={submit}>Contribute</Button></>}>
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30">{error}</p>}
      <div className="space-y-4">
        <div>
          <Label>From child</Label>
          <Select value={childId} onChange={(e) => setChildId(e.target.value)}>
            <option value="">Choose…</option>
            {children.map((c) => <option key={c.id} value={c.id}>{c.full_name} (🌱 {c.seed_balance || 0})</option>)}
          </Select>
        </div>
        <div><Label>Amount</Label><Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
      </div>
    </Dialog>
  )
}

function BossDialog({ open, onClose, user, boss }) {
  const [title, setTitle] = useState(boss?.title || 'The Chore Dragon')
  const [emoji, setEmoji] = useState(boss?.emoji || '🐲')
  const [required, setRequired] = useState(boss?.total_tasks_required || 15)
  const [bonus, setBonus] = useState(boss?.seed_bonus || 10)
  const [reward, setReward] = useState(boss?.reward_description || '')
  const [description, setDescription] = useState(boss?.description || '')

  function save() {
    const now = new Date()
    const end = new Date(); end.setDate(end.getDate() + 7)
    const payload = {
      family_id: user.family_id, title: title.trim() || 'Weekly Boss', emoji,
      description: description.trim(), total_tasks_required: Number(required) || 10,
      reward_description: reward.trim(), seed_bonus: Number(bonus) || 0,
      status: 'active',
    }
    if (boss) update('weeklyBosses', boss.id, payload)
    else create('weeklyBosses', { ...payload, tasks_completed: 0, week_start: now.toISOString(), week_end: end.toISOString() })
    toast({ title: 'Weekly Boss saved!', emoji: '🐲' })
    onClose()
  }

  return (
    <Dialog open={open} onClose={onClose} title={boss ? 'Edit Weekly Boss' : 'Create Weekly Boss'}
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={save}>Save boss</Button></>}>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-100 text-3xl dark:bg-purple-900/30">{emoji}</div>
          <div className="flex-1"><Label>Boss name</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
        </div>
        <div><Label>Emoji</Label><EmojiPicker value={emoji} onChange={setEmoji} options={['🐲', '👹', '🦖', '🐉', '👾', '🦑', '🤖', '👻', '🦈', '🐙']} /></div>
        <div><Label>Description</Label><Textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Tasks required</Label><Input type="number" min={1} value={required} onChange={(e) => setRequired(e.target.value)} /></div>
          <div><Label>Seed bonus</Label><Input type="number" min={0} value={bonus} onChange={(e) => setBonus(e.target.value)} /></div>
        </div>
        <div><Label>Reward description</Label><Input value={reward} onChange={(e) => setReward(e.target.value)} placeholder="e.g. Family pizza night" /></div>
      </div>
    </Dialog>
  )
}

function AnnouncementsTab({ announcements, user }) {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')

  function post() {
    if (!title.trim() || !message.trim()) return
    create('announcements', { family_id: user.family_id, title: title.trim(), message: message.trim(), created_by: user.id, is_pinned: false })
    try { localStorage.removeItem('goodseed_dismissed_announcement') } catch { /* ignore */ }
    toast({ title: 'Announcement posted!', emoji: '📣' })
    setTitle(''); setMessage('')
  }

  return (
    <div>
      <Card className="mb-4 p-4">
        <Label>New announcement</Label>
        <Input className="mb-2" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
        <Textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Message…" />
        <Button className="mt-2" onClick={post} disabled={!title.trim() || !message.trim()}><Plus className="h-4 w-4" /> Post</Button>
      </Card>
      {announcements.length === 0 ? (
        <EmptyState icon="📣" title="No announcements" description="Post family news here." />
      ) : (
        <div className="space-y-2">
          {announcements.map((a) => (
            <Card key={a.id} className={`p-4 ${a.is_pinned ? 'border-amber-200 bg-amber-50/50 dark:border-amber-900/40 dark:bg-amber-900/10' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
                    {a.is_pinned && <span>📌</span>}{a.title}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-600 dark:text-gray-300">{a.message}</p>
                  <p className="mt-1 text-xs text-gray-400">{formatDate(a.created_date)} · {relativeTime(a.created_date)}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => update('announcements', a.id, { is_pinned: !a.is_pinned })} className={`rounded-lg p-1.5 ${a.is_pinned ? 'text-amber-500' : 'text-gray-400'} hover:bg-gray-100 dark:hover:bg-gray-800`}>
                    <Pin className="h-4 w-4" />
                  </button>
                  <button onClick={() => remove('announcements', a.id)} className="rounded-lg p-1.5 text-gray-400 hover:text-red-500">
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

function FamilySettingsTab({ family, onDeleted }) {
  const [name, setName] = useState(family.name)
  const [confirm, setConfirm] = useState('')

  return (
    <div className="max-w-lg space-y-5">
      <Card className="p-5">
        <Label>Family name</Label>
        <div className="flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
          <Button onClick={() => { update('families', family.id, { name: name.trim() || family.name }); toast({ title: 'Saved!', emoji: '✅' }) }}>Save</Button>
        </div>
      </Card>
      <Card className="p-5">
        <Label>Invite code</Label>
        <div className="flex items-center gap-2">
          <Input value={family.invite_code} readOnly className="font-bold tracking-widest" />
          <Button variant="secondary" onClick={() => { update('families', family.id, { invite_code: generateInviteCode() }); toast({ title: 'Code regenerated!', emoji: '🔄' }) }}>
            <RefreshCw className="h-4 w-4" /> Regenerate
          </Button>
        </div>
      </Card>
      <Card className="border-red-200 p-5 dark:border-red-900/50">
        <h3 className="flex items-center gap-2 font-bold text-red-600"><AlertTriangle className="h-5 w-5" /> Danger Zone</h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Delete the entire family account and all data. Type <b>{family.name}</b> to confirm.
        </p>
        <Input className="mt-3" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={family.name} />
        <Button variant="danger" className="mt-3" disabled={confirm !== family.name} onClick={onDeleted}>
          Delete Family Account
        </Button>
      </Card>
    </div>
  )
}
