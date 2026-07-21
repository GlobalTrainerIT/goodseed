import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Maximize, Minimize, X } from 'lucide-react'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useRecord } from '@/lib/hooks'
import { useRosterPhoto } from '@/lib/rosterPhotos'
import { seedLabel, taskAppliesTo, latestCompletion, verseMemorizedThisWeek, armorProgress, distinctFruitsEarned, gratitudeRecent, altarProgress, altarStreakWeeks } from '@/lib/domain'
import { getVerseForWeek } from '@/lib/verses'
import { levelRank } from '@/lib/faith'
import { computeRollup, refreshFollowed, useFollowedData } from '@/lib/groupLink'
import { upcomingEvents, groupByDay } from '@/lib/events'
import { groupTypeOf, isGroup } from '@/lib/plan'

const MEDALS = ['🥇', '🥈', '🥉']

// Full-screen board for a screen in the room — a classroom monitor for groups,
// a kitchen tablet for families. Reads the reactive store, so points awarded
// (or tasks approved) elsewhere animate up here in real time.
export default function Display() {
  const user = useCurrentUser()
  const family = useRecord('families', user?.family_id)
  if (!user) return null
  return isGroup(family) ? <GroupBoard user={user} group={family} /> : <FamilyBoard user={user} family={family} />
}

// Shared: fullscreen toggle + "flash when points go up".
function useFullscreen() {
  const [isFs, setIsFs] = useState(false)
  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])
  const toggle = () => {
    if (document.fullscreenElement) document.exitFullscreen?.()
    else document.documentElement.requestFullscreen?.()
  }
  return [isFs, toggle]
}

function usePointFlash(kids) {
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
  return flash
}

function BoardControls({ isFs, toggleFs, onExit }) {
  return (
    <div className="flex gap-2">
      <button onClick={toggleFs} className="rounded-xl bg-white/10 p-3 hover:bg-white/20" aria-label="Fullscreen">
        {isFs ? <Minimize className="h-6 w-6" /> : <Maximize className="h-6 w-6" />}
      </button>
      <button onClick={onExit} className="rounded-xl bg-white/10 p-3 hover:bg-white/20" aria-label="Exit board">
        <X className="h-6 w-6" />
      </button>
    </div>
  )
}

