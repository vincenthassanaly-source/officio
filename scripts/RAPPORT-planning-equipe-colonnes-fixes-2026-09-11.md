# Rapport — Colonnes fixes pour les créneaux travail (Planning équipe)

Date : 2026-09-11

## Contexte

Dans la vue « Planning équipe » du module Agenda (`src/components/agenda/planning-equipe.tsx`),
chaque créneau de type `travail` d'un jour donné était affiché en `position:
absolute` avec `inset-x-0.5`, c'est-à-dire sur toute la largeur de la colonne
du jour. Quand plusieurs membres de l'équipe avaient un créneau de travail le
même jour, leurs blocs colorés se superposaient visuellement — le dernier
rendu recouvrait les précédents — au lieu d'apparaître côte à côte. C'était le
cas par exemple pour Yanel Dubray (09:00-12:30) et Fleur GUIDE (08:30-19:30)
le même jour.

## Solution implémentée

Chaque membre ayant au moins un créneau `travail` un jour donné occupe
désormais une **colonne verticale fixe et dédiée** sur toute la hauteur de la
journée (« couloirs de piscine »), même si les créneaux ne se chevauchent pas
dans le temps — aucun algorithme de recalcul dynamique façon Google Agenda.

### Détail des changements (`src/components/agenda/planning-equipe.tsx`)

Dans le rendu hebdomadaire (`weekDates.map(...)`, bloc travail) :

1. Pour chaque jour, calcul de `profilsJour` : la liste des `profil_id`
   distincts ayant un créneau `travail` ce jour-là, filtrée à partir de
   l'ordre de `equipe` (et non de l'ordre d'insertion des créneaux) — pour
   qu'un même membre reste toujours à la même position d'un jour à l'autre
   tant qu'il est présent.
2. Pour chaque créneau, la colonne horizontale est dérivée de l'index du
   `profil_id` dans `profilsJour` :
   - `largeur = 100 / nbColonnes` (%)
   - `left = calc(index * largeur% + 2px)`, `width = calc(largeur% - 4px)`
     (les `2px`/`4px` reprennent la marge de l'ancien `inset-x-0.5` pour
     garder un espacement visuel identique entre colonnes).
   - Pas de limite de nombre de colonnes ni de badge de repli « +n » : la
     largeur du jour est toujours divisée également entre toutes les
     personnes concernées.
3. Positionnement vertical (`top`/`height` selon `heure_debut`/`heure_fin`)
   inchangé.
4. Lisibilité dans des colonnes plus étroites :
   - La taille de police passe de `text-[8px]` à `text-[7px]` à partir de 3
     colonnes, puis `text-[6.5px]` à partir de 4 colonnes.
   - L'horaire (2ᵉ ligne du bloc) ne s'affiche que si la hauteur du créneau
     dépasse toujours le seuil existant (`hauteur > 26`) **et** qu'il y a au
     plus 2 colonnes ce jour-là — au-delà, l'horaire est masqué pour éviter
     le débordement, seules les initiales restent visibles.

Les badges `repos` (ligne au-dessus) et le système de lanes `bandesConge`
(congés) n'ont pas été touchés.

## Vérification

- `tsc --noEmit` : aucune erreur.
- `npm run lint` : aucune erreur (4 warnings préexistants dans
  `switch-identite.tsx`, sans rapport avec ce changement).
- Vérification visuelle : rendu du composant `PlanningEquipe` avec des
  données factices reproduisant l'exemple de Vincent (Yanel Dubray
  09:00-12:30 et Fleur GUIDE 08:30-19:30 le même jour), via
  `react-dom/server` + le CSS Tailwind compilé, capturé avec Playwright.
  Le rendu confirme deux colonnes égales côte à côte sans aucune
  superposition. Un second jour avec 4 personnes a aussi été vérifié :
  4 colonnes de largeur égale, toujours sans chevauchement. Cette
  vérification a été faite hors du serveur de dev Next.js (le middleware
  d'authentification du projet nécessite une session Supabase réelle) via un
  rendu statique isolé ; aucun fichier de vérification temporaire n'a été
  conservé dans le dépôt.

## Fichiers modifiés

- `src/components/agenda/planning-equipe.tsx` (seul fichier modifié)
