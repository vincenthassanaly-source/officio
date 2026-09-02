# Module Plan de posologie — outil d'impression 100% éphémère (2026-09-02)

## Résumé

Nouveau module "Plan de posologie", accessible depuis `/plan-posologie` : un formulaire côté
client permettant de composer un plan de prise (patient, médicaments, moments de prise
Matin/Midi/Soir/Coucher, instructions, durée) et d'en imprimer un tableau récapitulatif A4 en
noir et blanc. **Aucune donnée n'est stockée en base** : tout vit dans un `useState` React et
disparaît à la fermeture ou au rafraîchissement de la page — pas de table Supabase, pas de
migration SQL, pas de server action d'écriture.

## Fichiers créés

1. **`src/components/plan-posologie.tsx`** — composant client `PlanPosologie` :
   - Champ "Nom du patient" (optionnel, jamais persisté).
   - Liste dynamique de médicaments (`+ Ajouter un médicament` / bouton `×` par ligne), chacun
     avec : nom libre, 4 champs courts Matin/Midi/Soir/Coucher, instructions particulières,
     durée du traitement.
   - Aperçu imprimable généré en temps réel (tableau médicaments × moments de prise, date du
     jour, nom du patient, nom de l'officine active en pied de page) — n'affiche que les lignes
     dont le nom du médicament est renseigné.
   - Bouton "Imprimer le plan" déclenchant `window.print()`.
2. **`src/app/(app)/plan-posologie/page.tsx`** — page serveur minimale : `LienRetour` + titre
   (tous deux masqués à l'impression), récupère `getOfficineActive()` et passe
   `officine.officine_nom` en prop au composant client. Pas de fetch de données patient.
3. **`src/app/(app)/plan-posologie/loading.tsx`** — squelette `PageLoading` générique, même
   pattern que `huiles-essentielles/loading.tsx`.

## Fichiers modifiés

1. **`src/components/nav-icons.tsx`** — ajout de `IconPosologie` (cadran d'horloge), même
   pattern que les autres icônes (`viewBox 24x24`, `stroke="currentColor"`, `strokeWidth="2"`).
2. **`src/lib/nav-items.ts`** — nouvelle entrée dans `MODULES_SECONDAIRES` : "Plan de posologie",
   `bg-accent-soft` / `text-accent`.
3. **`src/app/(app)/layout.tsx`** — `print:hidden` sur le `<header>` mobile et `print:p-0` sur le
   conteneur de contenu, pour que seul le contenu de la page reste visible à l'impression.
4. **`src/components/sidebar-nav.tsx`** — `print:hidden` sur l'`<aside>` desktop.
5. **`src/components/bottom-nav.tsx`** — `print:hidden` sur la `<nav>` mobile.
6. **`src/app/globals.css`** — règle `@media print` : format `@page { size: A4 portrait; margin:
   16mm }`, fond blanc forcé sur `body`, et `.plan-posologie-impression` (classe posée sur le
   conteneur de l'aperçu) forcé en noir/blanc sobre (`color`, `background`, `border-color` en
   `#000`/`#fff`, ombres supprimées) indépendamment des tokens de thème de l'app.

## Impression

L'approche retenue s'appuie sur les variantes `print:` de Tailwind plutôt que sur une astuce
`visibility: hidden` globale sur `body *` : chaque élément de chrome (header, sidebar, bottom
nav, formulaire du composant) porte directement sa classe `print:hidden`. Seul l'aperçu
(`.plan-posologie-impression`) reste visible et imprimé, en A4 portrait, noir et blanc.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm ci`, `node_modules` n'était pas installé au
  départ de la session).
- `npm run lint` : ✅ aucune erreur ni avertissement sur les fichiers créés/modifiés par ce
  module. Une erreur ESLint pré-existante sur `src/components/switch-identite.tsx` (non touché
  par ce travail) a été repérée mais n'est pas liée au module Plan de posologie.

## Contraintes respectées

- Aucune table Supabase créée, aucune migration SQL, aucune server action d'écriture.
- Formulaire 100% éphémère : state React perdu à la fermeture/rafraîchissement de la page.
- Pas de `createPortal` / modal.
- Tokens Tailwind v4 sémantiques utilisés partout à l'écran (pas de couleur en dur) ; l'aperçu
  imprimé bascule volontairement en noir/blanc explicite (`#000`/`#fff`), hors tokens de thème,
  pour rester sobre et lisible sur papier quel que soit le thème de l'app.
- Nommage français partout, mobile-first.
