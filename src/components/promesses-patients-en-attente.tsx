'use client'

import { useDeferredValue, useId, useMemo, useOptimistic, useState, useTransition } from 'react'
import {
  basculerPromesseFacturee,
  creerPromesse,
  marquerPromesseTraitee,
  supprimerPromesse,
} from '@/app/actions/promesses-patients'
import type { PromessePatient } from '@/lib/data/promesses-patients'
import {
  correspondRecherche,
  depuisQuand,
  formaterTelephone,
  lienTelephone,
  normaliserRecherche,
  validerPromesse,
  validerTelephone,
  LONGUEUR_MAX_MEDICAMENT,
  LONGUEUR_MAX_PATIENT,
  type ChampPromesse,
  type ErreursPromesse,
} from '@/lib/promesses-patients'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { vibrer } from '@/lib/haptics'

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const CHAMP_CLASS =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink placeholder:text-muted outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

// Préfixe des identifiants temporaires des promesses ajoutées de façon
// optimiste : leurs actions restent désactivées tant que le serveur n'a pas
// renvoyé la vraie ligne (revalidatePath).
const PREFIXE_TEMPORAIRE = 'temp-'

// ─── Icônes (trait, viewBox 24, même tracé que le reste de l'app) ─────────

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

function IconAjouter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconCoche({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
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

function IconCorbeille({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  )
}

// ─── Utilitaires d'affichage ──────────────────────────────────────────────

type Groupe = { cle: string; medicament: string; promesses: PromessePatient[] }

// Regroupe par médicament normalisé ("Doliprane 1000" et "doliprane 1000"
// ne font qu'un groupe, libellé = première saisie), groupes triés par
// ordre alphabétique pour être retrouvés d'un coup d'œil ; à l'intérieur,
// l'ordre serveur (plus ancienne d'abord) est conservé.
function regrouper(promesses: PromessePatient[]): Groupe[] {
  const groupes = new Map<string, Groupe>()
  for (const p of promesses) {
    const cle = normaliserRecherche(p.nom_medicament)
    const groupe = groupes.get(cle)
    if (groupe) groupe.promesses.push(p)
    else groupes.set(cle, { cle, medicament: p.nom_medicament, promesses: [p] })
  }
  return [...groupes.values()].sort((a, b) => a.cle.localeCompare(b.cle, 'fr'))
}

function libellePatients(n: number) {
  return `${n} patient${n > 1 ? 's' : ''}`
}

type ActionOptimiste =
  | { type: 'ajout'; promesse: PromessePatient }
  | { type: 'retrait'; id: string }
  | { type: 'facture'; id: string }

export function PromessesPatientsEnAttente({ promesses }: { promesses: PromessePatient[] }) {
  const [recherche, setRecherche] = useState('')
  // Filtrage à chaque frappe sur une liste qui peut compter quelques
  // dizaines de lignes : différé pour garder la saisie fluide.
  const rechercheDifferee = useDeferredValue(recherche)
  // Formulaire ouvert d'office quand il n'y a encore aucune promesse : c'est
  // alors la seule chose à faire sur cet écran.
  const [formulaire, setFormulaire] = useState<{ ouvert: boolean; medicament: string; focus: boolean }>(() => ({
    ouvert: promesses.length === 0,
    medicament: '',
    focus: false,
  }))
  const [aSupprimer, setASupprimer] = useState<PromessePatient | null>(null)
  // Deux transitions distinctes : la création (qui pilote l'état du bouton
  // « Enregistrer ») ne doit pas afficher « Enregistrement… » parce qu'un
  // collègue vient de taper « Traitée » sur une autre ligne, et inversement.
  const [creationEnCours, startCreation] = useTransition()
  const [, startTransition] = useTransition()
  const toast = useToast()
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()

  const [promessesOptimistes, appliquerOptimiste] = useOptimistic(promesses, (etat, action: ActionOptimiste) => {
    if (action.type === 'ajout') return [...etat, action.promesse]
    if (action.type === 'retrait') return etat.filter((p) => p.id !== action.id)
    return etat.map((p) => (p.id === action.id ? { ...p, facture: !p.facture } : p))
  })

  const rechercheNormalisee = normaliserRecherche(rechercheDifferee)
  const groupes = useMemo(() => {
    const visibles = rechercheNormalisee
      ? promessesOptimistes.filter((p) => correspondRecherche(normaliserRecherche(p.nom_medicament), rechercheNormalisee))
      : promessesOptimistes
    return regrouper(visibles)
  }, [promessesOptimistes, rechercheNormalisee])
  const nombreVisibles = groupes.reduce((total, g) => total + g.promesses.length, 0)

  function ouvrirFormulaire(medicament: string) {
    setFormulaire({ ouvert: true, medicament, focus: true })
  }

  async function enregistrer(champs: {
    nom_medicament: string
    nom_patient: string
    telephone_patient: string
    facture: boolean
  }): Promise<boolean> {
    const formData = new FormData()
    formData.set('nom_medicament', champs.nom_medicament)
    formData.set('nom_patient', champs.nom_patient)
    formData.set('telephone_patient', champs.telephone_patient)
    formData.set('facture', champs.facture ? 'oui' : 'non')

    return new Promise((resoudre) => {
      startCreation(async () => {
        appliquerOptimiste({
          type: 'ajout',
          promesse: {
            id: `${PREFIXE_TEMPORAIRE}${Date.now()}`,
            nom_medicament: champs.nom_medicament.trim(),
            nom_patient: champs.nom_patient.trim(),
            telephone_patient: formaterTelephone(champs.telephone_patient),
            facture: champs.facture,
            statut: 'actif',
            created_at: new Date().toISOString(),
            traite_at: null,
          },
        })
        try {
          await creerPromesse(formData)
          vibrer()
          toast({ type: 'succes', message: `Promesse notée pour ${champs.nom_patient.trim()}.` })
          setFormulaire({ ouvert: false, medicament: '', focus: false })
          resoudre(true)
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : "Échec de l'enregistrement de la promesse.",
          })
          resoudre(false)
        }
      })
    })
  }

  function traiter(p: PromessePatient) {
    retirerApresAnimation(p.id, () =>
      startTransition(async () => {
        vibrer()
        appliquerOptimiste({ type: 'retrait', id: p.id })
        try {
          await marquerPromesseTraitee(p.id)
          toast({ type: 'succes', message: `${p.nom_patient} : promesse traitée, visible dans l'historique.` })
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec du passage en « Traitée ».',
          })
        }
      })
    )
  }

  function basculerFacture(p: PromessePatient) {
    startTransition(async () => {
      vibrer()
      appliquerOptimiste({ type: 'facture', id: p.id })
      try {
        await basculerPromesseFacturee(p.id, !p.facture)
      } catch (err) {
        toast({
          type: 'erreur',
          message: err instanceof Error ? err.message : 'Échec du changement de facturation.',
        })
      }
    })
  }

  function supprimer(p: PromessePatient) {
    retirerApresAnimation(p.id, () =>
      startTransition(async () => {
        appliquerOptimiste({ type: 'retrait', id: p.id })
        try {
          await supprimerPromesse(p.id)
          toast({ type: 'succes', message: 'Promesse supprimée.' })
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la suppression de la promesse.',
          })
        }
      })
    )
  }

  const idRecherche = useId()
  const rechercheSaisie = recherche.trim()

  return (
    <div className="flex flex-1 flex-col gap-3">
      <search className="flex flex-col gap-1.5">
        <label htmlFor={idRecherche} className="text-[12px] font-semibold text-muted">
          Médicament reçu : qui l&rsquo;attend ?
        </label>
        <div className="relative">
          <IconRecherche className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-muted" />
          <input
            id={idRecherche}
            type="search"
            value={recherche}
            onChange={(e) => setRecherche(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setRecherche('')
            }}
            placeholder="Ex. Doliprane 1000"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="search"
            className={`${CHAMP_CLASS} bg-surface pl-10 pr-11 shadow-card border-transparent [&::-webkit-search-cancel-button]:appearance-none`}
          />
          {recherche && (
            <button
              type="button"
              onClick={() => setRecherche('')}
              aria-label="Effacer la recherche"
              className={`absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:text-ink ${CLASSE_FOCUS}`}
            >
              <IconFermer className="h-4 w-4" />
            </button>
          )}
        </div>
        {/* Annonce du nombre de résultats aux lecteurs d'écran (et rappel
            visuel discret) : sans elle, rien ne signale que la liste
            en dessous vient de se filtrer. */}
        <p role="status" className={`text-[12px] text-muted ${nombreVisibles === 0 ? 'sr-only' : ''}`}>
          {rechercheSaisie
            ? nombreVisibles > 0
              ? `${libellePatients(nombreVisibles)} en attente pour « ${rechercheSaisie} »`
              : `Personne n'attend « ${rechercheSaisie} »`
            : ''}
        </p>
      </search>

      {formulaire.ouvert ? (
        <FormulairePromesse
          key={formulaire.medicament}
          medicamentInitial={formulaire.medicament}
          focusAuMontage={formulaire.focus}
          fermable={promessesOptimistes.length > 0}
          enCours={creationEnCours}
          onEnregistrer={enregistrer}
          onFermer={() => setFormulaire({ ouvert: false, medicament: '', focus: false })}
        />
      ) : (
        <button
          type="button"
          onClick={() => ouvrirFormulaire(rechercheSaisie)}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary-soft px-4 text-[13.5px] font-semibold text-primary hover:bg-primary hover:text-white motion-safe:transition-colors ${CLASSE_FOCUS}`}
        >
          <IconAjouter className="h-4 w-4" />
          Nouvelle promesse
        </button>
      )}

      {promessesOptimistes.length === 0 ? (
        <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
          <p className="text-[14px] font-semibold text-ink">Aucun patient en attente</p>
          <p className="max-w-[34ch] text-[13px] text-muted">
            Quand un patient repart sans son médicament, note-le ici : l&rsquo;équipe saura qui rappeler dès la
            livraison.
          </p>
        </div>
      ) : groupes.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-[20px] bg-surface px-5 py-8 text-center shadow-card">
          <div className="flex flex-col gap-1">
            <p className="text-[14px] font-semibold text-ink">
              Personne n&rsquo;attend « {rechercheSaisie} »
            </p>
            <p className="max-w-[34ch] text-[13px] text-muted">
              Vérifie l&rsquo;orthographe, ou essaie le début du nom seulement.
            </p>
          </div>
          {!formulaire.ouvert && (
            <button
              type="button"
              onClick={() => ouvrirFormulaire(rechercheSaisie)}
              className={`min-h-11 rounded-xl border border-border px-4 text-[13px] font-semibold text-primary hover:bg-primary-soft motion-safe:transition-colors ${CLASSE_FOCUS}`}
            >
              Noter une promesse pour « {rechercheSaisie} »
            </button>
          )}
        </div>
      ) : (
        // Deux colonnes façon "maçonnerie" sur desktop : des groupes de hauteurs
        // très différentes (1 patient / 6 patients) laisseraient des trous
        // dans une grille à lignes alignées.
        <div className="flex flex-col gap-3 lg:block lg:columns-2 lg:gap-3 lg:[&>*]:mb-3 lg:[&>*]:break-inside-avoid">
          {groupes.map((g) => (
            <GroupeMedicament
              key={g.cle}
              groupe={g}
              estEnSortie={estEnSortie}
              onAjouter={() => ouvrirFormulaire(g.medicament)}
              onTraiter={traiter}
              onBasculerFacture={basculerFacture}
              onDemanderSuppression={setASupprimer}
            />
          ))}
        </div>
      )}

      <ModaleConfirmation
        ouvert={aSupprimer !== null}
        titre={`Supprimer la promesse de ${aSupprimer?.nom_patient ?? ''} ?`}
        description="Elle disparaîtra sans passer par l'historique. Si le patient a été rappelé, utilise plutôt « Traitée »."
        texteConfirmer="Supprimer"
        onConfirmer={() => {
          if (aSupprimer) supprimer(aSupprimer)
          setASupprimer(null)
        }}
        onAnnuler={() => setASupprimer(null)}
      />
    </div>
  )
}

// ─── Groupe d'un médicament ───────────────────────────────────────────────

function GroupeMedicament({
  groupe,
  estEnSortie,
  onAjouter,
  onTraiter,
  onBasculerFacture,
  onDemanderSuppression,
}: {
  groupe: Groupe
  estEnSortie: (id: string) => boolean
  onAjouter: () => void
  onTraiter: (p: PromessePatient) => void
  onBasculerFacture: (p: PromessePatient) => void
  onDemanderSuppression: (p: PromessePatient) => void
}) {
  const idTitre = useId()

  return (
    <section aria-labelledby={idTitre} className="item-entree rounded-[20px] bg-surface p-4 shadow-card">
      <div className="mb-1 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id={idTitre} className="wrap-anywhere text-[16px] font-semibold leading-snug text-ink">
            {groupe.medicament}
          </h2>
          <p className="text-[12px] text-muted">{libellePatients(groupe.promesses.length)} en attente</p>
        </div>
        <button
          type="button"
          onClick={onAjouter}
          aria-label={`Ajouter un patient en attente de ${groupe.medicament}`}
          className={`group -m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 ${CLASSE_FOCUS}`}
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-soft text-primary group-hover:bg-primary group-hover:text-white motion-safe:transition-colors">
            <IconAjouter className="h-4 w-4" />
          </span>
        </button>
      </div>
      <ul className="divide-y divide-border">
        {groupe.promesses.map((p) => (
          <LignePromesse
            key={p.id}
            promesse={p}
            enSortie={estEnSortie(p.id)}
            onTraiter={onTraiter}
            onBasculerFacture={onBasculerFacture}
            onDemanderSuppression={onDemanderSuppression}
          />
        ))}
      </ul>
    </section>
  )
}

function LignePromesse({
  promesse: p,
  enSortie,
  onTraiter,
  onBasculerFacture,
  onDemanderSuppression,
}: {
  promesse: PromessePatient
  enSortie: boolean
  onTraiter: (p: PromessePatient) => void
  onBasculerFacture: (p: PromessePatient) => void
  onDemanderSuppression: (p: PromessePatient) => void
}) {
  // Seule une ligne encore temporaire (ajout optimiste en attente du
  // serveur) est désactivée : à l'arrivée d'un médicament attendu par
  // plusieurs patients, on enchaîne les « Traitée » sans attendre chaque
  // aller-retour (le double tap sur une même ligne est déjà neutralisé par
  // useRetraitAnime).
  const temporaire = p.id.startsWith(PREFIXE_TEMPORAIRE)
  const desactive = temporaire

  return (
    <li
      className={`flex flex-col gap-0.5 py-3 last:pb-0 ${temporaire ? 'opacity-60' : ''} ${
        enSortie ? 'item-sortie' : 'item-entree'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="wrap-anywhere text-[14.5px] font-semibold leading-snug text-ink">{p.nom_patient}</p>
          <a
            href={lienTelephone(p.telephone_patient)}
            aria-label={`Appeler ${p.nom_patient} au ${p.telephone_patient}`}
            className={`-mx-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[14px] font-medium tabular-nums text-primary hover:bg-primary-soft motion-safe:transition-colors ${CLASSE_FOCUS}`}
          >
            <IconTelephone className="h-[15px] w-[15px] shrink-0" />
            {p.telephone_patient}
          </a>
        </div>
        <button
          type="button"
          onClick={() => onTraiter(p)}
          disabled={desactive}
          aria-label={`Marquer la promesse de ${p.nom_patient} comme traitée`}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-primary px-3.5 text-[13px] font-semibold text-white hover:bg-primary-dark motion-safe:transition-colors disabled:opacity-50 ${CLASSE_FOCUS}`}
        >
          <IconCoche className="h-4 w-4" />
          Traitée
        </button>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onBasculerFacture(p)}
          disabled={desactive}
          aria-label={`Facturation de ${p.nom_patient} : ${p.facture ? 'facturé' : 'non facturé'}. Changer`}
          className={`group -my-1.5 flex min-h-11 items-center rounded-full py-1.5 disabled:opacity-50 ${CLASSE_FOCUS}`}
        >
          <span
            className={`rounded-full px-2.5 py-1 text-[12px] font-bold ring-inset group-hover:ring-1 motion-safe:transition-colors ${
              p.facture ? 'bg-green-soft text-green ring-green/40' : 'bg-accent-soft text-accent ring-accent/40'
            }`}
          >
            {p.facture ? 'Facturé' : 'Non facturé'}
          </span>
        </button>
        <span className="min-w-0 flex-1 truncate text-[12px] text-muted">{depuisQuand(p.created_at)}</span>
        <button
          type="button"
          onClick={() => onDemanderSuppression(p)}
          disabled={desactive}
          aria-label={`Supprimer la promesse de ${p.nom_patient}`}
          className={`-m-2.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-rec disabled:opacity-50 ${CLASSE_FOCUS}`}
        >
          <IconCorbeille className="h-4 w-4" />
        </button>
      </div>
    </li>
  )
}

// ─── Formulaire de création ───────────────────────────────────────────────

// Motif d'erreur de champ établi dans DESIGN.md (Inputs → Erreur) : texte
// 12 px `text-rec` juste sous le contrôle, relié par aria-describedby — pas
// de contour rouge dédié.
function MessageErreur({ id, erreur }: { id: string; erreur?: string }) {
  if (!erreur) return null
  return (
    <p id={id} className="text-[12px] font-medium text-rec">
      {erreur}
    </p>
  )
}

function FormulairePromesse({
  medicamentInitial,
  focusAuMontage,
  fermable,
  enCours,
  onEnregistrer,
  onFermer,
}: {
  medicamentInitial: string
  focusAuMontage: boolean
  fermable: boolean
  enCours: boolean
  onEnregistrer: (champs: {
    nom_medicament: string
    nom_patient: string
    telephone_patient: string
    facture: boolean
  }) => Promise<boolean>
  onFermer: () => void
}) {
  const [champs, setChamps] = useState({
    nom_medicament: medicamentInitial,
    nom_patient: '',
    telephone_patient: '',
  })
  const [facture, setFacture] = useState(false)
  // Erreurs affichées seulement après une première tentative d'envoi (ou
  // à la sortie du champ téléphone), puis recalculées à chaque frappe pour
  // disparaître dès que le champ est corrigé.
  const [tentative, setTentative] = useState(false)
  const [telephoneQuitte, setTelephoneQuitte] = useState(false)
  const idBase = useId()

  const erreursCalculees = validerPromesse(champs)
  const erreurs: ErreursPromesse = tentative
    ? erreursCalculees
    : telephoneQuitte && champs.telephone_patient.trim()
      ? { telephone_patient: erreursCalculees.telephone_patient }
      : {}

  function modifier(champ: ChampPromesse, valeur: string) {
    setChamps((c) => ({ ...c, [champ]: valeur }))
  }

  function idChamp(champ: ChampPromesse) {
    return `${idBase}-${champ}`
  }

  // Focus sur le premier champ encore vide quand le formulaire est ouvert
  // par un geste (pas au chargement de la page) : médicament déjà
  // pré-rempli → on passe directement au nom du patient.
  const champAFocaliser: ChampPromesse | null = focusAuMontage
    ? medicamentInitial.trim()
      ? 'nom_patient'
      : 'nom_medicament'
    : null

  function proprietesChamp(champ: ChampPromesse) {
    const erreur = erreurs[champ]
    return {
      id: idChamp(champ),
      name: champ,
      value: champs[champ],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => modifier(champ, e.target.value),
      'aria-invalid': erreur ? true : undefined,
      'aria-describedby': erreur ? `${idChamp(champ)}-erreur` : undefined,
      autoFocus: champAFocaliser === champ,
      // Pas d'autocomplétion navigateur : ce sont les coordonnées du
      // patient, pas celles du membre de l'équipe qui tient le téléphone.
      autoComplete: 'off',
      className: CHAMP_CLASS,
    }
  }

  return (
    <form
      noValidate
      aria-label="Nouvelle promesse patient"
      onSubmit={async (e) => {
        e.preventDefault()
        setTentative(true)
        const erreursEnvoi = validerPromesse(champs)
        const premierChampEnErreur = (['nom_medicament', 'nom_patient', 'telephone_patient'] as const).find(
          (c) => erreursEnvoi[c]
        )
        if (premierChampEnErreur) {
          document.getElementById(idChamp(premierChampEnErreur))?.focus()
          return
        }
        await onEnregistrer({ ...champs, facture })
      }}
      className="item-entree flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-heading text-[16px] font-semibold text-ink">Nouvelle promesse</h2>
        {fermable && (
          <button
            type="button"
            onClick={onFermer}
            aria-label="Fermer le formulaire"
            className={`-m-2.5 flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-ink ${CLASSE_FOCUS}`}
          >
            <IconFermer className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor={idChamp('nom_medicament')} className="text-[12px] font-semibold text-muted">
          Médicament attendu
        </label>
        <input
          {...proprietesChamp('nom_medicament')}
          maxLength={LONGUEUR_MAX_MEDICAMENT}
          placeholder="Ex. Doliprane 1000 mg"
          autoCapitalize="sentences"
          enterKeyHint="next"
        />
        <MessageErreur id={`${idChamp('nom_medicament')}-erreur`} erreur={erreurs.nom_medicament} />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={idChamp('nom_patient')} className="text-[12px] font-semibold text-muted">
            Patient
          </label>
          <input
            {...proprietesChamp('nom_patient')}
            maxLength={LONGUEUR_MAX_PATIENT}
            placeholder="Nom et prénom"
            autoCapitalize="words"
            enterKeyHint="next"
          />
          <MessageErreur id={`${idChamp('nom_patient')}-erreur`} erreur={erreurs.nom_patient} />
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <label htmlFor={idChamp('telephone_patient')} className="text-[12px] font-semibold text-muted">
            Téléphone
          </label>
          <input
            {...proprietesChamp('telephone_patient')}
            type="tel"
            inputMode="tel"
            maxLength={30}
            placeholder="06 12 34 56 78"
            enterKeyHint="done"
            onBlur={() => {
              setTelephoneQuitte(true)
              // Mise en forme "06 12 34 56 78" dès que la saisie est valide :
              // relecture plus facile avant d'enregistrer.
              if (!validerTelephone(champs.telephone_patient)) {
                modifier('telephone_patient', formaterTelephone(champs.telephone_patient))
              }
            }}
            className={`${CHAMP_CLASS} tabular-nums`}
          />
          <MessageErreur id={`${idChamp('telephone_patient')}-erreur`} erreur={erreurs.telephone_patient} />
        </div>
      </div>

      <fieldset className="flex flex-col gap-1">
        <legend className="mb-1 text-[12px] font-semibold text-muted">Déjà facturé ?</legend>
        <div className="flex rounded-xl bg-track p-1">
          {([false, true] as const).map((valeur) => (
            <label
              key={String(valeur)}
              className="flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-lg text-[13px] font-semibold text-muted has-checked:bg-surface has-checked:text-primary has-checked:shadow-sm has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary motion-safe:transition"
            >
              <input
                type="radio"
                name="facture"
                value={valeur ? 'oui' : 'non'}
                checked={facture === valeur}
                onChange={() => setFacture(valeur)}
                className="sr-only"
              />
              {valeur ? 'Oui, facturé' : 'Non, à facturer'}
            </label>
          ))}
        </div>
      </fieldset>

      <button
        type="submit"
        disabled={enCours}
        className={`min-h-11 rounded-xl bg-primary px-4 py-3 text-[13.5px] font-semibold text-white hover:bg-primary-dark motion-safe:transition-colors disabled:opacity-50 ${CLASSE_FOCUS}`}
      >
        {enCours ? 'Enregistrement…' : 'Enregistrer la promesse'}
      </button>
    </form>
  )
}
