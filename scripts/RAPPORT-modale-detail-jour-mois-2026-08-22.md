# Rapport — Modale de détail du jour en vue Mois (Vue globale + Planning équipe)

**Date** : 2026-08-22

## Contexte

Le diagnostic instrumenté (commit `17c6172`, rapport `RAPPORT-debug-clic-jour-planning-mois-2026-08-22.md`) est arrivé à son terme : Vincent confirme que le toast « Clic reçu sur … » apparaît bien à chaque clic. Le clic fonctionnait donc déjà correctement — le `state` `jourSelectionne` se mettait bien à jour. Le "bug" rapporté était en réalité une confusion d'UX : le panneau de détail s'affichait **sous le calendrier, en bas de la page**, et Vincent ne l'avait pas repéré. Il souhaite en fait une **fenêtre modale au centre de l'écran** plutôt qu'un panneau inséré dans le flux de la page.

## 1. Retrait de l'instrumentation DEBUG (commit `079064a`)

Retiré des deux fichiers, exactement le périmètre ajouté par `17c6172` :
- `src/components/agenda/planning-equipe-mois.tsx` : l'import `useToast`, `const toast = useToast()`, et le `toast({ type: 'info', ... })` dans le `onClick`.
- `src/components/agenda/agenda-vue-globale-mois.tsx` : le `toast({ type: 'info', ... })` dans le `onClick` (l'import `useToast` et `const toast = useToast()` restent, déjà utilisés par ailleurs dans ce fichier pour `onToggleTache`).

## 2. Transformation du panneau en modale (commit `8b0d658`)

Dans les deux fichiers, le bloc `{jourSelectionne && (...)}` a été extrait dans un sous-composant local `ModaleDetailJour`, sur le modèle exact de `ModaleEditionTache` (`src/components/taches-list.tsx`) :

- **Portail** : rendu via `createPortal(..., document.body)`. Nécessaire pour échapper à l'ancêtre `.agenda-glisse-*` (animation de transition mois/semaine dans `agenda.tsx`) qui reste en permanence sous `transform: translateX(0)` (`animation-fill-mode: both`) — sans le portail, ce `transform` actif deviendrait le référentiel du `fixed inset-0`, confinant la modale dans son petit conteneur au lieu de couvrir l'écran.
- **Montage post-hydratation** : `useSyncExternalStore(sabonnerSansChangement, () => true, () => false)` (fonction dupliquée à l'identique dans chaque fichier, comme dans `taches-list.tsx`) — `document.body` n'existe pas côté serveur, donc rien n'est rendu tant que le composant n'est pas monté côté client, évitant tout mismatch SSR/hydratation.
- **Structure visuelle** : `fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center` sur le fond (`onClick={onFerme}`), carte `rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]` avec `onClick={(e) => e.stopPropagation()}` — bottom-sheet plein écran sur mobile, modale centrée de largeur fixe sur desktop. Un `max-h-[85vh] overflow-y-auto` a été ajouté sur la carte (absent de `ModaleEditionTache`, qui est un formulaire court) pour que la liste de créneaux/items ne déborde pas de l'écran sur un jour chargé.

**Inchangé** : la grille du calendrier, le surlignage `bg-track` de la case sélectionnée, le déclenchement par `setJourSelectionne(iso)`, le bouton "Fermer", le bouton "Voir cette semaine" (Planning équipe), le tri/regroupement des items (`regrouperItemsParJour`), et le flux de `ModaleEditionTache` pour l'édition d'une tâche (toujours monté indépendamment, au même niveau).

### `agenda-vue-globale-mois.tsx`

`ModaleDetailJour` reçoit `iso`, `items: ItemAgenda[]`, `aujourdhuiIso`, `isPending`, `isPendingTache`, `onSupprimerRdv`, `onToggleTache`, `onEditerTache`, `couleurs`, `onFerme` — reproduit exactement le rendu `ItemLigne` précédent, désormais dans la modale.

### `planning-equipe-mois.tsx`

`ModaleDetailJour` reçoit `iso`, `creneaux: Creneau[]`, `equipe`, `couleurMembre` (fonction), `onVoirCetteSemaine`, `onFerme` — reproduit exactement le rendu des créneaux d'équipe précédent, avec le bouton "Voir cette semaine" en pied de modale.

## 3. Vérifications effectuées

`tsc --noEmit` et `npm run lint` passent sur les deux fichiers modifiés (une erreur de lint pré-existante et sans rapport dans `switch-identite.tsx` reste inchangée).

Test manuel via Playwright (page de test temporaire non commitée, montant `Agenda` avec des données factices, `next dev`) :

| Vérification | Desktop (souris, 1280×900) | Mobile (tactile, 375×812) |
|---|---|---|
| Ouverture de la modale au clic sur un jour | ✅ | ✅ |
| Portail rendu directement sous `<body>`, couvre tout le viewport | ✅ | ✅ |
| Carte centrée (desktop) / bottom-sheet plein écran collée en bas (mobile) | ✅ (384px, centrée) | ✅ (pleine largeur, bas d'écran) |
| Fermeture au clic sur le fond | ✅ | ✅ |
| Fermeture via le bouton "Fermer" | ✅ | ✅ |
| "Voir cette semaine" déclenche la navigation (Planning équipe) | ✅ | ✅ |
| Erreurs console | Aucune | Aucune |

## Fichiers modifiés

- `src/components/agenda/agenda-vue-globale-mois.tsx`
- `src/components/agenda/planning-equipe-mois.tsx`

Aucun autre fichier touché (grille, navigation semaine/mois, filtres, tri des items inchangés).
