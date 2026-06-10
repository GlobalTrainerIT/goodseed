import { useState } from 'react'
import { Dialog, Button } from '@/components/ui'
import { openSeedPack } from '@/lib/domain'
import Confetti from './Confetti'

export default function SeedPackReveal({ open, onClose, pack }) {
  const [revealed, setRevealed] = useState(null)
  const [bursting, setBursting] = useState(false)

  function handleOpen() {
    const reward = openSeedPack(pack.id)
    setRevealed(reward)
    setBursting(true)
    setTimeout(() => setBursting(false), 2500)
  }

  function handleClose() {
    setRevealed(null)
    onClose?.()
  }

  if (!pack) return null
  return (
    <Dialog open={open} onClose={handleClose} size="sm">
      <Confetti show={bursting} count={70} />
      <div className="flex flex-col items-center py-4 text-center">
        {!revealed ? (
          <>
            <button
              onClick={handleOpen}
              className="mb-4 flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-seed-400 to-seed-600 text-6xl shadow-lg transition-transform hover:scale-105 active:scale-95"
              style={{ animation: 'pop 0.4s ease-out' }}
            >
              🎁
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">A Seed Pack!</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Tap the pack to open it and reveal a cosmetic.</p>
            <Button className="mt-4" onClick={handleOpen}>
              Open Pack
            </Button>
          </>
        ) : (
          <>
            <div className="mb-3 flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-400 text-7xl shadow-lg animate-pop">
              {revealed.emoji}
            </div>
            <h2 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">You got: {revealed.label}!</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">A new cosmetic for your avatar. ✨</p>
            <Button className="mt-4" onClick={handleClose}>
              Awesome!
            </Button>
          </>
        )}
      </div>
    </Dialog>
  )
}
