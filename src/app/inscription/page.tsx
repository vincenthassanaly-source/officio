import Link from 'next/link'
import { InscriptionForm } from './inscription-form'
import { CarteAuthentification, CLASSE_LIEN_AUTH } from '@/components/carte-authentification'

export default async function InscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>
}) {
  const { invite } = await searchParams

  return (
    <CarteAuthentification>
      <h1 className={`font-heading text-2xl text-ink ${invite ? 'mb-1' : 'mb-5'}`}>Créer un compte</h1>
      {invite && (
        <p className="mb-5 text-[13px] text-muted">
          Tu rejoindras une officine avec le code <strong className="font-mono text-ink">{invite}</strong> une
          fois ton compte créé.
        </p>
      )}
      <InscriptionForm invite={invite} />
      <p className="mt-5 text-center text-[13px] text-muted">
        Déjà un compte ?{' '}
        <Link href="/login" className={CLASSE_LIEN_AUTH}>
          Se connecter
        </Link>
      </p>
    </CarteAuthentification>
  )
}
