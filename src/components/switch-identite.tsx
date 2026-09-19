'use client'

import { useEffect, useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { listerComptes, retirerCompte, ajouterOuMettreAJourCompte, type CompteAppareil } from '@/lib/comptes-appareil'
import { authentifierCompteAppareil } from '@/lib/supabase/authentification-appareil'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { couleurAvatar, texteAvatar } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'

function ReconnexionCompte({
  compte,
  onReconnecte,
  onAnnuler,
}: {
  compte: CompteAppareil
  onReconnecte: (compte: CompteAppareil) => void
  onAnnuler: () => void
}) {
  const [email, setEmail] = useState(compte.email ?? '')
  const [password, setPassword] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, startTransition] = useTransition()

  function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setErreur(null)

    startTransition(async () => {
      const resultat = await authentifierCompteAppareil(email.trim(), password)

      if ('erreur' in resultat) {
        setErreur(resultat.erreur)
        return
      }
      if (resultat.profilId !== compte.profilId) {
        setErreur('Cet email correspond à un autre compte que celui-ci.')
        return
      }

      ajouterOuMettreAJourCompte(resultat)
      onReconnecte(resultat)
    })
  }

  return (
    <form onSubmit={soumettre} className="flex flex-col gap-1.5 px-2 pb-2 pt-1">
      <p className="text-[12px] text-muted">
        Il faut se reconnecter pour continuer sur ce compte.
      </p>
      <label className="sr-only" htmlFor="reconnexion-email">Email</label>
      <input
        id="reconnexion-email"
        type="email"
        required
        autoComplete="email"
        inputMode="email"
        enterKeyHint="next"
        autoCapitalize="none"
        spellCheck={false}
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? 'reconnexion-erreur' : undefined}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className={`rounded-lg border bg-bg px-2.5 py-1.5 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${erreur ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
      />
      <label className="sr-only" htmlFor="reconnexion-password">Mot de passe</label>
      <input
        id="reconnexion-password"
        type="password"
        required
        autoComplete="current-password"
        enterKeyHint="go"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={erreur ? 'reconnexion-erreur' : undefined}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        className={`rounded-lg border bg-bg px-2.5 py-1.5 text-[16px] text-ink outline-none focus-visible:outline-2 focus-visible:outline-primary ${erreur ? 'border-rec focus-visible:border-rec' : 'border-border focus-visible:border-primary'}`}
      />
      {erreur && (
        <p id="reconnexion-erreur" role="alert" className="text-[12px] font-medium text-rec">
          {erreur}
        </p>
      )}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="-my-1.5 rounded-lg bg-primary px-3 py-3 text-[12px] font-semibold text-white disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {enCours ? 'Reconnexion…' : 'Se reconnecter'}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          disabled={enCours}
          className="-my-1.5 rounded-lg px-1 py-3 text-[12px] font-medium text-muted hover:text-rec disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          Annuler
        </button>
      </div>
    </form>
  )
}

export function SwitchIdentite({
  profilActuelId,
  nomComplet,
  initiales,
  couleurProfilActuel,
}: {
  profilActuelId: string
  nomComplet: string
  initiales: string
  // Couleur par rang dans l'officine active (getCouleursMembres), pas par
  // hash : c'est le seul avatar de ce composant dont on connaît l'équipe.
  couleurProfilActuel: CouleurAvatar
}) {
  const [panelOuvert, setPanelOuvert] = useState(false)
  const [comptes, setComptes] = useState<CompteAppareil[]>([])
  const [comptesExpires, setComptesExpires] = useState<Record<string, true>>({})
  const [enCoursId, setEnCoursId] = useState<string | null>(null)
  const [compteASupprimer, setCompteASupprimer] = useState<CompteAppareil | null>(null)
  // Rechargement complet requis après un changement de compte (voir
  // node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md :
  // "For logout flows, using window.location.href instead of router.push
  // triggers a full page reload, clearing all client-side state.") — un
  // router.push conserverait le cache RSC et l'état client de l'ancienne
  // identité. La mutation elle-même doit vivre dans un effet : l'assigner
  // directement dans basculer() (un gestionnaire d'évènement) est rejeté par
  // la règle react-hooks/immutability.
  const [bascule, setBascule] = useState(false)

  useFermerAvecRetour(panelOuvert, () => setPanelOuvert(false))

  useEffect(() => {
    if (bascule) window.location.href = '/'
  }, [bascule])

  function togglePanel() {
    if (!panelOuvert) {
      setComptes(listerComptes().filter((c) => c.profilId !== profilActuelId))
      setComptesExpires({})
    }
    setPanelOuvert((v) => !v)
  }

  async function basculer(compte: CompteAppareil) {
    setEnCoursId(compte.profilId)
    setComptesExpires((e) => {
      const { [compte.profilId]: _retire, ...reste } = e
      return reste
    })

    const supabase = createClient()
    const { data: sessionActuelle } = await supabase.auth.getSession()

    const { error } = await supabase.auth.setSession({
      access_token: compte.accessToken,
      refresh_token: compte.refreshToken,
    })

    if (error) {
      if (sessionActuelle.session) {
        await supabase.auth.setSession({
          access_token: sessionActuelle.session.access_token,
          refresh_token: sessionActuelle.session.refresh_token,
        })
      }
      setComptesExpires((e) => ({ ...e, [compte.profilId]: true }))
      setEnCoursId(null)
      return
    }

    setBascule(true)
  }

  function supprimer(profilId: string) {
    retirerCompte(profilId)
    setComptes((c) => c.filter((compte) => compte.profilId !== profilId))
    setComptesExpires((e) => {
      const { [profilId]: _retire, ...reste } = e
      return reste
    })
  }

  function confirmerSuppression() {
    if (compteASupprimer) supprimer(compteASupprimer.profilId)
    setCompteASupprimer(null)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        aria-expanded={panelOuvert}
        className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-neutral-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-xs font-semibold ${couleurProfilActuel.fond} ${couleurProfilActuel.texte}`}
        >
          {initiales}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{nomComplet}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform ${panelOuvert ? '' : 'rotate-180'}`}
        >
          <path d="M18 15 12 9l-6 6" />
        </svg>
      </button>

      {panelOuvert && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-full rounded-xl border border-border bg-surface p-2 shadow-lg">
          {comptes.length === 0 ? (
            <p className="px-2 py-2 text-[12px] text-muted">
              Aucun autre compte mémorisé sur cet ordinateur.
            </p>
          ) : (
            comptes.map((c) => (
              <div key={c.profilId} className="flex flex-col rounded-lg hover:bg-neutral-soft">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => basculer(c)}
                    disabled={enCoursId === c.profilId || Boolean(comptesExpires[c.profilId])}
                    className="flex min-h-11 flex-1 items-center gap-2.5 px-2 py-2 text-left disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(155deg,rgba(255,255,255,.4),rgba(255,255,255,0)_60%)] text-[12px] font-semibold ${couleurAvatar(c.profilId)} ${texteAvatar(c.profilId)}`}
                    >
                      {c.initiales}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                      {enCoursId === c.profilId ? 'Basculement…' : c.nomComplet}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCompteASupprimer(c)}
                    aria-label={`Retirer ${c.nomComplet} de cet ordinateur`}
                    className="-ml-1 mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                {comptesExpires[c.profilId] && (
                  <ReconnexionCompte
                    compte={c}
                    onAnnuler={() =>
                      setComptesExpires((e) => {
                        const { [c.profilId]: _retire, ...reste } = e
                        return reste
                      })
                    }
                    onReconnecte={(compteReconnecte) => {
                      setComptesExpires((e) => {
                        const { [c.profilId]: _retire, ...reste } = e
                        return reste
                      })
                      basculer(compteReconnecte)
                    }}
                  />
                )}
              </div>
            ))
          )}
          <Link
            href="/login?mode=ajouter"
            className="mt-1 flex min-h-11 items-center gap-1.5 rounded-lg px-2 py-2 text-[12.5px] font-semibold text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Se connecter avec un autre compte
          </Link>
        </div>
      )}

      <ModaleConfirmation
        ouvert={compteASupprimer !== null}
        titre="Retirer ce compte ?"
        description={
          compteASupprimer
            ? `« ${compteASupprimer.nomComplet} » ne sera plus proposé sur cet ordinateur. Vous pourrez vous reconnecter avec ce compte à tout moment.`
            : undefined
        }
        texteConfirmer="Retirer"
        onConfirmer={confirmerSuppression}
        onAnnuler={() => setCompteASupprimer(null)}
      />
    </div>
  )
}
