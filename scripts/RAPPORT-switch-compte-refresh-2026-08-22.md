# Fiabilisation du switch de compte multi-identité — rapport

Symptôme initial : le switch de compte redemandait le mot de passe de
façon imprévisible, alors que rien ne justifiait une déconnexion. Cause
probable : les comptes mémorisés mais inactifs (`comptes-appareil.ts`)
n'étaient jamais rafraîchis par `EcouteurSession` (qui ne suit que le
compte courant du client Supabase du navigateur), et `switch-identite.tsx`
appelait `setSession()` avec des tokens potentiellement périmés, sans
filet de rattrapage ni log permettant de savoir pourquoi.

Trois commits isolés, dans l'ordre demandé.

## 1 — Rafraîchissement en tâche de fond des comptes inactifs

**Fichiers touchés** : `src/components/ecouteur-session.tsx`,
`src/lib/supabase/authentification-appareil.ts`, `src/lib/comptes-appareil.ts`.

- `EcouteurSession` pose désormais un `setInterval` (22 minutes) qui, pour
  chaque compte de `listerComptes()` différent du profil actif dans le
  client Supabase du navigateur (déterminé via `supabase.auth.getSession()`),
  appelle `refreshSession({ refresh_token })` sur un client Supabase isolé
  et met à jour `comptes-appareil.ts` avec les nouveaux tokens en cas de
  succès.
- `authentification-appareil.ts` expose désormais `creerClientAppareilIsole()`
  (factorisation du client `persistSession: false` / `autoRefreshToken: false`
  déjà utilisé par `authentifierCompteAppareil`), réutilisé par ce
  mécanisme et par l'étape 3.
- Un échec de rafraîchissement en tâche de fond ne supprime jamais le
  compte du switcher : il reste visible, l'utilisateur peut toujours s'y
  reconnecter manuellement (formulaire `ReconnexionCompte`).
- Protection contre l'exécution en double dans un même onglet : un verrou
  booléen en mémoire (`enCours`) empêche un tick de chevaucher le
  précédent, et le tick est ignoré si `document.hidden` (onglet en
  arrière-plan). Pas de verrou inter-onglets (explicitement hors périmètre
  de la tâche) : plusieurs onglets ouverts rafraîchissent chacun
  indépendamment, avec leur propre throttle (voir point suivant).
