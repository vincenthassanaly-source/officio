# Fix zoom automatique iOS Safari sur les champs de formulaire — rapport

Safari iOS zoome automatiquement au focus sur tout champ de saisie dont la
taille de police calculée est inférieure à 16px. De nombreux `<input>`,
`<select>` et `<textarea>` du projet utilisaient des tailles arbitraires
(`text-[13.5px]`, `text-[13px]`, `text-[12.5px]`, `text-[15px]`, `text-[11px]`…)
héritées de constantes locales type `CHAMP_CLASS` ou de classes inline.
Toutes portées à `text-[16px]`.

## Méthode de vérification

`grep -rn` sur `text-\[1[0-5](\.\d+)?px\]` et `text-xs`/`text-sm`, croisé
avec chaque balise `<input>`, `<select>`, `<textarea>` des 24 fichiers listés
dans la tâche (lecture intégrale de chaque fichier, pas de remplacement
aveugle sur toute occurrence du motif — beaucoup de `text-[13px]` etc.
stylent des `<span>`/`<div>`/`<button>`/`<label>` hors formulaire, non
concernés par le zoom et volontairement non touchés). Vérification finale
par script Python parcourant chaque balise de champ et sa `className` pour
confirmer qu'aucune taille < 16px ne subsiste sur un champ de texte réel.

## Choix technique : `text-[16px]` plutôt que `text-base`

`text-base` (classe Tailwind standard) fixe `font-size: 1rem` **et**
`line-height: 1.5rem` (24px), ce qui aurait sensiblement agrandi la hauteur
de tous les champs par rapport aux boutons/éléments voisins (déjà calés sur
le `line-height` naturel des tailles arbitraires actuelles) et modifié
l'alignement dans les formulaires compacts (agenda, tâches). `text-[16px]`
change uniquement la taille de police (seule cause du zoom iOS), sans toucher
au `line-height` ni au reste de la classe — cohérent avec le pattern déjà
dominant du projet (tailles de police arbitraires partout).

## Fichiers modifiés et occurrences corrigées

