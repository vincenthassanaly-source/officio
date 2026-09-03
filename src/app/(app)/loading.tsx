import {
  SqueletteCartes,
  SqueletteChamp,
  SqueletteGrilleTuiles,
  SquelettePage,
  SqueletteTitre,
} from '@/components/page-loading'

// Squelette dédié à l'accueil plutôt que le PageLoading générique : c'est la
// route la plus vue de l'app, et la seule dont le squelette s'affiche à
// chaque visite (force-dynamic + fetchCache no-store + prefetch={false} sur
// les liens de navigation, voir page.tsx et bottom-nav.tsx). Reprend sa forme
// réelle — salutation, recherche globale, encarts tâches/messages, grille de
// tuiles de modules — pour éviter le saut visuel au remplacement.
export default function Loading() {
  return (
    <SquelettePage>
      <div className="flex flex-col gap-1.5">
        <SqueletteTitre largeur="w-48" />
        <div className="h-3.5 w-32 rounded-md bg-neutral-soft" />
      </div>

      <div className="mt-2.5">
        <SqueletteChamp />
      </div>

      <div className="mt-1.5">
        <SqueletteCartes nombre={2} hauteur="h-28" />
      </div>

      <div className="mt-2">
        <SqueletteGrilleTuiles nombre={8} />
      </div>
    </SquelettePage>
  )
}
