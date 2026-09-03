import {
  SqueletteCartes,
  SqueletteChamp,
  SqueletteOnglets,
  SquelettePastilles,
  SquelettePage,
  SqueletteTitre,
} from '@/components/page-loading'

// Forme réelle du module : onglets Liste / Calculateur / Posologie, puis
// dans l'onglet Liste (celui par défaut) la rangée de pastilles de statut
// avec leurs compteurs, la recherche, et la liste des huiles — en deux
// colonnes à partir de lg, comme le composant réel.
export default function Loading() {
  return (
    <SquelettePage>
      <SqueletteTitre largeur="w-44" />
      <SqueletteOnglets nombre={3} />
      <SquelettePastilles nombre={4} />
      <SqueletteChamp />
      <div className="lg:grid lg:grid-cols-2 lg:gap-2.5">
        <SqueletteCartes nombre={5} hauteur="h-[60px]" />
        <div className="hidden lg:block">
          <SqueletteCartes nombre={5} hauteur="h-[60px]" />
        </div>
      </div>
    </SquelettePage>
  )
}
