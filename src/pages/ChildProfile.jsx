import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, Plus, Minus, Pencil } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button, Badge, Dialog, Input, Label } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import AvatarEditor from '@/components/shared/AvatarEditor'
import StreakDisplay from '@/components/gamification/StreakDisplay'
import LevelProgress from '@/components/gamification/LevelProgress'
import BadgeGrid from '@/components/gamification/BadgeGrid'
import ActivityFeed from '@/components/family/ActivityFeed'
import FruitGarden from '@/components/shared/FruitGarden'
import AwardSeedsDialog from '@/components/family/AwardSeedsDialog'
import StatusBadge from '@/components/shared/StatusBadge'
import { useRecord, useCollection, useCurrentUser } from '@/lib/hooks'
import { getById, update } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { AVATAR_COLORS } from '@/lib/constants'
import { toast } from '@/lib/toast'

export default function ChildProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const me = useCurrentUser()
  const child = useRecord('users', id)
  const activity = useCollection('activity')
  const completions = useCollection('completions')
  const badges = useCollection('badges')
  const [award, setAward] = useState(false)
  const [deduct, setDeduct] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  if (!child) {
    return (
      <div>
        <Button variant="outline" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <p className="mt-6 text-center text-gray-400">Child not found.</p>
      </div>
    )
  }

  const isParent = me?.role === 'parent'
  const childActivity = activity.filter((a) => a.user_id === child.id).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 10)
  const childBadges = badges.filter((b) => b.user_id === child.id)
  const childCompletions = completions
    .filter((c) => c.child_id === child.id)
    .sort((a, b) => new Date(b.submitted_date) - new Date(a.submitted_date))
    .slice(0, 12)

  return (
    <div>
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <Card className="mb-5 overflow-hidden">
        <div className="flex flex-col items-center gap-4 bg-gradient-to-br from-seed-500 to-seed-700 p-6 text-white sm:flex-row sm:items-center">
          <Avatar user={child} size="xl" className="ring-4 ring-white/30" />
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold">{child.full_name}</h1>
            <div className="mt-1 flex flex-wrap justify-center gap-2 sm:justify-start">
              {child.age != null && <Badge className="bg-white/20 text-white">Age {child.age}</Badge>}
              <Badge className="bg-white/20 text-white">{child.managed ? 'Managed' : 'Active'}</Badge>
            </div>
          </div>
          {isParent && (
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="secondary" onClick={() => setEditOpen(true)}><Pencil className="h-4 w-4" /> Edit</Button>
              <Button variant="secondary" onClick={() => setAward(true)}><Plus className="h-4 w-4" /> Award</Button>
              <Button variant="secondary" onClick={() => setDeduct(true)}><Minus className="h-4 w-4" /> Deduct</Button>
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 p-5 sm:grid-cols-4">
          <Stat label="Seeds" value={`🌱 ${child.seed_balance || 0}`} />
          <Stat label="Total Earned" value={child.total_seeds_earned || 0} />
          <div className="col-span-2 sm:col-span-1"><StreakDisplay current={child.streak_current || 0} longest={child.streak_longest || 0} /></div>
          <div className="col-span-2 sm:col-span-1"><LevelProgress xp={child.xp || 0} /></div>
        </div>
      </Card>

      <div className="mb-5">
        <FruitGarden childId={child.id} interactive={isParent} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">🏅 Badges</h3>
          <BadgeGrid earnedBadges={childBadges} />
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">Recent Activity</h3>
          <ActivityFeed entries={childActivity} />
        </Card>
      </div>

      <Card className="mt-5 p-5">
        <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">Task History</h3>
        {childCompletions.length === 0 ? (
          <p className="text-sm text-gray-400">No completed tasks yet.</p>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {childCompletions.map((c) => {
              const task = getById('tasks', c.task_id)
              return (
                <div key={c.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{task?.title || 'Task'}</p>
                    <p className="text-xs text-gray-400">{formatDate(c.submitted_date, 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {c.seeds_awarded > 0 && <span className="text-sm font-bold text-seed-600">+{c.seeds_awarded} 🌱</span>}
                    <StatusBadge status={c.status} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      <AwardSeedsDialog open={award} onClose={() => setAward(false)} child={child} mode="award" />
      <AwardSeedsDialog open={deduct} onClose={() => setDeduct(false)} child={child} mode="deduct" />
      {isParent && <EditChildDialog open={editOpen} onClose={() => setEditOpen(false)} child={child} />}
    </div>
  )
}

function EditChildDialog({ open, onClose, child }) {
  const [name, setName] = useState(child.full_name || '')
  const [age, setAge] = useState(child.age ?? '')
  const [avatar, setAvatar] = useState({
    emoji: child.avatar_emoji || '🙂',
    color: child.avatar_bg_color || AVATAR_COLORS[0],
    photo: child.avatar_photo || null,
  })

  function save() {
    if (!name.trim()) return
    update('users', child.id, {
      full_name: name.trim(),
      age: age === '' ? null : Number(age),
      avatar_emoji: avatar.emoji,
      avatar_bg_color: avatar.color,
      avatar_photo: avatar.photo,
    })
    toast({ title: 'Profile updated!', emoji: '✅' })
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={`Edit ${child.full_name}`}
      description="Update their name, age, photo, or avatar."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={!name.trim()}>Save</Button>
        </>
      }
    >
      <AvatarEditor value={avatar} onChange={setAvatar} />
      <div className="mt-4 grid grid-cols-[1fr_6rem] gap-3">
        <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
        <div><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} /></div>
      </div>
    </Dialog>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-lg bg-gray-50 p-3 text-center dark:bg-gray-800">
      <p className="text-xl font-extrabold text-gray-900 dark:text-gray-100">{value}</p>
      <p className="text-xs text-gray-400">{label}</p>
    </div>
  )
}
