# Rapport — Édition et suppression d'un message par appui long

Date : 2026-09-02

## Objectif

Remplacer le bouton « × » de suppression, jusqu'ici toujours visible sur les messages de l'utilisateur courant, par un geste d'appui long qui révèle deux icônes (stylo pour modifier, corbeille pour supprimer sans confirmation), sur le modèle de l'édition des notes (`ModaleEditionNote` / `CarteNote` dans `src/components/notes.tsx`).

## 1. `modifierMessage` (src/app/actions/liaison.ts)

Nouvelle server action, calquée sur `modifierNote` et sur `supprimerMessage` déjà en place :

- Lit `contenu` depuis le `FormData`, `.trim()`.
- Vérifie `getCurrentProfil()`.
- Charge le message (`auteur_id`, `audio_chemin_stockage`), vérifie `message.auteur_id === profil.id`, sinon `throw new Error('Tu ne peux modifier que tes propres messages.')` (même formulation que `supprimerMessage`).
- N'exige un `contenu` non vide que si le message n'a pas d'audio (`!contenu && !message.audio_chemin_stockage → return`), pour permettre d'ajouter du texte a posteriori à un message audio, ou de le vider explicitement.
- `update({ contenu }).eq('id', id)`, aucune nouvelle colonne.
- `revalidatePath('/')`, seul chemin revalidé par les autres actions de ce fichier (`envoyerMessage`, `supprimerMessage`, `togglePouceMessage`).

`supprimerMessage` n'a pas été touchée.

## 2. UI (src/components/fil-de-messages.tsx)

### État

- `idIconesVisibles: string | null` — id du message dont les icônes stylo/corbeille sont révélées.
- `messageEnEdition: MessageAvecDetails | null` — message actuellement en édition.
- `idASupprimer` et `ModaleConfirmation` liés à la suppression de message ont été supprimés (plus de confirmation : la corbeille supprime directement).

### Extraction en `MessageItem`

Même découpage que `CarteNote` : chaque message porte désormais son propre minuteur d'appui long (`useRef<ReturnType<typeof setTimeout> | null>`), actif uniquement si `message.auteur?.id === profilActuelId`. Gestion identique à `notes.tsx`/`huiles-essentielles-liste.tsx` : `onTouchStart`/`onMouseDown` démarrent un `setTimeout` de 500 ms (`DELAI_APPUI_LONG_MS`), `onTouchMove`/`onTouchEnd`/`onMouseUp`/`onMouseLeave` l'annulent, `onContextMenu` fait `preventDefault()` pour l'auteur. Retour visuel `enMaintien` (`scale-[0.98] opacity-80`) pendant le maintien.

Au déclenchement (500 ms), `onAppuiLong(m.id)` est appelé — câblé directement sur `setIdIconesVisibles` côté parent.

### Icônes stylo / corbeille

À l'emplacement de l'ancien « × » (haut droite du header), affichage conditionnel selon `iconesVisibles` :

- **Stylo** (`IconStylo`, SVG inline 24×24, trait fin cohérent avec `nav-icons.tsx`/`notifications-cloche.tsx`) — `onClick` appelle `onEditer(m)`, qui fait `setMessageEnEdition(message)` puis `setIdIconesVisibles(null)`.
- **Corbeille** (`IconCorbeille`, même style) — `onClick` appelle `supprimer()`, qui déclenche `supprimerMessage(m.id)` via `startTransition` **sans confirmation**, toast `'Message supprimé.'` en cas de succès ou message d'erreur sinon, puis ferme les icônes (`onIconesFermees`).

### Fermeture au tap ailleurs

Overlay invisible `fixed inset-0 z-40` (idiome `notifications-cloche.tsx`), monté quand `idIconesVisibles !== null`, `onClick` → `setIdIconesVisibles(null)`. Le message dont les icônes sont visibles reçoit `relative z-50` pour rester cliquable au-dessus de l'overlay (même mécanique que le panneau de notifications, `z-50`, au-dessus de son propre overlay `z-40`) ; les autres messages, non positionnés, restent en dessous et laissent l'overlay intercepter le tap pour fermer.

### `ModaleEditionMessage`

Nouveau composant dans le même fichier, sur le modèle exact de `ModaleEditionNote` :

- `createPortal` vers `document.body`, montage différé via `useSyncExternalStore(sabonnerSansChangement, ...)` (dupliqué localement, comme le fait déjà `notes.tsx`) pour éviter un mismatch SSR.
- `useFermerAvecRetour(true, onFerme)` pour le bouton retour Android.
- Overlay `onClick={onFerme}`, formulaire `onClick={(e) => e.stopPropagation()}`.
- Un seul champ `textarea` (`name="contenu"`, `defaultValue={message.contenu}`, pas de titre). `required={!message.audioUrl}` : bloque la soumission d'un contenu vide seulement si le message n'a pas d'audio (même exigence que côté serveur).
- Si `message.audioUrl` existe, affichage en lecture seule de l'audio existant (`<audio controls>` non éditable) au-dessus du textarea, avec la mention « L'audio ne peut pas être modifié ici. ».
- `action` : `modifierMessage(message.id, formData)`, toast succès `'Message modifié.'` ou erreur, `onFerme()` au succès.

Rendu conditionnel dans `FilDeMessages` : `{messageEnEdition && <ModaleEditionMessage key={messageEnEdition.id} message={messageEnEdition} onFerme={...} />}`.

### Reste inchangé

Filtres, recherche, marquage lu automatique, pouces, envoi de message (texte/audio), surlignage de la notification cible — comportement intact, seule la portion « header du message » a été extraite et modifiée.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur.
- `npx eslint src/components/fil-de-messages.tsx src/app/actions/liaison.ts` : ✅ aucune erreur/warning. (`npm run lint` global remonte toujours la même erreur pré-existante dans `src/components/switch-identite.tsx`, fichier non touché par cette tâche.)
- Tokens Tailwind v4 sémantiques uniquement (`bg-surface`, `text-ink`, `text-muted`, `border-border`, `bg-primary`, `hover:text-rec`, `hover:text-primary`, etc.) — aucune couleur brute ajoutée.
- Aucune migration SQL, aucune nouvelle colonne, aucune nouvelle fonction `SECURITY DEFINER`.
- Noms de fonctions/variables en français, UI en français, conformément au reste du projet.

## Fichiers modifiés

- `src/app/actions/liaison.ts` (+29 lignes — `modifierMessage`)
- `src/components/fil-de-messages.tsx` (extraction de `MessageItem`, ajout de `ModaleEditionMessage`, `IconStylo`/`IconCorbeille`, suppression de `idASupprimer`/`ModaleConfirmation`)

## Commit

Un seul commit isolé regroupant stylo + corbeille (livrés ensemble, comme demandé). Aucun push effectué automatiquement.
