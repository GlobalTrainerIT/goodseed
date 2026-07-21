import { useNavigate } from 'react-router-dom'
import { LogOut, Trash2, Moon, Sun, Pencil, Lock, Download, Upload } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button, Toggle, Select, Label, Dialog, Input } from '@/components/ui'
import { lock } from '@/lib/pinLock'
import { exportData, importData } from '@/lib/db'
import { toast } from '@/lib/toast'
import { useRef } from 'react'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useSettings, useCollection, useRecord } from '@/lib/hooks'
import { updateSettings, remove, resetAll, update } from '@/lib/db'
import { deleteFamilyFromCloud } from '@/lib/sync'
import { isPlus, planOf, isGroup, trialDaysLeft, teamsActive } from '@/lib/plan'
import { fetchServerPlan, fetchSubscription, openBillingPortal, startCheckout, joinOrganization, syncLeaderCoverage } from '@/lib/billing'
import { formatDate } from '@/lib/utils'
import { CreditCard } from 'lucide-react'
import UpgradeDialog from '@/components/shared/UpgradeDialog'
import { Sparkles } from 'lucide-react'
import { buyStreakSaver } from '@/lib/domain'
import { logout } from '@/lib/auth'
import { useTheme, toggleTheme } from '@/lib/theme'
import { SEED_NAME_OPTIONS } from '@/lib/constants'
import { useState, useEffect } from 'react'
import DeleteConfirmDialog from '@/components/shared/DeleteConfirmDialog'
import BadgeGrid from '@/components/gamification/BadgeGrid'
import LevelProgress from '@/components/gamification/LevelProgress'
import StreakDisplay from '@/components/gamification/StreakDisplay'

function Row({ title, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{title}</p>
        {desc && <p className="text-xs text-gray-400">{desc}</p>}
      </div>
      {children}
    </div>
  )
}

