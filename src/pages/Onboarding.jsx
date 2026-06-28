import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Sprout, Plus, Trash2, Check, ArrowRight } from 'lucide-react'
import { Card, Button, Input, Label, ProgressBar } from '@/components/ui'
import { EmojiPicker, ColorPicker } from '@/components/shared/EmojiPicker'
import Avatar from '@/components/shared/Avatar'
import { AVATAR_EMOJIS, AVATAR_COLORS, TASK_CATEGORIES } from '@/lib/constants'
import { create, getById, getAll } from '@/lib/db'
import { toast } from '@/lib/toast'
import { useCurrentUser } from '@/lib/hooks'

const TASK_SUGGESTIONS = [
  { title: 'Tidy Room', category: 'chores', seed_value: 1 },
  { title: 'Read for 15 Minutes', category: 'homework', seed_value: 2 },
  { title: 'Help Set the Table', category: 'kindness', seed_value: 1 },
  { title: 'Brush Teeth', category: 'other', seed_value: 1 },
]

export default function Onboarding() {
  const navigate = useNavigate()
  const user = useCurrentUser()
  const [step, setStep] = useState(1)

  const [childDraft, setChildDraft] = useState({ name: '', age: '', emoji: '🚀', color: AVATAR_COLORS[0] })
  const [children, setChildren] = useState([])
  const [tasks, setTasks] = useState([])

  if (!user) return <Navigate to="/Welcome" replace />

  // Guard: if this family already has children or tasks, onboarding is done —
  // don't let a stray /Onboarding visit re-run setup and orphan data.
  const alreadySetUp =
    getAll('users').some((u) => u.family_id === user.family_id && u.role === 'child') ||
    getAll('tasks').some((t) => t.family_id === user.family_id)
  if (alreadySetUp) return <Navigate to="/Dashboard" replace />

  function addChild() {
    if (!childDraft.name.trim()) return
    if (children.length >= 2) {
      toast({ title: 'Free plan: up to 2 children', message: 'You can add more after upgrading to Plus.', emoji: '🌱', type: 'info' })
      return
    }
    setChildren((c) => [...c, { ...childDraft }])
    setChildDraft({ name: '', age: '', emoji: '🚀', color: AVATAR_COLORS[(children.length + 1) % AVATAR_COLORS.length] })
  }

  function toggleTask(sugg) {
    setTasks((t) =>
      t.find((x) => x.title === sugg.title) ? t.filter((x) => x.title !== sugg.title) : [...t, sugg]
    )
  }

  function finish() {
    children.forEach((c) =>
      create('users', {
        family_id: user.family_id,
        full_name: c.name.trim(),
        email: '',
        role: 'child',
        age: c.age ? Number(c.age) : null,
        avatar_emoji: c.emoji,
        avatar_bg_color: c.color,
        seed_balance: 0,
        total_seeds_earned: 0,
        streak_current: 0,
        streak_longest: 0,
        streak_savers_available: 0,
        xp: 0,
        level: 1,
        managed: true,
      })
    )
    tasks.forEach((t) =>
      create('tasks', {
        family_id: user.family_id,
        title: t.title,
        description: '',
        category: t.category,
        seed_value: t.seed_value,
        frequency: 'daily',
        due_date: null,
        assigned_children: [],
        status: 'active',
        requires_approval: true,
        created_by: user.id,
      })
    )
    navigate('/Dashboard')
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-gradient-to-b from-seed-100 to-seed-50 px-4 py-10 dark:from-gray-900 dark:to-gray-950">
      <div className="w-full max-w-xl">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seed-600 text-white">
            <Sprout className="h-5 w-5" />
          </div>
          <span className="text-lg font-extrabold text-gray-900 dark:text-gray-100">Let's set up your family</span>
        </div>

        <div className="mb-2 flex justify-between text-xs font-medium text-gray-500">
          <span>Step {step} of 3</span>
          <span>{Math.round((step / 3) * 100)}%</span>
        </div>
        <ProgressBar value={step} max={3} className="mb-6" />

        {step === 1 && (
          <Card className="p-6">
            <h2 className="mb-1 text-xl font-bold text-gray-900 dark:text-gray-100">Your family</h2>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              You're all set as <b>{user.full_name}</b>. Your invite code lets children join.
            </p>
            <div className="rounded-xl bg-seed-50 p-4 text-center dark:bg-seed-900/20">
              <p className="text-xs uppercase tracking-wide text-gray-400">Family invite code</p>
              <p className="mt-1 text-3xl font-extrabold tracking-widest text-seed-700 dark:text-seed-300">
                {getById('families', user.family_id)?.invite_code || '------'}
              </p>
            </div>
            <Button className="mt-6 w-full" onClick={() => setStep(2)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        )}

        {step === 2 && (
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Add your children</h2>
              <button onClick={() => setStep(3)} className="text-sm font-medium text-gray-400 hover:text-gray-600">
                Skip
              </button>
            </div>

            {children.length > 0 && (
              <div className="mb-4 space-y-2">
                {children.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 p-2.5 dark:bg-gray-800">
                    <Avatar user={{ avatar_emoji: c.emoji, avatar_bg_color: c.color }} size="sm" />
                    <span className="flex-1 font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                    {c.age && <span className="text-xs text-gray-400">Age {c.age}</span>}
                    <button onClick={() => setChildren(children.filter((_, idx) => idx !== i))} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-gray-100 p-4 dark:border-gray-800">
              <div className="flex items-center gap-3">
                <Avatar user={{ avatar_emoji: childDraft.emoji, avatar_bg_color: childDraft.color }} size="md" />
                <div className="flex-1">
                  <Input value={childDraft.name} onChange={(e) => setChildDraft({ ...childDraft, name: e.target.value })} placeholder="Child's name" />
                </div>
                <Input
                  type="number"
                  value={childDraft.age}
                  onChange={(e) => setChildDraft({ ...childDraft, age: e.target.value })}
                  placeholder="Age"
                  className="w-20"
                />
              </div>
              <div>
                <Label>Pick an emoji</Label>
                <EmojiPicker value={childDraft.emoji} onChange={(emoji) => setChildDraft({ ...childDraft, emoji })} options={AVATAR_EMOJIS} />
              </div>
              <div>
                <Label>Background color</Label>
                <ColorPicker value={childDraft.color} onChange={(color) => setChildDraft({ ...childDraft, color })} options={AVATAR_COLORS} />
              </div>
              <Button variant="secondary" className="w-full" onClick={addChild} disabled={!childDraft.name.trim()}>
                <Plus className="h-4 w-4" /> Add child
              </Button>
            </div>

            <Button className="mt-5 w-full" onClick={() => setStep(3)}>
              Continue <ArrowRight className="h-4 w-4" />
            </Button>
          </Card>
        )}

        {step === 3 && (
          <Card className="p-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Create your first tasks</h2>
              <button onClick={finish} className="text-sm font-medium text-gray-400 hover:text-gray-600">
                Skip
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Tap a few to get started. You can edit them later.</p>
            <div className="space-y-2">
              {TASK_SUGGESTIONS.map((sugg) => {
                const selected = tasks.find((t) => t.title === sugg.title)
                const cat = TASK_CATEGORIES[sugg.category]
                return (
                  <button
                    key={sugg.title}
                    onClick={() => toggleTask(sugg)}
                    className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                      selected ? 'border-seed-500 bg-seed-50 dark:bg-seed-900/20' : 'border-gray-100 hover:border-gray-300 dark:border-gray-800'
                    }`}
                  >
                    <span className="text-2xl">{cat.emoji}</span>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{sugg.title}</p>
                      <p className="text-xs text-gray-400">{cat.label} · 🌱 {sugg.seed_value}</p>
                    </div>
                    {selected && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-seed-600 text-white">
                        <Check className="h-4 w-4" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
            <Button className="mt-5 w-full" onClick={finish}>
              Finish setup 🌱
            </Button>
          </Card>
        )}
      </div>
    </div>
  )
}
