import { useState } from 'react'
import { Lock, Delete, LogOut } from 'lucide-react'
import { Button } from '@/components/ui'
import { unlock } from '@/lib/pinLock'
import { logout } from '@/lib/auth'
import { useNavigate } from 'react-router-dom'

/** Full-screen 4-digit PIN entry shown to parents on a PIN-locked family. */
export default function ParentPinGate({ pin }) {
  const [entry, setEntry] = useState('')
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  function press(d) {
    if (entry.length >= 4) return
    const next = entry + d
    setEntry(next)
    setError(false)
    if (next.length === 4) {
      if (next === pin) {
        unlock()
      } else {
        setError(true)
        setTimeout(() => setEntry(''), 400)
      }
    }
  }

  function signOut() {
    logout()
    navigate('/Welcome')
  }

  return (
    <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-seed-50 px-6 dark:bg-gray-950">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-seed-600 text-white">
        <Lock className="h-8 w-8" />
      </div>
      <h1 className="mt-4 text-xl font-extrabold text-gray-900 dark:text-gray-100">Parent PIN</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Enter your 4-digit PIN to continue.</p>

      <div className={`mt-6 flex gap-3 ${error ? 'animate-pop' : ''}`}>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-4 w-4 rounded-full ${entry.length > i ? (error ? 'bg-red-500' : 'bg-seed-600') : 'bg-gray-300 dark:bg-gray-700'}`}
          />
        ))}
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-500">Wrong PIN, try again</p>}

      <div className="mt-8 grid grid-cols-3 gap-3">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
          <button
            key={n}
            onClick={() => press(String(n))}
            className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-gray-800 shadow-sm transition active:scale-95 dark:bg-gray-800 dark:text-gray-100"
          >
            {n}
          </button>
        ))}
        <div />
        <button
          onClick={() => press('0')}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl font-bold text-gray-800 shadow-sm transition active:scale-95 dark:bg-gray-800 dark:text-gray-100"
        >
          0
        </button>
        <button
          onClick={() => setEntry((e) => e.slice(0, -1))}
          className="flex h-16 w-16 items-center justify-center rounded-full text-gray-500 transition active:scale-95"
        >
          <Delete className="h-6 w-6" />
        </button>
      </div>

      <Button variant="ghost" className="mt-8" onClick={signOut}>
        <LogOut className="h-4 w-4" /> Sign out instead
      </Button>
    </div>
  )
}
