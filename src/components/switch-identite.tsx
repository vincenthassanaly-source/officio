'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { listerComptes, retirerCompte, type CompteAppareil } from '@/lib/comptes-appareil'

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
  const [erreurs, setErreurs] = useState<Record<string, string>>({})
  const [enCoursId, setEnCoursId] = useState<string | null>(null)

  function togglePanel() {
    if (!panelOuvert) {
      setComptes(listerComptes().filter((c) => c.profilId !== profilActuelId))
      setErreurs({})
    }
    setPanelOuvert((v) => !v)
  }

  async function basculer(compte: CompteAppareil) {
    setEnCoursId(compte.profilId)
    setErreurs((e) => ({ ...e, [compte.profilId]: '' }))

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
      setErreurs((e) => ({
        ...e,
        [compte.profilId]: `Session expirée pour ce compte — reconnecte-toi avec l'email de ${compte.nomComplet.split(' ')[0]}.`,
      }))
      setEnCoursId(null)
      return
    }

    window.location.href = '/'
  }

  function supprimer(profilId: string) {
    retirerCompte(profilId)
    setComptes((c) => c.filter((compte) => compte.profilId !== profilId))
    setErreurs((e) => {
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
                    disabled={enCoursId === c.profilId}
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
                {erreurs[c.profilId] && (
                  <p className="px-2 pb-2 text-[11px] font-medium text-rec">{erreurs[c.profilId]}</p>
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
