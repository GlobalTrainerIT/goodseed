// Faith framework: the Fruit of the Spirit as an awardable values set, and a
// "growing tree" arc of level ranks (Psalm 1:3 — "like a tree planted by
// streams of water… which yields its fruit in season").

// Galatians 5:22–23. Used as a one-tap behavior pack for groups and as the
// vocabulary of GoodSeed's character system.
export const FRUIT_OF_SPIRIT = [
  { id: 'love', label: '❤️ Love', amount: 2 },
  { id: 'joy', label: '😊 Joy', amount: 2 },
  { id: 'peace', label: '🕊️ Peace', amount: 2 },
  { id: 'patience', label: '⏳ Patience', amount: 2 },
  { id: 'kindness', label: '🤝 Kindness', amount: 2 },
  { id: 'goodness', label: '🌟 Goodness', amount: 2 },
  { id: 'faithfulness', label: '🙏 Faithfulness', amount: 2 },
  { id: 'gentleness', label: '🌸 Gentleness', amount: 2 },
  { id: 'selfcontrol', label: '🛑 Self-Control', amount: 2 },
]

// Level → rank name. A child grows from a seed into a fruitful tree.
const RANKS = [
  { min: 1, name: 'Seed', emoji: '🌱' },
  { min: 2, name: 'Sprout', emoji: '🌿' },
  { min: 4, name: 'Sapling', emoji: '🪴' },
  { min: 7, name: 'Young Tree', emoji: '🌲' },
  { min: 11, name: 'Rooted', emoji: '🌳' },
  { min: 16, name: 'Flourishing', emoji: '🌳' },
  { min: 23, name: 'Fruitful', emoji: '🍎' },
  { min: 31, name: 'Mighty Oak', emoji: '🌳✨' },
]

export function levelRank(level = 1) {
  let rank = RANKS[0]
  for (const r of RANKS) if (level >= r.min) rank = r
  return rank
}

// True when going from oldLevel→newLevel crosses into a new rank tier.
export function crossedRank(oldLevel, newLevel) {
  return levelRank(oldLevel).name !== levelRank(newLevel).name
}
