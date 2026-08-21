# Remplacement de window.confirm() par ModaleConfirmation — rapport

`window.confirm()` natif cassait l'expérience "app native" sur les 9
fichiers listés dans la tâche. Remplacé partout par une sheet cohérente
avec le reste de l'UI, calquée sur le pattern déjà en prod
(`ModaleEditionTache` dans `taches-list.tsx`).

## Fichiers créés

**`src/components/ui/modale-confirmation.tsx`**
- Composant générique `ModaleConfirmation`.
- Props : `ouvert`, `titre`, `description?`, `texteConfirmer = "Supprimer"`,
  `texteAnnuler = "Annuler"`, `destructif = true`, `choix?`, `onConfirmer`,
  `onAnnuler`.
- Sheet mobile (`items-end` + `rounded-t-[20px]` sous `sm:`, centrée et
  `rounded-[20px]` à partir de `sm:`), fond `bg-black/40` cliquable pour
  fermer.
- `useFermerAvecRetour(ouvert, onAnnuler)` : bouton retour physique ferme
  la modale au lieu de naviguer plus loin (comportement identique aux
  autres panneaux de l'app — `RechercheGlobale`, `NotificationsCloche`).
- Touche Échap : `keydown` écouté tant que `ouvert`.
- Focus initial sur le bouton Annuler à l'ouverture (focus trap
  "basique", comme demandé — pas de cycle Tab/Shift+Tab complet).
- `role="dialog"` / `aria-modal="true"` / `aria-labelledby` sur le
  panneau.
- Couleur du bouton de confirmation : `bg-rec` (texte blanc) si
  `destructif`, `bg-primary` sinon — tokens `globals.css`, aucune valeur
  codée en dur.
- Variante `choix` (tableau `{ label, valeur }[]`) : un bouton par choix
  (couleur `bg-rec-soft`/`text-rec` ou `bg-primary-soft`/`text-primary`
  selon `destructif`) + le bouton Annuler, à la place du duo
  Annuler/Confirmer. `onConfirmer(valeur)` reçoit alors la valeur du choix
  cliqué.

## Fichiers modifiés (1 commit chacun)

Tous suivent le même schéma : un `confirm(...)` remplacé par un état
local (`useState`) mémorisant l'élément visé, ouverture de la modale au
clic, `onConfirmer` exécute l'action déjà existante
(`startTransition(() => actionServeur(...))`, inchangée) puis referme,
`onAnnuler` referme sans rien faire.

| Fichier | État local ajouté | Titre modale |
|---|---|---|
| `fournisseurs-liste.tsx` | `aSupprimer: { id, nom } \| null` | `Supprimer le fournisseur « {nom} » ?` |
| `carnet-adresses.tsx` | `aSupprimer: { id, nom } \| null` | `Supprimer le contact « {nom} » ?` |
| `cno-liste.tsx` | `aSupprimer: { id, nom } \| null` | `Supprimer la fiche de « {nom} » ?` |
| `regularisations-liste.tsx` | `aSupprimer: { id, nomComplet } \| null` | `Supprimer la régularisation de « {nomComplet} » ?` |
| `gestion-officines.tsx` | `officineAQuitter: { id, nom } \| null` | `Quitter « {nom} » ?` + description + `texteConfirmer="Quitter"` |
| `fil-de-messages.tsx` | `idASupprimer: string \| null` | `Supprimer ce message ?` |
| `suggestions.tsx` | `idASupprimer: string \| null` | `Retirer cette suggestion ?` + `texteConfirmer="Retirer"` |
| `taches-list.tsx` | `confirmationOuverte: boolean` **local à `CarteTache`** | `Supprimer la tâche « {titre} » ?` |
| `agenda/planning-equipe.tsx` | `creneauASupprimer: Creneau \| null` + `creneauPortee: Creneau \| null` | voir ci-dessous |

## Cas particulier : `planning-equipe.tsx`

L'ancien flux enchaînait deux `confirm()` synchrones : suppression simple,
puis (si le créneau appartient à une série récurrente) un choix
occurrence/série encodé en OK/Annuler d'un second `confirm()`. Reconstruit
en deux modales séquentielles, jamais ouvertes en même temps :

