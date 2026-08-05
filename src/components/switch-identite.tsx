'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { listerComptes, retirerCompte, verifierPin, type CompteAppareil } from '@/lib/comptes-appareil'

export function SwitchIdentite({
  profilActuelId,
  nomComplet,
  initiales,
}: {
  profilActuelId: string
  nomComplet: string
  initiales: string
}) {
  const router = useRouter()
  const [panelOuvert, setPanelOuvert] = useState(false)
  const [comptes, setComptes] = useState<CompteAppareil[]>([])
  const [compteSelectionne, setCompteSelectionne] = useState<CompteAppareil | null>(null)
  const [pin, setPin] = useState('')
  const [erreur, setErreur] = useState<string | null>(null)
  const [enCours, setEnCours] = useState(false)

  function togglePanel() {
    if (!panelOuvert) {
      setComptes(listerComptes().filter((c) => c.profilId !== profilActuelId))
      setCompteSelectionne(null)
      setPin('')
      setErreur(null)
    }
    setPanelOuvert((v) => !v)
  }

  async function basculer(e: React.FormEvent) {
    e.preventDefault()
    if (!compteSelectionne) return

    setEnCours(true)
    setErreur(null)

    const compte = await verifierPin(compteSelectionne.profilId, pin)
    if (!compte) {
      setErreur('Code incorrect.')
      setEnCours(false)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.auth.setSession({
      access_token: compte.accessToken,
      refresh_token: compte.refreshToken,
    })

    if (error) {
      setErreur("Impossible de basculer sur ce compte — reconnecte-toi via l'email.")
      setEnCours(false)
      return
    }

    setPanelOuvert(false)
    router.refresh()
    router.push('/')
  }

  function supprimer(profilId: string) {
    retirerCompte(profilId)
    setComptes((c) => c.filter((compte) => compte.profilId !== profilId))
    if (profilId === profilActuelId) {
      router.push('/login')
    }
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
          {compteSelectionne ? (
            <form onSubmit={basculer} className="flex flex-col gap-2 p-1.5">
              <p className="text-xs font-semibold text-ink">
                Code de {compteSelectionne.nomComplet.split(' ')[0]}
              </p>
              <input
                autoFocus
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, '').slice(0, 2))
                  setErreur(null)
                }}
                inputMode="numeric"
                maxLength={2}
                className="rounded-lg border border-border bg-bg px-3 py-2 text-center text-lg tracking-[0.4em] text-ink outline-none focus:border-primary"
              />
              {erreur && <p className="text-[11px] font-medium text-rec">{erreur}</p>}
              <div className="flex gap-1.5">
                <button
                  type="submit"
                  disabled={enCours || pin.length !== 2}
                  className="flex-1 rounded-lg bg-primary py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  Valider
                </button>
                <button
                  type="button"
                  onClick={() => setCompteSelectionne(null)}
                  className="rounded-lg border border-border px-3 py-2 text-xs font-semibold text-muted"
                >
                  Retour
                </button>
              </div>
            </form>
          ) : (
            <>
              {comptes.length === 0 ? (
                <p className="px-2 py-2 text-[11.5px] text-muted">
                  Aucun autre compte mémorisé sur cet ordinateur.
                </p>
              ) : (
                comptes.map((c) => (
                  <div
                    key={c.profilId}
                    className="flex items-center gap-1.5 rounded-lg hover:bg-neutral-soft"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setCompteSelectionne(c)
                        setPin('')
                        setErreur(null)
                      }}
                      className="flex flex-1 items-center gap-2.5 px-2 py-2 text-left"
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-white">
                        {c.initiales}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                        {c.nomComplet}
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
                ))
              )}
              <Link
                href="/login"
                className="mt-1 block rounded-lg px-2 py-2 text-[12.5px] font-semibold text-primary"
              >
                + Se connecter avec un autre compte
              </Link>
            </>
          )}
        </div>
      )}
    </div>
  )
}
