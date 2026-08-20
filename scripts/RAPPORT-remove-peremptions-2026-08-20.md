# Suppression du module "Péremptions" — rapport

## Contexte

Contrairement au module "Affiches prix" (retiré juste avant, entièrement
autonome), le module Péremptions était **couplé à la vue globale de
l'agenda** (`agenda-vue-globale.tsx`) : celle-ci affichait les péremptions
comme un 4e type d'item dans le planning hebdomadaire (carte, badge coloré
selon `estPerimee`, pastille de charge sur les jours). Confirmé avant toute
suppression et validé avec l'utilisateur.

## Fichiers supprimés

- `src/app/(app)/peremptions/page.tsx`
- `src/app/(app)/peremptions/loading.tsx`
- `src/components/peremptions-liste.tsx`
- `src/lib/data/peremptions.ts`
- `src/app/actions/peremptions.ts`

## Fichiers modifiés (retrait du couplage agenda + accueil)

- `src/components/agenda/agenda-vue-globale.tsx` : retrait de l'import
  `Peremption`/`estPerimee`, du 4e membre de l'union `ItemAgenda`, de la
  branche de rendu "Péremption" dans `ItemLigne`, des deux boucles qui
  alimentaient `itemsParJour`/`joursCharges`, du rang dans le tri, et du cas
  péremption dans la clé React. Commentaire d'en-tête du fichier mis à jour
  (ne mentionne plus les péremptions).
- `src/components/agenda/agenda.tsx` : retrait du prop `peremptions`
  (type + destructuring + passage à `AgendaVueGlobale`).
- `src/app/(app)/agenda/page.tsx` : retrait de l'appel
  `getPeremptionsPeriode` et du prop `peremptions` passé à `<Agenda>`.
- `src/app/(app)/page.tsx` : retrait de l'import `getPeremptions`/
  `IconPeremptions`, de l'appel dans le `Promise.all`, du calcul
  `peremptionsBientot`, et de la tuile d'accueil "Péremptions".
- `src/components/nav-icons.tsx` : suppression de `IconPeremptions`
  (vérifié : plus aucune référence dans `src/`).
- `src/app/actions/ruptures-stock.ts` : commentaire mis à jour (faisait
  référence à `peremptions.retire` comme point de comparaison — devenu
  obsolète, reformulé sans changer la logique).

## Base de données

- `scripts/migration-drop-peremptions.sql` (nouveau fichier) : `drop table
  if exists peremptions;`, **appliquée pour de vrai** au projet Supabase du
  repo.
- Table vérifiée vide (0 ligne) avant suppression — aucune perte de donnée
  réelle.
- `scripts/migration-peremptions.sql` et les rapports historiques
  (`RAPPORT-module-peremptions-2026-08-14.md`,
  `RAPPORT-annulation-retrait-peremptions-2026-08-14.md`) **conservés tels
  quels** plutôt que supprimés/réécrits : ils documentent ce qui a existé,
  cohérent avec le style "log append-only" déjà utilisé pour les migrations
  dans ce repo (ex. la table de rattrapage de rangée). Aucun code n'en
  dépend.
- Vérifié après suppression (`list_tables`) : la table n'apparaît plus,
  aucune autre table ne référençait `peremptions` par clé étrangère (déjà
  confirmé avant suppression).

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` ciblé sur tous les fichiers modifiés : 1 erreur
  préexistante dans `agenda-vue-globale.tsx` (`setState` synchrone dans un
  `useEffect`, ligne décalée par la suppression de code mais **déjà
  présente sur `main` avant ce changement**, vérifié par comparaison
  directe avec `git stash`) — non introduite par cette suppression, non
  corrigée ici (hors périmètre).
- `npm run build` : build de production réussi, `/peremptions` a bien
  disparu des routes générées (27 routes au lieu de 28), aucune autre route
  cassée.
- Recherche exhaustive (`grep -rl "peremption"` sur tout `src/`) après
  modification : plus aucune référence de code, seul le commentaire mis à
  jour dans `ruptures-stock.ts` en gardait une trace textuelle (corrigée).

## Ce qui change concrètement pour l'utilisateur

- La tuile "Péremptions" a disparu de l'accueil.
- Dans l'agenda (vue globale), les produits périmés n'apparaissent plus
  dans le planning hebdomadaire — seuls rendez-vous, tâches à échéance et
  régularisations d'ordonnances y figurent désormais. Le "Planning équipe"
  (deuxième onglet de l'agenda) n'était pas concerné (il n'utilisait pas les
  péremptions).
