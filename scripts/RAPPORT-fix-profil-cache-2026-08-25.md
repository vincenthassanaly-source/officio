# Fix — icône profil et prénom absents au premier chargement (mémoïsation de getCurrentProfil)

## Diagnostic

Bug observé : au premier chargement de l'app (notamment après réveil du
téléphone / PWA en arrière-plan), l'icône profil (initiales, ex: "VH") en
haut à droite du header et le prénom dans "Bonjour, [prénom]" sont absents.
Une actualisation manuelle de la page les fait réapparaître.

`getCurrentProfil()` (`src/lib/data/profils.ts`) n'était pas enveloppée
dans `cache()` de `'react'`, contrairement à `getMesAdhesions()`
(`src/lib/data/adhesions.ts`), qui l'est déjà.

Or `getCurrentProfil()` est appelée plusieurs fois au sein d'une même
requête serveur : au moins dans `src/app/(app)/layout.tsx` et
`src/app/(app)/page.tsx`, ainsi que dans plusieurs autres pages sous
`src/app/(app)/` et de nombreuses Server Actions sous `src/app/actions/`.
Sans mémoïsation, chaque appel recrée son propre client Supabase et refait
un appel réseau `supabase.auth.getUser()` indépendant. Des appels
concurrents à `getUser()` peuvent se percuter sur le rafraîchissement du
refresh token Supabase (usage unique) : l'un des appels échoue
silencieusement, ce qui produit un `profilActuel` (ou `profil`) `null`
pour ce rendu — exactement la même classe de bug que celle documentée et
partiellement corrigée pour `getMesAdhesions()` dans
`scripts/RAPPORT-fix-session-bienvenue-2026-08-21.md`.

Contrairement au cas de `getMesAdhesions()` (qui provoquait une
redirection intempestive vers `/bienvenue`), un échec silencieux de
`getCurrentProfil()` ne casse pas la navigation : il se traduit
simplement par une absence d'affichage (initiales, prénom) le temps
d'un rendu, d'où le symptôme "ça revient après un refresh manuel".

## Changement effectué

Dans `src/lib/data/profils.ts` :

- Ajout de `import { cache } from 'react'`.
- `getCurrentProfil` est maintenant déclarée comme
  `export const getCurrentProfil = cache(async (): Promise<Profil | null> => { ... })`,
  selon le même pattern que `getMesAdhesions()` dans
  `src/lib/data/adhesions.ts`. La logique interne de la fonction est
  inchangée.
- Ajout d'un commentaire au-dessus de la fonction expliquant pourquoi
  `cache()` est nécessaire (appels multiples par requête serveur,
  référence au rapport du 21/08), pour éviter qu'un futur retrait
  accidentel de `cache()` ne réintroduise le bug.

Aucun autre fichier n'a été modifié.

## Vérification des appelants

Lecture de tous les appels à `getCurrentProfil()` sous `src/app/actions/*.ts`
(fournisseurs, regularisations, recherche, produits-a-recommander,
notifications, contacts, ruptures-stock, agenda, taches, erreurs-client,
suggestions, notes, documents, liaison, et autres) : dans chaque Server
Action, `getCurrentProfil()` est appelé une seule fois, en tout début de
fonction, pour identifier l'utilisateur avant d'effectuer la mutation.
Aucun cas n'appelle `getCurrentProfil()` une seconde fois après une
mutation dans la même invocation pour en lire un état rafraîchi. La
mémoïsation par requête (portée d'un seul rendu / d'une seule Server
Action) n'introduit donc aucune régression de fraîcheur des données.

## Vérifications effectuées

- `npm install` (dépendances absentes dans l'environnement de la session,
  nécessaires pour exécuter `tsc`/`eslint`).
- `npx tsc --noEmit` : 0 erreur.
- `npx eslint src/lib/data/profils.ts` : 0 erreur/warning.
- `npx eslint .` (projet entier) : 1 erreur pré-existante dans
  `src/components/switch-identite.tsx` (non liée à ce changement, fichier
  non modifié) ; aucune erreur/warning nouveau introduit par ce fix.

## Commit

Un seul commit isolé, contenant uniquement la modification de
`src/lib/data/profils.ts`.
