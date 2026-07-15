import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sprout, Crown, Baby, Trophy, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, Button, Input, Label } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import { getAll, create } from '@/lib/db'
import { login } from '@/lib/auth'
import { findFamilyByInviteCode, loadFamilyData } from '@/lib/sync'
import { isPlus, teamsActive, GROUP_TYPES, TEAMS_PLAN } from '@/lib/plan'
import { generateInviteCode } from '@/lib/utils'
import { DEFAULT_NOTIFICATION_PREFS } from '@/lib/seedData'
import { updateSettings } from '@/lib/db'

export default function Welcome() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState('choose') // choose | parent | child
  const [error, setError] = useState('')

  // parent fields
  const [pName, setPName] = useState('')
  const [pEmail, setPEmail] = useState('')
  const [familyName, setFamilyName] = useState('')

  // child fields
  const [code, setCode] = useState('')
  const [matchedFamily, setMatchedFamily] = useState(null)
  const [looking, setLooking] = useState(false)

  // coach fields
  const [groupName, setGroupName] = useState('')
  const [groupType, setGroupType] = useState('class')

  useEffect(() => {
    const join = params.get('join')
    if (join) {
      setMode('child')
      setCode(join.toUpperCase())
    }
  }, [params])

  function handleCreateParent(e) {
    e.preventDefault()
    setError('')
    if (!pName.trim() || !familyName.trim()) {
      setError('Please enter your name and a family name.')
      return
    }
    const family = create('families', {
      name: familyName.trim(),
      invite_code: generateInviteCode(),
      avatar_emoji: '🏡',
      plan: 'free',
    })
    const parent = create('users', {
      family_id: family.id,
      full_name: pName.trim(),
      email: pEmail.trim(),
      role: 'parent',
      avatar_emoji: '👑',
      avatar_bg_color: '#fde68a',
      seed_balance: 0,
      total_seeds_earned: 0,
      streak_current: 0,
      streak_longest: 0,
      streak_savers_available: 0,
      xp: 0,
      level: 1,
    })
    updateSettings({
      family_id: family.id,
      seedName: 'Seeds',
      seedNameSingular: 'Seed',
      allowStreakSavers: false,
      enableSeedPacks: true,
      parentPin: '',
      parentPinEnabled: false,
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    })
    login(parent.id)
    navigate('/Onboarding', { state: { familyId: family.id } })
  }

  // A coach/teacher creating a classroom, team, daycare, or church group.
  // Groups reuse the family engine (kind: 'group') with points-flavored naming.
  function handleCreateGroup(e) {
    e.preventDefault()
    setError('')
    if (!pName.trim() || !groupName.trim()) {
      setError('Please enter your name and a group name.')
      return
    }
    const type = GROUP_TYPES.find((t) => t.id === groupType) || GROUP_TYPES[0]
    const group = create('families', {
      name: groupName.trim(),
      invite_code: generateInviteCode(),
      avatar_emoji: type.emoji,
      plan: 'free',
      kind: 'group',
      group_type: type.id,
    })
    const coach = create('users', {
      family_id: group.id,
      full_name: pName.trim(),
      email: pEmail.trim(),
      role: 'parent',
      avatar_emoji: '🏅',
      avatar_bg_color: '#bfdbfe',
      seed_balance: 0,
      total_seeds_earned: 0,
      streak_current: 0,
      streak_longest: 0,
      streak_savers_available: 0,
      xp: 0,
      level: 1,
    })
    updateSettings({
      family_id: group.id,
      seedName: 'Points',
      seedNameSingular: 'Point',
      allowStreakSavers: false,
      enableSeedPacks: false,
      parentPin: '',
      parentPinEnabled: false,
      leaderboardMode: 'full',
      notificationPrefs: { ...DEFAULT_NOTIFICATION_PREFS },
    })
    login(coach.id)
    navigate('/Roster')
  }

  // A second parent joining an existing family on their own device.
  async function handleJoinParent(e) {
    e.preventDefault()
    setError('')
    if (!pName.trim()) {
      setError('Please enter your name.')
      return
    }
    const wanted = code.trim().toUpperCase()
    let family = getAll('families').find((f) => f.invite_code.toUpperCase() === wanted)
    if (!family) {
      setLooking(true)
      try {
        const remote = await findFamilyByInviteCode(wanted)
        if (remote) {
          await loadFamilyData(remote.id)
          family = remote
        }
      } catch {
        /* fall through to error */
      }
      setLooking(false)
    }
    if (!family) {
      setError('No family found with that code. Double-check and try again.')
      return
    }
    const groupJoin = family.kind === 'group'
    if (groupJoin ? !teamsActive(family) : !isPlus(family)) {
      setError(
        groupJoin
          ? "This group's Teams trial has ended. Ask the group leader to subscribe, then try again."
          : 'Co-parents are a GoodSeed Plus feature. Ask the family owner to upgrade to Plus, then try again.'
      )
      return
    }
    const parent = create('users', {
      family_id: family.id,
      full_name: pName.trim(),
      email: pEmail.trim(),
      role: 'parent',
      avatar_emoji: '🧑',
      avatar_bg_color: '#c7d2fe',
      seed_balance: 0,
      total_seeds_earned: 0,
      streak_current: 0,
      streak_longest: 0,
      streak_savers_available: 0,
      xp: 0,
      level: 1,
    })
    login(parent.id)
    navigate('/Dashboard')
  }

  async function handleFindFamily(e) {
    e.preventDefault()
    setError('')
    const wanted = code.trim().toUpperCase()
    // Local first (same device / demo family), then the cloud (other devices).
    let family = getAll('families').find((f) => f.invite_code.toUpperCase() === wanted)
    if (!family) {
      setLooking(true)
      try {
        const remote = await findFamilyByInviteCode(wanted)
        if (remote) {
          await loadFamilyData(remote.id)
          family = remote
        }
      } catch {
        /* fall through to error */
      }
      setLooking(false)
    }
    if (!family) {
      setError('No family found with that code. Double-check and try again.')
      return
    }
    setMatchedFamily(family)
  }

  function pickProfile(userId) {
    login(userId)
    navigate('/Dashboard')
  }

  const familyProfiles = matchedFamily
    ? getAll('users').filter((u) => u.family_id === matchedFamily.id)
    : []
  const childProfiles = familyProfiles.filter((u) => u.role === 'child')

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-seed-100 to-seed-50 px-4 py-10 dark:from-gray-900 dark:to-gray-950">
      <div className="mb-8 flex flex-col items-center text-center">
        <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-seed-600 text-white shadow-lg">
          <Sprout className="h-9 w-9" />
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">GoodSeed</h1>
        <p className="mt-1 text-gray-500 dark:text-gray-400">Plant good seeds, watch your family grow 🌱</p>
      </div>

      {error && (
        <div className="mb-4 w-full max-w-md rounded-lg bg-red-50 px-4 py-2.5 text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300">
          {error}
        </div>
      )}

      {mode === 'choose' && (
        <div className="w-full max-w-3xl">
          <div className="grid gap-4 sm:grid-cols-3">
            <button onClick={() => { setMode('parent'); setError('') }} className="group">
              <Card className="flex h-full flex-col items-center gap-3 p-6 text-center transition hover:border-seed-400 hover:shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl dark:bg-amber-900/40">
                  <Crown className="h-8 w-8 text-amber-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">I'm a Parent</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Create a new family, or join one your co-parent started.</p>
              </Card>
            </button>
            <button onClick={() => { setMode('child'); setError('') }} className="group">
              <Card className="flex h-full flex-col items-center gap-3 p-6 text-center transition hover:border-seed-400 hover:shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl dark:bg-blue-900/40">
                  <Baby className="h-8 w-8 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">I'm a Child</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Enter your family code to see your tasks & seeds.</p>
              </Card>
            </button>
            <button onClick={() => { setMode('coach'); setError('') }} className="group">
              <Card className="flex h-full flex-col items-center gap-3 p-6 text-center transition hover:border-seed-400 hover:shadow-md">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-purple-100 text-3xl dark:bg-purple-900/40">
                  <Trophy className="h-8 w-8 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Coach or Teacher</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">Run points for a class, team, daycare, or youth group.</p>
              </Card>
            </button>
          </div>
          <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Already part of a family?{' '}
            <button
              onClick={() => { setMode('signin'); setMatchedFamily(null); setError('') }}
              className="font-bold text-seed-700 underline-offset-2 hover:underline dark:text-seed-400"
            >
              Sign back in
            </button>
          </p>
          <p className="mt-4 text-center text-xs text-gray-400 dark:text-gray-500">
            By continuing you agree to our{' '}
            <a href="/terms.html" className="underline hover:text-gray-600">Terms</a> and{' '}
            <a href="/privacy.html" className="underline hover:text-gray-600">Privacy Policy</a>.
          </p>
        </div>
      )}

      {mode === 'parent' && (
        <Card className="w-full max-w-md p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Parent setup</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Starting fresh, or joining a family that already exists?</p>
          <div className="space-y-3">
            <button
              onClick={() => { setMode('parent-create'); setError('') }}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-4 text-left transition hover:border-seed-400 hover:bg-seed-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">🏡</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Create a new family</p>
                <p className="text-xs text-gray-400">Set up the family and get an invite code.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300" />
            </button>
            <button
              onClick={() => { setMode('parent-join'); setError('') }}
              className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-4 text-left transition hover:border-seed-400 hover:bg-seed-50 dark:border-gray-800 dark:hover:bg-gray-800"
            >
              <span className="text-2xl">🤝</span>
              <div className="flex-1">
                <p className="font-semibold text-gray-900 dark:text-gray-100">Join my family</p>
                <p className="text-xs text-gray-400">Use the invite code from your co-parent.</p>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-300" />
            </button>
          </div>
          <button type="button" onClick={() => setMode('choose')} className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
        </Card>
      )}

      {mode === 'parent-create' && (
        <Card className="w-full max-w-md p-6">
          <form onSubmit={handleCreateParent} className="space-y-4">
            <div>
              <Label>Your name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Alex" autoFocus />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label>Family name</Label>
              <Input value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="e.g. The Smith Family" />
            </div>
            <Button type="submit" className="w-full">
              Create Family <ArrowRight className="h-4 w-4" />
            </Button>
            <button type="button" onClick={() => setMode('parent')} className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
        </Card>
      )}

      {mode === 'parent-join' && (
        <Card className="w-full max-w-md p-6">
          <form onSubmit={handleJoinParent} className="space-y-4">
            <div>
              <Label>Your name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Jordan" autoFocus />
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div>
              <Label>Family invite code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEMO01"
                maxLength={6}
                className="text-center text-lg font-bold tracking-widest"
              />
              <p className="mt-1.5 text-xs text-gray-400">Ask your co-parent for the code in Family → Invite.</p>
            </div>
            <Button type="submit" className="w-full" disabled={looking}>
              {looking ? 'Looking…' : <>Join Family <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <button type="button" onClick={() => setMode('parent')} className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
        </Card>
      )}

      {mode === 'coach' && (
        <Card className="w-full max-w-md p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Set up your group</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
            Free for {TEAMS_PLAN.trialDays} days — no card needed. Add your roster and start awarding points in the next two minutes.
          </p>
          <form onSubmit={handleCreateGroup} className="space-y-4">
            <div>
              <Label>Your name</Label>
              <Input value={pName} onChange={(e) => setPName(e.target.value)} placeholder="e.g. Coach Mike" autoFocus />
            </div>
            <div>
              <Label>Group name</Label>
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} placeholder="e.g. Tigers Basketball, Room 12" />
            </div>
            <div>
              <Label>What kind of group?</Label>
              <div className="mt-1 grid grid-cols-2 gap-2">
                {GROUP_TYPES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setGroupType(t.id)}
                    className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm font-medium transition ${
                      groupType === t.id
                        ? 'border-seed-500 bg-seed-50 text-seed-800 dark:bg-seed-900/30 dark:text-seed-200'
                        : 'border-gray-200 text-gray-600 hover:border-seed-300 dark:border-gray-700 dark:text-gray-300'
                    }`}
                  >
                    <span className="text-lg">{t.emoji}</span> {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Email (optional)</Label>
              <Input type="email" value={pEmail} onChange={(e) => setPEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <Button type="submit" className="w-full">
              Create Group <ArrowRight className="h-4 w-4" />
            </Button>
            <button type="button" onClick={() => setMode('choose')} className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
        </Card>
      )}

      {mode === 'signin' && !matchedFamily && (
        <Card className="w-full max-w-md p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">Welcome back</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Enter your family code to find your profile.</p>
          <form onSubmit={handleFindFamily} className="space-y-4">
            <div>
              <Label>Family invite code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEMO01"
                maxLength={6}
                className="text-center text-lg font-bold tracking-widest"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-gray-400">It's the 6-character code your family uses to join. A parent can find it in Family → Invite.</p>
            </div>
            <Button type="submit" className="w-full" disabled={looking}>
              {looking ? 'Looking…' : <>Find My Family <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <button type="button" onClick={() => setMode('choose')} className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
        </Card>
      )}

      {mode === 'signin' && matchedFamily && (
        <Card className="w-full max-w-md p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">{matchedFamily.name}</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Who are you? Tap your profile to sign back in.</p>
          <div className="space-y-2">
            {familyProfiles.map((member) => (
              <button
                key={member.id}
                onClick={() => pickProfile(member.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition hover:border-seed-400 hover:bg-seed-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <Avatar user={member} size="md" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{member.full_name}</p>
                  <p className="text-xs text-gray-400">{member.role === 'parent' ? 'Parent' : member.age ? `Age ${member.age}` : 'Child'}</p>
                </div>
                {member.role === 'parent' && <Crown className="h-4 w-4 text-amber-500" />}
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
            {familyProfiles.length === 0 && (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">
                We found your family, but no profiles synced to this device yet. Multi-device sync is a Plus feature — on the Free plan your profiles live on the device where the family was created.
              </p>
            )}
          </div>
          <button type="button" onClick={() => setMatchedFamily(null)} className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Use a different code
          </button>
        </Card>
      )}

      {mode === 'child' && !matchedFamily && (
        <Card className="w-full max-w-md p-6">
          <form onSubmit={handleFindFamily} className="space-y-4">
            <div>
              <Label>Family invite code</Label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="e.g. DEMO01"
                maxLength={6}
                className="text-center text-lg font-bold tracking-widest"
                autoFocus
              />
              <p className="mt-1.5 text-xs text-gray-400">Tip: try the demo family code <b>DEMO01</b></p>
            </div>
            <Button type="submit" className="w-full" disabled={looking}>
              {looking ? 'Looking…' : <>Find My Family <ArrowRight className="h-4 w-4" /></>}
            </Button>
            <button type="button" onClick={() => setMode('choose')} className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
        </Card>
      )}

      {mode === 'child' && matchedFamily && (
        <Card className="w-full max-w-md p-6">
          <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">{matchedFamily.name}</h2>
          <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">Who are you? Tap your profile.</p>
          <div className="space-y-2">
            {childProfiles.map((child) => (
              <button
                key={child.id}
                onClick={() => pickProfile(child.id)}
                className="flex w-full items-center gap-3 rounded-xl border border-gray-100 p-3 text-left transition hover:border-seed-400 hover:bg-seed-50 dark:border-gray-800 dark:hover:bg-gray-800"
              >
                <Avatar user={child} size="md" />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 dark:text-gray-100">{child.full_name}</p>
                  <p className="text-xs text-gray-400">{child.age ? `Age ${child.age}` : 'Tap to continue'}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-gray-300" />
              </button>
            ))}
            {childProfiles.length === 0 && (
              <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500 dark:bg-gray-800">
                No child profiles yet. Ask a parent to add you first.
              </p>
            )}
          </div>
          <button type="button" onClick={() => setMatchedFamily(null)} className="mt-4 flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> Use a different code
          </button>
        </Card>
      )}
    </div>
  )
}
