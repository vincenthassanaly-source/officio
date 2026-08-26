# Transparence des coins de l'icône app — rapport

Rend transparents les coins de `public/icon-master.png` (fond blanc opaque
hors de la forme arrondie violette/argentée), devenus visibles depuis le
passage du `background_color` du manifest PWA à une teinte sombre
(`#1A1A2E`, cf. `RAPPORT-splash-screen-background-2026-08-26.md`) : le fond
blanc dénaturait l'écran de démarrage en dessinant quatre carrés blancs
dans les coins autour de l'icône arrondie.

## Fichier modifié

- **`public/icon-master.png`** (1024×1024, RGBA) : les pixels de fond
  situés dans les quatre coins (hors de la forme arrondie) sont passés à
  alpha = 0. Aucun pixel de la forme violette/argentée elle-même n'a été
  modifié (RGB identique à l'original pour tout pixel resté opaque —
  vérifié par comparaison pixel à pixel, cf. section Vérifications).

## Méthode

Script Python one-off (Pillow), écrit dans le répertoire scratchpad de la
session puis supprimé après usage — non committé, conformément à la
consigne.

Un simple seuillage global « proche du blanc → transparent » aurait été
risqué : l'icône contient un anneau « argenté » (le rond central) avec des
tons très clairs (jusqu'à RGB ~(250,241,255)), quasiment aussi proches du
blanc que le fond lui-même. Un seuil de couleur global aurait donc soit
laissé un résidu de fond, soit rongé une partie du reflet argenté.

À la place : **remplissage par propagation (flood fill) depuis les bords
de l'image**, en deux passes :

1. **Passe stricte** — amorcée sur les 4 bords de l'image (garantis fond,
   par définition hors de la forme). Un pixel n'est absorbé dans la région
   « fond » que s'il est quasi neutre (écart max entre canaux R/G/B ≤ 10)
   et très clair (canal minimum ≥ 240) — ce qui correspond au blanc
   `#F7F7F9`/`#FFFFFF` d'origine et à son antialiasing immédiat contre le
   fond.
2. **Passe relâchée** — ré-amorcée uniquement depuis les pixels déjà
   marqués « fond » par la passe 1 (jamais depuis le bord directement),
   avec un seuil plus tolérant (écart ≤ 20, canal minimum ≥ 215), pour
   absorber le dernier pixel de frange d'antialiasing sans laisser de
   liseré blanchâtre.

Parce que la propagation part uniquement des bords et ne peut avancer que
de proche en proche à travers des pixels « proches du blanc », elle ne
peut jamais atteindre le reflet argenté au centre de l'icône : celui-ci
est entouré par le corps violet (très saturé, loin du blanc) et n'est
connecté au bord par aucun chemin de pixels clairs — la coupure ne se
déclenche que sur les 4 coins, exactement là où le fond blanc existait.

Résultat : **3,10 % des pixels** rendus transparents (32 515 / 1 048 576),
cohérent avec la géométrie attendue (aire des 4 coins coupés d'un carré
1024×1024 aux coins arrondis).

## Vérifications

- **Alpha strictement binaire** : les seules valeurs d'alpha présentes
  dans le fichier final sont `0` et `255` — aucun pixel semi-transparent,
  conformément à la contrainte « pas de pixels semi-transparents visibles
  en bordure ».
- **Aucun pixel opaque modifié en couleur** : comparaison pixel à pixel
  entre l'original et le résultat — 0 pixel resté opaque (`alpha=255`)
  n'a vu son RGB changer. Le violet et l'argenté du logo sont strictement
  identiques à l'original.
- **Les 4 coins de l'image sont bien transparents** (`(0,0)`,
  `(1023,0)`, `(0,1023)`, `(1023,1023)` → alpha 0), ainsi qu'un
  échantillon de points proches de chaque coin.
- **Inspection visuelle** (composite sur fond rouge vif puis sur le
  `#1A1A2E` réel du manifest, zoom ×5 sur un coin) : contour net, aucun
  halo blanc résiduel, l'anneau argenté et le reflet du bandeau supérieur
  du logo (légitimement très clairs, ~RGB 210-250, mais non connectés au
  fond) sont intacts.
- `npx tsc --noEmit` : 0 erreur.
- `npm run lint` : 1 erreur pré-existante et sans rapport avec ce
  changement, dans `src/components/switch-identite.tsx:147`
  (`react-hooks/immutability`), plus des warnings `no-unused-vars` dans le
  même fichier — non touché par cette session (déjà signalé dans le
  rapport précédent sur le `background_color`), non corrigé ici pour ne
  modifier aucun autre fichier que `public/icon-master.png`.

## Fichiers confirmés comme n'ayant pas besoin de modification

- **`src/lib/app-icon.tsx`** : lit `public/icon-master.png` en base64 à
  chaque rendu (`readFileSync`) — consomme donc automatiquement le nouveau
  fichier sans aucun changement de code.
- **`src/app/icon.tsx`**, **`src/app/apple-icon.tsx`**,
  **`src/app/icon-192/route.tsx`**, **`src/app/icon-512/route.tsx`** :
  tous importent `AppIconMark` depuis `@/lib/app-icon` et lui délèguent le
  rendu (redimensionné par satori/`next/og`) — aucune référence directe au
  fichier PNG, donc rien à modifier.

## Point d'attention

- `apple-icon.tsx` (utilisé comme icône d'écran d'accueil iOS, pas comme
  splash screen) hérite lui aussi de la transparence. Apple recommande
  historiquement une icône d'écran d'accueil opaque (iOS ignore ou
  aplatit parfois l'alpha des `apple-touch-icon`) — comportement
  pré-existant à vérifier séparément si un rendu inattendu est constaté
  sur l'icône d'accueil iOS ; non traité ici car hors du périmètre demandé
  (correction des coins du splash screen).

## Commit (1, isolé)

`fix: transparent background for app icon corners`
