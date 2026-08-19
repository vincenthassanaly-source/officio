# Scanner chaussures — passage à une caméra intégrée (2026-08-19)

## Résumé du changement d'approche

**Avant** : `chaussures-scanner.tsx` s'appuyait sur `<input type="file" capture="environment">`
pour déclencher l'appli Appareil photo native d'Android. En PWA installée, cette bascule vers
l'app système provoque parfois un rechargement du WebView par Android au retour (libération de
mémoire), ce qui coupe l'appel réseau à Voyage AI en cours et fait perdre l'état React (`vue`
retombe sur `'catalogue'`) — la photo s'affiche brièvement puis l'écran revient sur le catalogue
sans qu'aucune analyse n'aboutisse.

**Après** : le flux caméra est capturé directement dans la page via
`navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })`, affiché dans un
`<video>` en direct, et la capture se fait en dessinant l'image courante dans un `<canvas>` puis
en l'exportant en JPEG. Aucune app externe n'est ouverte, donc plus de rechargement de WebView ni
de perte d'état React pendant l'analyse.

Le repli `<input capture="environment">` existant est conservé intégralement, mais seulement
comme filet de sécurité : il ne s'affiche que si `getUserMedia` échoue ou n'est pas disponible
(permission refusée, aucune caméra, contexte non sécurisé, navigateur sans support).

## Fichiers modifiés

