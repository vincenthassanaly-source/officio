import { SquelettePage, SqueletteTitre, SquelettePastilles, SqueletteChamp } from '@/components/page-loading'

const BLOC = 'bg-neutral-soft'

// Forme réelle du module : rangée de filtres par genre (si plusieurs genres),
// recherche + bouton scanner, puis des groupes de catégorie contenant une
// grille de vignettes carrées (2 colonnes sur mobile, comme le vrai
// composant) — assez différente de la simple liste de cartes du repli
// PageLoading par défaut pour justifier un squelette dédié.
export default function Loading() {
  return (
    <SquelettePage>
      <SqueletteTitre largeur="w-48" />
      <SquelettePastilles nombre={3} />
      <div className="flex gap-1.5">
        <div className="flex-1">
          <SqueletteChamp />
        </div>
        <div className={`h-10 w-11 shrink-0 rounded-xl ${BLOC}`} />
      </div>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className={`h-3 w-24 rounded ${BLOC}`} />
          <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className={`aspect-square rounded-[20px] ${BLOC}`} />
            ))}
          </div>
        </div>
      </div>
    </SquelettePage>
  )
}
