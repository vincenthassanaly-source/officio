# Rapport — Agenda : clic sur une tâche ouvre l'édition (2026-08-22)

## Objectif

Dans la vue globale de l'agenda (`AgendaVueGlobale`), chaque tâche était
enveloppée dans un `<Link href="/liaison">` : un clic redirigeait toujours
vers le cahier de liaison au lieu de permettre d'agir sur la tâche. Le
comportement cible, déjà présent sur l'accueil (`AccueilDashboard`), est
repris ici : une case à cocher change le statut fait/à faire, un clic sur le
reste de la carte ouvre `ModaleEditionTache`.

## Fichiers touchés

- `src/lib/data/taches.ts` — `getTachesEcheancePeriode` sélectionne
  désormais `photo_chemin_stockage` et la relation `assigne` (même select que
  `getTaches`), génère la `photoUrl` signée (même bucket `taches-photos`,
  même `DUREE_SIGNED_URL_PHOTO`), et retourne `Tache[]` au lieu de
  `TacheEcheance[]`. Le type `TacheEcheance` est supprimé (vérifié par grep :
  plus aucune référence hors fichiers historiques dans `scripts/`).
- `src/components/taches-list.tsx` — commentaire au-dessus de `dueInfo` mis à
  jour : ne mentionne plus `TacheEcheance`/`getTachesEcheancePeriode`
  (devenu obsolète), explique juste que la fonction n'a besoin que des
  champs d'échéance/statut.
- `src/app/(app)/agenda/page.tsx` — import de `getCurrentProfil` (même
  pattern que `liaison/page.tsx`), ajouté au `Promise.all`, et
  `profilActuelId={profil?.id ?? ''}` passé à `<Agenda />`.
- `src/components/agenda/agenda.tsx` — prop `taches` retypée `Tache[]`
  (import depuis `@/lib/data/taches`), nouvelle prop `profilActuelId:
  string`, transmise à `<AgendaVueGlobale />` avec `equipe` (déjà
  disponible et déjà passée à `PlanningEquipe`, réutilisée telle quelle).
- `src/components/agenda/agenda-vue-globale.tsx` :
  - `ItemAgenda['tache']` référence désormais `Tache` (plus `TacheEcheance`).
  - `AgendaVueGlobale` reçoit `equipe: MembreEquipe[]` et
    `profilActuelId: string`, et porte un state local
    `tacheEnEdition: Tache | null`.
  - Dans `ItemLigne` (branche `tache`), le `<Link href="/liaison">` englobant
    est remplacé par un `<div className="flex gap-3">` : la case à cocher
    (bouton rond/carré, coche `✓` si `statut === 'fait'`) appelle
    `onToggle(t.id, t.statut)`, le reste de la carte (titre + badge
    échéance, classes inchangées : `rounded-[20px] bg-surface shadow-card
    p-3.5`, `due.className`) appelle `onEdit(t)`.
  - `onToggle` et `onEdit` sont fournis par `AgendaVueGlobale` :
    `onToggle={(id, statut) => startTransition(() => toggleTache(id, statut))}`
    (réutilise l'`isPending`/`startTransition` déjà présents pour la
    suppression de RDV) et `onEdit={(t) => setTacheEnEdition(t)}`.
  - `<ModaleEditionTache>` est affichée conditionnellement en bas du JSX (au
    même niveau que le reste, hors boucle des jours), avec `equipe`,
    `profilActuelId` et `onFerme={() => setTacheEnEdition(null)}`.

## Choix techniques

- `Tache.echeance` est typé `string | null` (contrairement à l'ancien
  `TacheEcheance.echeance: string`, non nullable). `getTachesEcheancePeriode`
  garantit en pratique des échéances non nulles (filtre `gte`/`lte` côté
  requête, qui exclut structurellement les lignes `NULL`), mais le typage
  plus large de `Tache` oblige à un garde explicite (`if (t.echeance)`) dans
  les deux `for` qui indexent les tâches par date (`itemsParJour`,
  `joursCharges`) — commenté in situ pour expliciter l'invariant plutôt que
  de forcer un `as string`.
- Aucune modification de `src/app/actions/taches.ts` ni de la logique
  serveur d'`officine_id` (toujours dérivé via `getOfficineActive`, dans la
  page) : seule la requête `getTachesEcheancePeriode` a été enrichie.
- Aucune migration SQL nécessaire : aucune colonne ni table ne change,
  uniquement le `select` d'une requête existante.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npx eslint` sur les 5 fichiers modifiés : ✅ aucun avertissement ni erreur.
  (Une erreur lint pré-existante et sans rapport dans
  `src/components/switch-identite.tsx` subsiste sur `main`, non touchée par
  ce travail.)
