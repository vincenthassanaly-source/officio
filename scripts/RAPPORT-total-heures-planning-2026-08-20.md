# Total d'heures hebdo par employé dans la légende du planning — rapport

## Fichier modifié

- `src/components/agenda/planning-equipe.tsx` — seul fichier touché.

## Ce qui a été ajouté

1. **Calcul mémoïsé** (`heuresParMembre`, `useMemo`) : parcourt `creneaux`
   (déjà filtrée par la page sur la semaine affichée) et, pour chaque
   créneau `type === 'travail'` avec `heure_debut`/`heure_fin` renseignés,
   additionne `heureEnDecimal(heure_fin) - heureEnDecimal(heure_debut)` dans
   une `Map<string, number>` indexée par `profil_id`. Recalculé uniquement
   quand `creneaux` change.
2. **Fonction de formatage** `formatDureeHeures(heures: number): string` :
   arrondit à 0,1h près (`Math.round(heures * 10) / 10`) puis affiche en
   décimal français avec virgule — `32,5h` si non entier, `32h` (sans
   `,0`) si le total tombe juste.
3. **Affichage** dans la légende (lignes ~113-121) : un `<span>` supplémentaire
   après le nom de chaque membre, `heuresParMembre.get(m.id) ?? 0` passé à
   `formatDureeHeures`.

## Format d'affichage retenu

`text-[10px] font-normal text-muted` — légèrement plus petit que le nom
(`text-[11px] font-medium text-ink`) et en couleur atténuée (`text-muted`),
pour rester discret et ne pas surcharger la légende. Aucun changement de
layout : reste dans le `flex items-center gap-1.5` existant, avec le
`flex-wrap` du conteneur parent qui absorbe la largeur supplémentaire.

## Portée

- Aucune modification de `src/lib/data/plannings.ts`, de
  `src/app/(app)/agenda/page.tsx`, ni de la base de données : calcul
  purement dérivé de la prop `creneaux` déjà chargée et déjà filtrée sur la
  semaine.
- Aucun changement de comportement existant (clic sur un créneau, ouverture
  du détail, formulaires d'ajout/édition, etc.) — uniquement un ajout dans
  le bloc de légende.

## Vérifications

- `npx eslint src/components/agenda/planning-equipe.tsx` → aucune erreur.
  (`npm run lint` sur l'ensemble du repo remonte 2 erreurs préexistantes
  dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, sans rapport avec
  ce changement et non introduites par lui.)
- `npx tsc --noEmit` → aucune erreur (TypeScript strict, pas de `any`
  introduit).
