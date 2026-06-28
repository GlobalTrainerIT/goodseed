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
  return currentChildCount < planOf(family).maxChildren
}

/** Whether a co-parent may join (Plus only). */
export function canAddCoParent(family) {
  return isPlus(family)
}
