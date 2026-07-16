import { useEffect, useState, useCallback } from 'react'
import { Sprout, RefreshCw, LogOut, Gift, XCircle, Plus } from 'lucide-react'
import { Card, Button, Input, Label, Badge, Dialog } from '@/components/ui'
import { supabase } from '@/lib/supabase'
import { ensureSession } from '@/lib/sync'
import { GROUP_TYPES } from '@/lib/plan'
import { toast } from '@/lib/toast'

/**
 * Owner console — not linked from any nav; reachable only at /Admin with the
 * owner's admin key. All data & mutations go through the admin-api edge
 * function, which verifies the key server-side and runs with service role.
 * Shows only cloud-synced accounts (Plus families + Teams groups/trials);
 * free single-device families never leave their device by design.
 */
const KEY_STORAGE = 'goodseed_admin_key'

async function adminCall(key, body) {
  await ensureSession()
  const { data, error } = await supabase.functions.invoke('admin-api', {
    body,
    headers: { 'x-admin-key': key },
  })
  if (error) {
    let msg = error.message
    try {
      const ctx = await error.context?.json()
      if (ctx?.error) msg = ctx.error
    } catch { /* keep original message */ }
    throw new Error(msg)
  }
  if (data?.error) throw new Error(data.error)
  return data
}

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem(KEY_STORAGE) || '')
  const [draft, setDraft] = useState('')
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [granting, setGranting] = useState(null) // family row being comped

  const refresh = useCallback(async (k = key) => {
    if (!k) return
    setBusy(true)
    setError('')
    try {
      const res = await adminCall(k, { action: 'overview' })
      setData(res)
      sessionStorage.setItem(KEY_STORAGE, k)
      setKey(k)
    } catch (e) {
      setError(String(e.message || e))
      if (/unauthorized/i.test(String(e))) {
        sessionStorage.removeItem(KEY_STORAGE)
        setKey('')
        setData(null)
      }
    } finally {
      setBusy(false)
    }
  }, [key])

  useEffect(() => {
    if (key) refresh(key)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function revoke(f) {
    if (!confirm(`Remove the comped plan from "${f.name}"? They drop back to Free at once.`)) return
    setBusy(true)
    try {
      await adminCall(key, { action: 'revoke', family_id: f.family_id })
      await refresh()
    } catch (e) {
      setError(String(e.message || e))
      setBusy(false)
    }
  }

  function signOut() {
    sessionStorage.removeItem(KEY_STORAGE)
    setKey('')
    setData(null)
  }

  if (!key || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 px-4">
        <Card className="w-full max-w-sm p-6 dark:bg-gray-900">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-seed-600 text-white"><Sprout className="h-5 w-5" /></div>
            <div>
              <p className="font-extrabold text-gray-900 dark:text-gray-100">GoodSeed Owner Console</p>
              <p className="text-xs text-gray-400">Authorized access only</p>
            </div>
          </div>
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); refresh(draft.trim()) }} className="space-y-3">
            <div>
              <Label>Admin key</Label>
              <Input type="password" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="gsk_…" autoFocus />
            </div>
            <Button type="submit" className="w-full" disabled={!draft.trim() || busy}>{busy ? 'Checking…' : 'Open console'}</Button>
          </form>
        </Card>
      </div>
    )
  }

  const { stats, families, waitlist } = data
  const groups = families.filter((f) => f.kind === 'group')
  const fams = families.filter((f) => f.kind === 'family')

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8 dark:bg-gray-950 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-seed-600 text-white"><Sprout className="h-6 w-6" /></div>
            <div>
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-gray-100">Owner Console</h1>
              <p className="text-xs text-gray-400">Cloud-synced accounts only — free single-device families stay on-device by design.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => refresh()} disabled={busy}><RefreshCw className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} /> Refresh</Button>
            <Button variant="outline" onClick={signOut}><LogOut className="h-4 w-4" /> Lock</Button>
          </div>
        </div>

        {error && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-300">{error}</p>}

        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            ['Est. MRR', `$${stats.est_mrr.toFixed(2)}`],
            ['Active subs', stats.active_subs],
            ['Comped', stats.comped_subs],
            ['Families', stats.families],
            ['Groups', stats.groups],
            ['Kids', stats.kids],
            ['Devices', stats.devices],
            ['Orgs', stats.orgs ?? 0],
            ['Waitlist', stats.waitlist],
          ].map(([label, value]) => (
            <Card key={label} className="p-4 text-center">
              <p className="text-2xl font-extrabold text-gray-900 dark:text-gray-100">{value}</p>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            </Card>
          ))}
        </div>

        <Section title={`Organizations (${(data.organizations || []).length})`}>
          <OrgTable
            orgs={data.organizations || []}
            onCreate={async (name, days, cap) => {
              setBusy(true)
              try {
                const r = await adminCall(key, { action: 'create_org', name, days, group_cap: cap || null })
                await refresh()
                return r.code
              } catch (e) {
                setError(String(e.message || e)); setBusy(false); return null
              }
            }}
            onRevoke={async (org) => {
              if (!confirm(`End ${org.name}'s coverage? Every group they cover drops to free immediately.`)) return
              setBusy(true)
              try { await adminCall(key, { action: 'revoke_org', org_id: org.id }); await refresh() }
              catch (e) { setError(String(e.message || e)); setBusy(false) }
            }}
          />
        </Section>

        <Section title={`Teams & Classrooms (${groups.length})`}>
          <AccountTable rows={groups} onGrant={setGranting} onRevoke={revoke} isGroup />
        </Section>
        <Section title={`Families (${fams.length})`}>
          <AccountTable rows={fams} onGrant={setGranting} onRevoke={revoke} />
        </Section>
        <Section title={`Teams waitlist (${waitlist.length})`}>
          {waitlist.length === 0 ? (
            <p className="text-sm text-gray-400">No signups yet.</p>
          ) : (
            <Card className="divide-y divide-gray-100 dark:divide-gray-800">
              {waitlist.map((w, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="capitalize text-gray-600 dark:text-gray-300">{w.role || 'unknown'}</span>
                  <span className="text-gray-400">{new Date(w.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </Card>
          )}
        </Section>

        <GrantDialog
          row={granting}
          onClose={() => setGranting(null)}
          onGrant={async (plan, days) => {
            setBusy(true)
            try {
              await adminCall(key, { action: 'grant', family_id: granting.family_id, plan, days })
              setGranting(null)
              await refresh()
            } catch (e) {
              setError(String(e.message || e))
              setBusy(false)
            }
          }}
        />
      </div>
    </div>
  )
}

// Organizations: an invoiced church/school/YMCA deal. You create it here, hand
// the code to their administrator, and every leader who enters it is covered.
function OrgTable({ orgs, onCreate, onRevoke }) {
  const [name, setName] = useState('')
  const [days, setDays] = useState('365')
  const [cap, setCap] = useState('')
  const [newCode, setNewCode] = useState(null)

  async function create() {
    if (!name.trim()) return
    const code = await onCreate(name.trim(), parseInt(days, 10) || 365, cap ? parseInt(cap, 10) : null)
    if (code) { setNewCode({ code, name: name.trim() }); setName(''); setCap('') }
  }

  return (
    <>
      <Card className="mb-3 p-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <Label>Organization name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Grace Church" />
          </div>
          <div className="w-24">
            <Label>Days</Label>
            <Input type="number" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <div className="w-28">
            <Label>Group cap</Label>
            <Input type="number" value={cap} onChange={(e) => setCap(e.target.value)} placeholder="∞" />
          </div>
          <Button onClick={create} disabled={!name.trim()}><Plus className="h-4 w-4" /> Create org</Button>
        </div>
        {newCode && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border-2 border-seed-500 bg-seed-50 p-3 dark:bg-seed-900/30">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-seed-700 dark:text-seed-400">{newCode.name}'s code</p>
              <p className="font-mono text-2xl font-black tracking-widest text-seed-800 dark:text-seed-200">{newCode.code}</p>
            </div>
            <Button size="sm" variant="secondary" onClick={() => { navigator.clipboard?.writeText(newCode.code); toast({ title: 'Code copied', message: 'Send it to their administrator.', emoji: '📋' }) }}>
              Copy
            </Button>
            <p className="text-xs text-gray-500">Their leaders enter this in Settings — every group they run is covered, free to them.</p>
          </div>
        )}
      </Card>

      {orgs.length === 0 ? (
        <p className="text-sm text-gray-400">No organizations yet. Create one when you land a church or school deal.</p>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
                <th className="px-4 py-2.5">Organization</th>
                <th className="px-4 py-2.5">Code</th>
                <th className="px-4 py-2.5">Groups</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Renews</th>
                <th className="px-4 py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
              {orgs.map((o) => (
                <tr key={o.id}>
                  <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{o.name}</td>
                  <td className="px-4 py-2.5">
                    <button onClick={() => { navigator.clipboard?.writeText(o.code); toast({ title: 'Code copied', emoji: '📋' }) }}
                      className="rounded bg-gray-100 px-2 py-1 font-mono text-xs font-bold tracking-wider hover:bg-gray-200 dark:bg-gray-800">
                      {o.code}
                    </button>
                  </td>
                  <td className="px-4 py-2.5">{o.groups_covered}{o.group_cap ? ` / ${o.group_cap}` : ''}</td>
                  <td className="px-4 py-2.5">
                    {o.revoked ? <Badge variant="gray">ended</Badge>
                      : o.expired ? <Badge className="bg-red-100 text-red-700">expired</Badge>
                      : <Badge variant="green">active</Badge>}
                  </td>
                  <td className="px-4 py-2.5 text-gray-400">{new Date(o.active_until).toLocaleDateString()}</td>
                  <td className="px-4 py-2.5 text-right">
                    {!o.revoked && (
                      <Button size="sm" variant="outline" className="border-red-200 text-red-600" onClick={() => onRevoke(o)}>
                        <XCircle className="h-3.5 w-3.5" /> End
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  )
}

function Section({ title, children }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </div>
  )
}

function planBadge(f) {
  const sub = f.sub
  const active = sub && (sub.status === 'active' || sub.status === 'trialing') &&
    (!sub.current_period_end || new Date(sub.current_period_end) > new Date())
  if (active && sub.comped) return <Badge className="bg-purple-100 text-purple-700">Comped {sub.plan} · to {new Date(sub.current_period_end).toLocaleDateString()}</Badge>
  if (active) return <Badge variant="green">{sub.plan} · paid</Badge>
  if (f.kind === 'group') return <Badge variant="gray">trial / free</Badge>
  return <Badge variant="gray">free</Badge>
}

function AccountTable({ rows, onGrant, onRevoke, isGroup = false }) {
  if (rows.length === 0) return <p className="text-sm text-gray-400">None yet.</p>
  return (
    <Card className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs uppercase tracking-wide text-gray-400 dark:border-gray-800">
            <th className="px-4 py-2.5">Name</th>
            {isGroup && <th className="px-4 py-2.5">Type</th>}
            <th className="px-4 py-2.5">{isGroup ? 'Kids' : 'Children'}</th>
            <th className="px-4 py-2.5">{isGroup ? 'Leaders' : 'Parents'}</th>
            <th className="px-4 py-2.5">Devices</th>
            <th className="px-4 py-2.5">Plan</th>
            <th className="px-4 py-2.5">Last active</th>
            <th className="px-4 py-2.5 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
          {rows.map((f) => (
            <tr key={f.family_id}>
              <td className="px-4 py-2.5 font-semibold text-gray-900 dark:text-gray-100">{f.name}</td>
              {isGroup && (
                <td className="px-4 py-2.5 text-gray-500">
                  {(GROUP_TYPES.find((t) => t.id === f.group_type) || {}).label || '—'}
                </td>
              )}
              <td className="px-4 py-2.5">{f.kids}</td>
              <td className="px-4 py-2.5">{f.leaders}</td>
              <td className="px-4 py-2.5">{f.devices}</td>
              <td className="px-4 py-2.5">{planBadge(f)}</td>
              <td className="px-4 py-2.5 text-gray-400">{f.last_active ? new Date(f.last_active).toLocaleDateString() : '—'}</td>
              <td className="px-4 py-2.5 text-right">
                {(() => {
                  const compActive =
                    f.sub?.comped &&
                    (f.sub.status === 'active' || f.sub.status === 'trialing') &&
                    (!f.sub.current_period_end || new Date(f.sub.current_period_end) > new Date())
                  if (compActive)
                    return (
                      <Button size="sm" variant="outline" onClick={() => onRevoke(f)} className="border-red-200 text-red-600">
                        <XCircle className="h-3.5 w-3.5" /> End comp
                      </Button>
                    )
                  if (f.sub?.stripe_subscription_id)
                    return <span className="text-xs text-gray-400">managed by Stripe</span>
                  return (
                    <Button size="sm" variant="secondary" onClick={() => onGrant(f)}>
                      <Gift className="h-3.5 w-3.5" /> Comp
                    </Button>
                  )
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}

function GrantDialog({ row, onClose, onGrant }) {
  const [days, setDays] = useState('30')
  if (!row) return null
  const plan = row.kind === 'group' ? 'teams' : 'plus'
  return (
    <Dialog
      open={!!row}
      onClose={onClose}
      title={`Comp ${row.name}`}
      description={`Grants the ${plan === 'teams' ? 'Teams' : 'Plus'} plan free — everything unlocked, no card. It expires automatically.`}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onGrant(plan, Math.max(1, parseInt(days, 10) || 30))}>
            <Gift className="h-4 w-4" /> Grant {days || 30} days
          </Button>
        </>
      }
    >
      <div className="flex items-end gap-3">
        <div className="w-28">
          <Label>Days</Label>
          <Input type="number" min="1" max="365" value={days} onChange={(e) => setDays(e.target.value)} />
        </div>
        <div className="flex gap-2 pb-0.5">
          {[30, 60, 90].map((d) => (
            <button key={d} onClick={() => setDays(String(d))} className={`rounded-full px-3 py-1.5 text-sm font-semibold ${String(d) === days ? 'bg-seed-600 text-white' : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  )
}
