import { useRef, useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  LineChart, Line, Legend, Cell,
} from 'recharts'
import {
  startOfWeek, endOfWeek, subWeeks, startOfMonth, endOfMonth, subMonths,
  startOfYear, endOfYear, format, eachDayOfInterval, isWithinInterval, isSameDay,
} from 'date-fns'
import { CheckSquare, Sprout, Users as UsersIcon, Target, FileText, Download } from 'lucide-react'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Select, Button, Tabs, ProgressBar } from '@/components/ui'
import Avatar from '@/components/shared/Avatar'
import EmptyState from '@/components/shared/EmptyState'
import { useCollection, useCurrentUser } from '@/lib/hooks'
import { getById } from '@/lib/db'
import { TASK_CATEGORIES } from '@/lib/constants'
import { safeParseDate, formatDate } from '@/lib/utils'
import { toast } from '@/lib/toast'

const CHILD_COLORS = ['#16a34a', '#2563eb', '#db2777', '#ea580c', '#7c3aed', '#0891b2']

function getRange(period) {
  const now = new Date()
  switch (period) {
    case 'last_week': { const s = startOfWeek(subWeeks(now, 1)); return { start: s, end: endOfWeek(subWeeks(now, 1)) } }
    case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) }
    case 'last_3_months': return { start: startOfMonth(subMonths(now, 2)), end: endOfMonth(now) }
    case 'this_year': return { start: startOfYear(now), end: endOfYear(now) }
    case 'this_week':
    default: return { start: startOfWeek(now), end: endOfWeek(now) }
  }
}

