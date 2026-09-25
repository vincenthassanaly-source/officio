import { getOfficineActive } from '@/lib/data/officine-active'
import { getOfficine } from '@/lib/data/officines'
import { getEquipe } from '@/lib/data/equipe'
import { getCouleursMembres } from '@/lib/data/couleurs-membres'
import { getCurrentProfil } from '@/lib/data/profils'
import { InviterCard } from '@/components/inviter-card'
import { MembresOfficine } from '@/components/membres-officine'
import { LienRetour } from '@/components/lien-retour'

export default async function InviterPage() {
  const officineActive = await getOfficineActive()
  if (!officineActive) return null

  // getOfficine en parallèle des autres lectures (toutes clées sur
  // l'officine active) plutôt qu'avant elles.
  const [officine, membres, couleurs, profil] = await Promise.all([
    getOfficine(officineActive.officine_id),
    getEquipe(officineActive.officine_id),
    getCouleursMembres(officineActive.officine_id),
    getCurrentProfil(),
  ])

  if (!officine) return null

  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Mon équipe</h1>
      <div className="flex flex-col gap-6">
        <section aria-labelledby="titre-equipe" className="flex flex-col gap-2">
          <h2 id="titre-equipe" className="text-[12px] font-bold uppercase tracking-wide text-muted">
            Équipe
          </h2>
          <MembresOfficine membres={membres} profilActuelId={profil?.id ?? ''} couleurs={couleurs} />
        </section>
        <section aria-labelledby="titre-inviter" className="flex flex-col gap-2">
          <h2 id="titre-inviter" className="text-[12px] font-bold uppercase tracking-wide text-muted">
            Inviter un collègue
          </h2>
          <InviterCard officineId={officine.id} code={officine.code_invitation} />
        </section>
      </div>
    </>
  )
}
