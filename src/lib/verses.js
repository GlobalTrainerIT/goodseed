import { getDayOfYear } from 'date-fns'

/**
 * Curated, encouraging verses focused on hard work, kindness, family,
 * perseverance, gratitude, and faith.
 */
export const VERSES = [
  { verse_text: 'I can do all things through Christ who strengthens me.', reference: 'Philippians 4:13', translation: 'NIV' },
  { verse_text: 'Start children off on the way they should go, and even when they are old they will not turn from it.', reference: 'Proverbs 22:6', translation: 'NIV' },
  { verse_text: 'Whatever you do, work at it with all your heart, as working for the Lord.', reference: 'Colossians 3:23', translation: 'NIV' },
  { verse_text: 'Children, obey your parents in the Lord, for this is right.', reference: 'Ephesians 6:1', translation: 'NIV' },
  { verse_text: 'A friend loves at all times, and a brother is born for a time of adversity.', reference: 'Proverbs 17:17', translation: 'NIV' },
  { verse_text: 'Let us not become weary in doing good, for at the proper time we will reap a harvest if we do not give up.', reference: 'Galatians 6:9', translation: 'NIV' },
  { verse_text: 'Be strong and courageous. Do not be afraid; the Lord your God will be with you wherever you go.', reference: 'Joshua 1:9', translation: 'NIV' },
  { verse_text: 'Do everything in love.', reference: '1 Corinthians 16:14', translation: 'NIV' },
  { verse_text: 'Let your light shine before others, that they may see your good deeds and glorify your Father in heaven.', reference: 'Matthew 5:16', translation: 'NIV' },
  { verse_text: 'Children are a heritage from the Lord, offspring a reward from him.', reference: 'Psalm 127:3', translation: 'NIV' },
  { verse_text: 'Be kind and compassionate to one another, forgiving each other.', reference: 'Ephesians 4:32', translation: 'NIV' },
  { verse_text: 'Give thanks in all circumstances; for this is God’s will for you.', reference: '1 Thessalonians 5:18', translation: 'NIV' },
  { verse_text: 'And we know that in all things God works for the good of those who love him.', reference: 'Romans 8:28', translation: 'NIV' },
  { verse_text: 'Trust in the Lord with all your heart and lean not on your own understanding.', reference: 'Proverbs 3:5', translation: 'NIV' },
  { verse_text: 'The Lord is my shepherd, I lack nothing.', reference: 'Psalm 23:1', translation: 'NIV' },
  { verse_text: 'Love is patient, love is kind. It does not envy, it does not boast.', reference: '1 Corinthians 13:4', translation: 'NIV' },
  { verse_text: 'Therefore encourage one another and build each other up.', reference: '1 Thessalonians 5:11', translation: 'NIV' },
  { verse_text: 'She is clothed with strength and dignity; she can laugh at the days to come.', reference: 'Proverbs 31:25', translation: 'NIV' },
  { verse_text: 'But the fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness.', reference: 'Galatians 5:22', translation: 'NIV' },
  { verse_text: 'Commit to the Lord whatever you do, and he will establish your plans.', reference: 'Proverbs 16:3', translation: 'NIV' },
  { verse_text: 'Do to others as you would have them do to you.', reference: 'Luke 6:31', translation: 'NIV' },
  { verse_text: 'The plans of the diligent lead to profit as surely as haste leads to poverty.', reference: 'Proverbs 21:5', translation: 'NIV' },
  { verse_text: 'Each of you should use whatever gift you have received to serve others.', reference: '1 Peter 4:10', translation: 'NIV' },
  { verse_text: 'A generous person will prosper; whoever refreshes others will be refreshed.', reference: 'Proverbs 11:25', translation: 'NIV' },
  { verse_text: 'Carry each other’s burdens, and in this way you will fulfill the law of Christ.', reference: 'Galatians 6:2', translation: 'NIV' },
  { verse_text: 'Let everything that has breath praise the Lord.', reference: 'Psalm 150:6', translation: 'NIV' },
  { verse_text: 'Above all, love each other deeply, because love covers over a multitude of sins.', reference: '1 Peter 4:8', translation: 'NIV' },
  { verse_text: 'I praise you because I am fearfully and wonderfully made.', reference: 'Psalm 139:14', translation: 'NIV' },
  { verse_text: 'But those who hope in the Lord will renew their strength. They will soar on wings like eagles.', reference: 'Isaiah 40:31', translation: 'NIV' },
  { verse_text: 'Pleasant words are a honeycomb, sweet to the soul and healing to the bones.', reference: 'Proverbs 16:24', translation: 'NIV' },
  { verse_text: 'Be completely humble and gentle; be patient, bearing with one another in love.', reference: 'Ephesians 4:2', translation: 'NIV' },
  { verse_text: 'A cheerful heart is good medicine.', reference: 'Proverbs 17:22', translation: 'NIV' },
  { verse_text: 'Whoever is kind to the poor lends to the Lord.', reference: 'Proverbs 19:17', translation: 'NIV' },
  { verse_text: 'Therefore, my dear brothers and sisters, stand firm. Let nothing move you.', reference: '1 Corinthians 15:58', translation: 'NIV' },
  { verse_text: 'For God gave us a spirit not of fear but of power and love and self-control.', reference: '2 Timothy 1:7', translation: 'NIV' },
  { verse_text: 'Cast all your anxiety on him because he cares for you.', reference: '1 Peter 5:7', translation: 'NIV' },
  { verse_text: 'The Lord your God is with you, the Mighty Warrior who saves.', reference: 'Zephaniah 3:17', translation: 'NIV' },
  { verse_text: 'Let us consider how we may spur one another on toward love and good deeds.', reference: 'Hebrews 10:24', translation: 'NIV' },
  { verse_text: 'Whoever sows generously will also reap generously.', reference: '2 Corinthians 9:6', translation: 'NIV' },
  { verse_text: 'A gentle answer turns away wrath, but a harsh word stirs up anger.', reference: 'Proverbs 15:1', translation: 'NIV' },
  { verse_text: 'Rejoice always, pray continually, give thanks in all circumstances.', reference: '1 Thessalonians 5:16-18', translation: 'NIV' },
  { verse_text: 'How good and pleasant it is when God’s people live together in unity!', reference: 'Psalm 133:1', translation: 'NIV' },
  { verse_text: 'In their hearts humans plan their course, but the Lord establishes their steps.', reference: 'Proverbs 16:9', translation: 'NIV' },
  { verse_text: 'Therefore, as God’s chosen people, clothe yourselves with compassion and kindness.', reference: 'Colossians 3:12', translation: 'NIV' },
  { verse_text: 'Whatever is true, whatever is noble, whatever is right — think about such things.', reference: 'Philippians 4:8', translation: 'NIV' },
  { verse_text: 'The righteous person may have many troubles, but the Lord delivers him from them all.', reference: 'Psalm 34:19', translation: 'NIV' },
  { verse_text: 'Honor your father and your mother, so that you may live long.', reference: 'Exodus 20:12', translation: 'NIV' },
  { verse_text: 'Now faith is confidence in what we hope for and assurance about what we do not see.', reference: 'Hebrews 11:1', translation: 'NIV' },
  { verse_text: 'This is the day the Lord has made; let us rejoice and be glad in it.', reference: 'Psalm 118:24', translation: 'NIV' },
  { verse_text: 'Be devoted to one another in love. Honor one another above yourselves.', reference: 'Romans 12:10', translation: 'NIV' },
]

export function getVerseForDate(date = new Date()) {
  const idx = getDayOfYear(date) % VERSES.length
  return { ...VERSES[idx], date: date.toISOString() }
}
