'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { rechercherGlobal, type GroupeResultatsRecherche } from '@/app/actions/recherche'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import {
  IconLiaison,
  IconAgenda,
  IconCarnet,
  IconFournisseurs,
  IconDocuments,
  IconCno,
  IconRegularisation,
  IconSuggestions,
  IconRupturesStock,
  IconHuiles,
  IconChaussures,
} from '@/components/nav-icons'

const SEUIL_RECHERCHE = 2
const DEBOUNCE_MS = 300

const ICONES: Record<string, React.ComponentType<{ className?: string }>> = {
  messages: IconLiaison,
  taches: IconLiaison,
  agenda: IconAgenda,
  carnet: IconCarnet,
  fournisseurs: IconFournisseurs,
  documents: IconDocuments,
  cno: IconCno,
  'ruptures-stock': IconRupturesStock,
  suggestions: IconSuggestions,
  huiles: IconHuiles,
  chaussures: IconChaussures,
  regularisations: IconRegularisation,
}

// Pas dans nav-icons.tsx : pas un lien de nav, propre à cette barre de
// recherche (même choix que IconCloche dans notifications-cloche.tsx).
function IconRecherche({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </svg>
  )
}

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className ?? ''}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" />
      <path className="opacity-75" fill="currentColor" d="M21 12a9 9 0 0 0-9-9v3a6 6 0 0 1 6 6h3z" />
    </svg>
  )
}

// Panneau positionné en absolute (pas en fixed comme NotificationsCloche/
// OfficineSwitcher) : cette barre occupe toute la largeur de son conteneur
// en haut de l'accueil, pas près d'un bord d'écran, donc pas de risque de
// débordement à calculer depuis un bouton étroit.
export function RechercheGlobale() {
  const [requete, setRequete] = useState('')
  const [ouvert, setOuvert] = useState(false)
  const [resultats, setResultats] = useState<GroupeResultatsRecherche[] | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requeteIdRef = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const signalerNavigation = useFermerAvecRetour(ouvert, () => setOuvert(false))

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [])

  function lancerRecherche(valeur: string) {
    setRequete(valeur)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    const q = valeur.trim()
    if (q.length < SEUIL_RECHERCHE) {
      setOuvert(false)
      setResultats(null)
      return
    }

    setOuvert(true)
    const idCourant = ++requeteIdRef.current
    debounceRef.current = setTimeout(() => {
      startTransition(async () => {
        const res = await rechercherGlobal(q)
        // Ignore une réponse obsolète arrivée après une frappe plus récente.
        if (requeteIdRef.current === idCourant) setResultats(res)
      })
    }, DEBOUNCE_MS)
  }

  function fermer() {
    setOuvert(false)
  }

  function choisirResultat(url: string) {
    signalerNavigation()
    router.push(url)
    fermer()
  }

  // Chargement tant que la réponse du debounce en cours n'est pas arrivée,
  // pas seulement pendant isPending : évite un flash "Aucun résultat" entre
  // l'ouverture du panneau et le déclenchement réel de la recherche.
  const chargement = ouvert && (isPending || resultats === null)
  const aAffiner = ouvert && !chargement && (resultats?.length ?? 0) === 0

  return (
    <div className="relative">
      <div
        className={`relative flex items-center gap-2.5 rounded-[20px] bg-surface px-4 py-3 shadow-card ${
          ouvert ? 'z-50' : ''
        }`}
      >
        <IconRecherche className="h-[18px] w-[18px] shrink-0 text-muted" />
        <input
          ref={inputRef}
          type="text"
          value={requete}
          onChange={(e) => lancerRecherche(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              fermer()
              inputRef.current?.blur()
            }
          }}
          placeholder="Rechercher dans Officio…"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] text-ink outline-none placeholder:text-muted"
        />
        {chargement && <Spinner className="h-4 w-4 shrink-0 text-muted" />}

        {ouvert && (
          <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-[20px] border border-border bg-surface p-2 shadow-lg">
            {chargement ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-muted">Recherche…</p>
            ) : aAffiner ? (
              <p className="px-3 py-6 text-center text-[12.5px] text-muted">
                Aucun résultat pour « {requete.trim()} »
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {resultats?.map((groupe) => {
                  const Icone = ICONES[groupe.cle] ?? IconLiaison
                  return (
                    <div key={groupe.cle} className="flex flex-col">
                      <div className="flex items-center gap-1.5 px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                        <Icone className="h-3.5 w-3.5 shrink-0" />
                        {groupe.label}
                      </div>
                      {groupe.resultats.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => choisirResultat(r.url)}
                          className="rounded-lg px-2.5 py-2 text-left text-[13px] text-ink hover:bg-neutral-soft"
                        >
                          <span className="block truncate">{r.label}</span>
                        </button>
                      ))}
                      {groupe.total > groupe.resultats.length && (
                        <p className="px-2.5 py-1 text-[11px] text-muted">
                          +{groupe.total - groupe.resultats.length} autres
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Capte les clics en dehors du panneau pour le fermer — même idiome
          que NotificationsCloche, mais l'input reste au-dessus (z-50) : à la
          différence d'un bouton déclencheur, il doit rester utilisable
          (continuer à taper) pendant que le panneau est ouvert. */}
      {ouvert && (
        <button type="button" aria-label="Fermer la recherche" onClick={fermer} className="fixed inset-0 z-40" />
      )}
    </div>
  )
}
