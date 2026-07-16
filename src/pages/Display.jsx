import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize, Minimize, X, Trophy } from 'lucide-react'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useRecord } from '@/lib/hooks'
import { useRosterPhoto } from '@/lib/rosterPhotos'
import { seedLabel } from '@/lib/domain'
import { groupTypeOf, isGroup } from '@/lib/plan'

const MEDALS = ['🥇', '🥈', '🥉']

// Full-screen, read-only board for a classroom monitor / projector. Reads the
// same reactive store, so points awarded on the coach's phone (same device, or
// a co-leader's via cloud sync) animate up here in real time.
export default function Display() {
  const user = useCurrentUser()
  const group = useRecord('families', user?.family_id)
  const navigate = useNavigate()
  const [isFs, setIsFs] = useState(false)

  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
      .sort((a, b) => (b.seed_balance || 0) - (a.seed_balance || 0) || a.full_name.localeCompare(b.full_name))
  )
  const announcements = useCollection('announcements', (all) =>
    all.filter((a) => a.family_id === user?.family_id)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at))
  )

  // Flash a card when its points go up.
  const prev = useRef({})
  const [flash, setFlash] = useState({})
  useEffect(() => {
    const changed = {}
    kids.forEach((k) => {
      const before = prev.current[k.id]
      if (before != null && (k.seed_balance || 0) > before) changed[k.id] = (k.seed_balance || 0) - before
      prev.current[k.id] = k.seed_balance || 0
    })
    if (Object.keys(changed).length) {
      setFlash(changed)
      const t = setTimeout(() => setFlash({}), 1600)
      return () => clearTimeout(t)
    }
  }, [kids])

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  function toggleFs() {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.()
  }

  if (!user) return null
  if (!isGroup(group)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-emerald-950 text-white">
        <p>The big-screen board is for classrooms &amp; teams.</p>
      </div>
    )
  }
  const type = groupTypeOf(group)
  const total = kids.reduce((s, k) => s + (k.seed_balance || 0), 0)
  const label = seedLabel()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-10 sm:py-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl">{type.emoji}</span>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{group.name}</h1>
            </div>
            <p className="mt-2 text-lg font-semibold text-emerald-200 sm:text-2xl">
              {kids.length} on the team · {total} {label.toLowerCase()} earned together 🌟
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleFs} className="rounded-xl bg-white/10 p-3 hover:bg-white/20" aria-label="Fullscreen">
              {isFs ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
            </button>
            <button onClick={() => navigate('/Roster')} className="rounded-xl bg-white/10 p-3 hover:bg-white/20" aria-label="Exit board">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Leaderboard */}
        {kids.length === 0 ? (
          <div className="flex flex-1 items-center justify-center">
            <p className="text-2xl text-emerald-200">Add kids to your roster to start the board.</p>
          </div>
        ) : (
          <div className="mt-8 grid flex-1 auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kids.map((kid, i) => (
              <DisplayRow key={kid.id} kid={kid} rank={i} flashBy={flash[kid.id]} label={label} />
            ))}
          </div>
        )}

        {/* Announcements ticker */}
        {announcements.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="text-lg font-black uppercase tracking-wide text-amber-300">📣 Announcements</span>
              {announcements.slice(0, 4).map((a) => (
                <span key={a.id} className="text-lg font-semibold sm:text-xl">
                  {a.is_pinned && '📌 '}<b>{a.title}</b>{a.message ? ` — ${a.message}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function DisplayRow({ kid, rank, flashBy, label }) {
  const photo = useRosterPhoto(kid.id)
  const shown = photo ? { ...kid, avatar_photo: photo } : kid
  const top = rank < 3
  return (
    <div
      className={`relative flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-500 ${
        top ? 'bg-white/20' : 'bg-white/10'
      } ${flashBy ? 'scale-[1.03] ring-4 ring-amber-300' : ''}`}
    >
      <span className="w-10 text-center text-3xl font-black sm:text-4xl">
        {MEDALS[rank] || <span className="text-emerald-200">{rank + 1}</span>}
      </span>
      <Avatar user={shown} size="lg" ring />
      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-extrabold sm:text-3xl">{kid.full_name}</p>
        <p className="text-sm font-semibold text-emerald-200">{label}</p>
      </div>
      <div className="text-right">
        <p className="text-4xl font-black tabular-nums sm:text-5xl">{kid.seed_balance || 0}</p>
        {flashBy ? <p className="text-lg font-black text-amber-300">+{flashBy}</p> : null}
      </div>
    </div>
  )
}
