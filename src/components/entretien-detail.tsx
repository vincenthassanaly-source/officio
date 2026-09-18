'use client'

import { useState, type KeyboardEvent } from 'react'
import dynamic from 'next/dynamic'
import type { TypeEntretien, ItemEntretien, DocumentEntretien, SectionEntretien } from '@/lib/data/entretiens'
import { EntretienMethodologie } from '@/components/entretien-methodologie'
import type { EtatModeEntretien } from '@/components/entretien-mode-entretien'
import { BandeauEdition, CLASSE_FOCUS } from '@/components/entretien-ui'

// Un seul onglet est visible à la fois : les sections autres que la
// méthodologie (affichée par défaut à l'ouverture) sont chargées à la
// demande plutôt que dans le bundle initial de la fiche.
const EntretienItems = dynamic(() => import('@/components/entretien-items').then((m) => m.EntretienItems), {
  loading: () => <ChargementSection />,
})
const EntretienDocuments = dynamic(
  () => import('@/components/entretien-documents').then((m) => m.EntretienDocuments),
  { loading: () => <ChargementSection /> }
)

type OngletEntretien = 'methodologie' | 'facturation' | 'documents'

const ONGLETS: { id: OngletEntretien; label: string }[] = [
  { id: 'methodologie', label: 'Script' },
  { id: 'facturation', label: 'Facturation' },
  { id: 'documents', label: 'Documents' },
]

// « Entretien » n'a de sens que sur le script : sur Facturation et Documents,
// le même mode (lecture) s'appelle « Consultation ». Le comportement est
// identique, seul le libellé change.
const LIBELLE_MODE_LECTURE: Record<OngletEntretien, string> = {
  methodologie: 'Entretien',
  facturation: 'Consultation',
  documents: 'Consultation',
}

function ChargementSection() {
  return (
    <div aria-busy="true" aria-label="Chargement de la section…" className="flex flex-col gap-2.5 rounded-[20px] bg-surface p-3.5 shadow-card">
      <div className="h-4 w-32 animate-pulse rounded bg-neutral-soft" />
      <div className="h-16 animate-pulse rounded-xl bg-neutral-soft" />
    </div>
  )
}

export function EntretienDetail({
  type,
  items,
  documents,
}: {
  type: TypeEntretien
  items: Record<SectionEntretien, ItemEntretien[]>
  documents: DocumentEntretien[]
}) {
  const [onglet, setOnglet] = useState<OngletEntretien>('methodologie')
  const [modeEdition, setModeEdition] = useState(false)

  // État du mode Entretien, gardé ici plutôt que dans le panneau Script : ce
  // panneau est démonté quand on consulte Facturation ou Documents en plein
  // entretien, et la progression ne doit pas s'y perdre. Volontairement en
  // mémoire seulement (aucune écriture serveur, ni localStorage/sessionStorage) :
  // perdue à la navigation ou au rechargement. La page monte ce composant avec
  // key={type.id} : elle repart de zéro quand on change de type d'entretien.
  const [coches, setCoches] = useState<ReadonlySet<string>>(() => new Set())
  const [phasesOuvertes, setPhasesOuvertes] = useState<ReadonlySet<string> | null>(null)
  const etatEntretien: EtatModeEntretien = {
    coches,
    phasesOuvertes,
    onChangerCoches: setCoches,
    onChangerPhasesOuvertes: setPhasesOuvertes,
  }

  return (
    // data-sticky-layout : voir globals.css (le wrapper du layout empêche sinon
    // tout élément sticky de coller en mobile).
    <div data-sticky-layout className="flex flex-1 flex-col gap-3">
      {!type.actif && (
        <p className="rounded-xl bg-neutral-soft px-3 py-2 text-[12.5px] font-semibold text-muted">
          Ce type d’entretien est archivé.
        </p>
      )}

      <div role="group" aria-label="Mode d’affichage" className="flex shrink-0 gap-1 rounded-xl bg-track p-1">
        <button
          type="button"
          aria-pressed={!modeEdition}
          onClick={() => setModeEdition(false)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-semibold ${CLASSE_FOCUS} ${
            !modeEdition ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          {LIBELLE_MODE_LECTURE[onglet]}
        </button>
        <button
          type="button"
          aria-pressed={modeEdition}
          onClick={() => setModeEdition(true)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-semibold ${CLASSE_FOCUS} ${
            modeEdition ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Édition
        </button>
      </div>

      <EntretienNavigation
        ongletActif={onglet}
        onChanger={setOnglet}
        compteurs={{
          methodologie: items.methodologie.length,
          facturation: items.facturation.length,
          documents: documents.length,
        }}
      />

      {modeEdition && <BandeauEdition onTerminer={() => setModeEdition(false)} />}

      <div id={`panneau-${onglet}`} role="tabpanel" aria-labelledby={`onglet-${onglet}`} className="flex flex-col gap-3">
        {onglet === 'methodologie' && (
          <EntretienMethodologie
            typeEntretienId={type.id}
            items={items.methodologie}
            modeEdition={modeEdition}
            etatEntretien={etatEntretien}
          />
        )}
        {onglet === 'facturation' && (
          <EntretienItems typeEntretienId={type.id} items={items.facturation} modeEdition={modeEdition} />
        )}
        {onglet === 'documents' && (
          <EntretienDocuments typeEntretienId={type.id} documents={documents} modeEdition={modeEdition} />
        )}
      </div>
    </div>
  )
}

function EntretienNavigation({
  ongletActif,
  onChanger,
  compteurs,
}: {
  ongletActif: OngletEntretien
  onChanger: (onglet: OngletEntretien) => void
  compteurs: Record<OngletEntretien, number>
}) {
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const direction = e.key === 'ArrowRight' ? 1 : -1
    const cible = ONGLETS[(index + direction + ONGLETS.length) % ONGLETS.length]
    onChanger(cible.id)
    document.getElementById(`onglet-${cible.id}`)?.focus()
  }

  return (
    <nav
      role="tablist"
      aria-label="Sections de la fiche"
      // h-12 (48 px) : le bandeau d'édition et la barre de progression collent
      // juste dessous avec `top-12`. Plein écran (marges négatives = celles du
      // conteneur du layout) pour que rien ne dépasse dans les gouttières.
      className="sticky top-0 z-20 -mx-4 flex h-12 gap-1 bg-bg px-4 sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10"
    >
      {ONGLETS.map((o, index) => (
        <button
          key={o.id}
          id={`onglet-${o.id}`}
          role="tab"
          type="button"
          aria-selected={ongletActif === o.id}
          aria-controls={`panneau-${o.id}`}
          aria-label={`${o.label} (${compteurs[o.id]})`}
          tabIndex={ongletActif === o.id ? 0 : -1}
          onClick={() => onChanger(o.id)}
          onKeyDown={(e) => onKeyDown(e, index)}
          className={`flex min-w-0 flex-auto flex-wrap items-center justify-center gap-x-1.5 overflow-hidden rounded-xl px-2 text-[13px] font-semibold ${CLASSE_FOCUS} ${
            ongletActif === o.id ? 'bg-primary text-white shadow-card' : 'bg-surface text-muted'
          }`}
        >
          {o.label}
          <span
            aria-hidden="true"
            className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[12px] font-bold tabular-nums ${
              ongletActif === o.id ? 'bg-surface text-primary' : 'bg-neutral-soft text-ink'
            }`}
          >
            {compteurs[o.id]}
          </span>
        </button>
      ))}
    </nav>
  )
}