export default function Reports() {
  const user = useCurrentUser()
  const completions = useCollection('completions')
  const users = useCollection('users')
  const goals = useCollection('goals')
  const activity = useCollection('activity')
  const [period, setPeriod] = useState('this_week')
  const [tableTab, setTableTab] = useState('children')
  const reportRef = useRef(null)

  const { start, end } = getRange(period)
  const children = useMemo(() => users.filter((u) => u.family_id === user?.family_id && u.role === 'child'), [users, user])

  const approvedInRange = completions.filter((c) => {
    if (c.status !== 'approved' || c.family_id !== user?.family_id) return false
    const d = safeParseDate(c.approved_date || c.submitted_date)
    return d && isWithinInterval(d, { start, end })
  })

  // Every seed gain in the period — task rewards, manual awards, bonuses — lands
  // in the activity log with a positive seeds_delta (regardless of action_type).
  const seedEventsInRange = activity.filter((a) => {
    if (a.family_id !== user?.family_id || !(a.seeds_delta > 0)) return false
    const d = safeParseDate(a.timestamp)
    return d && isWithinInterval(d, { start, end })
  })

  const tasksCompleted = approvedInRange.length
  // Seeds earned = everything from the activity log, so manual awards count too.
  const seedsEarned = seedEventsInRange.reduce((sum, a) => sum + (a.seeds_delta || 0), 0)
  // A child is "active" if they completed a task OR earned seeds in the period.
  const activeIds = new Set([
    ...approvedInRange.map((c) => c.child_id),
    ...seedEventsInRange.map((a) => a.user_id),
  ])
  const activeChildren = children.filter((c) => activeIds.has(c.id)).length
  const activeGoals = goals.filter((g) => g.family_id === user?.family_id && g.status !== 'completed').length

  // contributions per child — seeds earned (includes manual awards)
  const contributions = children.map((c, i) => ({
    name: c.full_name,
    tasks: approvedInRange.filter((a) => a.child_id === c.id).length,
    seeds: seedEventsInRange.filter((a) => a.user_id === c.id).reduce((s, a) => s + (a.seeds_delta || 0), 0),
    color: CHILD_COLORS[i % CHILD_COLORS.length],
  }))

  // by category
  const byCategory = Object.entries(TASK_CATEGORIES).map(([key, cat]) => ({
    name: cat.label,
    count: approvedInRange.filter((a) => getById('tasks', a.task_id)?.category === key).length,
    color: cat.color,
  })).filter((d) => d.count > 0)

  // timeline — seeds earned per day (tasks + awards)
  const days = eachDayOfInterval({ start, end }).slice(-31)
  const timeline = days.map((day) => ({
    date: format(day, 'MMM d'),
    count: seedEventsInRange
      .filter((a) => isSameDay(safeParseDate(a.timestamp), day))
      .reduce((s, a) => s + (a.seeds_delta || 0), 0),
  }))

  function exportCSV() {
    // Single seed ledger from the activity log — task rewards, manual awards,
    // bonuses and deductions, each once (no double-counting).
    const rows = [['Child', 'Date', 'Type', 'Detail', 'Seeds']]
    activity
      .filter((a) => {
        if (a.family_id !== user?.family_id || !a.seeds_delta) return false
        const d = safeParseDate(a.timestamp)
        return d && isWithinInterval(d, { start, end })
      })
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
      .forEach((a) => {
        const child = getById('users', a.user_id)
        rows.push([
          child?.full_name || '', formatDate(a.timestamp),
          a.seeds_delta > 0 ? 'Earned' : 'Spent',
          a.description || '', a.seeds_delta || 0,
        ])
      })
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    downloadBlob(new Blob([csv], { type: 'text/csv' }), `goodseed-report-${period}.csv`)
    toast({ title: 'CSV exported!', emoji: '📄' })
  }

  async function exportPDF() {
    try {
      toast({ title: 'Building PDF…', emoji: '⏳' })
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import('jspdf'),
        import('html2canvas'),
      ])
      const canvas = await html2canvas(reportRef.current, { scale: 2, backgroundColor: '#ffffff' })
      const img = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const w = pdf.internal.pageSize.getWidth()
      const h = (canvas.height * w) / canvas.width
      pdf.addImage(img, 'PNG', 0, 0, w, h)
      pdf.save(`goodseed-report-${period}.pdf`)
      toast({ title: 'PDF exported!', emoji: '📑' })
    } catch (e) {
      console.error(e)
      toast({ title: 'PDF export failed', message: 'Try the CSV export instead.', type: 'error' })
    }
  }

  return (
    <div>
      <PageHeader
        title="Family Reports"
        subtitle="Track progress and celebrate achievements"
        actions={
          <>
            <Select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-44">
              <option value="this_week">This Week</option>
              <option value="last_week">Last Week</option>
              <option value="this_month">This Month</option>
              <option value="last_3_months">Last 3 Months</option>
              <option value="this_year">This Year</option>
            </Select>
            <Button variant="secondary" onClick={exportPDF}><FileText className="h-4 w-4" /> PDF</Button>
            <Button variant="secondary" onClick={exportCSV}><Download className="h-4 w-4" /> CSV</Button>
          </>
        }
      />
      <p className="mb-4 text-sm text-gray-400">{formatDate(start)} – {formatDate(end)}</p>

      <div ref={reportRef} className="space-y-5 rounded-xl bg-seed-50 p-1 dark:bg-transparent">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryCard icon={CheckSquare} tone="green" label="Tasks Completed" value={tasksCompleted} />
          <SummaryCard icon={Sprout} tone="green" label="Seeds Earned" value={seedsEarned} />
          <SummaryCard icon={UsersIcon} tone="blue" label="Active Children" value={activeChildren} />
          <SummaryCard icon={Target} tone="purple" label="Active Goals" value={activeGoals} />
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <ChartCard title="Individual Contributions (seeds)">
            {contributions.some((c) => c.seeds > 0) ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={contributions}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="seeds" name="Seeds earned" radius={[6, 6, 0, 0]}>
                    {contributions.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </ChartCard>

          <ChartCard title="Tasks by Category">
            {byCategory.length ? (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={byCategory} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                  <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {byCategory.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <NoData />}
          </ChartCard>
        </div>

        <ChartCard title="Activity Timeline">
          {timeline.some((t) => t.count > 0) ? (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="count" name="Seeds Earned" stroke="#16a34a" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <NoData />}
        </ChartCard>

        <Card className="p-5">
          <Tabs
            tabs={[{ value: 'children', label: 'Children Details' }, { value: 'goals', label: 'Goals Progress' }]}
            value={tableTab}
            onChange={setTableTab}
            className="mb-4"
          />
          {tableTab === 'children' ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-left text-xs uppercase text-gray-400 dark:border-gray-800">
                    <th className="py-2">Child</th><th className="py-2">Tasks</th><th className="py-2">Seeds Earned</th><th className="py-2">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map((c, i) => (
                    <tr key={c.id} className="border-b border-gray-50 dark:border-gray-800/50">
                      <td className="py-2.5"><div className="flex items-center gap-2"><Avatar user={c} size="xs" /><span className="font-medium text-gray-800 dark:text-gray-200">{c.full_name}</span></div></td>
                      <td className="py-2.5">{contributions[i]?.tasks || 0}</td>
                      <td className="py-2.5"><span className="font-semibold text-seed-600">+{contributions[i]?.seeds || 0} 🌱</span></td>
                      <td className="py-2.5">🌱 {c.seed_balance || 0}</td>
                    </tr>
                  ))}
                  {children.length === 0 && <tr><td colSpan={4} className="py-4 text-center text-gray-400">No children yet.</td></tr>}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="space-y-3">
              {goals.filter((g) => g.family_id === user?.family_id).map((g) => {
                const pct = g.target_seeds ? Math.round((g.current_seeds / g.target_seeds) * 100) : 0
                return (
                  <div key={g.id}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-800 dark:text-gray-200">{g.title}</span>
                      <span className="text-gray-400">{g.current_seeds}/{g.target_seeds} · {g.status === 'completed' ? '✅' : `${pct}%`}</span>
                    </div>
                    <ProgressBar value={pct} />
                  </div>
                )
              })}
              {goals.filter((g) => g.family_id === user?.family_id).length === 0 && <p className="text-center text-sm text-gray-400">No goals yet.</p>}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function SummaryCard({ icon: Icon, label, value, tone }) {
  const tones = { green: 'text-seed-600 bg-seed-100 dark:bg-seed-900/40', blue: 'text-blue-600 bg-blue-100 dark:bg-blue-900/40', purple: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40' }
  return (
    <Card className="flex items-center gap-3 p-4">
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${tones[tone]}`}><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{value}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </Card>
  )
}

function ChartCard({ title, children }) {
  return (
    <Card className="p-5">
      <h3 className="mb-3 font-bold text-gray-900 dark:text-gray-100">{title}</h3>
      {children}
    </Card>
  )
}

function NoData() {
  return <div className="flex h-[240px] items-center justify-center text-sm text-gray-400">No data yet for this period.</div>
}
