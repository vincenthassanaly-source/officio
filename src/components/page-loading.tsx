// Primitives de squelette partagées par les loading.tsx (frontière Suspense
// de chaque route, voir src/app/(app)/*/loading.tsx).
//
// Composant serveur : aucun `use client` ici, un fallback de Suspense n'a
// aucun état ni interaction et n'a pas à embarquer de JS client. C'est aussi
// la raison pour laquelle ces primitives vivent dans ce fichier plutôt que
// dans les composants de liste correspondants — VaccinsSquelette est encore
// exporté depuis vaccins-liste.tsx ('use client'), qui reste le seul cas.
//
// Les dimensions reprennent celles des vrais composants (hauteurs de cartes,
// arrondis, gouttières) : c'est tout l'intérêt d'un squelette de forme, il
// évite le saut visuel au moment où le contenu réel remplace les blocs.

const BLOC = 'bg-neutral-soft'

export function SqueletteTitre({ largeur = 'w-40' }: { largeur?: string }) {
  return <div className={`h-6 ${largeur} rounded-md ${BLOC}`} />
}

/** Rangée de filtres en pastilles (onglets de statut, filtres d'équipe…). */
export function SquelettePastilles({ nombre = 3 }: { nombre?: number }) {
  const largeurs = ['w-16', 'w-24', 'w-20', 'w-28', 'w-14']
  return (
    <div className="flex gap-1.5">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`h-7 ${largeurs[i % largeurs.length]} rounded-full ${BLOC}`} />
      ))}
    </div>
  )
}

/** Champ de recherche ou de saisie pleine largeur. */
export function SqueletteChamp() {
  return <div className={`h-10 rounded-xl ${BLOC}`} />
}

/** Bandeau d'onglets segmenté (Cahier de liaison, agenda, huiles). */
export function SqueletteOnglets({ nombre = 2 }: { nombre?: number }) {
  return (
    <div className="flex gap-1 rounded-xl bg-track p-1">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`h-8 flex-1 rounded-lg ${BLOC}`} />
      ))}
    </div>
  )
}

/** Liste verticale de cartes, la forme la plus répandue de l'app. */
export function SqueletteCartes({ nombre = 4, hauteur = 'h-16' }: { nombre?: number; hauteur?: string }) {
  return (
    <div className="flex flex-col gap-2.5">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`${hauteur} rounded-[20px] ${BLOC}`} />
      ))}
    </div>
  )
}

/** Grille de tuiles carrées (tuiles de modules de l'accueil). */
export function SqueletteGrilleTuiles({ nombre = 8 }: { nombre?: number }) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      {Array.from({ length: nombre }, (_, i) => (
        <div key={i} className={`h-[86px] rounded-[20px] ${BLOC}`} />
      ))}
    </div>
  )
}

/** Enveloppe commune : occupe la hauteur disponible et porte le pouls. */
export function SquelettePage({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-1 animate-pulse flex-col gap-3">{children}</div>
}

// Repli par défaut, conservé tel quel pour les routes dont la forme réelle
// est déjà proche d'une simple liste de cartes (carnet, fournisseurs, notes,
// suggestions, ruptures, CNO, chaussures, documents, profil…). Les routes à
// fort écart de forme ont leur propre squelette : accueil, agenda, liaison,
// huiles essentielles et vaccins.
export function PageLoading() {
  return (
    <SquelettePage>
      <SqueletteTitre />
      <div className="h-24 rounded-2xl bg-neutral-soft" />
      <SqueletteCartes nombre={3} />
    </SquelettePage>
  )
}
