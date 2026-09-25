'use client'

import { useActionState, useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from './actions'
import { ajouterOuMettreAJourCompte } from '@/lib/comptes-appareil'
import { authentifierCompteAppareil } from '@/lib/supabase/authentification-appareil'
import { CLASSE_BOUTON_AUTH, CLASSE_CHAMP_AUTH, CLASSE_LIBELLE_AUTH } from '@/components/carte-authentification'

export function LoginForm({ modeAjout = false }: { modeAjout?: boolean }) {
  const router = useRouter()
  const [email, setEmail] = useState('')

  // --- connexion classique (aucune session active à protéger) : la session
  // est ouverte via l'action serveur `signIn`, qui écrit les cookies partagés. ---
  const [state, action, pendingConnexion] = useActionState(signIn, undefined)
  const traite = useRef(false)
  const succesConnexion = !modeAjout && state && 'success' in state && state.success ? state : null

  useEffect(() => {
    if (modeAjout || !succesConnexion || traite.current) return
    traite.current = true

    if (succesConnexion.profil) {
      ajouterOuMettreAJourCompte({
        profilId: succesConnexion.profil.id,
        nomComplet: succesConnexion.profil.nom_complet,
        initiales: succesConnexion.profil.initiales,
        email: succesConnexion.session.email,
        accessToken: succesConnexion.session.accessToken,
        refreshToken: succesConnexion.session.refreshToken,
      })
    }

    router.push('/')
  }, [succesConnexion, router, modeAjout])

  // --- ajout d'un compte supplémentaire sur cet appareil (session déjà
  // active) : authentification isolée, aucune écriture de cookies, donc la
  // session en cours n'est jamais affectée. ---
  const [pendingAjout, startAjout] = useTransition()
  const [resultatAjout, setResultatAjout] = useState<{ erreur?: string; succes?: string } | null>(null)

  function soumettreAjout(formData: FormData) {
    setResultatAjout(null)
    const emailSaisi = String(formData.get('email') ?? '').trim()
    const password = String(formData.get('password') ?? '')

    if (!emailSaisi || !password) {
      setResultatAjout({ erreur: 'Merci de renseigner ton email et ton mot de passe.' })
      return
    }

    startAjout(async () => {
      const resultat = await authentifierCompteAppareil(emailSaisi, password)
      if ('erreur' in resultat) {
        setResultatAjout({ erreur: resultat.erreur })
        return
      }
      ajouterOuMettreAJourCompte(resultat)
      setEmail('')
      setResultatAjout({
        succes: `Compte de ${resultat.nomComplet.split(' ')[0]} ajouté sur cet ordinateur. Ouvre le menu du bas pour basculer dessus.`,
      })
    })
  }

  const pending = modeAjout ? pendingAjout : pendingConnexion
  const erreur = modeAjout ? resultatAjout?.erreur : state && 'error' in state ? state.error : undefined

  return (
    <form action={modeAjout ? soumettreAjout : action} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={CLASSE_LIBELLE_AUTH}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={CLASSE_CHAMP_AUTH}
          placeholder="prenom@pharmacie-romevillage.fr"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={CLASSE_LIBELLE_AUTH}>
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className={CLASSE_CHAMP_AUTH}
        />
      </div>

      {erreur && <p role="alert" className="rounded-xl bg-rec-soft px-4 py-3 text-sm text-rec">{erreur}</p>}
      {modeAjout && resultatAjout?.succes && (
        <p role="status" className="rounded-xl bg-primary-soft px-4 py-3 text-sm text-primary">{resultatAjout.succes}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={CLASSE_BOUTON_AUTH}
      >
        {pending ? (modeAjout ? 'Ajout…' : 'Connexion…') : modeAjout ? 'Ajouter ce compte' : 'Se connecter'}
      </button>
    </form>
  )
}
