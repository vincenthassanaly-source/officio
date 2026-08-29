# Rapport — Total d'heures dans la vue "Mois complet" de l'Agenda

Date : 2026-08-29

## Objectif

Ajouter dans la légende de la vue "Mois complet" (`PlanningEquipeMois`) le total d'heures travaillées par employé, sur le même modèle que la vue "Semaine" (`PlanningEquipe`), sans toucher à la logique de la grille mensuelle (pastilles, sélection de jour, modale de détail).

## Choix d'implémentation

Les fonctions `heureEnDecimal` et `formatDureeHeures` étaient dupliquées à l'identique entre les deux vues. Plutôt que de les recopier dans `planning-equipe-mois.tsx`, elles ont été extraites dans un nouveau fichier partagé :

- **`src/lib/duree-creneaux.ts`** (nouveau) : contient `heureEnDecimal(heure: string): number` et `formatDureeHeures(heures: number): string`, copiées à l'identique depuis `planning-equipe.tsx` (aucun changement de comportement).

## Fichiers modifiés

### `src/components/agenda/planning-equipe.tsx`
- Suppression des définitions locales de `heureEnDecimal` et `formatDureeHeures`.
- Import de ces deux fonctions depuis `@/lib/duree-creneaux`.
- Aucun changement de comportement ni de rendu.

### `src/components/agenda/planning-equipe-mois.tsx`
- Import de `formatDureeHeures` et `heureEnDecimal` depuis `@/lib/duree-creneaux`.
- Ajout d'un `useMemo` `heuresParMembre` basé sur le prop `creneaux` (déjà scopé au mois affiché côté serveur — aucun filtrage de date supplémentaire nécessaire) : ne garde que les créneaux de type `travail` avec `heure_debut`/`heure_fin` renseignés, et cumule la durée par `profil_id` dans une `Map<string, number>`.
- Dans la légende du haut (`.map(equipe...)`), ajout après le nom de chaque membre du même `<span className="text-[10px] font-normal text-muted">{formatDureeHeures(heuresParMembre.get(m.id) ?? 0)}</span>` que dans la vue semaine.

### `src/lib/duree-creneaux.ts` (nouveau fichier)
- Contient les deux fonctions utilitaires partagées, sans aucune logique supplémentaire.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npm run lint` : ✅ aucune erreur/warning sur les fichiers modifiés. (Le lint global remonte 1 erreur et 4 warnings pré-existants dans `src/components/switch-identite.tsx`, fichier non touché par cette tâche.)
- Rendu visuel : la légende reste en `flex-wrap`, chaque `<span>` de membre regroupe désormais le nom et le total d'heures dans un même bloc `flex items-center` — le comportement de retour à la ligne sur mobile est identique à celui de la vue semaine, qui utilise déjà ce pattern à plusieurs membres par ligne.
- Aucune modification de la logique de la grille mensuelle (pastilles, sélection de jour, `ModaleDetailJour`).

## Commit

Un seul commit isolé contenant les 3 fichiers ci-dessus, poussé sur la branche `claude/agenda-mois-total-heures-tzou0k`.
