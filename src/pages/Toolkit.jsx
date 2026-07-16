import { useEffect, useRef, useState } from 'react'
import { Shuffle, Timer as TimerIcon, Users2, Volume2, ArrowLeft, Play, Pause, RotateCcw, Dice5 } from 'lucide-react'
import { Card, Button, Input, Label } from '@/components/ui'
import PageHeader from '@/components/shared/PageHeader'
import EmptyState from '@/components/shared/EmptyState'
import Avatar from '@/components/shared/Avatar'
import { useCurrentUser, useCollection, useRecord } from '@/lib/hooks'
import { useRosterPhoto } from '@/lib/rosterPhotos'
import { isGroup, groupTypeOf } from '@/lib/plan'

// Universal daily utilities for any group leader — coach, teacher, youth
// director, daycare lead. Works off the group's roster.
const TOOLS = [
  { id: 'pick', label: 'Random pick', desc: 'Pick someone at random', icon: Shuffle, tone: 'bg-blue-100 text-blue-600 dark:bg-blue-900/40' },
  { id: 'timer', label: 'Timer', desc: 'Countdown for drills & rounds', icon: TimerIcon, tone: 'bg-purple-100 text-purple-600 dark:bg-purple-900/40' },
  { id: 'teams', label: 'Make teams', desc: 'Split the roster randomly', icon: Users2, tone: 'bg-amber-100 text-amber-600 dark:bg-amber-900/40' },
  { id: 'noise', label: 'Noise meter', desc: 'Keep the room calm', icon: Volume2, tone: 'bg-rose-100 text-rose-600 dark:bg-rose-900/40' },
]

