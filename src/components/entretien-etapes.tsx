import type { ReactNode } from 'react'
import type { EtapeMethodologie, ItemEntretien } from '@/lib/data/entretiens'

// Regroupement par étape partagé entre la méthodologie et les questions
// (seules sections où entretien_items.etape est pertinent).
export const ORDRE_ETAPES: EtapeMethodologie[] = [
  'annee1_entretien1',
  'annee1_entretien2',
  'annee1_entretien3',
  'annees_suivantes',
]

export const LABELS_ETAPE: Record<EtapeMethodologie, string> = {
  annee1_entretien1: 'Année 1 — 1er entretien',
  annee1_entretien2: 'Année 1 — 2e entretien',
  annee1_entretien3: 'Année 1 — 3e entretien',
  annees_suivantes: 'Années suivantes',
}

export const OPTIONS_ETAPE: { valeur: EtapeMethodologie | ''; label: string }[] = [
  { valeur: '', label: 'Contenu général (non séquencé)' },
  ...ORDRE_ETAPES.map((etape) => ({ valeur: etape, label: LABELS_ETAPE[etape] })),
]

export function regrouperParEtape(items: ItemEntretien[]) {
  const general = items.filter((i) => i.etape === null)
  const groupes = ORDRE_ETAPES.map((etape) => ({ etape, items: items.filter((i) => i.etape === etape) })).filter(
    (g) => g.items.length > 0
  )
  return { general, groupes }
}

// Stepper numéroté par étape (méthodologie/questions), avec un bloc
// "Contenu général" pour les items sans étape. Le rendu de chaque item est
// délégué à `rendreItem` : seule la structure de regroupement est partagée.
export function StepperEtapes({
  general,
  groupes,
  rendreItem,
}: {
  general: ItemEntretien[]
  groupes: { etape: EtapeMethodologie; items: ItemEntretien[] }[]
  rendreItem: (item: ItemEntretien, index: number, groupe: ItemEntretien[]) => ReactNode
}) {
  const aEtapes = groupes.length > 0

  return (
    <>
      {general.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {aEtapes && <h3 className="text-[12px] font-bold text-muted">Contenu général</h3>}
          {general.map((item, i) => rendreItem(item, i, general))}
        </div>
      )}

      {aEtapes && (
        <ol className="flex flex-col">
          {groupes.map(({ etape, items: itemsGroupe }, index) => (
            <li key={etape} className="relative flex gap-3 pb-5 last:pb-0">
              {index < groupes.length - 1 && (
                <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-8 w-px bg-border" />
              )}
              <span
                aria-hidden="true"
                className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-[13px] font-bold text-white"
              >
                {index + 1}
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <h3 className="mb-2 text-[13px] font-bold text-ink">{LABELS_ETAPE[etape]}</h3>
                <div className="flex flex-col gap-1.5">
                  {itemsGroupe.map((item, i) => rendreItem(item, i, itemsGroupe))}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  )
}