export default function Settings() {
  const user = useCurrentUser()
  const settings = useSettings()
  const theme = useTheme()
  const navigate = useNavigate()
  const badges = useCollection('badges')
  const [delOpen, setDelOpen] = useState(false)

  if (!user) return null
  const isParent = user.role === 'parent'
  const prefs = settings.notificationPrefs || {}
  const myBadges = badges.filter((b) => b.user_id === user.id)
  const [pinDialog, setPinDialog] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const importRef = useRef(null)
  const family = useRecord('families', user.family_id)
  const plus = isPlus(family)
  const [activating, setActivating] = useState(false)
  const [subInfo, setSubInfo] = useState(null)
  const [portalLoading, setPortalLoading] = useState(false)

  // Load renewal details for the plan card (Plus families / Teams groups).
  useEffect(() => {
    let cancelled = false
    if ((plus || family?.plan === 'teams') && family?.id) {
      fetchSubscription(family.id).then((s) => {
        if (!cancelled) setSubInfo(s)
      })
    }
    return () => {
      cancelled = true
    }
  }, [plus, family?.id])

  async function handleManageBilling() {
    setPortalLoading(true)
    await openBillingPortal(family)
    setPortalLoading(false)
  }

  // Returning from Stripe checkout (?upgraded=1): the webhook can lag a few
  // seconds behind the redirect, so poll the server plan briefly and unlock the
  // moment it lands instead of looking like nothing happened.
  useEffect(() => {
    const expected = isGroup(family) ? 'teams' : 'plus'
    if (!family || (family.plan || 'free') === expected) return
    if (!new URLSearchParams(window.location.search).has('upgraded')) return
    let cancelled = false
    let tries = 0
    setActivating(true)
    const timer = setInterval(async () => {
      tries += 1
      try {
        const serverPlan = await fetchServerPlan(family.id)
        if (!cancelled && serverPlan === expected) {
          clearInterval(timer)
          setActivating(false)
          update('families', family.id, { plan: expected })
          // A paid Teams subscription covers ALL of this coach's teams.
          if (expected === 'teams') syncLeaderCoverage(family.id)
          toast({
            title: expected === 'teams' ? 'Welcome to GoodSeed Teams! 🏆' : 'Welcome to GoodSeed Plus! 🎉',
            message: 'Everything is unlocked.',
            emoji: '✨',
          })
          return
        }
      } catch {
        /* keep polling */
      }
      if (tries >= 15 && !cancelled) {
        clearInterval(timer)
        setActivating(false)
      }
    }, 2500)
    return () => {
      cancelled = true
      clearInterval(timer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family?.id])

  function handleExport() {
    const blob = new Blob([JSON.stringify(exportData(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `goodseed-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    updateSettings({ lastBackupAt: new Date().toISOString() })
    toast({ title: 'Backup downloaded!', emoji: '💾' })
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const data = JSON.parse(await file.text())
      if (importData(data)) {
        toast({ title: 'Backup restored!', message: 'Reloading…', emoji: '✅' })
        setTimeout(() => window.location.reload(), 800)
      } else {
        toast({ title: 'Invalid backup file', type: 'error' })
      }
    } catch {
      toast({ title: 'Could not read that file', type: 'error' })
    }
    e.target.value = ''
  }

  function setPref(key, val) {
    updateSettings({ notificationPrefs: { ...prefs, [key]: val } })
  }

  function togglePin(on) {
    if (on) {
      setPinDialog(true)
    } else {
      updateSettings({ parentPinEnabled: false, parentPin: '' })
    }
  }

  function handleSignOut() {
    logout()
    navigate('/Welcome')
  }
  async function handleDeleteAccount() {
    if (isParent) {
      // Cloud first, then local — "delete all data" must include the synced copy.
      const cloudOk = await deleteFamilyFromCloud(user.family_id)
      if (!cloudOk) {
        toast({ title: "Couldn't reach the cloud", message: 'Local data was deleted. Cloud copy will need another try while online.', emoji: '⚠️' })
      }
      resetAll()
      logout()
      navigate('/Welcome')
    } else {
      remove('users', user.id)
      logout()
      navigate('/Welcome')
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={isParent ? 'Settings' : 'My Profile'} subtitle="Manage your profile and preferences" />

      {/* Profile */}
      <Card className="mb-5 p-5">
        <div className="flex items-center gap-4">
          <Avatar user={user} size="lg" />
          <div className="flex-1">
            <p className="text-lg font-bold text-gray-900 dark:text-gray-100">{user.full_name}</p>
            <p className="text-sm text-gray-400">{user.email || (user.role === 'child' ? `Age ${user.age ?? '—'}` : '')} · <span className="capitalize">{user.role}</span></p>
          </div>
          <Button variant="secondary" onClick={() => navigate('/ProfileSetup')}><Pencil className="h-4 w-4" /> Edit</Button>
        </div>
        {!isParent && (
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-seed-50 p-3 text-center dark:bg-seed-900/20">
              <p className="text-xl font-extrabold text-seed-700 dark:text-seed-300">🌱 {user.seed_balance || 0}</p>
              <p className="text-xs text-gray-400">Balance</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><StreakDisplay current={user.streak_current || 0} longest={user.streak_longest || 0} /></div>
            <div className="rounded-lg bg-gray-50 p-3 dark:bg-gray-800"><LevelProgress xp={user.xp || 0} /></div>
          </div>
        )}
        {!isParent && settings.allowStreakSavers && (
          <div className="mt-3 flex items-center justify-between rounded-lg bg-orange-50 p-3 dark:bg-orange-900/10">
            <div>
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">🛡️ Streak Savers: {user.streak_savers_available || 0}</p>
              <p className="text-xs text-gray-400">Protects your streak if you miss a day.</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => buyStreakSaver(user.id)}>Buy for 5 🌱</Button>
          </div>
        )}
      </Card>

      {!isParent && (
        <Card className="mb-5 p-5">
          <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">🏅 My Badges</h3>
          <BadgeGrid earnedBadges={myBadges} />
        </Card>
      )}

      {/* Plan — Teams groups (coach/teacher) */}
      {isParent && isGroup(family) && (
        <Card className={`mb-5 p-5 ${family.plan === 'teams' ? 'border-seed-200 dark:border-seed-800' : ''}`}>
          {family.plan === 'teams' ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
                  <Sparkles className="h-4 w-4 text-seed-600" /> GoodSeed Teams
                </h3>
                <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Unlimited roster, co-leaders, and multi-device sync.</p>
                {subInfo?.current_period_end && (
                  <p className="mt-0.5 text-xs text-gray-400">
                    {subInfo.comped ? 'Free access until' : subInfo.status === 'canceled' ? 'Access until' : 'Renews on'} {formatDate(subInfo.current_period_end)}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {!subInfo?.comped && (
                  <Button size="sm" variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
                    <CreditCard className="h-3.5 w-3.5" /> {portalLoading ? 'Opening…' : 'Manage billing'}
                  </Button>
                )}
                <span className="rounded-full bg-seed-100 px-3 py-1 text-xs font-bold text-seed-700 dark:bg-seed-900/40 dark:text-seed-300">Active</span>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-gray-100">GoodSeed Teams</h3>
                  <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                    {teamsActive(family)
                      ? `Trial — ${trialDaysLeft(family)} day${trialDaysLeft(family) === 1 ? '' : 's'} left. Everything is unlocked.`
                      : 'Your trial has ended. Subscribe to keep awarding points and growing the roster.'}
                  </p>
                </div>
                {activating && (
                  <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Activating…</span>
                )}
              </div>
              {!activating && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button onClick={() => startCheckout(family, 'teams_monthly')}>
                      <Sparkles className="h-4 w-4" /> $12.99/month
                    </Button>
                    <Button variant="secondary" onClick={() => startCheckout(family, 'teams_yearly')}>
                      $119/year — save 24%
                    </Button>
                  </div>
                  <OrgCodeBox family={family} />
                </>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Plan (parent only) */}
      {isParent && !isGroup(family) && (
        <Card className={`mb-5 p-5 ${plus ? 'border-seed-200 dark:border-seed-800' : ''}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 font-bold text-gray-900 dark:text-gray-100">
                {plus && <Sparkles className="h-4 w-4 text-seed-600" />}
                {plus ? 'GoodSeed Plus' : 'Free plan'}
              </h3>
              <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">
                {plus
                  ? 'Unlimited children, co-parents, and multi-device sync.'
                  : `Up to ${planOf(family).maxChildren} children, single device.`}
              </p>
              {plus && subInfo?.current_period_end && (
                <p className="mt-0.5 text-xs text-gray-400">
                  {subInfo.status === 'canceled' ? 'Access until' : 'Renews on'} {formatDate(subInfo.current_period_end)}
                </p>
              )}
            </div>
            {plus ? (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleManageBilling} disabled={portalLoading}>
                  <CreditCard className="h-3.5 w-3.5" /> {portalLoading ? 'Opening…' : 'Manage billing'}
                </Button>
                <span className="rounded-full bg-seed-100 px-3 py-1 text-xs font-bold text-seed-700 dark:bg-seed-900/40 dark:text-seed-300">Active</span>
              </div>
            ) : activating ? (
              <span className="animate-pulse rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">Activating…</span>
            ) : (
              <Button onClick={() => setUpgradeOpen(true)}><Sparkles className="h-4 w-4" /> Upgrade</Button>
            )}
          </div>
        </Card>
      )}

      {/* Appearance */}
      <Card className="mb-5 p-5">
        <h3 className="mb-1 font-bold text-gray-900 dark:text-gray-100">Appearance</h3>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          <Row title="Dark mode" desc="Switch between light and dark themes.">
            <button onClick={toggleTheme} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </Row>
        </div>
      </Card>

      {isParent && (
        <>
          {/* Gamification */}
          <Card className="mb-5 p-5">
            <h3 className="mb-1 font-bold text-gray-900 dark:text-gray-100">Gamification</h3>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <Row title="Allow Streak Savers" desc="Children earn 1 saver per week; it auto-protects a missed day.">
                <Toggle checked={settings.allowStreakSavers} onChange={(v) => updateSettings({ allowStreakSavers: v })} />
              </Row>
              <Row title="Enable Seed Packs" desc="Children earn packs every 10 tasks or at streak milestones.">
                <Toggle checked={settings.enableSeedPacks} onChange={(v) => updateSettings({ enableSeedPacks: v })} />
              </Row>
              <Row title="Verse of the Week" desc="Run a weekly Scripture-memory challenge; mark a child memorized to award points.">
                <Toggle checked={settings.memoryVerseEnabled !== false} onChange={(v) => updateSettings({ memoryVerseEnabled: v })} />
              </Row>
              {settings.memoryVerseEnabled !== false && (
                <Row title="Verse reward" desc="Points awarded when a child memorizes the week's verse.">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={settings.memoryVerseReward ?? 5}
                    onChange={(e) => updateSettings({ memoryVerseReward: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })}
                  />
                </Row>
              )}
              <Row title="Armor of God" desc="Daily devotion challenge: kids put on a piece of armor each day; you confirm it.">
                <Toggle checked={settings.armorEnabled !== false} onChange={(v) => updateSettings({ armorEnabled: v })} />
              </Row>
              {settings.armorEnabled !== false && (
                <Row title="Armor piece reward" desc="Points awarded for each daily armor piece you confirm.">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={settings.armorPieceReward ?? 2}
                    onChange={(e) => updateSettings({ armorPieceReward: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })}
                  />
                </Row>
              )}
              <Row title="Fruit of the Spirit garden" desc="A nine-fruit collectible on each child's profile; awarding a Fruit behavior grows it.">
                <Toggle checked={settings.fruitGardenEnabled !== false} onChange={(v) => updateSettings({ fruitGardenEnabled: v })} />
              </Row>
              <Row title="Gratitude jar" desc="A daily thankful/prayer note that builds a streak and shows on the kitchen board.">
                <Toggle checked={settings.gratitudeEnabled !== false} onChange={(v) => updateSettings({ gratitudeEnabled: v })} />
              </Row>
              {settings.gratitudeEnabled !== false && (
                <Row title="Gratitude reward" desc="Points for the first jar note each day.">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={settings.gratitudeReward ?? 1}
                    onChange={(e) => updateSettings({ gratitudeReward: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })}
                  />
                </Row>
              )}
              <Row title="Bible journey map" desc="A story-milestone path each child travels as their lifetime seeds grow.">
                <Toggle checked={settings.journeyEnabled !== false} onChange={(v) => updateSettings({ journeyEnabled: v })} />
              </Row>
              <Row title="Family Altar" desc="A weekly whole-family devotional; finishing every step rewards every child.">
                <Toggle checked={settings.altarEnabled !== false} onChange={(v) => updateSettings({ altarEnabled: v })} />
              </Row>
              {settings.altarEnabled !== false && (
                <Row title="Altar reward" desc="Points each child earns when the family completes the week's altar.">
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    className="w-24"
                    value={settings.altarReward ?? 5}
                    onChange={(e) => updateSettings({ altarReward: Math.max(0, Math.min(100, parseInt(e.target.value, 10) || 0)) })}
                  />
                </Row>
              )}
              <Row title="Currency name" desc="Rename your family currency.">
                <Select
                  className="w-36"
                  value={settings.seedName}
                  onChange={(e) => updateSettings({ seedName: e.target.value, seedNameSingular: e.target.value.replace(/s$/, '') })}
                >
                  {SEED_NAME_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </Row>
              <Row title="Parent PIN lock" desc="Require a 4-digit PIN to open parent pages (shared device).">
                <div className="flex items-center gap-2">
                  {settings.parentPinEnabled && settings.parentPin && (
                    <Button size="sm" variant="outline" onClick={lock}><Lock className="h-3.5 w-3.5" /> Lock now</Button>
                  )}
                  <Toggle checked={settings.parentPinEnabled} onChange={togglePin} />
                </div>
              </Row>
            </div>
          </Card>

          {/* Notification preferences */}
          <Card className="mb-5 p-5">
            <h3 className="mb-2 font-bold text-gray-900 dark:text-gray-100">Notification Preferences</h3>
            <p className="mb-1 text-xs font-bold uppercase text-gray-400">Tasks</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <Row title="New task assigned"><Toggle checked={prefs.newTaskAssigned} onChange={(v) => setPref('newTaskAssigned', v)} /></Row>
              <Row title="Task reminders"><Toggle checked={prefs.taskReminders} onChange={(v) => setPref('taskReminders', v)} /></Row>
              <Row title="Due date alerts"><Toggle checked={prefs.dueDateAlerts} onChange={(v) => setPref('dueDateAlerts', v)} /></Row>
            </div>
            <p className="mb-1 mt-3 text-xs font-bold uppercase text-gray-400">Rewards</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <Row title="Redemption requests"><Toggle checked={prefs.redemptionRequests} onChange={(v) => setPref('redemptionRequests', v)} /></Row>
              <Row title="Reward approved"><Toggle checked={prefs.rewardApproved} onChange={(v) => setPref('rewardApproved', v)} /></Row>
            </div>
            <p className="mb-1 mt-3 text-xs font-bold uppercase text-gray-400">Family</p>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              <Row title="New announcements"><Toggle checked={prefs.newAnnouncements} onChange={(v) => setPref('newAnnouncements', v)} /></Row>
              <Row title="Goal updates"><Toggle checked={prefs.goalUpdates} onChange={(v) => setPref('goalUpdates', v)} /></Row>
              <Row title="Weekly Boss updates"><Toggle checked={prefs.weeklyBossUpdates} onChange={(v) => setPref('weeklyBossUpdates', v)} /></Row>
            </div>
          </Card>
        </>
      )}

      {/* Data & backup (parent only — family-wide data) */}
      {isParent && (
        <Card className="mb-5 p-5">
          <h3 className="mb-1 font-bold text-gray-900 dark:text-gray-100">Data & Backup</h3>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            Your family data lives on this device. Export a backup so you can restore it later or move to another device.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={handleExport}><Download className="h-4 w-4" /> Export backup</Button>
            <Button variant="secondary" onClick={() => importRef.current?.click()}><Upload className="h-4 w-4" /> Import backup</Button>
            <input ref={importRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImport} />
          </div>
        </Card>
      )}

      {/* Danger zone */}
      <Card className="border-red-200 p-5 dark:border-red-900/50">
        <h3 className="mb-3 font-bold text-red-600">Danger Zone</h3>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={handleSignOut}><LogOut className="h-4 w-4" /> Sign Out</Button>
          <Button variant="danger" onClick={() => setDelOpen(true)}><Trash2 className="h-4 w-4" /> Delete Account</Button>
        </div>
      </Card>

      <DeleteConfirmDialog
        open={delOpen}
        onClose={() => setDelOpen(false)}
        itemName="your account"
        message={isParent ? 'This deletes the entire family and all data.' : 'This removes your child profile.'}
        onConfirm={handleDeleteAccount}
      />

      <SetPinDialog open={pinDialog} onClose={() => setPinDialog(false)} />
      <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} family={family} />
    </div>
  )
}

function SetPinDialog({ open, onClose }) {
  const [pin, setPin] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')

  function onlyDigits(v) {
    return v.replace(/\D/g, '').slice(0, 4)
  }
  function save() {
    if (pin.length !== 4) return setError('PIN must be 4 digits.')
    if (pin !== confirm) return setError('PINs do not match.')
    updateSettings({ parentPinEnabled: true, parentPin: pin })
    setPin(''); setConfirm(''); setError('')
    onClose()
  }
  function cancel() {
    setPin(''); setConfirm(''); setError('')
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={cancel}
      title="Set a Parent PIN"
      description="You'll enter this 4-digit PIN to open parent pages on a shared device."
      footer={<><Button variant="outline" onClick={cancel}>Cancel</Button><Button onClick={save}>Set PIN</Button></>}
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30">{error}</p>}
      <div className="space-y-4">
        <div>
          <Label>New PIN</Label>
          <Input inputMode="numeric" type="password" value={pin} onChange={(e) => setPin(onlyDigits(e.target.value))} placeholder="••••" className="text-center text-2xl tracking-[0.5em]" autoFocus />
        </div>
        <div>
          <Label>Confirm PIN</Label>
          <Input inputMode="numeric" type="password" value={confirm} onChange={(e) => setConfirm(onlyDigits(e.target.value))} placeholder="••••" className="text-center text-2xl tracking-[0.5em]" />
        </div>
      </div>
    </Dialog>
  )
}

// A church/school/YMCA buys one deal and hands its leaders a code. Entering it
// covers this group, so volunteer coaches never pay out of pocket.
function OrgCodeBox({ family }) {
  const [open, setOpen] = useState(false)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const r = await joinOrganization(code, family.id)
    setBusy(false)
    if (r?.error) {
      const msg =
        r.error === 'not_found' ? "That organization code wasn't recognized. Check it with your administrator."
        : r.error === 'org_expired' ? `${r.org_name || 'That organization'}'s plan has ended — ask them to renew.`
        : r.error === 'org_full' ? `${r.org_name || 'That organization'} has used all ${r.cap} of its group spots.`
        : r.error === 'has_own_subscription' ? 'This group already has its own paid subscription.'
        : r.error === 'forbidden' ? 'Only a leader of this group can use an organization code.'
        : r.error
      setError(msg)
      return
    }
    update('families', family.id, { plan: 'teams' })
    toast({ title: `Covered by ${r.org_name}! 🎉`, message: 'Everything is unlocked — nothing to pay.', emoji: '🏛️' })
    setCode('')
    setOpen(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-3 text-xs font-medium text-seed-700 hover:underline dark:text-seed-400">
        Part of a church, school, or organization? Enter their code →
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="mt-3 space-y-2 rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <Label>Organization code</Label>
      <div className="flex gap-2">
        <Input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. ORG-8A7VH" maxLength={10}
          className="text-center font-bold tracking-widest" autoFocus />
        <Button type="submit" disabled={!code.trim() || busy}>{busy ? 'Checking…' : 'Apply'}</Button>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
      <p className="text-xs text-gray-400">Your administrator has this code. It covers your group at no cost to you.</p>
    </form>
  )
}