- `src/components/chaussures-scanner.tsx` — réécriture complète du composant caméra
  (`<video>` en direct + capture canvas + repli `<input capture>` + gestion d'état/erreurs).
- `src/components/chaussures-catalogue.tsx` — correctif indépendant demandé (voir plus bas).
- `src/app/actions/scanner-chaussures.ts` — **non modifié**, comme demandé.

## Détail technique du composant caméra

- Le flux vidéo n'est actif que tant qu'aucune photo n'est en cours d'analyse/aperçu
  (`photoApercu === null`). Il démarre au montage et se relance automatiquement via
  "Reprendre une photo".
- Les tracks du flux sont coupées (`stream.getTracks().forEach(t => t.stop())`) :
  - immédiatement après la capture (avant même l'envoi au serveur, pour éteindre le voyant
    caméra tout de suite) ;
  - au démontage du composant (cleanup d'un `useEffect` dédié), pour couvrir le cas où
    l'utilisateur navigue hors de l'écran Scanner pendant que la caméra est active ;
  - à chaque nettoyage d'effet (changement de dépendances), pour éviter les flux fantômes en
    cas de re-render rapide.
- Résolution de capture bornée directement à `DIMENSION_MAX_PX = 1600` px sur le côté long
  (demandée en `ideal` à `getUserMedia`, puis re-vérifiée au moment du `drawImage` dans le
  canvas). Comme la capture est déjà à la bonne résolution, elle **n'est pas repassée** dans le
  pipeline `compresserPhoto()` — celui-ci reste utilisé uniquement pour le repli `<input
  capture>`, qui lui reçoit une vraie photo pleine résolution du téléphone. Qualité JPEG 0.85
  dans les deux cas, cohérent avec `src/lib/image.ts::comprimerImage()`.
- `<video autoPlay muted playsInline>` : `playsInline` est nécessaire pour éviter le plein écran
  natif sur iOS Safari/Android Chrome, `muted` est requis par la plupart des navigateurs pour
  autoriser l'autoplay.
- Gestion d'état caméra à 3 valeurs (`chargement` / `active` / `indisponible`) :
  - `chargement` : `getUserMedia()` en cours → overlay "Ouverture de la caméra…" visible.
  - `active` : flux prêt → bouton "Capturer" visible.
  - `indisponible` : échec (`catch`) ou absence de support détectée au premier rendu
    (`useState` avec initialiseur paresseux, pour ne pas déclencher de `setState` synchrone
    dans un effet — voir décision technique ci-dessous) → message clair + bouton de repli vers
    `<input capture>`.
- Le flux existant (`identifierChaussure(formData)`, affichage des candidats, sélection
  manuelle obligatoire) est réutilisé à l'identique, que la photo vienne de la caméra intégrée
  ou du repli `<input capture>`.

## Correctif indépendant : onglets ÉTÉ/HIVER/PERMANENT/FINS DE SÉRIE

Dans `chaussures-catalogue.tsx`, le bloc d'onglets de rayon restait visible et cliquable même
quand `vue === 'scanner'`, alors que la barre de recherche et les filtres Genre étaient déjà
correctement masqués dans ce cas. Le bloc est maintenant conditionné par `vue === 'catalogue' &&`,
au même titre que le reste de l'UI catalogue. Les comparaisons internes `vue === 'catalogue' &&
rayon === r` ont été simplifiées en `rayon === r` puisque le bloc entier est désormais déjà sous
cette garde (évite une redondance).

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → OK, aucune nouvelle erreur introduite. Les 2 erreurs restantes
  (`agenda-vue-globale.tsx`, `switch-identite.tsx`) sont préexistantes et sans rapport avec ce
  travail (non touchées).
- `npm run build` → build de production réussi (Next.js 16.2.12 / Turbopack), toutes les pages
  compilées et générées sans erreur.
- Test dans le navigateur automatisé (Browser pane) : limité à la vérification que le serveur
  dev démarre sans erreur console/réseau. Impossible d'aller plus loin dans ce navigateur — pas
  de vraie caméra disponible dans cet environnement, et l'app est protégée par une page de
  connexion à laquelle je n'ai pas de compte de test.

## Décision technique prise sans redemander

Le linter du projet embarque une règle (`react-hooks/set-state-in-effect`, liée au React
Compiler — cohérent avec l'avertissement `AGENTS.md` sur les changements de comportement de
cette version de Next.js/React) qui interdit d'appeler `setState` de façon synchrone dans le
corps d'un effet (en dehors d'un callback `.then`/`.catch`). La première version du composant
appelait `setEtatCamera(...)` directement dans l'effet pour poser l'état initial. Corrigé en :
- déplaçant la détection du support navigateur (`cameraSupportee`) dans un initialiseur
  paresseux de `useState`, calculé une seule fois, sans passer par un effet ;
- laissant l'état `'chargement'` être celui posé par défaut au montage, et remis explicitement
  par `reprendrePhoto()` (un gestionnaire d'événement, pas un effet — donc autorisé) avant que
  l'effet ne relance `getUserMedia()`.

Ce choix n'a aucun impact fonctionnel sur le comportement décrit dans la tâche, seulement sur la
façon dont l'état est câblé pour respecter les règles du linter du projet.

## Ce qui reste à tester en vrai sur téléphone

Impossible à vérifier dans un navigateur automatisé — nécessite un vrai appareil :

1. **Accès caméra réel** : que le flux `environment` (caméra arrière) s'ouvre bien et affiche une
   image nette, sur Android Chrome PWA installée ET sur iOS Safari (Ajouter à l'écran d'accueil).
2. **Capture** : que le bouton "Capturer" produise une photo nette et correctement cadrée
   (vérifier notamment qu'il n'y a pas de décalage entre ce qui est affiché dans le `<video>` et
   ce qui est effectivement dessiné dans le `<canvas>`, en particulier si `object-cover` recadre
   différemment de la résolution native du flux).
3. **Permission refusée** : que le message de repli s'affiche bien et que le bouton
   "Prendre une photo de la chaussure" (repli `<input capture>`) fonctionne toujours comme avant.
4. **Aucune caméra disponible / contexte non sécurisé** : comportement de repli identique.
5. **Comportement iOS Safari vs Android Chrome** :
   - iOS Safari est historiquement plus strict sur `playsInline`/autoplay et sur la libération
     effective de la caméra (voyant orange) — à confirmer que `stop()` sur les tracks éteint
     bien le voyant immédiatement après capture.
   - Vérifier qu'aucune des deux plateformes ne bascule en plein écran natif lors du `autoPlay`.
6. **Que le bug initial soit bien résolu** : enchaîner plusieurs scans d'affilée en PWA installée
   sur Android sans que l'app ne revienne sur le catalogue en cours d'analyse (c'était le
   symptôme initial avec `<input capture>`).
7. **Navigation hors de l'écran Scanner caméra active** : confirmer au niveau système
   (indicateur caméra du téléphone) que le flux est bien coupé quand on quitte l'onglet Chaussures
   ou qu'on revient au catalogue en cours de prévisualisation caméra.
