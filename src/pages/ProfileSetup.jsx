import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button, Input, Label } from '@/components/ui'
import { EmojiPicker, ColorPicker } from '@/components/shared/EmojiPicker'
import Avatar from '@/components/shared/Avatar'
import { AVATAR_EMOJIS, AVATAR_COLORS } from '@/lib/constants'
import { update } from '@/lib/db'
import { useCurrentUser } from '@/lib/hooks'
import { toast } from '@/lib/toast'

export default function ProfileSetup() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [age, setAge] = useState(user?.age || '')
  const [emoji, setEmoji] = useState(user?.avatar_emoji || '🙂')
  const [color, setColor] = useState(user?.avatar_bg_color || AVATAR_COLORS[0])

  if (!user) return null
  const isChild = user.role === 'child'

  function save() {
    update('users', user.id, {
      full_name: name.trim() || user.full_name,
      email: email.trim(),
      age: isChild && age ? Number(age) : user.age,
      avatar_emoji: emoji,
      avatar_bg_color: color,
    })
    toast({ title: 'Profile saved!', emoji: '✅' })
    navigate(-1)
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Profile" subtitle="Update your name and avatar" />
      <Card className="p-5">
        <div className="mb-5 flex justify-center">
          <Avatar user={{ avatar_emoji: emoji, avatar_bg_color: color }} size="xl" />
        </div>
        <div className="space-y-4">
          <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          {!isChild && <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          {isChild && <div><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-28" /></div>}
          <div><Label>Avatar emoji</Label><EmojiPicker value={emoji} onChange={setEmoji} options={AVATAR_EMOJIS} /></div>
          <div><Label>Background color</Label><ColorPicker value={color} onChange={setColor} options={AVATAR_COLORS} /></div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Save profile</Button>
        </div>
      </Card>
    </div>
  )
}
