# Section "Tâches archivées" repliable — rapport

Ajout d'une section repliable pour les tâches au statut `'fait'` dans
`TachesList`, sur le pattern d'accordéon déjà en prod (`CarteVaccin` de
`vaccins-liste.tsx`). Changement purement d'affichage : aucune migration
SQL, `toggleTache`/`modifierTache`/`supprimerTache` inchangés.

## Fichier modifié

**`src/components/taches-list.tsx`** (seul fichier touché)

1. **Découpage `visibles` en deux** : `actives` (`statut === 'a_faire'`) et
   `archivees` (`statut === 'fait'`), tous deux dérivés de `visibles` donc
   respectent déjà le filtre équipe existant et l'ordre trié côté data
   layer (`created_at desc`, non retouché).
2. **Extraction de `CarteTache`** : composant séparé, JSX/comportement
   identiques à l'ancien bloc inline (checkbox, clic pour éditer, photo,
   suppression, badge d'échéance) — juste `t` renommé en `tache` et le clic
   d'édition passé par une prop `onEditer` plutôt que d'appeler
   `setTacheEnEdition` directement (l'état reste dans `TachesList`, la carte
   ne fait qu'informer le parent). Reste dans `taches-list.tsx`, comme
   demandé (voir "Écarts" plus bas pour la seule chose qui en sort).
3. **Liste active inchangée en apparence** : `actives.map(...)` avec
   `CarteTache`, message "Aucune tâche pour l'instant." conditionné à
   `actives.length === 0 && archivees.length === 0`.
4. **Section "Tâches archivées"**, visible seulement si
   `archivees.length > 0` :
   - Carte séparée (`rounded-[20px] bg-surface shadow-card p-3.5`) sous la
     liste active.
   - Bouton d'en-tête `Tâches archivées ({archivees.length})`,
     `aria-expanded={archiveOuverte}`, chevron qui pivote
     (`rotate-180` conditionnel, `transition-transform duration-200`).
   - Conteneur `grid transition-[grid-template-rows] duration-200 ease-out`
     + `grid-rows-[1fr]`/`grid-rows-[0fr]` + `overflow-hidden` interne —
     exactement le pattern `CarteVaccin`.
   - `archivees.map(...)` avec `CarteTache` à l'intérieur.
5. **Mise en évidence par notification adaptée à l'archive** :
   - `archiveOuverte` est initialisé directement via la fonction paresseuse
     de `useState` (comme `idSurligne` déjà présent) plutôt que dans un
     `useEffect` : si `?tache=<id>` cible une tâche `'fait'`, l'accordéon
     démarre déjà ouvert — évite un rendu en cascade (setState synchrone
     dans un effect), flaggé par la règle ESLint
     `react-hooks/set-state-in-effect` lors d'un premier essai avec
     `setArchiveOuverte` appelé au montage.
   - Dans l'écouteur de `EVENEMENT_NOTIFICATION_CIBLE` (notification
     cliquée sans navigation, cf. commentaire existant), `setArchiveOuverte(true)`
     est appelé si la tâche ciblée est archivée — ici sans problème
     puisque l'appel a lieu dans le callback de l'évènement, pas
     directement dans le corps de l'effect.
   - `defilerVersTache(id)` (nouvelle fonction, remplace l'appel direct à
     `scrollIntoView` dans les deux effects) diffère le `scrollIntoView`
     de 220ms si la cible est archivée : le contenu de l'accordéon n'est
     jamais démonté (seule sa hauteur anime), mais tant qu'il est fermé
     (`grid-rows-[0fr]`) la carte n'a pas de position de défilement
     significative — le délai laisse la transition CSS (200ms) se
     terminer avant de calculer la position.
6. **`ModaleEditionTache` inchangée** : reçoit toujours une `Tache`
   complète (active ou archivée) via `tacheEnEdition`, peu importe la
   section d'où vient le clic — l'édition d'une tâche déjà faite fonctionne
   sans modification.

## Décisions prises

- **`CarteTache` reste dans `taches-list.tsx`** (~90 lignes avec son JSX),
  pas de fichier séparé — largement sous un seuil qui justifierait
  l'extraction, et elle n'est utilisée que par ce fichier.
- **Pas de nouvelle prop sur `TachesList`** : signature publique
  inchangée, comme demandé.
- **`IconChevron` dupliquée localement** plutôt qu'importée depuis
  `vaccins-liste.tsx` (qui ne l'exporte pas) : cohérent avec le style déjà
  en place dans ce fichier (`ModaleEditionTache`, etc. sont aussi des
  composants privés au fichier) et avec d'autres icônes non partagées du
  projet (`IconCloche`, `IconRecherche`, définies localement à leur
  composant plutôt que dans `nav-icons.tsx`).

## Écart par rapport au prompt

- Le prompt suggérait d'ouvrir l'accordéon "dans le `useEffect` au montage
  et dans l'écouteur d'évènement". Le montage a finalement été implémenté
  via l'initialisation paresseuse de `useState` plutôt que dans le corps
  du `useEffect` — le résultat visible est identique (l'accordéon est
  déjà ouvert au premier rendu si la cible est archivée), mais la règle
  ESLint `react-hooks/set-state-in-effect` interdit un `setState`
  synchrone dans le corps d'un effect au montage. C'est un correctif
  mécanique imposé par le lint du projet, pas un choix de comportement.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` (`npx eslint src/components/taches-list.tsx --max-warnings 0`) :
  0 erreur/warning (a nécessité l'ajustement décrit ci-dessus pour passer).
- `npm run build` : build de production réussi, aucune route affectée en
  erreur.
- Pas de vérification navigateur en conditions réelles dans cet
  environnement (pas de compte de test disponible) — la modale d'édition,
  le filtre équipe, la suppression et le toggle statut réutilisent du code
  strictement inchangé (`ModaleEditionTache`, `toggleTache`,
  `supprimerTache`, `dueInfo`), donc à faible risque, mais l'ouverture
  automatique de l'accordéon sur notification archivée reste à confirmer
  en conditions réelles par l'utilisateur.

## Commit (1, isolé comme demandé)

`feat(taches): section tâches archivées repliable` — seul fichier touché :
`src/components/taches-list.tsx`.
