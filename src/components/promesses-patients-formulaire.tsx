'use client'

import { useId, useState } from 'react'
import {
  formaterTelephone,
  validerPromesse,
  validerTelephone,
  LONGUEUR_MAX_MEDICAMENT,
  LONGUEUR_MAX_PATIENT,
  QUANTITE_MAX,
  type ChampPromesse,
  type ErreursPromesse,
} from '@/lib/promesses-patients'

const CLASSE_FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary'

const CHAMP_CLASS =
  'w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink placeholder:text-muted outline-none focus-visible:border-primary focus-visible:outline-2 focus-visible:outline-primary'

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
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

export type ChampsNouvellePromesse = {
  nom_medicament: string
  quantite: string
  nom_patient: string
  telephone_patient: string
  facture: boolean
}

// Charge utile de l'action creerPromesse (mêmes noms de champs que ceux
// lus par champsPromesse côté serveur).
export function formDataPromesse(champs: ChampsNouvellePromesse): FormData {
  const formData = new FormData()
  formData.set('nom_medicament', champs.nom_medicament)
  formData.set('quantite', champs.quantite)
  formData.set('nom_patient', champs.nom_patient)
  formData.set('telephone_patient', champs.telephone_patient)
  formData.set('facture', champs.facture ? 'oui' : 'non')
  return formData
}

// Formulaire partagé entre la page Promesses patients (variante « carte »,
// en ligne au-dessus de la liste) et le bouton + de l'accueil (variante
// « panneau », dans la sheet de création rapide qui porte déjà son fond,
// son bouton de fermeture et son piège à focus).
export function FormulairePromesse({
  medicamentInitial,
  focusAuMontage,
  fermable,
  enCours,
  onEnregistrer,
  onFermer,
  variante = 'carte',
  idTitre,
}: {
  medicamentInitial: string
  focusAuMontage: boolean
  fermable: boolean
  enCours: boolean
  onEnregistrer: (champs: ChampsNouvellePromesse) => Promise<boolean>
  onFermer: () => void
  variante?: 'carte' | 'panneau'
  idTitre?: string
}) {
  const [champs, setChamps] = useState({
    nom_medicament: medicamentInitial,
    quantite: '',
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
      aria-label={variante === 'carte' ? 'Nouvelle promesse patient' : undefined}
      onSubmit={async (e) => {
        e.preventDefault()
        setTentative(true)
        const erreursEnvoi = validerPromesse(champs)
        const premierChampEnErreur = (['nom_medicament', 'quantite', 'nom_patient', 'telephone_patient'] as const).find(
          (c) => erreursEnvoi[c]
        )
        if (premierChampEnErreur) {
          document.getElementById(idChamp(premierChampEnErreur))?.focus()
          return
        }
        await onEnregistrer({ ...champs, facture })
      }}
      className={
        variante === 'carte'
          ? 'item-entree flex flex-col gap-3 rounded-[20px] bg-surface p-4 shadow-card'
          : 'flex flex-col gap-3 p-4'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id={idTitre}
          className={`font-heading text-ink ${variante === 'carte' ? 'text-[16px] font-semibold' : 'text-lg'}`}
        >
          Nouvelle promesse
        </h2>
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
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 flex-col gap-1">
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
          </div>
          {/* Quantité : vide = 1, le cas courant ne coûte aucune saisie. */}
          <div className="flex w-[84px] shrink-0 flex-col gap-1">
            <label htmlFor={idChamp('quantite')} className="text-[12px] font-semibold text-muted">
              Quantité
            </label>
            <input
              {...proprietesChamp('quantite')}
              inputMode="numeric"
              maxLength={String(QUANTITE_MAX).length}
              placeholder="1"
              enterKeyHint="next"
              className={`${CHAMP_CLASS} text-center tabular-nums`}
            />
          </div>
        </div>
        <MessageErreur id={`${idChamp('nom_medicament')}-erreur`} erreur={erreurs.nom_medicament} />
        <MessageErreur id={`${idChamp('quantite')}-erreur`} erreur={erreurs.quantite} />
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
            Téléphone <span className="font-normal">(facultatif)</span>
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
              if (champs.telephone_patient.trim() && !validerTelephone(champs.telephone_patient)) {
                modifier('telephone_patient', formaterTelephone(champs.telephone_patient) ?? '')
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
