// The Bible journey: a long-horizon path of story milestones a child travels as
// their lifetime good work (total_seeds_earned) grows. Each stop unlocks at a
// seed threshold. Blurbs are short, kid-friendly paraphrases (not verbatim
// scripture) with a reference to look up.

export const JOURNEY_STOPS = [
  { id: 'creation', threshold: 0, emoji: '🌍', name: 'Creation', ref: 'Genesis 1', blurb: 'In the beginning, God made the whole world — and it was good.' },
  { id: 'noah', threshold: 25, emoji: '🌈', name: "Noah's Ark", ref: 'Genesis 6–9', blurb: 'Noah trusted God, and the rainbow became a promise.' },
  { id: 'abraham', threshold: 60, emoji: '⭐', name: "Abraham's Promise", ref: 'Genesis 15', blurb: 'God promised Abraham a family as countless as the stars.' },
  { id: 'joseph', threshold: 110, emoji: '🧥', name: "Joseph's Coat", ref: 'Genesis 37', blurb: "God turned Joseph's hard road into rescue for many." },
  { id: 'redsea', threshold: 180, emoji: '🌊', name: 'The Red Sea', ref: 'Exodus 14', blurb: 'God parted the sea and led His people to freedom.' },
  { id: 'commandments', threshold: 270, emoji: '📜', name: 'Ten Commandments', ref: 'Exodus 20', blurb: 'God gave good rules to help us love Him and others.' },
  { id: 'jericho', threshold: 380, emoji: '🎺', name: 'Walls of Jericho', ref: 'Joshua 6', blurb: 'The people trusted God, and the walls came down.' },
  { id: 'david', threshold: 520, emoji: '🪨', name: 'David & Goliath', ref: '1 Samuel 17', blurb: 'Young David was brave because God was with him.' },
  { id: 'daniel', threshold: 700, emoji: '🦁', name: 'Daniel & the Lions', ref: 'Daniel 6', blurb: 'Daniel kept praying, and God kept him safe.' },
  { id: 'jonah', threshold: 920, emoji: '🐋', name: 'Jonah & the Whale', ref: 'Jonah 1–2', blurb: 'God gave Jonah a second chance to obey.' },
  { id: 'nativity', threshold: 1200, emoji: '👶', name: 'Jesus is Born', ref: 'Luke 2', blurb: 'God sent His Son — good news of great joy!' },
  { id: 'resurrection', threshold: 1600, emoji: '✝️', name: 'The Empty Tomb', ref: 'Matthew 28', blurb: 'Jesus is alive! The greatest story of all.' },
]

export const JOURNEY_FINAL = JOURNEY_STOPS[JOURNEY_STOPS.length - 1].threshold

/** Where a child is on the journey, given lifetime seeds earned. */
export function journeyProgress(total = 0) {
  let currentIdx = 0
  for (let i = 0; i < JOURNEY_STOPS.length; i++) {
    if (total >= JOURNEY_STOPS[i].threshold) currentIdx = i
  }
  const current = JOURNEY_STOPS[currentIdx]
  const next = JOURNEY_STOPS[currentIdx + 1] || null
  const span = next ? next.threshold - current.threshold : 1
  const into = next ? total - current.threshold : 1
  return {
    current,
    currentIdx,
    next,
    reachedCount: currentIdx + 1,
    total: JOURNEY_STOPS.length,
    pctToNext: next ? Math.max(0, Math.min(100, Math.round((into / span) * 100))) : 100,
    toNext: next ? Math.max(0, next.threshold - total) : 0,
    complete: !next,
  }
}
