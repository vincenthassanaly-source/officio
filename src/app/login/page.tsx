import Link from 'next/link'
import { LoginForm } from './login-form'
import { CarteAuthentification, CLASSE_LIEN_AUTH } from '@/components/carte-authentification'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>
}) {
  const { mode } = await searchParams
  const modeAjout = mode === 'ajouter'

  return (
    <CarteAuthentification>
      <h1 className={`font-heading text-2xl text-ink ${modeAjout ? 'mb-1' : 'mb-5'}`}>
        {modeAjout ? 'Ajouter un compte' : 'Connexion'}
      </h1>
      {modeAjout && (
        <p className="mb-5 text-[13px] text-muted">
          Ta session actuelle reste ouverte. Ce compte sera simplement mémorisé sur cet
          ordinateur pour que tu puisses basculer dessus depuis le menu du bas.
        </p>
      )}
      <LoginForm modeAjout={modeAjout} />
      {!modeAjout && (
        <p className="mt-5 text-center text-[13px] text-muted">
          Pas encore de compte ?{' '}
          <Link href="/inscription" className={CLASSE_LIEN_AUTH}>
            En créer un
          </Link>
        </p>
      )}
    </CarteAuthentification>
  )
}
