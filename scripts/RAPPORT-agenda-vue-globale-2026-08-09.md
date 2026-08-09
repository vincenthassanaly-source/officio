# Rapport — Agenda : vue globale (2026-08-09)

## Contexte

L'onglet "Rendez-vous" de l'Agenda n'affichait que les rendez-vous. Il devient une vue globale de la semaine combinant rendez-vous, tâches à échéance et régularisations d'ordonnances, sans toucher à l'onglet Planning équipe (créneaux).

## Libellé choisi pour l'onglet

**« Vue globale »** (au lieu de « Rendez-vous »). Préféré à « Cette semaine » — qui décrit la fenêtre temporelle (déjà visible via le sélecteur de semaine juste au-dessus) plutôt que le contenu de l'onglet — alors que « Vue globale » indique directement que l'onglet montre maintenant plusieurs types d'éléments, pas seulement les RDV, ce qui est l'information la plus utile à ce niveau.

L'état interne du composant a aussi été renommé (`'rdv' | 'planning'` → `'globale' | 'planning'`), purement pour la lisibilité du code — aucun effet fonctionnel.

## 1. `getTachesEcheancePeriode` (`src/lib/data/taches.ts`)

Nouvelle fonction, même pattern que `getRegularisationsPeriode` (`src/lib/data/regularisations.ts`) : filtre côté requête (`gte`/`lte` sur `echeance`), pas côté client. Retourne un type allégé `TacheEcheance` (`id, titre, statut, echeance`) plutôt que le `Tache` complet de `getTaches()` — pas besoin de l'assigné ni de l'URL signée de la photo pour cette vue, ce qui évite l'appel Storage supplémentaire de `getTaches()`. Les tâches sans échéance sont exclues naturellement : `NULL` ne satisfait jamais une comparaison `gte`/`lte`, aucun filtre explicite supplémentaire n'était nécessaire.

## 2. Page Agenda (`src/app/(app)/agenda/page.tsx`)

`getTachesEcheancePeriode` et `getRegularisationsPeriode` ajoutées au `Promise.all` existant, sur la même plage `dateDebut`/`dateFin` déjà calculée pour la semaine affichée. Résultats passés en props à `<Agenda />`.

## 3. Composant étendu — renommage de fichier

`src/components/agenda/rendez-vous-list.tsx` → **`src/components/agenda/agenda-vue-globale.tsx`**, composant exporté renommé `RendezVousList` → `AgendaVueGlobale`, maintenant qu'il ne concerne plus seulement les rendez-vous.

### Choix de tri et d'affichage

- **Tri par jour** : RDV d'abord (triés par heure), puis tâches (triées par titre), puis régularisations (triées par nom de patient) — exactement l'ordre proposé dans le prompt, pas d'écart.
- **Pastille "jour chargé"** dans le strip du haut : un point unique, allumé si le jour a au moins un élément des trois types (RDV, tâche à échéance ou régularisation). Pas de distinction par couleur à ce niveau (un point par type aurait surchargé une pastille de 4px) — la distinction par type se fait dans la liste détaillée en dessous.
- **Heure** : un RDV garde son heure + durée dans la colonne de gauche, comme avant. Une tâche ou une régularisation affiche **« Journée »** à la place (plutôt que rien du tout) — plus explicite qu'un simple tiret, et cohérent avec le principe d'un événement "sans heure précise dans la journée".
- **Distinction visuelle par type** : badge texte + couleur, dans le même emplacement que le badge de catégorie des RDV.
  - RDV : badges de catégorie existants inchangés (Rendez-vous / Logistique / Formation / Autre).
  - Tâche : badge « Tâche », coloré avec le **même code couleur d'urgence que `taches-list.tsx`** (rouge `bg-rec-soft` si en retard, orange `bg-accent-soft` si aujourd'hui/demain, bleu `bg-primary-soft` sinon, gris `bg-neutral-soft` si déjà faite) — la fonction `dueInfo` a été **exportée** de `taches-list.tsx` (type assoupli en `Pick<Tache, 'statut' | 'echeance'>` pour accepter le type allégé `TacheEcheance`) et réutilisée telle quelle, seul le libellé texte a été remplacé (« Tâche » fixe plutôt que « Demain »/« Aujourd'hui », qui ferait doublon avec l'en-tête du jour dans cette vue groupée par date).
  - Régularisation : badge « Régularisation », coloré avec le **même critère que `regularisations-liste.tsx`** (`estEnRetard`, exportée de ce fichier et réutilisée telle quelle) : rouge si en retard, gris si déjà facturée, bleu sinon.
  - Aucune nouvelle couleur inventée : les trois modules réutilisent exactement les couleurs déjà en place ailleurs dans l'app.
