import { useRef, useState } from 'react'
import { Camera, X } from 'lucide-react'
import { Label } from '@/components/ui'
import Avatar from './Avatar'
import { EmojiPicker, ColorPicker } from './EmojiPicker'
import { AVATAR_EMOJIS, AVATAR_COLORS } from '@/lib/constants'
import { fileToDataUrl } from '@/lib/utils'

/**
 * Shared avatar editing block: live preview, photo upload (downscaled),
 * emoji picker, and background color. Controlled via `value` + `onChange`
 * ({ emoji, color, photo }).
 */
export default function AvatarEditor({ value, onChange }) {
  const fileRef = useRef(null)
  const [processing, setProcessing] = useState(false)
  const { emoji, color, photo } = value

  async function pickPhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setProcessing(true)
    const url = await fileToDataUrl(file, 192, 0.8)
    setProcessing(false)
    if (url) onChange({ ...value, photo: url })
    e.target.value = ''
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-center gap-4">
        <Avatar user={{ avatar_emoji: emoji, avatar_bg_color: color, avatar_photo: photo }} size="xl" />
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-800"
          >
            <Camera className="h-4 w-4" /> {processing ? 'Processing…' : photo ? 'Change photo' : 'Upload photo'}
          </button>
          {photo && (
            <button
              type="button"
              onClick={() => onChange({ ...value, photo: null })}
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <X className="h-4 w-4" /> Remove photo
            </button>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={pickPhoto} />
      </div>

      {!photo && (
        <>
          <div>
            <Label>Or pick an emoji</Label>
            <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-100 p-2 dark:border-gray-800">
              <EmojiPicker value={emoji} onChange={(e) => onChange({ ...value, emoji: e })} options={AVATAR_EMOJIS} />
            </div>
          </div>
          <div>
            <Label>Background color</Label>
            <ColorPicker value={color} onChange={(c) => onChange({ ...value, color: c })} options={AVATAR_COLORS} />
          </div>
        </>
      )}
    </div>
  )
}
