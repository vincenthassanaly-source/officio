import { getOfficineActive } from '@/lib/data/officine-active'
import { getOfficine } from '@/lib/data/officines'
import { getEquipe } from '@/lib/data/equipe'
import { getCurrentProfil } from '@/lib/data/profils'
import { InviterCard } from '@/components/inviter-card'
import { MembresOfficine } from '@/components/membres-officine'

export default async function InviterPage() {
  const officineActive = await getOfficineActive()
  const officine = officineActive ? await getOfficine(officineActive.officine_id) : null

  if (!officine) return null

  const [membres, profil] = await Promise.all([getEquipe(officine.id), getCurrentProfil()])

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Mon équipe</h1>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Équipe</div>
          <MembresOfficine membres={membres} profilActuelId={profil?.id ?? ''} />
        </div>
        <div className="flex flex-col gap-2">
          <div className="text-[11px] font-bold uppercase tracking-wide text-muted">Inviter un collègue</div>
          <InviterCard officineId={officine.id} code={officine.code_invitation} />
        </div>
      </div>
    </>
  )
}
