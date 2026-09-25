import Link from 'next/link'
import { getMesAdhesions } from '@/lib/data/adhesions'
import { BienvenueForm } from '@/components/bienvenue-form'
import { CarteAuthentification } from '@/components/carte-authentification'
import { signOut } from '@/app/actions/auth'

// Lien de sortie compact : cible 44 px via padding compensé par une marge
// négative égale (motif « bouton-icône compact » de DESIGN.md).
const CLASSE_LIEN_SORTIE =
  '-ml-3 -mt-3 mb-1 inline-flex min-h-11 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold hover:bg-neutral-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

function IconFlecheRetour() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  )
}

export default async function BienvenuePage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const [adhesions, { invite }] = await Promise.all([getMesAdhesions(), searchParams])

  return (
    <CarteAuthentification>
      {adhesions.length > 0 ? (
        <Link href="/" className={`${CLASSE_LIEN_SORTIE} text-primary`}>
          <IconFlecheRetour />
          Retour à l&rsquo;appli
        </Link>
      ) : (
        <form action={signOut}>
          <button type="submit" className={`${CLASSE_LIEN_SORTIE} text-muted hover:text-ink`}>
            <IconFlecheRetour />
            Se déconnecter
          </button>
        </form>
      )}
      <h1 className="mb-5 font-heading text-2xl text-ink">
        {adhesions.length > 0 ? 'Ajouter une officine' : 'Crée une officine ou rejoins-en une'}
      </h1>
      <BienvenueForm inviteInitial={invite} />
    </CarteAuthentification>
  )
}
