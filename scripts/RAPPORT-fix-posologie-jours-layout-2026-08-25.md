# Rapport — Correction du débordement du sélecteur d'unité "Jours" (Posologie, Huiles essentielles)

**Date** : 2026-08-25
**Branche** : `claude/posologie-unit-selector-mobile-sioxm4`

## Fichier modifié

`src/components/huiles-essentielles-posologie.tsx`

## Cause exacte du bug

Dans la section "Durée du traitement" (lignes 108-127), le conteneur `flex gap-2` contient deux enfants :
- l'`<input type="number">` de la durée
- le `<select>` de l'unité (Jours / Semaines / Mois)

Les deux enfants portaient uniquement la classe `flex-1` (`flex: 1 1 0%`), sans `min-w-0`.

En CSS flexbox, la valeur par défaut de `min-width` sur un enfant flex est `auto`, ce qui équivaut à son `min-content` — c'est-à-dire la largeur minimale nécessaire pour afficher son contenu sans le tronquer. Pour un `<select>` natif, ce `min-content` inclut le texte de la plus longue option ("Semaines") plus le chrome du composant (padding, flèche de sélection). Un `flex-basis: 0%` avec `flex-grow: 1` ne suffit pas à faire *rétrécir* l'élément en dessous de ce `min-content` implicite.

Résultat : sur un viewport étroit (~360-400px), la somme des largeurs minimales de l'input et du select dépasse l'espace disponible dans la carte. Le `<select>` déborde alors visuellement à droite au lieu de se réduire, et se retrouve coupé/tronqué sur le bord de l'écran.

### Vérification chiffrée (reproduction isolée à 375px de large)

Une reproduction HTML isolée du même balisage (mêmes classes flex, mêmes tokens de couleur) a été rendue avec Playwright/Chromium à 375px de large :

- **Avant correctif** : le `<select>` se termine à `x = 383px` → déborde de **8px** au-delà du viewport (375px).
- **Après correctif** : le `<select>` se termine à `x = 351px`, parfaitement contenu dans la carte (qui fait 351px de large avec ses marges).

## Correction appliquée

Ajout de `min-w-0` aux deux enfants du conteneur flex, ce qui autorise explicitement l'input et le select à rétrécir en dessous de leur largeur de contenu minimale et à se partager l'espace disponible selon `flex-1` :

```diff
             <input
               type="number"
               min="0"
               step="1"
               value={dureeValeur}
               onChange={(e) => setDureeValeur(e.target.value)}
               placeholder="ex : 10"
-              className={`flex-1 ${CHAMP_CLASS}`}
+              className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
             />
             <select
               value={dureeUnite}
               onChange={(e) => setDureeUnite(e.target.value as UniteDuree)}
-              className={`flex-1 ${CHAMP_CLASS}`}
+              className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
             >
```

Aucune couleur en dur n'a été introduite — seules les classes utilitaires Tailwind (`min-w-0`, `flex-1`) et les tokens sémantiques déjà utilisés (`CHAMP_CLASS`, qui référence `border-border`, `bg-bg`, `text-ink`, `border-primary`) sont concernés.

## Portée du changement

Seul le fichier `src/components/huiles-essentielles-posologie.tsx` a été modifié (2 lignes). Les autres champs de l'onglet Posologie (Gouttes par prise, Prises par jour, Gouttes par mL) utilisent des conteneurs `flex flex-col` à un seul enfant en pleine largeur (`CHAMP_CLASS` seul) et ne sont pas affectés par ce changement.

## Vérifications

### `tsc --noEmit`

```
$ npx tsc --noEmit
```
✅ Aucune erreur.

### Lint

```
$ npx eslint src/components/huiles-essentielles-posologie.tsx
```
✅ Aucune erreur ni avertissement sur le fichier modifié.

(Note : `npm run lint` sur l'ensemble du dépôt relève 1 erreur et 4 avertissements préexistants dans `src/components/switch-identite.tsx`, sans rapport avec ce correctif et non modifiés par ce commit.)

### Fonctionnalité du sélecteur

Le `<select>` conserve son `value`/`onChange` d'origine (`dureeUnite` / `setDureeUnite`) — seules les classes CSS ont été modifiées. Le sélecteur reste pleinement cliquable et permet toujours de basculer entre "Jours", "Semaines" et "Mois", avec la mise à jour du calcul de volume associée (`joursParUnite`).

### Rendu visuel mobile (~375px)

Une reproduction isolée du composant (mêmes classes Tailwind, mêmes tokens de couleur définis dans `globals.css`) a été capturée à 375px de large avant/après correctif :

- **Avant** : le `<select>` "Jours" déborde de 8px à droite de l'écran et de la carte.
- **Après** : l'input de durée et le sélecteur d'unité se partagent l'espace disponible, restent alignés côte à côte, et tiennent entièrement dans la carte sans débordement ni troncature.

(Le serveur de développement complet de l'application n'a pas pu être lancé dans cet environnement car il requiert des identifiants Supabase valides — `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` — non disponibles ici. La vérification visuelle a donc été faite sur une reproduction fidèle et isolée du balisage concerné plutôt que sur l'application complète.)
