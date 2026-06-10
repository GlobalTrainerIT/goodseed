import { BookOpen } from 'lucide-react'
import { Card, Badge } from '@/components/ui'
import { getVerseForDate } from '@/lib/verses'
import { formatDate } from '@/lib/utils'

export default function BibleVerseCard() {
  const verse = getVerseForDate(new Date())
  return (
    <Card className="overflow-hidden border-seed-100 bg-gradient-to-br from-seed-50 to-white dark:border-seed-900/50 dark:from-seed-900/20 dark:to-gray-900">
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-seed-700 dark:text-seed-300">
            <BookOpen className="h-5 w-5" />
            <span className="text-sm font-bold uppercase tracking-wide">Verse of the Day</span>
          </div>
          <span className="text-xs text-gray-400">{formatDate(new Date())}</span>
        </div>
        <p className="text-lg font-medium leading-relaxed text-gray-800 dark:text-gray-100">"{verse.verse_text}"</p>
        <div className="mt-3 flex items-center gap-2">
          <Badge variant="green">{verse.reference}</Badge>
          <Badge variant="gray">{verse.translation}</Badge>
        </div>
      </div>
    </Card>
  )
}
