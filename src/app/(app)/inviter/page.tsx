import { getOfficineActive } from '@/lib/data/officine-active'
import { getOfficine } from '@/lib/data/officines'
import { InviterCard } from '@/components/inviter-card'

export default async function InviterPage() {
  const officineActive = await getOfficineActive()
  const officine = officineActive ? await getOfficine(officineActive.officine_id) : null

  if (!officine) return null

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Inviter un collègue</h1>
      <InviterCard officineId={officine.id} code={officine.code_invitation} />
    </>
  )
}