- **Clic sur un item** :
  - RDV : comportement inchangé — bouton « × » de suppression. *Point de vigilance* : le prompt mentionnait un « détail/modification sur place, déjà existant » pour les RDV, mais en relisant `rendez-vous-list.tsx` avant modification, aucune fonctionnalité de détail/édition n'existait réellement — seule la suppression. Comportement conservé à l'identique (suppression uniquement), rien inventé au-delà de ce qui existait.
  - Tâche : toute la ligne est un lien vers `/liaison`.
  - Régularisation : toute la ligne est un lien vers `/regularisations`.
  - Aucune action rapide (marquer fait, marquer facturé) reproduite dans cette vue, conformément à la consigne — c'est une vue de consultation/navigation.
- Formulaire « + Ajouter un rendez-vous » : strictement inchangé, ne crée toujours que des rendez-vous.

## Rendu vérifié en conditions réelles

Officine de test avec, sur une même semaine (3–9 août 2026) :
- un RDV (mercredi, 10h00, catégorie "Rendez-vous")
- une tâche à échéance le même jour que le RDV (en retard) + une tâche déjà faite un autre jour
- une régularisation en retard un autre jour + une régularisation à faire (non en retard) le même jour que le RDV

Confirmé par inspection des classes CSS rendues :
- Mercredi (jour avec les 3 types) : RDV affiché en premier (10:00, badge "Rendez-vous" `bg-accent-soft text-accent`), puis la tâche (badge "Tâche" `bg-rec-soft text-rec`, en retard), puis la régularisation (badge "Régularisation" `bg-rec-soft text-rec`, en retard) — ordre RDV → tâche → régularisation respecté.
- Tâche déjà faite : badge "Tâche" `bg-neutral-soft text-muted`, titre barré (`line-through`) — cohérent avec `taches-list.tsx`.
- Pastilles du strip de jours : allumées (`bg-primary`) exactement sur les 3 jours contenant un élément, éteintes (`bg-transparent`) sur les 4 autres.
- Jours vides : « Rien de prévu ».
- Liens `href="/liaison"` (tâche) et `href="/regularisations"` (régularisation) confirmés dans le DOM rendu.
- Rendu testé en viewport mobile (375px), sans débordement horizontal.

Toutes les données de test (compte, officine, RDV, tâches, régularisations) supprimées de la base après vérification.

## Points restant à tester manuellement

- **Bascule vers l'onglet « Planning équipe »** : le code n'a pas changé sur ce point (la structure conditionnelle de rendu et le gestionnaire de clic sont identiques à avant, seul le nom de la valeur d'état `'rdv'` → `'globale'` a changé) — mais je n'ai pas pu confirmer interactivement le clic sur cet onglet lors de cette session : l'onglet du navigateur s'est retrouvé en arrière-plan (`document.hidden = true`) pendant la vérification, ce qui a empêché toute interaction (clics, dimensions de mise en page) d'aboutir, y compris via JavaScript direct. À vérifier manuellement que la bascule Vue globale ↔ Planning équipe fonctionne toujours normalement.
- Clic réel sur un item "Tâche" et "Régularisation" jusqu'à la navigation effective vers `/liaison` et `/regularisations` (les `href` sont corrects dans le DOM, mais le clic effectif n'a pas pu être testé pour la même raison que ci-dessus).
- Rendu sur un jour avec un grand nombre d'éléments des 3 types (au-delà de ce qui a été testé) pour confirmer que la grille `lg:grid-cols-2` reste lisible.

## Vérifications techniques

- `npx tsc --noEmit` : OK, aucune erreur.
- `npm run lint` : une erreur préexistante (`Calling setState synchronously within an effect`) présente **avant** ce travail dans `rendez-vous-list.tsx:33` s'est simplement déplacée avec le renommage du fichier vers `agenda-vue-globale.tsx:146` — ce n'est pas une régression introduite ici. Les 2 autres erreurs/warnings préexistants (`switch-identite.tsx`) restent sans rapport avec ce travail.

## Commits

1. `feat(agenda): getTachesEcheancePeriode pour les tâches à échéance`
2. `feat(agenda): récupérer tâches et régularisations de la semaine affichée`
3. `feat(agenda): étendre la liste hebdomadaire aux tâches et régularisations`
4. `feat(agenda): renommer l'onglet "Rendez-vous" en "Vue globale"`

Poussé sur `main` après validation du rapport.