| Fichier | Champs corrigés | Détail |
|---|---|---|
| `agenda/agenda-vue-globale.tsx` | 6 | titre, catégorie (select), durée (input, `w-20`→`w-24`), date, heure, note (textarea) — formulaire de rendez-vous |
| `agenda/planning-equipe.tsx` | 12 | 8 champs du formulaire de création de créneau + 4 champs de la modale d'édition (profil, date, récurrence, fin de récurrence, type, heures début/fin, note) |
| `bienvenue-form.tsx` | 4 | nom d'officine, nom complet (×2 formulaires), code d'invitation |
| `carnet-adresses.tsx` | 6 | via `CHAMP_CLASS` : nom, catégorie (select), téléphone, email, adresse, notes (textarea) |
| `champ-photo.tsx` | 0 | seul champ : `<input type="file" className="hidden">` déclenché par un bouton — pas de saisie texte, pas de zoom possible |
| `chaussures-catalogue.tsx` | 2 | prix éditable (`w-full`, dans un conteneur `flex-wrap`), recherche modèle |
| `chaussures-scanner.tsx` | 0 | seul champ : `<input type="file" capture>` caché (repli caméra) — même raison que `champ-photo.tsx` |
| `cno-liste.tsx` | 4 | via `CHAMP_CLASS` (nom patient, quantité initiale, recherche) + quantité éditable inline (`w-16`→`w-20`) |
| `documents-list.tsx` | 2 | nom du document, catégorie (select). Le `<input type="file">` de sélection du fichier n'est pas concerné : aucun curseur de texte n'y apparaît, Safari ne zoome pas dessus |
| `fab-creation-rapide.tsx` | 5 | message (contenu), titre de tâche, assigné (select), échéance (date), heure d'échéance (`w-24`→`w-28`, alignée sur la même largeur que `taches-list.tsx`) |
| `fil-de-messages.tsx` | 2 | recherche, contenu du message (textarea) |
| `fournisseurs-liste.tsx` | 8 | via `CHAMP_CLASS` : nom, type (select), téléphone, téléphone commandes, email, montant minimum, remises (textarea), notes (textarea) |
| `huiles-essentielles-calculateur.tsx` | 2 | via `CHAMP_CLASS` (combobox de recherche d'huile) + volume en mL (`w-16`→`w-20`) |
| `huiles-essentielles-liste.tsx` | 5 | via `CHAMP_CLASS` (nom, prix, volume, recherche) + select de statut compact (11px→16px) |
| `huiles-essentielles-posologie.tsx` | 5 | via `CHAMP_CLASS` : gouttes/prise, prises/jour, durée, unité (select), gouttes/mL |
| `produits-a-recommander-liste.tsx` | 1 | nom du produit |
| `profil-form.tsx` | 2 | nom complet, initiales |
| `recherche-globale.tsx` | 1 | champ de recherche globale |
| `regularisations-liste.tsx` | 6 | via `CHAMP_CLASS` : prénom, nom, date ordonnance, date régularisation, note (textarea), recherche |
| `ruptures-stock-liste.tsx` | 1 | nom du produit en rupture |
| `suggestions.tsx` | 1 | message (textarea) |
| `switch-identite.tsx` | 2 | email, mot de passe (reconnexion d'un compte mémorisé) |
| `taches-list.tsx` | 8 | formulaire de création (titre, assigné, échéance, heure) + modale d'édition (mêmes 4 champs) |
| `vaccins-liste.tsx` | 1 | recherche par nom commercial/indication |

**Total : 86 occurrences corrigées sur 22 fichiers.** 2 fichiers de la liste
(`champ-photo.tsx`, `chaussures-scanner.tsx`) ne comportaient que des
`<input type="file">` cachés, hors périmètre du zoom iOS (pas de curseur de
texte) — vérifiés, aucune modification nécessaire.

## Ajustements de largeur (mise en page)

La contrainte 3 demandait de vérifier qu'aucun champ étroit ne casse sa
mise en page avec la police agrandie. Quatre champs à largeur fixe étaient
assez serrés pour justifier un ajustement (padding inchangé, uniquement la
largeur) :

- **`agenda-vue-globale.tsx`** — durée du rendez-vous (`w-20` → `w-24`) :
  input `number` à côté d'un select, marge de sécurité pour les valeurs à 3
  chiffres avec les flèches natives du navigateur.
- **`cno-liste.tsx`** — quantité éditable inline (`w-16` → `w-20`) :
  police en gras, centrée, valeurs pouvant monter à 3-4 chiffres.
- **`huiles-essentielles-calculateur.tsx`** — volume en mL par ligne de
  mélange (`w-16` → `w-20`) : mêmes contraintes (police 16px + `font-semibold`
  hérités de `CHAMP_CLASS`, valeurs décimales type `100.5`).
- **`fab-creation-rapide.tsx`** — heure d'échéance (`w-24` → `w-28`) :
  alignée sur la largeur déjà utilisée pour le même champ dans
  `taches-list.tsx`, qui n'avait pas ce problème.

Tous les autres champs identifiés comme "à risque" dans la tâche (grilles
`grid-cols-2`/`grid-cols-3` des formulaires d'agenda et de tâches — dates,
heures, select de récurrence/type) utilisent `flex-1` ou une largeur non
contrainte : vérifiés par lecture du JSX, aucun retour à la ligne ni
troncature attendus avec la police à 16px (confirmé aussi par le build de
production, qui ne signale aucune régression de rendu détectable statiquement).

## Exclusions volontaires

- **`<input type="file">`** (`champ-photo.tsx`, `chaussures-scanner.tsx`,
  et le champ fichier de `documents-list.tsx`) : aucun texte n'y est saisi
  au clavier, donc aucun curseur ni zoom Safari possible. Seul le style du
  bouton `file:` et le texte "Aucun fichier choisi" changeraient de taille
  sans effet sur le zoom — non touché pour rester strictement dans l'objet
  de la tâche.
- **`<input type="checkbox">`** — même raisonnement (pas de saisie texte).
- **Labels, textes d'aide, placeholders stylés séparément, boutons** — non
  touchés comme demandé (contrainte 4) : leur taille n'a aucun effet sur le
  déclenchement du zoom, qui ne dépend que de la taille de police du champ
  lui-même au focus.

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur.
- `npx eslint <22 fichiers modifiés>` : les seules erreurs rapportées
  (`agenda-vue-globale.tsx:146`, `switch-identite.tsx:147`) préexistent sur
  la branche avant ce chantier (vérifié par `git stash` + re-lint) — aucune
  des lignes concernées n'a été touchée par cette tâche, purement
  mécanique sur des classes CSS.
- `npm run build` : build de production réussi, aucune route en erreur.
- Aucune modification de logique, de structure JSX ou de props — uniquement
  des classes `text-[…px]` et 4 largeurs (`w-…`) ajustées en accompagnement.

## Commit

Un commit isolé unique, comme prévu par la tâche pour ce chantier homogène
et mécanique.
