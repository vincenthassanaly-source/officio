'use client'

import { useState, type KeyboardEvent } from 'react'
import dynamic from 'next/dynamic'
import type { TypeEntretien, ItemEntretien, DocumentEntretien, SectionEntretien } from '@/lib/data/entretiens'
import { EntretienMethodologie } from '@/components/entretien-methodologie'

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

type OngletEntretien = 'methodologie' | 'facturation' | 'questions' | 'documents'

const ONGLETS: { id: OngletEntretien; label: string }[] = [
  { id: 'methodologie', label: 'Méthodologie' },
  { id: 'facturation', label: 'Facturation' },
  { id: 'questions', label: 'Questions' },
  { id: 'documents', label: 'Documents' },
]

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

  return (
    <div className="flex flex-1 flex-col gap-3">
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
          className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-semibold transition ${
            !modeEdition ? 'bg-surface text-primary shadow-sm' : 'text-muted'
          }`}
        >
          Consultation
        </button>
        <button
          type="button"
          aria-pressed={modeEdition}
          onClick={() => setModeEdition(true)}
          className={`flex min-h-11 flex-1 items-center justify-center rounded-lg px-3 text-[13px] font-semibold transition ${
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
          questions: items.questions.length,
          documents: documents.length,
        }}
      />

      <div id={`panneau-${onglet}`} role="tabpanel" aria-labelledby={`onglet-${onglet}`} className="flex flex-col gap-3">
        {onglet === 'methodologie' && (
          <EntretienMethodologie typeEntretienId={type.id} items={items.methodologie} modeEdition={modeEdition} />
        )}
        {onglet === 'facturation' && (
          <EntretienItems
            section="facturation"
            typeEntretienId={type.id}
            items={items.facturation}
            modeEdition={modeEdition}
          />
        )}
        {onglet === 'questions' && (
          <EntretienItems
            section="questions"
            typeEntretienId={type.id}
            items={items.questions}
            modeEdition={modeEdition}
          />
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
      className="sticky top-0 z-10 flex gap-1 overflow-x-auto bg-bg/95 py-1 backdrop-blur"
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
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3.5 text-[13px] font-semibold transition ${
            ongletActif === o.id ? 'bg-primary text-white shadow-card' : 'bg-surface text-muted'
          }`}
        >
          {o.label}
          <span
            aria-hidden="true"
            className={`flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold ${
              ongletActif === o.id ? 'bg-white/25 text-white' : 'bg-neutral-soft text-muted'
            }`}
          >
            {compteurs[o.id]}
          </span>
        </button>
      ))}
    </nav>
  )
}
