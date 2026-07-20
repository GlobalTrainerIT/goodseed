import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Plus, Check } from 'lucide-react'
import { Button, Input, Label, Dialog } from '@/components/ui'
import { useCurrentUser, useRecord } from '@/lib/hooks'
import { isGroup, GROUP_TYPES } from '@/lib/plan'
import { useMyTeams, switchTeam, createCoachGroup } from '@/lib/teams'
import { syncLeaderCoverage } from '@/lib/billing'
import { login } from '@/lib/auth'
import { toast } from '@/lib/toast'

// Slim bar atop every group page: which team is active + switch + add another.
// Each team is its own group; one subscription (or org code) covers them all.
export default function TeamSwitcher() {
  const user = useCurrentUser()
  const family = useRecord('families', user?.family_id)
  const teams = useMyTeams()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!isGroup(family)) return null

  const current = teams.find((t) => t.familyId === family.id)
  const label = current?.name || family.name

  function pick(t) {
    setOpen(false)
    if (t.familyId === family.id) return
    switchTeam(t.familyId)
    navigate('/Roster')
  }

  return (
    <div className="border-b border-gray-100 bg-white/70 px-4 py-2 backdrop-blur dark:border-gray-800 dark:bg-gray-900/60 sm:px-6">
      <div className="mx-auto flex max-w-6xl items-center justify-between">
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-bold text-gray-900 hover:bg-gray-100 dark:text-gray-100 dark:hover:bg-gray-800"
          >
            <span className="text-lg">{current?.emoji || family.avatar_emoji || '🏅'}</span>
            <span className="max-w-[50vw] truncate">{label}</span>
            {teams.length > 1 && <span className="rounded-full bg-gray-100 px-1.5 text-xs font-semibold text-gray-500 dark:bg-gray-800">{teams.length}</span>}
            <ChevronDown className="h-4 w-4 text-gray-400" />
          </button>
          {open && (
            <div className="absolute left-0 top-full z-40 mt-1 w-64 rounded-xl border border-gray-100 bg-white p-1 shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <p className="px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-gray-400">Your teams &amp; classes</p>
              {teams.map((t) => (
                <button key={t.familyId} onClick={() => pick(t)}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-800">
                  <span className="text-lg">{t.emoji}</span>
                  <span className="flex-1 truncate font-medium text-gray-800 dark:text-gray-200">{t.name}</span>
                  {t.familyId === family.id && <Check className="h-4 w-4 text-seed-600" />}
                </button>
              ))}
              <button onClick={() => { setOpen(false); setAdding(true) }}
                className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-gray-100 px-3 py-2 text-left text-sm font-semibold text-seed-700 hover:bg-seed-50 dark:border-gray-800 dark:text-seed-400 dark:hover:bg-gray-800">
                <Plus className="h-4 w-4" /> New team or class
              </button>
            </div>
          )}
        </div>
        <span className="hidden text-xs text-gray-400 sm:block">One account · one subscription covers them all</span>
      </div>

      <NewTeamDialog open={adding} coachName={user?.full_name} email={user?.email} onClose={() => setAdding(false)} onCreated={() => navigate('/Roster')} />
    </div>
  )
}

function NewTeamDialog({ open, coachName, email, onClose, onCreated }) {
  const [name, setName] = useState('')
  const [typeId, setTypeId] = useState('team')
  const [busy, setBusy] = useState(false)

  async function create() {
    if (!name.trim()) return
    setBusy(true)
    const { group, coach } = createCoachGroup({ name, typeId, coachName: coachName || 'Coach', email })
    login(coach.id) // switch to the new team
    // Extend the coach's existing coverage (paid or org) to this new team.
    try { await syncLeaderCoverage(group.id) } catch { /* trial still applies */ }
    setBusy(false)
    toast({ title: `${group.name} created!`, message: 'Add your roster and start awarding points.', emoji: '🎉' })
    setName('')
    onClose()
    onCreated?.()
  }

  return (
    <Dialog open={open} onClose={onClose} title="New team or class"
      description="Runs on the same account — one subscription covers all your teams."
      footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={create} disabled={!name.trim() || busy}>{busy ? 'Creating…' : 'Create'}</Button></>}>
      <div className="space-y-4">
        <div>
          <Label>Team or class name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Volleyball, 3rd Period" autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); create() } }} />
        </div>
        <div>
          <Label>What kind?</Label>
          <div className="mt-1 grid grid-cols-2 gap-2">
            {GROUP_TYPES.map((t) => (
              <button key={t.id} type="button" onClick={() => setTypeId(t.id)}
                className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-sm font-medium transition ${typeId === t.id ? 'border-seed-500 bg-seed-50 text-seed-800 dark:bg-seed-900/30 dark:text-seed-200' : 'border-gray-200 text-gray-600 hover:border-seed-300 dark:border-gray-700 dark:text-gray-300'}`}>
                <span className="text-lg">{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Dialog>
  )
}