- `comptes-appareil.ts` gagne un suivi en mémoire (non persisté, propre à
  l'onglet) du dernier rafraîchissement tenté par `profilId`
  (`marquerRafraichissementRecent` / `rafraichissementRecent`, fenêtre de
  5 minutes), consommé par l'étape 3.
- Nettoyage : `clearInterval(minuteur)` dans le cleanup du `useEffect`, au
  même endroit que le `unsubscribe()` déjà existant — pas de fuite mémoire.

## 2 — Logs de diagnostic sur les échecs de session

**Fichiers touchés** : `src/components/ecouteur-session.tsx`,
`src/components/switch-identite.tsx`.

Un `console.warn` structuré est ajouté sur :
- l'échec de `setSession()` dans `basculer()` (`switch-identite.tsx`) ;
- l'échec de `refreshSession()` dans le mécanisme de tâche de fond
  (`ecouteur-session.tsx`).

Chaque log porte le préfixe du fichier d'origine et un objet avec
`profilId`, `code` (code d'erreur Supabase), `status` (code HTTP), `message`
et `horodatage` (ISO 8601) — voir « Comment lire les logs » ci-dessous.

## 3 — `refreshSession()` silencieux avant bascule

**Fichier touché** : `src/components/switch-identite.tsx`.

Dans `basculer()`, avant d'appeler `setSession()` avec les tokens
mémorisés (potentiellement périmés) :
- si `rafraichissementRecent(compte.profilId)` est vrai (rafraîchissement
  en tâche de fond ou bascule précédente il y a moins de 5 minutes), on
  saute directement à `setSession()` avec les tokens déjà à jour ;
- sinon, on tente un `refreshSession()` silencieux via
  `creerClientAppareilIsole()`. En cas de succès, les nouveaux tokens sont
  utilisés pour le `setSession()` final et mémorisés via
  `ajouterOuMettreAJourCompte()`. En cas d'échec réel, le formulaire de
  reconnexion s'affiche immédiatement (plus besoin de passer par un
  `setSession()` voué à l'échec).
- Un `console.warn` (même format qu'à l'étape 2) est aussi posé sur
  l'échec de ce nouvel appel `refreshSession()` — non explicitement listé
  dans la consigne de l'étape 2 (qui ne pouvait pas encore le mentionner,
  cet appel n'existant qu'à partir de cette étape), mais ajouté par
  cohérence avec l'objectif de diagnostic : c'est désormais l'un des deux
  chemins d'échec possibles avant reconnexion manuelle.

## Comment lire les nouveaux logs si le problème se reproduit

Ouvrir la console du navigateur et chercher l'un de ces trois préfixes :

| Préfixe console | Fichier / moment | Signification |
|---|---|---|
| `[ecouteur-session] Échec du rafraîchissement en tâche de fond` | Intervalle 22 min, compte inactif | Le rafraîchissement périodique d'un compte non actif a échoué. Sans conséquence immédiate pour l'utilisateur (il n'a pas basculé), mais annonce un futur échec à la bascule si rien ne se corrige d'ici là. |
| `[switch-identite] Échec du refreshSession() silencieux avant bascule` | Clic sur un compte dans le switcher, avant `setSession()` | Le rafraîchissement tenté juste avant la bascule a échoué : le formulaire de reconnexion s'affiche immédiatement. |
| `[switch-identite] Échec de setSession() lors de la bascule de compte` | Clic sur un compte, après un refreshSession() réussi (ou sauté car récent) | Cas résiduel : les tokens (rafraîchis ou jugés récents) sont malgré tout rejetés par `setSession()`. |

Chaque log contient un objet avec :
- **`profilId`** : le compte concerné — permet de savoir si le problème
  touche toujours le même compte ou est aléatoire.
- **`code`** : le code d'erreur Supabase (champ `AuthError.code`). Les
  valeurs les plus utiles à distinguer :
  - **`refresh_token_already_used`** → *révocation par réutilisation
    détectée*. Le refresh token avait déjà été consommé par une autre
    requête (deux onglets, ou un appel concurrent — un cas similaire a
    déjà été corrigé côté `proxy.ts` dans un commit précédent, voir
    « réduire les rafraîchissements de token Supabase concurrents »). À
    chercher en priorité si le compte a été utilisé simultanément dans
    plusieurs onglets/appareils, ou si ce log apparaît juste après un tick
    du rafraîchissement en tâche de fond pour le même `profilId`.
  - **`refresh_token_not_found`** ou **`session_expired`** →
    *token réellement expiré ou invalidé côté Supabase* (session terminée
    ailleurs, mot de passe changé, refresh token trop ancien). Reconnexion
    manuelle normale et attendue dans ce cas.
  - Toute autre valeur (ou `code` absent avec `status` réseau, ex. `0`
    ou `503`) → probablement une coupure réseau ou une indisponibilité
    Supabase transitoire, pas un problème de token en soi.
- **`status`** : code HTTP retourné par l'API Auth Supabase (ex. `400`
  pour un refresh token invalide/déjà utilisé, `401` pour un token
  expiré) — utile en complément de `code` si celui-ci est absent.
- **`message`** : message brut de Supabase, à recopier tel quel en cas de
  doute sur l'interprétation ci-dessus.
- **`horodatage`** : ISO 8601, pour corréler plusieurs logs entre eux (ex.
  un `[ecouteur-session]` suivi de près par un `[switch-identite]` sur le
  même `profilId` confirme une réutilisation de refresh token entre les
  deux mécanismes).

## Vérifications techniques

- `npx tsc --noEmit -p tsconfig.json` : 0 erreur, après chacun des 3 commits.
- `npx eslint <fichiers modifiés>` : aucune erreur ni avertissement
  nouveaux. `switch-identite.tsx` porte une erreur ESLint pré-existante
  (`react-hooks/immutability` sur `window.location.href = '/'`, ligne
  déjà présente avant cette tâche) — vérifiée par `git stash` + relint sur
  le fichier non modifié : même erreur, même ligne relative, confirmée
  indépendante de ce chantier et non introduite par lui.
- Aucune modification en dehors des 4 fichiers mentionnés dans la tâche
  (`comptes-appareil.ts`, `switch-identite.tsx`, `ecouteur-session.tsx`,
  `authentification-appareil.ts`).

## Commits

1. `feat(auth): rafraîchir en tâche de fond les comptes mémorisés inactifs`
2. `feat(auth): logs de diagnostic sur les échecs de session au switch de compte`
3. `feat(auth): refreshSession() silencieux avant bascule de compte`
