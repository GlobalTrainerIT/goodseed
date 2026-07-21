import { Shield, Check, Clock, Undo2 } from 'lucide-react'
import { Card, Button, Badge } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useSettings } from '@/lib/hooks'
import {
  armorProgress,
  armorTodayRecord,
  armorStreakDays,
  kidMarkArmor,
  confirmArmor,
  undoArmorToday,
  armorPieceReward,
  seedLabel,
} from '@/lib/domain'
import { ARMOR, ARMOR_SIZE, armorTier } from '@/lib/armor'
import { toast } from '@/lib/toast'

// "Armor of God" daily devotion. Renders the child's own self-check view when a
// child is signed in, or a parent confirmation panel (all kids) for a parent.
export default function ArmorOfGod({ familyId }) {
  const user = useCurrentUser()
  const settings = useSettings()
  const kids = useCollection('users', (all) =>
    all
      .filter((u) => u.family_id === familyId && u.role === 'child')
      .sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  useCollection('armorPieces') // re-render as pieces are marked/confirmed

  if (settings.armorEnabled === false) return null
  if (!user) return null

  if (user.role === 'child') {
    return (
      <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-900/50 dark:from-indigo-900/20 dark:to-gray-900">
        <Header />
        <div className="mt-4">
          <ChildView child={user} self />
        </div>
      </Card>
    )
  }

  if (kids.length === 0) return null
  return (
    <Card className="overflow-hidden border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 dark:border-indigo-900/50 dark:from-indigo-900/20 dark:to-gray-900">
      <Header />
      <div className="mt-4 space-y-2.5">
        {kids.map((kid) => (
          <ParentRow key={kid.id} kid={kid} byUserId={user.id} />
        ))}
      </div>
    </Card>
  )
}

function Header() {
  return (
    <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300">
      <Shield className="h-5 w-5" />
      <span className="text-sm font-bold uppercase tracking-wide">Armor of God</span>
    </div>
  )
}

// A row of the seven armor slots. Earned pieces are filled; the next piece to
// earn glows; the rest are locked.
function ArmorSlots({ inSuit }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ARMOR.map((piece, i) => {
        const earned = i < inSuit
        const next = i === inSuit
        return (
          <span
            key={piece.id}
            title={`${piece.label} — ${piece.kid}`}
            className={`flex h-8 w-8 items-center justify-center rounded-lg text-lg transition ${
              earned
                ? 'bg-indigo-500 shadow-sm'
                : next
                ? 'bg-indigo-100 ring-2 ring-indigo-400 dark:bg-indigo-900/40'
                : 'bg-gray-100 opacity-40 dark:bg-gray-800'
            }`}
          >
            {earned || next ? piece.emoji : '🔒'}
          </span>
        )
      })}
    </div>
  )
}

function StatsLine({ childId }) {
  const prog = armorProgress(childId)
  const tier = armorTier(prog.suitsCompleted)
  const streak = armorStreakDays(childId)
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="purple">{prog.inSuit}/{ARMOR_SIZE} pieces</Badge>
      <Badge variant="gray">{tier.emoji} {tier.name}</Badge>
      {prog.suitsCompleted > 0 && <Badge variant="purple">⚔️ {prog.suitsCompleted} full suit{prog.suitsCompleted === 1 ? '' : 's'}</Badge>}
      {streak > 0 && <Badge variant="green">🔥 {streak} day{streak === 1 ? '' : 's'}</Badge>}
    </div>
  )
}

// Child's own view: read today's verse, then put on today's piece.
function ChildView({ child }) {
  const today = armorTodayRecord(child.id)
  const prog = armorProgress(child.id)
  const nextPiece = ARMOR[prog.nextPieceIndex]

  function putOn() {
    if (kidMarkArmor(child.id)) {
      toast({ title: 'Armor marked! 🛡️', message: 'Ask a grown-up to confirm it.', emoji: '🛡️' })
    }
  }

  return (
    <div className="space-y-3">
      <ArmorSlots inSuit={prog.inSuit} />
      <div className="rounded-xl bg-white/70 p-3 dark:bg-gray-900/40">
        <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
          Today: {nextPiece.emoji} {nextPiece.label}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{nextPiece.kid} · {nextPiece.ref}</p>
      </div>

      {!today ? (
        <Button className="w-full" onClick={putOn}>
          <Shield className="h-4 w-4" /> Put on today's armor
        </Button>
      ) : today.status === 'pending' ? (
        <div className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2.5 dark:bg-amber-900/20">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-amber-700 dark:text-amber-300">
            <Clock className="h-4 w-4" /> Waiting for a grown-up to confirm
          </span>
          <button onClick={() => undoArmorToday(child.id)} className="text-xs font-medium text-gray-400 hover:text-gray-600" title="Undo">
            <Undo2 className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-2.5 text-sm font-semibold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">
          <Check className="h-4 w-4" /> Armor on for today! Come back tomorrow for the next piece.
        </div>
      )}

      <StatsLine childId={child.id} />
    </div>
  )
}

// Parent's per-child row: confirm a kid's self-mark, or mark it complete.
function ParentRow({ kid, byUserId }) {
  const today = armorTodayRecord(kid.id)
  const prog = armorProgress(kid.id)
  const pending = today?.status === 'pending'
  const done = today?.status === 'confirmed'
  const reward = armorPieceReward()

  function confirm() {
    const r = confirmArmor(kid.id, byUserId)
    if (r) {
      toast({
        title: r.fullArmor ? `⚔️ ${kid.full_name} — Full Armor!` : `${kid.full_name} suited up 🛡️`,
        message: r.fullArmor ? 'Completed the whole armor of God!' : `${r.piece.label}${reward ? ` · +${reward} ${seedLabel().toLowerCase()}` : ''}`,
        emoji: r.fullArmor ? '⚔️' : '🛡️',
      })
    }
  }

  return (
    <div className={`flex items-center gap-3 rounded-xl border p-2.5 ${pending ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/10' : 'border-gray-200 dark:border-gray-800'}`}>
      <Avatar user={kid} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-bold text-gray-900 dark:text-gray-100">{kid.full_name}</p>
        <div className="mt-0.5">
          <ArmorSlots inSuit={prog.inSuit} />
        </div>
      </div>
      {pending ? (
        <Button size="sm" onClick={confirm}>
          <Check className="h-4 w-4" /> Confirm
        </Button>
      ) : done ? (
        <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
          <Check className="h-4 w-4" /> Done today
        </span>
      ) : (
        <Button size="sm" variant="secondary" onClick={confirm}>
          Mark done
        </Button>
      )}
    </div>
  )
}