1. `creneauASupprimer` → `ModaleConfirmation` simple, titre calculé par
   `libelleSuppression(c)` (même texte qu'avant : nom, type, horaire).
   `onConfirmer` (`confirmerEtapeUn`) ferme cette modale puis, si
   `c.serie_id` est renseigné, ouvre `creneauPortee` — sinon supprime
   directement en portée `'occurrence'` (comportement identique à avant).
2. `creneauPortee` → `ModaleConfirmation` avec `choix={[{label: 'Toute la
   série', valeur: 'serie'}, {label: 'Seulement ce jour', valeur:
   'occurrence'}]}`. `onConfirmer` (`confirmerPortee`) reçoit la valeur du
   bouton cliqué et appelle `supprimerCreneau(c.id, c.serie_id, portee)` —
   même server action, même signature qu'avant.

Les deux fonctions `confirmerSuppression`/`demanderPorteeSuppression`
(simples enveloppes autour de `confirm`) ont été supprimées ; le
commentaire métier qui les accompagnait ("un créneau récurrent est
composé de plusieurs lignes reliées par serie_id…") a été déplacé au-dessus
des nouveaux états.

## Écart par rapport au prompt

- **`onConfirmer` accepte un paramètre optionnel** (`(valeurChoix?: string)
  => void`) plutôt que `() => void` strict. Nécessaire pour que la
  variante `choix` puisse transmettre quel bouton a été cliqué — les 8
  autres appelants (confirmation simple) l'ignorent et restent
  `() => void` valides (paramètre optionnel non fourni). Sans cette
  extension, aucun mécanisme n'aurait permis à `planning-equipe.tsx` de
  savoir si l'utilisateur a choisi "série" ou "occurrence".
- **État local par carte plutôt que par liste** dans `taches-list.tsx` :
  la suppression est gérée dans le sous-composant `CarteTache` (déjà
  extrait lors d'un travail précédent, voir
  `RAPPORT-taches-archivees-2026-08-21.md`), chaque carte connaît déjà sa
  propre tâche — un booléen local suffit, pas besoin de remonter un id à
  `TachesList`. Comportement final identique à un `elementASupprimer`
  centralisé.
- **Deux `&rsquo;` corrigés en apostrophe littérale** (`gestion-officines.tsx`,
  `planning-equipe.tsx`) : `titre`/`description` sont des props `string`,
  pas des enfants JSX — une entité HTML n'y est jamais décodée et
  s'afficherait telle quelle à l'écran.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur après chaque commit.
- `npm run lint` (`npx eslint <fichier> --max-warnings 0`) : 0
  erreur/warning après chaque commit.
- `npm run build` : build de production réussi après le dernier commit,
  aucune route en erreur.
- `grep -rn '\bconfirm\('` sur `src/` : plus aucun appel réel restant
  (seule occurrence : le mot "confirm()" dans le commentaire de doc de
  `modale-confirmation.tsx`).
- Chaque `onConfirmer`/`onAnnuler` réutilise exactement les mêmes
  `startTransition`/actions serveur qu'avant — aucune server action, aucun
  data layer, aucune migration touchés.

## Comportement (description textuelle, pas de capture disponible dans cet environnement)

- Clic sur "Supprimer"/"Quitter"/"Retirer" : la sheet remonte du bas de
  l'écran sur mobile (glissement immédiat, pas d'animation d'entrée
  distincte du reste de l'app), apparaît centrée en carte arrondie à
  partir de `sm:`.
- Fond assombri (`bg-black/40`) cliquable : un clic dessus referme sans
  action, comme un clic sur "Annuler".
- Touche Échap : referme sans action, où que soit le focus.
- Bouton retour physique (mobile) : referme sans action au lieu de
  quitter la page.
- Ouverture : le focus clavier saute directement sur le bouton "Annuler"
  (sécurité par défaut — un appui accidentel sur Entrée n'exécute pas
  l'action destructive).
- Variante `choix` (`planning-equipe.tsx`, créneau récurrent) : au lieu
  d'un duo Annuler/Confirmer, un bouton par option ("Toute la série" /
  "Seulement ce jour") empilé au-dessus du bouton Annuler.

## Points de vigilance restants

- **Focus trap "basique" uniquement** : le focus initial est posé sur
  Annuler, mais Tab peut toujours sortir de la modale vers le reste de la
  page (pas de cycle fermé). Suffisant pour l'usage actuel (peu
  d'éléments focusables dans la modale elle-même) mais à renforcer si un
  jour une modale de ce type embarque plus de contenu interactif.
- **Pas de vérification navigateur en conditions réelles** dans cet
  environnement (pas de compte de test disponible) : le comportement
  visuel (glissement, focus, Échap, retour physique) repose sur le même
  mécanisme déjà validé pour `NotificationsCloche`/`RechercheGlobale`
  (`useFermerAvecRetour`), mais reste à confirmer à l'usage par
  l'utilisateur, en particulier l'enchaînement des deux modales dans
  `planning-equipe.tsx`.
- **`gestion-officines.tsx`** : `destructif` reste à sa valeur par défaut
  (`true`) pour "Quitter une officine" — c'est réversible (on peut
  rejoindre à nouveau avec un code d'invitation) mais suffisamment
  bloquant pour justifier la couleur d'alerte ; à réévaluer si ce choix de
  couleur prête à confusion à l'usage.

## Commits (10, isolés comme demandé)

1. `feat(ui): composant générique ModaleConfirmation`
2. `Remplace confirm() par ModaleConfirmation dans fournisseurs-liste.tsx`
3. `Remplace confirm() par ModaleConfirmation dans planning-equipe.tsx`
4. `Remplace confirm() par ModaleConfirmation dans taches-list.tsx`
5. `Remplace confirm() par ModaleConfirmation dans gestion-officines.tsx`
6. `Remplace confirm() par ModaleConfirmation dans fil-de-messages.tsx`
7. `Remplace confirm() par ModaleConfirmation dans carnet-adresses.tsx`
8. `Remplace confirm() par ModaleConfirmation dans suggestions.tsx`
9. `Remplace confirm() par ModaleConfirmation dans cno-liste.tsx`
10. `Remplace confirm() par ModaleConfirmation dans regularisations-liste.tsx`

Aucune logique métier touchée : mêmes server actions, mêmes
`isPending`/`useTransition`, aucun fichier de migration SQL modifié.
