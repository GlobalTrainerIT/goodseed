import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { ListChecks, Clock, Gift, Award, Plus, CheckCircle2, BarChart3, UserPlus, Monitor } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import StatCard from '@/components/dashboard/StatCard'
import BibleVerseCard from '@/components/dashboard/BibleVerseCard'
import VerseChallenge from '@/components/shared/VerseChallenge'
import ArmorOfGod from '@/components/shared/ArmorOfGod'
import FamilyAltar from '@/components/shared/FamilyAltar'
import UpcomingEvents from '@/components/shared/UpcomingEvents'
import MealPlan from '@/components/shared/MealPlan'
import TodoLane from '@/components/shared/TodoLane'
import PhotoLane from '@/components/shared/PhotoLane'
import ShoutOutCard from '@/components/dashboard/ShoutOutCard'
import LeaderboardCard from '@/components/dashboard/LeaderboardCard'
import ChildHome from '@/components/child/ChildHome'
import FollowedGroups from '@/components/dashboard/FollowedGroups'
import BackupNudge from '@/components/dashboard/BackupNudge'
import { Button } from '@/components/ui'
import TaskForm from '@/components/tasks/TaskForm'
import RewardForm from '@/components/rewards/RewardForm'
import { useCollection, useCurrentUser, useRecord } from '@/lib/hooks'
import { isGroup } from '@/lib/plan'
import { formatDate } from '@/lib/utils'

export default function Dashboard() {
  const user = useCurrentUser()
  const family = useRecord('families', user?.family_id)
  const navigate = useNavigate()
  const tasks = useCollection('tasks')
  const completions = useCollection('completions')
  const rewards = useCollection('rewards')
  const redemptions = useCollection('redemptions')
  const [taskOpen, setTaskOpen] = useState(false)
  const [rewardOpen, setRewardOpen] = useState(false)

  if (!user) return null
  // Coaches/teachers live on the roster, not the family dashboard.
  if (isGroup(family)) return <Navigate to="/Roster" replace />
  if (user.role === 'child') return <ChildHome child={user} />

  const fam = (arr) => arr.filter((x) => x.family_id === user.family_id)
  const activeTasks = fam(tasks).filter((t) => t.status === 'active')
  const pendingApprovals = fam(completions).filter((c) => c.status === 'pending_approval')
  const pendingRedemptions = fam(redemptions).filter((r) => r.status === 'pending')
  const totalRewards = fam(rewards).length

  return (
    <div>
      <PageHeader
        title={`Welcome back, ${user.full_name.split(' ')[0]}!`}
        subtitle={formatDate(new Date(), 'EEEE, MMMM d')}
        actions={
          <>
            <Button onClick={() => setTaskOpen(true)}><Plus className="h-4 w-4" /> New Task</Button>
            <Button variant="purple" onClick={() => setRewardOpen(true)}><Plus className="h-4 w-4" /> New Reward</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Active Tasks" value={activeTasks.length} icon={ListChecks} tone="green" to="/Tasks" />
        <StatCard label="Pending Approvals" value={pendingApprovals.length} icon={Clock} tone="orange" to="/Tasks" highlight={pendingApprovals.length > 0} />
        <StatCard label="Redemption Requests" value={pendingRedemptions.length} icon={Gift} tone="purple" to="/Rewards" highlight={pendingRedemptions.length > 0} />
        <StatCard label="Total Rewards" value={totalRewards} icon={Award} tone="blue" to="/Rewards" />
      </div>

      <div className="mt-5">
        <BackupNudge />
        <FollowedGroups />
      </div>

      <div className="mt-5">
        <UpcomingEvents familyId={user.family_id} canAdd />
      </div>

      <div className="mt-5">
        <TodoLane familyId={user.family_id} />
      </div>

      <div className="mt-5">
        <MealPlan familyId={user.family_id} canEdit />
      </div>

      <div className="mt-5">
        <PhotoLane />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <BibleVerseCard />
          <VerseChallenge familyId={user.family_id} />
          <ArmorOfGod familyId={user.family_id} />
          <FamilyAltar familyId={user.family_id} />
          <ShoutOutCard />
        </div>
        <div className="space-y-5">
          <LeaderboardCard />
          <div className="grid grid-cols-1 gap-2">
            <Button variant="secondary" onClick={() => navigate('/Display')}><Monitor className="h-4 w-4" /> Kitchen screen</Button>
            <Button variant="secondary" onClick={() => navigate('/Tasks')}><CheckCircle2 className="h-4 w-4" /> Approve Tasks</Button>
            <Button variant="secondary" onClick={() => navigate('/Reports')}><BarChart3 className="h-4 w-4" /> View Reports</Button>
            <Button variant="secondary" onClick={() => navigate('/Family')}><UserPlus className="h-4 w-4" /> Add Child</Button>
          </div>
        </div>
      </div>

      <TaskForm open={taskOpen} onClose={() => setTaskOpen(false)} />
      <RewardForm open={rewardOpen} onClose={() => setRewardOpen(false)} />
    </div>
  )
}
