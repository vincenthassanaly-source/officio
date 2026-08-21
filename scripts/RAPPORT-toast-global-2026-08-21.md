# Système de toasts global — rapport

Le projet n'avait aucun feedback visuel de succès (ajout/modification/envoi) :
seuls `chaussures-scanner.tsx`, `switch-identite.tsx`, `suggestions.tsx` et
`notifications-parametres.tsx` géraient un état d'erreur local, et rien ne
confirmait un succès. Ajout d'un `ToastProvider` global (contexte +
`useToast()`) puis branchement sur les modules listés dans la tâche.

## Fichier créé

**`src/components/ui/toast-provider.tsx`** (Client Component)
- Contexte React + `useToast()` exposant `toast({ type, message })` avec
  `type: 'succes' | 'erreur' | 'info'`.
- Empilement de plusieurs toasts (`useState<Toast[]>`, id incrémental
  module-scope).
- Auto-dismiss : 3.5 s (succès/info), 5 s (erreur). Fermeture manuelle
  (bouton ×) qui annule le minuteur en cours.
- Animation de sortie avant retrait de la liste (`enSortie: true` pendant
  180 ms, même durée que l'animation d'entrée) plutôt qu'un retrait
  immédiat — évite un "pop" sec à la fermeture.
- Positionnement : `fixed inset-x-0 bottom-[calc(4.5rem+0.75rem+env(safe-area-inset-bottom))]`
  sur mobile (au-dessus de la `BottomNav`, qui réserve déjà
  `4.5rem + safe-area-inset-bottom` dans `(app)/layout.tsx`), `lg:bottom-6
  lg:right-6 lg:items-end` en bas à droite sur desktop (la `BottomNav` est
  `lg:hidden`). `z-[60]`, au-dessus des modales (`z-50` dans
  `ModaleConfirmation`/`ModaleEditionTache`).
- Animation translate+fade (`.toast-entree`/`.toast-sortie`, keyframes dans
  `globals.css`, même easing/durée — 180 ms ease-out — que les transitions
  de page déjà en place) neutralisée sous `prefers-reduced-motion: reduce`
  (durée quasi nulle) + `motion-reduce:animate-none` en ceinture.
- Couleurs par `type` via tokens existants uniquement : `succes` →
  `border-green/20 bg-green-soft text-green`, `erreur` → `border-rec/20
  bg-rec-soft text-rec`, `info` → `border-primary/20 bg-primary-soft
  text-primary`.
- `aria-live="polite"` sur le conteneur, `role="alert"` sur un toast
  d'erreur et `role="status"` sinon.

**`src/app/globals.css`** — ajout des keyframes `toast-in`/`toast-out` et
des classes `.toast-entree`/`.toast-sortie`, à la suite des keyframes de
transition de page existantes, avec le bloc `prefers-reduced-motion:
reduce` correspondant.

**`src/app/layout.tsx`** — `{children}` enveloppé dans `<ToastProvider>`.
Le composant racine reste un Server Component : `ToastProvider` est un
simple wrapper client qui prend `children` en prop, aucune autre partie du
layout racine n'a dû passer en Client Component.

## Actions désormais couvertes par un toast

| Module | Fichier(s) | Action(s) | Toast succès | Toast erreur |
|---|---|---|---|---|
| Carnet | `carnet-adresses.tsx` | `ajouterContact` | ✅ | ✅ |
| | | `modifierContact` | ✅ | ✅ |
| | | `supprimerContact` | ✅ | ✅ |
| Fournisseurs | `fournisseurs-liste.tsx` | `ajouterFournisseur` | ✅ | ✅ |
| | | `modifierFournisseur` | ✅ | ✅ |
| | | `supprimerFournisseur` | ✅ | ✅ |
| Liaison | `fil-de-messages.tsx` | `envoyerMessage` | ✅ | ✅ |
| | | `supprimerMessage` | ✅ | ✅ |
| Tâches | `taches-list.tsx` | `creerTache` | ✅ | ✅ |
| | | `modifierTache` | ✅ | ✅ |
| | | `supprimerTache` | ✅ | ✅ |
| | | `toggleTache` (fait/à faire) | — (déjà visible : case cochée + texte barré) | ✅ (remplace un échec jusque-là totalement silencieux) |
| Suggestions | `suggestions.tsx` | `envoyerSuggestion` | ✅ | ✅ |
| | | `supprimerSuggestion` | ✅ | ✅ |
| | | `basculerSuggestionFaite` | — (déjà visible : case cochée) | ✅ (remplace `console.error`) |
| CNO | `cno-liste.tsx` | `ajouterPatientCno` | ✅ | ✅ |
| | | `modifierQuantiteCno` (édition inline) | ✅ | ✅ (+ rollback de la valeur affichée) |
| | | `supprimerPatientCno` | ✅ | ✅ |
| Régularisations | `regularisations-liste.tsx` | `ajouterRegularisation` | ✅ | ✅ |
| | | `modifierRegularisation` | ✅ | ✅ |
| | | `supprimerRegularisation` | ✅ | ✅ |
| | | `marquerFacture` / `marquerAFaire` | — (déjà visible : badge/statut change) | ✅ (remplace `console.error`) |
| Ruptures de stock | `ruptures-stock-liste.tsx` | `ajouterRuptureStock` | ✅ | ✅ |
| | | `supprimerRuptureStock` (case "de nouveau disponible") | — (déjà visible : ligne retirée) | ✅ (remplace `console.error`) |
| Invitation équipe | `inviter-card.tsx` | Copie du lien d'invitation | ✅ | — (action 100 % client, ne peut pas échouer) |
| | | `regenererCodeAction` | ✅ | ✅ |
| Profil | `profil-form.tsx` | `modifierProfil` (via `useActionState`) | ✅ | ✅ (garde aussi le message inline existant) |

