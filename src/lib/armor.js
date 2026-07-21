// The Armor of God (Ephesians 6:14–18) as a daily collectible set. A child puts
// on one piece per day (a daily devotion habit); collecting all seven completes
// a full suit of armor, which awards a bonus and starts a new suit at a higher
// tier. Kid-friendly one-liners paraphrase each piece rather than quoting a
// copyrighted translation verbatim.

export const ARMOR = [
  { id: 'belt', label: 'Belt of Truth', emoji: '🥋', ref: 'Ephesians 6:14', kid: 'Be honest and true.' },
  { id: 'breastplate', label: 'Breastplate of Righteousness', emoji: '🦺', ref: 'Ephesians 6:14', kid: 'Do what is right.' },
  { id: 'shoes', label: 'Shoes of Peace', emoji: '👟', ref: 'Ephesians 6:15', kid: 'Be a peacemaker.' },
  { id: 'shield', label: 'Shield of Faith', emoji: '🛡️', ref: 'Ephesians 6:16', kid: 'Trust God, even when it’s hard.' },
  { id: 'helmet', label: 'Helmet of Salvation', emoji: '⛑️', ref: 'Ephesians 6:17', kid: 'Remember you are saved and loved.' },
  { id: 'sword', label: 'Sword of the Spirit', emoji: '⚔️', ref: 'Ephesians 6:17', kid: 'Read and remember God’s Word.' },
  { id: 'prayer', label: 'Prayer', emoji: '🙏', ref: 'Ephesians 6:18', kid: 'Talk to God about everything.' },
]

export const ARMOR_SIZE = ARMOR.length

// Bonus for completing a full suit — grows a little each time so a child is
// rewarded for keeping the armor on, week after week.
export function armorSuitBonus(suitNumber) {
  return Math.min(15 + (Math.max(1, suitNumber) - 1) * 5, 40)
}

// Visual tier for how many full suits a child has completed. Gives the armor a
// sense of "leveling up" as the habit sticks.
const TIERS = [
  { min: 0, name: 'Bronze', emoji: '🥉' },
  { min: 1, name: 'Silver', emoji: '🥈' },
  { min: 3, name: 'Gold', emoji: '🥇' },
  { min: 6, name: 'Champion', emoji: '👑' },
]

export function armorTier(suitsCompleted = 0) {
  let tier = TIERS[0]
  for (const t of TIERS) if (suitsCompleted >= t.min) tier = t
  return tier
}