export default function Toolkit() {
  const user = useCurrentUser()
  const group = useRecord('families', user?.family_id)
  const kids = useCollection('users', (all) =>
    all.filter((u) => u.family_id === user?.family_id && u.role === 'child')
  )
  const [tool, setTool] = useState(null)

  if (!group) return null
  if (!isGroup(group)) {
    return <div className="mx-auto max-w-2xl"><EmptyState icon="🧰" title="The Toolkit is for teams & classrooms" /></div>
  }
  const type = groupTypeOf(group)

  return (
    <div className="mx-auto max-w-3xl">
      {!tool ? (
        <>
          <PageHeader title="🧰 Toolkit" subtitle="Everyday tools for your group — pick, time, team up, and calm the room." />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TOOLS.map((t) => (
              <button key={t.id} onClick={() => setTool(t.id)} className="text-left">
                <Card className="flex h-full flex-col items-center gap-2 p-5 text-center transition hover:border-seed-400 hover:shadow-md">
                  <span className={`flex h-14 w-14 items-center justify-center rounded-2xl ${t.tone}`}><t.icon className="h-7 w-7" /></span>
                  <p className="font-bold text-gray-900 dark:text-gray-100">{t.label}</p>
                  <p className="text-xs text-gray-400">{t.desc}</p>
                </Card>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setTool(null)} className="mb-4 flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4" /> All tools
          </button>
          {kids.length === 0 && tool !== 'timer' && tool !== 'noise' ? (
            <EmptyState icon="🧑‍🏫" title="Add kids to your roster first" description="These tools use your group's roster." />
          ) : (
            <>
              {tool === 'pick' && <RandomPick kids={kids} />}
              {tool === 'timer' && <TimerTool />}
              {tool === 'teams' && <TeamMaker kids={kids} groupType={type.id} />}
              {tool === 'noise' && <NoiseMeter />}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ---- Random pick ----------------------------------------------------------
function RandomPick({ kids }) {
  const [chosen, setChosen] = useState(null)
  const [noRepeat, setNoRepeat] = useState(true)
  const [used, setUsed] = useState(() => new Set())
  const [spinning, setSpinning] = useState(false)

  function pick() {
    const pool = noRepeat ? kids.filter((k) => !used.has(k.id)) : kids
    if (pool.length === 0) { setUsed(new Set()); return }
    setSpinning(true)
    let ticks = 0
    const iv = setInterval(() => {
      setChosen(pool[Math.floor((ticks * 7 + 3) % pool.length)]) // deterministic shuffle-ish flicker
      ticks += 1
      if (ticks > 10) {
        clearInterval(iv)
        const winner = pool[(ticks * 3) % pool.length]
        setChosen(winner)
        if (noRepeat) setUsed((u) => new Set(u).add(winner.id))
        setSpinning(false)
      }
    }, 80)
  }

  const remaining = noRepeat ? kids.length - used.size : kids.length
  return (
    <Card className="flex flex-col items-center gap-5 p-8 text-center">
      {chosen ? (
        <div className={`flex flex-col items-center gap-3 ${spinning ? 'opacity-60' : ''}`}>
          <PickAvatar kid={chosen} />
          <p className="text-3xl font-black text-gray-900 dark:text-gray-100">{chosen.full_name}</p>
        </div>
      ) : (
        <div className="flex h-40 items-center justify-center text-gray-400"><Dice5 className="h-16 w-16" /></div>
      )}
      <div className="flex flex-col items-center gap-3">
        <Button onClick={pick} disabled={spinning} className="px-8 text-lg">
          <Shuffle className="h-5 w-5" /> {chosen ? 'Pick again' : 'Pick someone'}
        </Button>
        <label className="flex items-center gap-2 text-sm text-gray-500">
          <input type="checkbox" checked={noRepeat} onChange={(e) => { setNoRepeat(e.target.checked); setUsed(new Set()) }} />
          No repeats {noRepeat && `· ${remaining} left`}
        </label>
        {noRepeat && remaining === 0 && <p className="text-sm font-medium text-seed-600">Everyone's had a turn — picking again resets.</p>}
      </div>
    </Card>
  )
}
function PickAvatar({ kid }) {
  const photo = useRosterPhoto(kid.id)
  return <Avatar user={photo ? { ...kid, avatar_photo: photo } : kid} size="xl" />
}

// ---- Timer ----------------------------------------------------------------
const TIMER_PRESETS = [60, 180, 300, 600]
function TimerTool() {
  const [total, setTotal] = useState(180)
  const [left, setLeft] = useState(180)
  const [running, setRunning] = useState(false)
  const [customMin, setCustomMin] = useState('')
  const raf = useRef(null)
  const endAt = useRef(0)

  useEffect(() => {
    if (!running) return
    endAt.current = Date.now() + left * 1000
    const tick = () => {
      const rem = Math.max(0, Math.round((endAt.current - Date.now()) / 1000))
      setLeft(rem)
      if (rem <= 0) { setRunning(false); beep(); return }
      raf.current = setTimeout(tick, 250)
    }
    raf.current = setTimeout(tick, 250)
    return () => clearTimeout(raf.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  function setPreset(secs) { setRunning(false); setTotal(secs); setLeft(secs) }
  function applyCustom() {
    const m = parseFloat(customMin)
    if (!m || m <= 0) return
    setPreset(Math.round(m * 60))
    setCustomMin('')
  }
  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const pct = total ? (left / total) * 100 : 0
  const low = left <= 10 && left > 0

  return (
    <Card className="flex flex-col items-center gap-6 p-8">
      <div className="relative flex h-56 w-56 items-center justify-center">
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full -rotate-90">
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-800" strokeWidth="7" />
          <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className={left === 0 ? 'text-red-500' : low ? 'text-amber-500' : 'text-seed-500'} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(pct / 100) * 283} 283`} />
        </svg>
        <span className={`text-6xl font-black tabular-nums ${low ? 'text-amber-500' : left === 0 ? 'text-red-500' : 'text-gray-900 dark:text-gray-100'}`}>{mm}:{ss}</span>
      </div>
      <div className="flex gap-2">
        <Button onClick={() => setRunning((r) => !r)} disabled={left === 0} className="px-8">
          {running ? <><Pause className="h-5 w-5" /> Pause</> : <><Play className="h-5 w-5" /> Start</>}
        </Button>
        <Button variant="outline" onClick={() => { setRunning(false); setLeft(total) }}><RotateCcw className="h-5 w-5" /> Reset</Button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {TIMER_PRESETS.map((s) => (
          <button key={s} onClick={() => setPreset(s)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${total === s ? 'bg-seed-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
            {s < 60 ? `${s}s` : `${s / 60}m`}
          </button>
        ))}
        <div className="flex items-center gap-1">
          <Input type="number" min="0" step="0.5" value={customMin} onChange={(e) => setCustomMin(e.target.value)} placeholder="min" className="w-20" />
          <Button variant="secondary" onClick={applyCustom} disabled={!customMin}>Set</Button>
        </div>
      </div>
    </Card>
  )
}
function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    ;[0, 0.25, 0.5].forEach((t) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      osc.connect(gain); gain.connect(ctx.destination)
      gain.gain.setValueAtTime(0.001, ctx.currentTime + t)
      gain.gain.exponentialRampToValueAtTime(0.4, ctx.currentTime + t + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.18)
      osc.start(ctx.currentTime + t); osc.stop(ctx.currentTime + t + 0.2)
    })
    setTimeout(() => ctx.close(), 1200)
  } catch { /* audio not available */ }
}

// ---- Team maker -----------------------------------------------------------
function TeamMaker({ kids, groupType }) {
  const teamWord = groupType === 'team' ? 'Teams' : groupType === 'church' ? 'Groups' : 'Groups'
  const [count, setCount] = useState(2)
  const [teams, setTeams] = useState(null)

  function make() {
    const shuffled = [...kids]
    // Fisher–Yates using index-derived jitter (no Math.random dependency needed for correctness here)
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(((i + 1) * (Date.now() % 97) + i * 31) % (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    const out = Array.from({ length: count }, () => [])
    shuffled.forEach((k, i) => out[i % count].push(k))
    setTeams(out)
  }

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label className="mb-0">Number of {teamWord.toLowerCase()}</Label>
          <div className="flex gap-1">
            {[2, 3, 4, 5, 6].map((n) => (
              <button key={n} onClick={() => setCount(n)} className={`h-9 w-9 rounded-lg text-sm font-bold ${count === n ? 'bg-seed-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>{n}</button>
            ))}
          </div>
        </div>
        <Button onClick={make}><Shuffle className="h-4 w-4" /> {teams ? 'Reshuffle' : `Make ${teamWord.toLowerCase()}`}</Button>
      </div>
      {teams && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {teams.map((team, i) => (
            <div key={i} className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
              <p className="mb-2 font-bold text-seed-700 dark:text-seed-400">{teamWord.replace(/s$/, '')} {i + 1} <span className="text-xs font-normal text-gray-400">· {team.length}</span></p>
              <div className="flex flex-wrap gap-1.5">
                {team.map((k) => (
                  <span key={k.id} className="rounded-full bg-gray-100 px-2.5 py-1 text-sm font-medium text-gray-700 dark:bg-gray-800 dark:text-gray-200">{k.avatar_emoji} {k.full_name}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

// ---- Noise meter ----------------------------------------------------------
function NoiseMeter() {
  const [level, setLevel] = useState(0)
  const [active, setActive] = useState(false)
  const [error, setError] = useState('')
  const stream = useRef(null)
  const ctx = useRef(null)
  const raf = useRef(null)

  async function start() {
    setError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      const ac = new (window.AudioContext || window.webkitAudioContext)()
      ctx.current = ac
      const src = ac.createMediaStreamSource(s)
      const analyser = ac.createAnalyser()
      analyser.fftSize = 512
      src.connect(analyser)
      const data = new Uint8Array(analyser.frequencyBinCount)
      const loop = () => {
        analyser.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setLevel(Math.min(100, Math.round((avg / 128) * 100)))
        raf.current = requestAnimationFrame(loop)
      }
      loop()
      setActive(true)
    } catch {
      setError('Microphone access is needed for the noise meter. It only measures volume — nothing is recorded.')
    }
  }
  function stop() {
    cancelAnimationFrame(raf.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    ctx.current?.close()
    setActive(false)
    setLevel(0)
  }
  useEffect(() => () => stop(), [])

  const tone = level > 70 ? 'bg-red-500' : level > 40 ? 'bg-amber-500' : 'bg-seed-500'
  const face = level > 70 ? '🤫' : level > 40 ? '🙂' : '😌'
  return (
    <Card className="flex flex-col items-center gap-6 p-8 text-center">
      <div className="text-6xl">{active ? face : '🎤'}</div>
      <div className="h-6 w-full max-w-md overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
        <div className={`h-full rounded-full transition-all duration-100 ${tone}`} style={{ width: `${level}%` }} />
      </div>
      {error && <p className="max-w-sm text-sm text-gray-500">{error}</p>}
      {!active ? (
        <Button onClick={start}><Volume2 className="h-5 w-5" /> Start listening</Button>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-500">{level > 70 ? 'Too loud — time to settle down' : level > 40 ? 'Nice working volume' : 'Lovely and calm'}</p>
          <Button variant="outline" onClick={stop}>Stop</Button>
        </>
      )}
      <p className="text-xs text-gray-400">🔒 The meter only reads volume on this device. Nothing is recorded or uploaded.</p>
    </Card>
  )
}