// ---- Group board (classroom monitor) --------------------------------------
function GroupBoard({ user, group }) {
  const navigate = useNavigate()
  const [isFs, toggleFs] = useFullscreen()
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
      .sort((a, b) => (b.seed_balance || 0) - (a.seed_balance || 0) || a.full_name.localeCompare(b.full_name))
  )
  const announcements = useCollection('announcements', (all) =>
    all.filter((a) => a.family_id === user?.family_id)
      .sort((a, b) => (b.is_pinned ? 1 : 0) - (a.is_pinned ? 1 : 0) || new Date(b.created_at) - new Date(a.created_at))
  )
  useCollection('memoryVerses') // subscribe so memorized marks update live
  const flash = usePointFlash(kids)
  const type = groupTypeOf(group)
  const total = kids.reduce((s, k) => s + (k.seed_balance || 0), 0)
  const label = seedLabel()
  const verse = getVerseForWeek(new Date())
  const memorizedCount = kids.filter((k) => verseMemorizedThisWeek(k.id)).length
  const gEvents = groupByDay(upcomingEvents(announcements, { days: 30 }))
  const notices = announcements.filter((a) => !a.event_date)

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-900 via-green-800 to-emerald-950 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-10 sm:py-8">
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
          <BoardControls isFs={isFs} toggleFs={toggleFs} onExit={() => navigate('/Roster')} />
        </div>

        {kids.length === 0 ? (
          <div className="flex flex-1 items-center justify-center"><p className="text-2xl text-emerald-200">Add kids to your roster to start the board.</p></div>
        ) : (
          <div className="mt-8 grid flex-1 auto-rows-min grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {kids.map((kid, i) => <GroupRow key={kid.id} kid={kid} rank={i} flashBy={flash[kid.id]} label={label} memorized={verseMemorizedThisWeek(kid.id)} />)}
          </div>
        )}

        {gEvents.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="text-lg font-black uppercase tracking-wide text-sky-300">📅 Upcoming</span>
              {gEvents.slice(0, 3).flatMap((day) => day.events.slice(0, 2).map((ev) => (
                <span key={ev.id} className="text-lg font-semibold sm:text-xl">
                  <b>{day.label}:</b> {ev.title}{ev.event_time ? ` · ${ev.event_time}` : ''}
                </span>
              )))}
            </div>
          </div>
        )}

        {notices.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="text-lg font-black uppercase tracking-wide text-amber-300">📣 Announcements</span>
              {notices.slice(0, 4).map((a) => (
                <span key={a.id} className="text-lg font-semibold sm:text-xl">
                  {a.is_pinned && '📌 '}<b>{a.title}</b>{a.message ? ` — ${a.message}` : ''}
                </span>
              ))}
            </div>
          </div>
        )}

        {kids.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur">
            <p className="text-xs font-black uppercase tracking-widest text-emerald-200">
              📖 Verse of the Week{memorizedCount > 0 ? ` · ${memorizedCount} memorized` : ''}
            </p>
            <p className="mt-1 text-lg font-semibold italic sm:text-2xl">“{verse.verse_text}”</p>
            <p className="mt-1 text-sm font-bold text-emerald-100">{verse.reference}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function GroupRow({ kid, rank, flashBy, label, memorized }) {
  const photo = useRosterPhoto(kid.id)
  const shown = photo ? { ...kid, avatar_photo: photo } : kid
  const top = rank < 3
  return (
    <div className={`relative flex items-center gap-4 rounded-2xl px-5 py-4 transition-all duration-500 ${top ? 'bg-white/20' : 'bg-white/10'} ${flashBy ? 'scale-[1.03] ring-4 ring-amber-300' : ''}`}>
      <span className="w-10 text-center text-3xl font-black sm:text-4xl">{MEDALS[rank] || <span className="text-emerald-200">{rank + 1}</span>}</span>
      <Avatar user={shown} size="lg" ring />
      <div className="min-w-0 flex-1">
        <p className="truncate text-2xl font-extrabold sm:text-3xl">{kid.full_name} {memorized && <span title="Memorized this week's verse">📖</span>}</p>
        <p className="text-sm font-semibold text-emerald-200">{label}</p>
      </div>
      <div className="text-right">
        <p className="text-4xl font-black tabular-nums sm:text-5xl">{kid.seed_balance || 0}</p>
        {flashBy ? <p className="text-lg font-black text-amber-300">+{flashBy}</p> : null}
      </div>
    </div>
  )
}

// ---- Family board (kitchen tablet) ----------------------------------------
// Warm and equal — no sibling ranking. Everyone's growth is celebrated.
function FamilyBoard({ user, family }) {
  const navigate = useNavigate()
  const [isFs, toggleFs] = useFullscreen()
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child').sort((a, b) => a.full_name.localeCompare(b.full_name))
  )
  const tasks = useCollection('tasks', (all) => all.filter((t) => t.family_id === user?.family_id && t.status === 'active'))
  useCollection('completions') // subscribe so "tasks left" recomputes on approval
  useCollection('memoryVerses') // subscribe so the memorized pill updates live
  useCollection('armorPieces') // subscribe so the armor pill updates live
  useCollection('fruitEarned') // subscribe so the fruit pill updates live
  useCollection('gratitude') // subscribe so the gratitude jar updates live
  useCollection('familyAltar') // subscribe so the altar line updates live
  const ownAnnouncements = useCollection('announcements', (all) => all.filter((a) => a.family_id === user?.family_id))
  const { followed, snapshots } = useFollowedData() // re-render when linked-group snapshots arrive
  useEffect(() => { refreshFollowed() }, []) // pull school/sports totals for the rollup
  const flash = usePointFlash(kids)
  const label = seedLabel()
  const verse = getVerseForWeek(new Date())
  const jar = gratitudeRecent(user?.family_id, 5)
  const nameOf = (id) => kids.find((k) => k.id === id)?.full_name || ''
  const altar = altarProgress(user?.family_id)
  const altarStreak = altarStreakWeeks(user?.family_id)
  const groupEvents = followed.flatMap((f) => (snapshots[f.code]?.announcements || []).map((a) => ({ ...a, group: snapshots[f.code]?.group_name || f.groupName })))
  const agenda = groupByDay(upcomingEvents([...ownAnnouncements, ...groupEvents], { days: 14 }))

  function tasksLeft(kidId) {
    const applies = tasks.filter((t) => taskAppliesTo(t, kidId))
    const today = new Date().toDateString()
    const done = applies.filter((t) => {
      const c = latestCompletion(t.id, kidId)
      return c && new Date(c.submitted_date).toDateString() === today && (c.status === 'approved' || c.status === 'pending_approval')
    })
    return applies.length - done.length
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-seed-600 via-green-600 to-emerald-700 text-white">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 sm:px-10 sm:py-8">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-4xl sm:text-5xl">{family?.avatar_emoji || '🏡'}</span>
              <h1 className="text-4xl font-black tracking-tight sm:text-6xl">{family?.name || 'Our Family'}</h1>
            </div>
            <p className="mt-2 text-lg font-semibold text-green-100 sm:text-2xl">Plant good seeds, watch your family grow 🌱</p>
          </div>
          <BoardControls isFs={isFs} toggleFs={toggleFs} onExit={() => navigate('/Dashboard')} />
        </div>

        {kids.length === 0 ? (
          <div className="flex flex-1 items-center justify-center"><p className="text-2xl text-green-100">Add your kids to see the family board.</p></div>
        ) : (
          <div className="mt-8 grid flex-1 auto-rows-min grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {kids.map((kid) => {
              const left = tasksLeft(kid.id)
              const bump = flash[kid.id]
              const roll = computeRollup(kid) // rank reflects home + school + sports
              const armor = armorProgress(kid.id)
              const fruits = distinctFruitsEarned(kid.id)
              return (
                <div key={kid.id} className={`flex flex-col items-center gap-3 rounded-3xl bg-white/15 px-6 py-6 text-center backdrop-blur transition-all duration-500 ${bump ? 'scale-[1.03] ring-4 ring-amber-300' : ''}`}>
                  <Avatar user={kid} size="xl" ring />
                  <p className="text-2xl font-extrabold sm:text-3xl">{kid.full_name}</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-black tabular-nums sm:text-6xl">{kid.seed_balance || 0}</span>
                    <span className="text-lg font-semibold text-green-100">🌱 {label.toLowerCase()}</span>
                    {bump ? <span className="text-xl font-black text-amber-300">+{bump}</span> : null}
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-2 text-base font-semibold">
                    {(kid.streak_current || 0) > 0 && <span className="rounded-full bg-white/15 px-3 py-1">🔥 {kid.streak_current} day{kid.streak_current === 1 ? '' : 's'}</span>}
                    {verseMemorizedThisWeek(kid.id) && <span className="rounded-full bg-white/15 px-3 py-1">📖 Verse ✓</span>}
                    {(armor.inSuit > 0 || armor.suitsCompleted > 0) && <span className="rounded-full bg-white/15 px-3 py-1">🛡️ Armor {armor.inSuit}/{armor.size}</span>}
                    {fruits > 0 && <span className="rounded-full bg-white/15 px-3 py-1">🌳 Fruit {fruits}/9</span>}
                    <span className="rounded-full bg-white/15 px-3 py-1">{roll.rank.emoji} {roll.rank.name}</span>
                    {roll.hasGroups && <span className="rounded-full bg-white/15 px-3 py-1">🌍 {roll.grandTotal} total</span>}
                    <span className="rounded-full bg-white/15 px-3 py-1">{left > 0 ? `📋 ${left} to do` : '✅ All done!'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {jar.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              <span className="text-lg font-black uppercase tracking-wide text-amber-200">💛 Gratitude Jar</span>
              {jar.map((n) => (
                <span key={n.id} className="text-lg font-semibold sm:text-xl">
                  {n.kind === 'prayer' ? '🙏' : '💛'} {n.text}
                  {nameOf(n.child_id) && <span className="text-green-200"> — {nameOf(n.child_id)}</span>}
                </span>
              ))}
            </div>
          </div>
        )}

        {agenda.length > 0 && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
              <span className="text-lg font-black uppercase tracking-wide text-sky-200">📅 This Week</span>
              {agenda.slice(0, 4).flatMap((day) => day.events.slice(0, 2).map((ev) => (
                <span key={ev.id || `${ev.event_date}-${ev.title}`} className="text-lg font-semibold sm:text-xl">
                  <b>{day.label}:</b> {ev.title}{ev.event_time ? ` · ${ev.event_time}` : ''}
                  {ev.group && <span className="text-green-200"> ({ev.group})</span>}
                </span>
              )))}
            </div>
          </div>
        )}

        {(altar.doneCount > 0 || altar.completed) && (
          <div className="mt-6 rounded-2xl bg-white/10 px-6 py-3 text-center backdrop-blur">
            <p className="text-lg font-black sm:text-xl">
              🕯️ Family Altar — {altar.completed ? 'lit this week! 🎉' : `${altar.doneCount}/${altar.total} done together`}
              {altarStreak > 1 && <span className="text-amber-200"> · 🔥 {altarStreak} weeks</span>}
            </p>
          </div>
        )}

        <div className="mt-6 rounded-2xl bg-white/10 px-6 py-4 text-center backdrop-blur">
          <p className="text-xs font-black uppercase tracking-widest text-green-200">📖 Verse of the Week</p>
          <p className="mt-1 text-lg font-semibold italic sm:text-2xl">“{verse.verse_text}”</p>
          <p className="mt-1 text-sm font-bold text-green-100">{verse.reference}</p>
        </div>
      </div>
    </div>
  )
}
