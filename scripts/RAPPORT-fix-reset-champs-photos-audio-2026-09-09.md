# Rapport — Fix : vignette photo/audio persistante après envoi d'un message (2026-09-09)

## Bug

Après l'envoi d'un message avec une photo (ou un vocal) joint dans le Cahier
de liaison, la vignette restait affichée à côté du champ "Écrire un message"
au lieu de disparaître.

## Cause

`ChampAudio` (`src/components/champ-audio.tsx`) et `ChampPhotos`
(`src/components/champ-photos.tsx`) gèrent chacun leur aperçu dans un état
interne non contrôlé (`apercu` / `apercus`). Le formulaire parent
`FilDeMessages` réinitialisait bien son propre état (`setAudio(null)`,
`setPhotos([])`) après un envoi réussi, mais rien ne forçait ces deux
composants enfants à remettre à zéro leur état interne — leur vignette
survivait donc au succès de l'envoi.

## Correctif

Dans `src/components/fil-de-messages.tsx` :
- Ajout d'un compteur `cleFormulaire` (`useState(0)`), incrémenté juste après
  `envoyerMessage` dans le même bloc que `setContenu('')` / `setAudio(null)` /
  `setPhotos([])`.
- `key={`audio-${cleFormulaire}`}` sur `<ChampAudio />` et
  `key={`photos-${cleFormulaire}`}` sur `<ChampPhotos />` : changer la `key`
  force React à démonter puis remonter ces composants après un envoi réussi,
  ce qui réinitialise proprement leur état interne (aperçus, blobs).

## Portée

`ChampAudio` est aussi utilisé dans `taches-list.tsx` et
`fab-creation-rapide.tsx`, et `ChampPhotos` dans `notes.tsx` — ces usages
n'ont pas été touchés, conformément à la demande : le correctif ne s'applique
qu'au formulaire d'envoi du Cahier de liaison (`FilDeMessages`).
`ModaleEditionMessage` (même fichier) n'utilise ni l'un ni l'autre — rien à y
changer.

## Fichier modifié

- `src/components/fil-de-messages.tsx`

## Vérifications

- `tsc --noEmit` : ✅ aucune erreur.
- `npm run lint` : ✅ 0 erreur (4 warnings préexistants dans
  `switch-identite.tsx`, hors périmètre).

## Commit

Un commit isolé, prêt mais pas poussé.
