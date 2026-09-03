import {
  SqueletteCartes,
  SqueletteChamp,
  SqueletteOnglets,
  SquelettePage,
  SqueletteTitre,
} from '@/components/page-loading'

// Forme réelle du Cahier de liaison : titre, onglets « Fil de l'équipe » /
// « Tâches », barre de recherche + filtres de catégorie, puis le fil de
// cartes de messages (plus hautes qu'une carte de liste ordinaire — auteur,
// contenu, pied de carte avec lecteurs et pouces).
export default function Loading() {
  return (
    <SquelettePage>
      <SqueletteTitre largeur="w-52" />
      <SqueletteOnglets />
      <SqueletteChamp />
      <SqueletteCartes nombre={4} hauteur="h-32" />
    </SquelettePage>
  )
}