Règle appliquée pour distinguer succès+erreur vs erreur seule : les actions
de type formulaire (ajout/modification/suppression explicites, validées par
un bouton "Enregistrer"/"Ajouter"/"Supprimer") reçoivent un toast de succès
**et** d'erreur. Les bascules déjà optimistes visuellement (case à cocher,
badge de statut qui change instantanément) ne reçoivent qu'un toast
d'erreur — elles avaient déjà un feedback de succès immédiat à l'écran, et
leur échec était jusque-là soit un `console.error` invisible pour
l'utilisateur, soit une exception non interceptée du tout.

## Actions volontairement laissées de côté

- **`marquerPlusieursLus` (liaison.ts)** — déclenchée automatiquement à
  l'ouverture du fil (marquage "lu"), sans intention explicite de
  l'utilisateur. Un toast à chaque ouverture d'écran serait du bruit.
- **"Envoi d'invitation équipe"** — il n'existe aucune action d'envoi
  (email/SMS) dans le code : le flux réel (`InviterCard`) est un code +
  lien à copier-coller/partager manuellement. Le toast de succès a été posé
  sur l'action de copie du lien (l'équivalent fonctionnel le plus proche
  d'un "envoi" dans ce produit), en plus de la régénération du code.
- **`notifications-parametres.tsx`** (activation/désactivation des push,
  préférences par catégorie) — mentionné dans le contexte comme exemple
  préexistant de gestion d'erreur locale, mais absent de la liste explicite
  des modules à brancher (étape 3 de la tâche). Non modifié pour rester
  strictement dans le périmètre demandé ; le switch physique donne déjà un
  feedback visuel immédiat pour les préférences, et le message d'erreur
  inline existant reste seul pour l'activation des push.
- **`chaussures-scanner.tsx`, `switch-identite.tsx`** — mentionnés dans le
  contexte comme exemples préexistants d'état d'erreur local, mais non
  listés dans le périmètre à brancher. Non modifiés.
- **Authentification (`login-form.tsx`, `inscription-form.tsx`), création/
  rejoindre une officine (`bienvenue-form.tsx`, `creerOfficineAction`,
  `rejoindreOfficineAction`), changement/quitter officine
  (`changerOfficineActiveAction`, `quitterOfficineAction`)** — non listés
  dans le périmètre demandé. La plupart de ces actions font un `redirect()`
  immédiat en cas de succès (changement de page avant qu'un toast n'ait pu
  s'afficher), ce qui les rend de toute façon peu adaptées à ce mécanisme.
- **Autres modules non mentionnés dans la tâche** (agenda, documents,
  huiles essentielles, produits à recommander, chaussures/scanner,
  recherche globale, gestion des officines) — hors périmètre explicite de
  la demande (section « Branche le toast de succès sur les actions
  suivantes » du prompt), non touchés.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur après chaque commit.
- `npx eslint <fichiers modifiés>` : 0 erreur/warning après chaque commit.
- Aucune signature de server action modifiée, aucune logique métier
  touchée : chaque branchement ajoute uniquement un `try/catch` autour de
  l'appel existant (déjà fait dans `useTransition`) et un appel à
  `toast(...)`.
- Le layout racine (`src/app/layout.tsx`) reste un Server Component ; seul
  `ToastProvider` est un Client Component, comme demandé.

## Commits (isolés)

1. `Ajouter le système de toasts (ToastProvider)`
2. `Brancher les toasts sur le carnet d'adresses et les fournisseurs`
3. `Brancher les toasts sur le cahier de liaison et les tâches`
4. `Brancher les toasts sur les suggestions`
5. `Brancher les toasts sur le CNO, les régularisations et les ruptures de stock`
6. `Brancher les toasts sur l'invitation équipe et le profil`

## Points de vigilance restants

- **Pas de vérification navigateur en conditions réelles** dans cet
  environnement (pas de compte de test disponible) : le rendu visuel
  (empilement, position au-dessus de la `BottomNav`, animation) repose sur
  les tokens et mécanismes déjà validés ailleurs dans l'app, mais reste à
  confirmer à l'usage.
- **`modifierQuantiteCno`** : en cas d'échec, la valeur locale de l'input
  est réinitialisée à `patient.quantite_restante` (prop), donc à la valeur
  d'avant tentative — comportement correct tant que la prop n'a pas déjà
  été revalidée entre-temps (cas normal, l'action a échoué avant tout
  `revalidatePath`).
