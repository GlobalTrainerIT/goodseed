/**
 * Subscription plans. A family is either on Free or Plus.
 *
 * Free:  1 parent, up to 2 children, single device (no cloud sync).
 * Plus:  unlimited children, co-parents, and multi-device cloud sync.
 *
 * The plan lives on the family record (`family.plan`). Until Stripe is wired up
 * (Phase B), it's set locally; afterwards the Stripe webhook makes it
 * server-authoritative via the `subscriptions` table so it can't be faked.
 */
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    price: '$0',
    maxChildren: 2,
    maxParents: 1,
    sync: false,
    features: ['1 parent', 'Up to 2 children', 'Tasks, rewards & seeds', 'Works on one device', 'Backup & restore'],
  },
  plus: {
    id: 'plus',
    name: 'Plus',
    price: '$4.99/mo',
    maxChildren: Infinity,
    maxParents: Infinity,
    sync: true,
    features: [
      'Unlimited children',
      'Both parents on their own devices',
      'Real-time multi-device sync',
      'Kids on their own tablets/devices',
      'Everything in Free',
    ],
  },
}

// ---- Groups (Teams & Classrooms) -------------------------------------------
// A classroom/team/daycare group reuses the family engine: `family.kind` is
// 'group' and `family.group_type` says what flavor. Groups run on the Teams
// plan; new groups get a 30-day free trial with everything unlocked.

export const GROUP_TYPES = [
  { id: 'class', label: 'Classroom', emoji: '📚' },
  { id: 'team', label: 'Sports team', emoji: '🏀' },
  { id: 'daycare', label: 'Daycare / after-school', emoji: '🧸' },
  { id: 'church', label: 'Church / youth group', emoji: '⛪' },
  { id: 'other', label: 'Other group', emoji: '🌟' },
]

export const TEAMS_PLAN = {
  id: 'teams',
  name: 'Teams',
  price: '$12.99/mo or $99/yr',
  trialDays: 30,
}

export function isGroup(family) {
  return family?.kind === 'group'
}

export function groupTypeOf(family) {
  return GROUP_TYPES.find((t) => t.id === family?.group_type) || GROUP_TYPES[4]
}

/** Days of trial remaining (0 when expired; null for non-groups). */
export function trialDaysLeft(family) {
  if (!isGroup(family)) return null
  const started = new Date(family.created_at || Date.now()).getTime()
  const ends = started + TEAMS_PLAN.trialDays * 24 * 60 * 60 * 1000
  return Math.max(0, Math.ceil((ends - Date.now()) / (24 * 60 * 60 * 1000)))
}

/** A group is active on the paid Teams plan or still inside its trial. */
export function teamsActive(family) {
  if (!isGroup(family)) return false
  return family.plan === 'teams' || trialDaysLeft(family) > 0
}

export function familyPlan(family) {
  return family?.plan === 'plus' ? 'plus' : 'free'
}

export function isPlus(family) {
  return familyPlan(family) === 'plus'
}

export function planOf(family) {
  return PLANS[familyPlan(family)]
}

/** Whether another child may be added under the family's current plan. */
export function canAddChild(family, currentChildCount) {
  if (isGroup(family)) return teamsActive(family) // unlimited roster while Teams/trial is active
  return currentChildCount < planOf(family).maxChildren
}

/** Whether a co-parent may join (Plus only). */
export function canAddCoParent(family) {
  return isPlus(family)
}
