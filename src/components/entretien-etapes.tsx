import type { ReactNode } from 'react'
import type { ItemEntretien } from '@/lib/data/entretiens'

// Regroupement par phase du script de méthodologie. Les libellés de phase
// sont du texte libre propre à chaque type d'entretien (ex. « Année 1 —
// Entretien 1 » pour les entretiens au rythme annuel) : le regroupement se
// fait sur les valeurs distinctes réellement présentes, dans leur ordre
// d'apparition — pas sur une liste figée.
export function regrouperParEtape(items: ItemEntretien[]) {
  const general = items.filter((i) => i.phase === null)
  const ordreApparition: string[] = []
  for (const item of items) {
    if (item.phase !== null && !ordreApparition.includes(item.phase)) {
      ordreApparition.push(item.phase)
    }
  }
  const groupes = ordreApparition.map((phase) => ({ phase, items: items.filter((i) => i.phase === phase) }))
  return { general, groupes }
}

// Stepper numéroté par phase, avec un bloc "Contenu général" pour les items
// sans phase. Le rendu de chaque item est délégué à `rendreItem` : seule la
// structure de regroupement est partagée. Si aucune phase n'est utilisée par
// le type affiché, seule la liste simple (général) s'affiche.
export function StepperEtapes({
  general,
  groupes,
  rendreItem,
}: {
  general: ItemEntretien[]
  groupes: { phase: string; items: ItemEntretien[] }[]
  rendreItem: (item: ItemEntretien, index: number, groupe: ItemEntretien[]) => ReactNode
}) {
  const aPhases = groupes.length > 0

  return (
    <>
      {general.length > 0 && (
        <div className="flex flex-col gap-1.5">
          {aPhases && <h3 className="text-[12px] font-bold text-muted">Contenu général</h3>}
          {general.map((item, i) => rendreItem(item, i, general))}
        </div>
      )}

      {aPhases && (
        <ol className="flex flex-col">
          {groupes.map(({ phase, items: itemsGroupe }, index) => (
            <li key={phase} className="relative flex gap-3 pb-5 last:pb-0">
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
                <h3 className="mb-2 text-[13px] font-bold text-ink">{phase}</h3>
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
