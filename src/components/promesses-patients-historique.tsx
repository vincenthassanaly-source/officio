'use client'

import { useEffect, useId, useOptimistic, useRef, useState, useTransition } from 'react'
import { rechercherPromessesTraitees, remettrePromesseEnAttente } from '@/app/actions/promesses-patients'
import type { PromessePatient } from '@/lib/data/promesses-patients'
import { lienTelephone, quandTraitee, LIMITE_HISTORIQUE } from '@/lib/promesses-patients'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { vibrer } from '@/lib/haptics'
import { preparerFocusApresRetrait } from '@/lib/focus-apres-retrait'

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

// Délai avant d'interroger le serveur : une requête par pause de frappe,
// pas une par lettre.
const DELAI_RECHERCHE_MS = 250

function IconRecherche({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  )
}

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

function IconAnnuler({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M9 14 4 9l5-5" />
      <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
    </svg>
  )
}

function IconTelephone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  )
}

export function PromessesPatientsHistorique({
  promessesInitiales,
}: {
  // null = échec du chargement côté serveur (distinct d'un historique vide).
  promessesInitiales: PromessePatient[] | null
}) {
  const [terme, setTerme] = useState('')
  // Résultats de la dernière recherche serveur ; sans recherche, la liste
  // vient directement des props (rafraîchies par revalidatePath après
  // chaque action, donc toujours à jour).
  const [resultats, setResultats] = useState<PromessePatient[] | null>(null)
  const [erreurRecherche, setErreurRecherche] = useState(false)
  const [rechercheEnCours, startRecherche] = useTransition()
  const [, startAction] = useTransition()
  const minuterieRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Numéro de la dernière recherche lancée : une réponse plus lente arrivée
  // après une plus récente est ignorée.
  const derniereRequeteRef = useRef(0)
  const toast = useToast()
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()
  const idRecherche = useId()

  useEffect(() => {
    return () => {
      if (minuterieRef.current) clearTimeout(minuterieRef.current)
    }
  }, [])

  const termeSaisi = terme.trim()
  const base = termeSaisi ? (resultats ?? []) : (promessesInitiales ?? [])
  const [affichees, retirerOptimiste] = useOptimistic(base, (etat, id: string) => etat.filter((p) => p.id !== id))

  function lancerRecherche(valeur: string) {
    setTerme(valeur)
    if (minuterieRef.current) clearTimeout(minuterieRef.current)
    const numero = ++derniereRequeteRef.current
    if (!valeur.trim()) {
      setResultats(null)
      setErreurRecherche(false)
      return
    }
    minuterieRef.current = setTimeout(() => {
      startRecherche(async () => {
        try {
          const trouvees = await rechercherPromessesTraitees(valeur)
          if (numero !== derniereRequeteRef.current) return
          setResultats(trouvees)
          setErreurRecherche(false)
        } catch {
          if (numero !== derniereRequeteRef.current) return
          setErreurRecherche(true)
        }
      })
    }, DELAI_RECHERCHE_MS)
  }

  function remettreEnAttente(p: PromessePatient, bouton: HTMLElement | null) {
    const rendreFocus = preparerFocusApresRetrait(bouton, 'data-action-remettre')
    retirerApresAnimation(p.id, () =>
      startAction(async () => {
        vibrer()
        retirerOptimiste(p.id)
        requestAnimationFrame(rendreFocus)
        try {
          await remettrePromesseEnAttente(p.id)
          setResultats((r) => r?.filter((x) => x.id !== p.id) ?? null)
          toast({ type: 'succes', message: `${p.nom_patient} : promesse remise en attente.` })
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la remise en attente.',
          })
        }
      })
    )
  }

  const attenteResultats = Boolean(termeSaisi) && resultats === null && !erreurRecherche

  let etat: React.ReactNode = null
  if (promessesInitiales === null && !termeSaisi) {
    etat = (
      <p role="alert" className="px-6 py-10 text-center text-[13px] text-muted">
        Historique indisponible pour le moment. Tire la page vers le bas pour réessayer.
      </p>
    )
  } else if (erreurRecherche) {
    etat = (
      <p role="alert" className="px-6 py-10 text-center text-[13px] text-muted">
        La recherche a échoué. Vérifie la connexion puis modifie la saisie pour relancer.
      </p>
    )
  } else if (!attenteResultats && affichees.length === 0) {
    etat = termeSaisi ? (
      <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
        <p className="text-[14px] font-semibold text-ink">Rien trouvé pour « {termeSaisi} »</p>
        <p className="max-w-[34ch] text-[13px] text-muted">
          La recherche porte sur le médicament et le nom du patient, parmi les {LIMITE_HISTORIQUE} promesses
          traitées les plus récentes qui correspondent.
        </p>
      </div>
    ) : (
      <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
        <p className="text-[14px] font-semibold text-ink">Aucune promesse traitée</p>
        <p className="max-w-[34ch] text-[13px] text-muted">
          Les promesses passées en « Traitée » arrivent ici, avec la date du rappel.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-3">
      <search className="flex flex-col gap-1.5">
        <label htmlFor={idRecherche} className="text-[12px] font-semibold text-muted">
          Rechercher un médicament ou un patient
        </label>
        <div className="relative">
          <IconRecherche className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id={idRecherche}
            type="search"
            value={terme}
            onChange={(e) => lancerRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') lancerRecherche('')
            }}
            placeholder="Ex. Durand, Ozempic"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            aria-busy={rechercheEnCours || undefined}
            className={`w-full rounded-xl border border-transparent bg-surface py-2.5 pl-10 pr-11 text-[16px] text-ink shadow-card outline-none placeholder:text-muted focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary [&::-webkit-search-cancel-button]:appearance-none`}
          />
          {terme && (
            <button
              type="button"
              onClick={() => lancerRecherche('')}
              aria-label="Effacer la recherche"
              className={`absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink ${CLASSE_FOCUS}`}
            >
              <IconFermer className="h-4 w-4" />
            </button>
          )}
        </div>
        <p role="status" className="text-[12px] text-muted">
          {termeSaisi && (rechercheEnCours || attenteResultats)
            ? 'Recherche…'
            : termeSaisi && !erreurRecherche && affichees.length > 0
              ? `${affichees.length}${affichees.length >= LIMITE_HISTORIQUE ? '+' : ''} promesse${affichees.length > 1 ? 's' : ''} trouvée${affichees.length > 1 ? 's' : ''}`
              : ''}
        </p>
      </search>

      {etat ?? (
        <ul
          className={`flex flex-col divide-y divide-border rounded-[20px] bg-surface px-4 shadow-card motion-safe:transition-opacity ${
            rechercheEnCours ? 'opacity-60' : ''
          }`}
        >
          {affichees.map((p) => (
            <li
              key={p.id}
              className={`flex flex-col gap-0.5 py-3.5 ${estEnSortie(p.id) ? 'item-sortie' : 'item-entree'}`}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="wrap-anywhere text-[14px] font-semibold leading-snug text-ink">{p.nom_patient}</p>
                  <p className="wrap-anywhere text-[13px] text-ink">{p.nom_medicament}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${
                    p.facture ? 'bg-green-soft text-green' : 'bg-accent-soft text-accent'
                  }`}
                >
                  {p.facture ? 'Facturé' : 'Non facturé'}
                </span>
              </div>
              <a
                href={lienTelephone(p.telephone_patient)}
                aria-label={`Appeler ${p.nom_patient} au ${p.telephone_patient}`}
                className={`-mx-2 inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2 text-[13.5px] font-medium tabular-nums text-primary hover:bg-primary-soft motion-safe:transition-colors ${CLASSE_FOCUS}`}
              >
                <IconTelephone className="h-[15px] w-[15px] shrink-0" />
                {p.telephone_patient}
              </a>
              <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
                <span className="text-[12px] text-muted">{quandTraitee(p.traite_at)}</span>
                <button
                  type="button"
                  onClick={(e) => remettreEnAttente(p, e.currentTarget)}
                  data-action-remettre=""
                  aria-label={`Remettre la promesse de ${p.nom_patient} en attente`}
                  className={`-mr-1 ml-auto flex min-h-11 items-center gap-1.5 rounded-xl px-2.5 text-[12.5px] font-semibold text-muted hover:bg-neutral-soft hover:text-ink motion-safe:transition-colors ${CLASSE_FOCUS}`}
                >
                  <IconAnnuler className="h-4 w-4" />
                  Remettre en attente
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!etat && affichees.length >= LIMITE_HISTORIQUE && (
        <p className="px-4 text-center text-[12px] text-muted">
          Seules les {LIMITE_HISTORIQUE} plus récentes sont affichées : précise la recherche pour remonter plus loin.
        </p>
      )}
    </div>
  )
}
