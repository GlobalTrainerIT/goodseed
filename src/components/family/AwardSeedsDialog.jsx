import { useState, useEffect } from 'react'
import { Dialog, Button, Input, Textarea, Label } from '@/components/ui'
import { awardSeeds, deductSeeds, seedLabel } from '@/lib/domain'
import { toast } from '@/lib/toast'
import { useCurrentUser } from '@/lib/hooks'

export default function AwardSeedsDialog({ open, onClose, child, mode = 'award' }) {
  const user = useCurrentUser()
  const [amount, setAmount] = useState(1)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const isDeduct = mode === 'deduct'

  useEffect(() => {
    if (open) { setAmount(1); setReason(''); setError('') }
  }, [open])

  function submit() {
    const amt = Number(amount)
    if (!amt || amt <= 0) return setError('Enter an amount greater than 0.')
    if (isDeduct) {
      const ok = deductSeeds(child.id, amt, reason.trim())
      if (!ok) return setError('Child does not have enough seeds.')
      toast({ title: `Deducted ${amt} ${seedLabel()}`, emoji: '💸', type: 'info' })
    } else {
      awardSeeds(child.id, amt, reason.trim(), user?.id)
      toast({ title: `Awarded ${amt} ${seedLabel()}!`, emoji: '🌱' })
    }
    onClose()
  }

  if (!child) return null
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={isDeduct ? `Deduct ${seedLabel()}` : `Award ${seedLabel()}`}
      description={`${isDeduct ? 'Remove from' : 'Give to'} ${child.full_name} (balance: ${child.seed_balance || 0})`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant={isDeduct ? 'danger' : 'primary'} onClick={submit}>
            {isDeduct ? 'Deduct' : 'Award'}
          </Button>
        </>
      }
    >
      {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30">{error}</p>}
      <div className="space-y-4">
        <div>
          <Label>Amount</Label>
          <Input type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
        </div>
        <div>
          <Label>Reason (optional)</Label>
          <Textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={isDeduct ? 'e.g. broke a house rule' : 'e.g. extra help with dishes'} />
        </div>
      </div>
    </Dialog>
  )
}
