import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Dialog, Button } from '@/components/ui'
import { PLANS } from '@/lib/plan'
import { startCheckout } from '@/lib/billing'

/**
 * Paywall / upgrade modal. `reason` tailors the headline to what the user just
 * hit (e.g. the child cap or a co-parent/sync gate).
 */
export default function UpgradeDialog({ open, onClose, family, reason }) {
  const [loading, setLoading] = useState(false)

  async function upgrade() {
    setLoading(true)
    await startCheckout(family)
    setLoading(false)
  }

  return (
    <Dialog open={open} onClose={onClose} title="Upgrade to GoodSeed Plus" size="md">
      {reason && (
        <div className="mb-4 rounded-lg bg-seed-50 px-3 py-2 text-sm font-medium text-seed-700 dark:bg-seed-900/20 dark:text-seed-300">
          {reason}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-4 dark:border-gray-700">
          <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{PLANS.free.name}</p>
          <p className="mb-3 text-2xl font-extrabold text-gray-900 dark:text-gray-100">{PLANS.free.price}</p>
          <ul className="space-y-1.5">
            {PLANS.free.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" /> {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border-2 border-seed-500 bg-seed-50/50 p-4 dark:bg-seed-900/10">
          <p className="flex items-center gap-1 text-sm font-bold text-seed-700 dark:text-seed-300">
            <Sparkles className="h-4 w-4" /> {PLANS.plus.name}
          </p>
          <p className="mb-3 text-2xl font-extrabold text-gray-900 dark:text-gray-100">{PLANS.plus.price}</p>
          <ul className="space-y-1.5">
            {PLANS.plus.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-200">
                <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-seed-600" /> {f}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={onClose}>Not now</Button>
        <Button className="flex-1" onClick={upgrade} disabled={loading}>
          <Sparkles className="h-4 w-4" /> {loading ? 'Starting…' : 'Upgrade to Plus'}
        </Button>
      </div>
    </Dialog>
  )
}
