# Badge coloré pour les initiales assignées sur l'agenda — rapport

Reprend le badge rond coloré déjà utilisé dans le module Tâches
(`taches-list.tsx`, `CarteTache`) pour les initiales de la personne
assignée affichées sur les tâches de l'agenda (onglet « Vue globale »,
vues semaine et mois) — jusqu'ici un simple texte gris sans fond.

## Fichiers modifiés

- **`src/components/agenda/agenda-item-ligne.tsx`**
  - Import de `type { CouleurAvatar } from '@/lib/data/couleurs-membres'`
    et `COULEUR_PAR_DEFAUT` depuis `@/lib/avatar-couleur`.
  - `ItemLigne` reçoit une nouvelle prop `couleurs: Map<string,
    CouleurAvatar>`.
  - Dans le cas `item.type === 'tache'` : calcul de
    `couleurAssigne = (t.assigne ? couleurs.get(t.assigne.id) : null) ??
    COULEUR_PAR_DEFAUT` (même expression que `CarteTache` dans
    `taches-list.tsx`). Le `<span>` texte gris des initiales est remplacé
    par une pastille ronde `${couleurAssigne.fond} ${couleurAssigne.texte}`
    — mêmes classes de taille que le badge d'avatar de `taches-list.tsx`
    (`h-[18px] w-[18px] text-[8.5px] font-bold rounded-full`), cohérentes
    avec le format compact de cette ligne et avec le badge de catégorie/
    échéance juste à côté.
- **`src/components/agenda/agenda-vue-globale.tsx`** : nouvelle prop
  `couleurs: Map<string, CouleurAvatar>` sur `AgendaVueGlobale`, transmise
  à l'unique appel de `ItemLigne`.
- **`src/components/agenda/agenda-vue-globale-mois.tsx`** : même
  changement (prop `couleurs`, transmise à l'unique appel de `ItemLigne`).
- **`src/components/agenda/agenda.tsx`** : la Map `couleurs` déjà calculée
  (déjà transmise à `PlanningEquipe`/`PlanningEquipeMois`) est maintenant
  aussi transmise aux deux appels de `AgendaVueGlobale` et
  `AgendaVueGlobaleMois`, juste au-dessus.

## Vérifications

- Recherche de tout appelant de `ItemLigne` : seuls `agenda-vue-globale.tsx`
  et `agenda-vue-globale-mois.tsx` l'utilisent — les deux ont été mis à
  jour, aucun autre appelant à modifier.
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint` sur les 4 fichiers modifiés : 0 erreur/warning.
- `npx next build` : build de production réussi, `/agenda` toujours listé
  sans erreur.

## Points d'attention

- `avatar-couleur.ts` et `couleurs-membres.ts` non touchés, comme demandé
  — réutilisés tels quels via l'import déjà existant du type `CouleurAvatar`
  réexporté par `couleurs-membres.ts`.
- Aucun autre comportement modifié : tri des items, filtres, suppression de
  RDV, toggle/édition de tâche restent identiques — seul le rendu visuel
  des initiales change.

## Commit (1, isolé)

`Colorer les initiales de la personne assignée sur les tâches de l'agenda`
