import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '@/components/shared/PageHeader'
import { Card, Button, Input, Label } from '@/components/ui'
import AvatarEditor from '@/components/shared/AvatarEditor'
import { AVATAR_COLORS } from '@/lib/constants'
import { update } from '@/lib/db'
import { useCurrentUser } from '@/lib/hooks'
import { toast } from '@/lib/toast'

export default function ProfileSetup() {
  const user = useCurrentUser()
  const navigate = useNavigate()
  const [name, setName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [age, setAge] = useState(user?.age || '')
  const [avatar, setAvatar] = useState({
    emoji: user?.avatar_emoji || '🙂',
    color: user?.avatar_bg_color || AVATAR_COLORS[0],
    photo: user?.avatar_photo || null,
  })

  if (!user) return null
  const isChild = user.role === 'child'

  function save() {
    update('users', user.id, {
      full_name: name.trim() || user.full_name,
      email: email.trim(),
      age: isChild && age ? Number(age) : user.age,
      avatar_emoji: avatar.emoji,
      avatar_bg_color: avatar.color,
      avatar_photo: avatar.photo,
    })
    toast({ title: 'Profile saved!', emoji: '✅' })
    navigate(-1)
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Edit Profile" subtitle="Update your name, photo, and avatar" />
      <Card className="p-5">
        <AvatarEditor value={avatar} onChange={setAvatar} />
        <div className="mt-5 space-y-4">
          <div><Label>Display name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          {!isChild && <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>}
          {isChild && <div><Label>Age</Label><Input type="number" value={age} onChange={(e) => setAge(e.target.value)} className="w-28" /></div>}
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => navigate(-1)}>Cancel</Button>
          <Button className="flex-1" onClick={save}>Save profile</Button>
        </div>
      </Card>
    </div>
  )
}
