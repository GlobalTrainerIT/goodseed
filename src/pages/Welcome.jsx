import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Sprout, Crown, Baby, ArrowLeft, ArrowRight } from 'lucide-react'
import { Card, Button, Input, Label } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import { getAll, create } from '@/lib/db'
import { login } from '@/lib/auth'
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

  function handleFindFamily(e) {
    e.preventDefault()
    setError('')
    const family = getAll('families').find(
      (f) => f.invite_code.toUpperCase() === code.trim().toUpperCase()
    )
    if (!family) {
      setError('No family found with that code. Double-check and try again.')
      return
    }
    setMatchedFamily(family)
  }

  function pickChild(childId) {
    login(childId)
    navigate('/Dashboard')
  }

  const childProfiles = matchedFamily
    ? getAll('users').filter((u) => u.family_id === matchedFamily.id && u.role === 'child')
    : []

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
        <div className="grid w-full max-w-2xl gap-4 sm:grid-cols-2">
          <button onClick={() => { setMode('parent'); setError('') }} className="group">
            <Card className="flex h-full flex-col items-center gap-3 p-8 text-center transition hover:border-seed-400 hover:shadow-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-3xl dark:bg-amber-900/40">
                <Crown className="h-8 w-8 text-amber-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">I'm a Parent</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Create your family and start managing tasks & rewards.</p>
            </Card>
          </button>
          <button onClick={() => { setMode('child'); setError('') }} className="group">
            <Card className="flex h-full flex-col items-center gap-3 p-8 text-center transition hover:border-seed-400 hover:shadow-md">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl dark:bg-blue-900/40">
                <Baby className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">I'm a Child</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Enter your family code to see your tasks & seeds.</p>
            </Card>
          </button>
        </div>
      )}

      {mode === 'parent' && (
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
            <button type="button" onClick={() => setMode('choose')} className="flex w-full items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
          </form>
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
            <Button type="submit" className="w-full">
              Find My Family <ArrowRight className="h-4 w-4" />
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
                onClick={() => pickChild(child.id)}
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
