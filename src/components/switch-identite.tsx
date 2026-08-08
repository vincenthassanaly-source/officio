'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { listerComptes, retirerCompte, ajouterOuMettreAJourCompte, type CompteAppareil } from '@/lib/comptes-appareil'
import { authentifierCompteAppareil } from '@/lib/supabase/authentification-appareil'

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
      <p className="text-[11px] text-muted">
        Il faut se reconnecter pour continuer sur ce compte.
      </p>
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
      />
      <input
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Mot de passe"
        className="rounded-lg border border-border bg-bg px-2.5 py-1.5 text-[12.5px] text-ink outline-none focus:border-primary"
      />
      {erreur && <p className="text-[11px] font-medium text-rec">{erreur}</p>}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={enCours}
          className="rounded-lg bg-primary px-3 py-1.5 text-[11.5px] font-semibold text-white disabled:opacity-60"
        >
          {enCours ? 'Reconnexion…' : 'Se reconnecter'}
        </button>
        <button
          type="button"
          onClick={onAnnuler}
          disabled={enCours}
          className="text-[11.5px] font-medium text-muted hover:text-rec disabled:opacity-60"
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
}: {
  profilActuelId: string
  nomComplet: string
  initiales: string
}) {
  const [panelOuvert, setPanelOuvert] = useState(false)
  const [comptes, setComptes] = useState<CompteAppareil[]>([])
  const [comptesExpires, setComptesExpires] = useState<Record<string, true>>({})
  const [enCoursId, setEnCoursId] = useState<string | null>(null)

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

    window.location.href = '/'
  }

  function supprimer(profilId: string) {
    retirerCompte(profilId)
    setComptes((c) => c.filter((compte) => compte.profilId !== profilId))
    setComptesExpires((e) => {
      const { [profilId]: _retire, ...reste } = e
      return reste
    })
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={togglePanel}
        className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-neutral-soft"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white">
          {initiales}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{nomComplet}</span>
        <span className="shrink-0 text-muted">{panelOuvert ? '▴' : '▾'}</span>
      </button>

      {panelOuvert && (
        <div className="absolute bottom-full left-0 z-10 mb-2 w-full rounded-xl border border-border bg-surface p-2 shadow-lg">
          {comptes.length === 0 ? (
            <p className="px-2 py-2 text-[11.5px] text-muted">
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
                    className="flex flex-1 items-center gap-2.5 px-2 py-2 text-left disabled:opacity-60"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                      {c.initiales}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                      {enCoursId === c.profilId ? 'Basculement…' : c.nomComplet}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => supprimer(c.profilId)}
                    aria-label="Retirer ce compte de cet ordinateur"
                    className="mr-1 shrink-0 text-muted hover:text-rec"
                  >
                    ×
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
            className="mt-1 block rounded-lg px-2 py-2 text-[12.5px] font-semibold text-primary"
          >
            + Se connecter avec un autre compte
          </Link>
        </div>
      )}
    </div>
  )
}
