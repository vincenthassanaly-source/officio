# Retour téléphone sur les panneaux plein écran — audit et correctifs

## Contexte

`useFermerAvecRetour` (`src/lib/use-fermer-avec-retour.ts`) empêche le
bouton/geste retour du téléphone de sauter par-dessus un panneau ouvert en
état local pour atterrir sur la page précédente : à l'ouverture, une entrée
fictive est poussée dans l'historique ; le retour la consomme et ferme le
panneau au lieu de naviguer plus loin. Il était déjà utilisé dans 7
composants (`chaussures-catalogue.tsx`, `fab-creation-rapide.tsx`,
`notifications-cloche.tsx`, `officine-switcher.tsx`, `recherche-globale.tsx`,
`switch-identite.tsx`, `ui/modale-confirmation.tsx`). Cette tâche audite le
reste de l'app pour trouver les panneaux qui utilisent le même pattern
visuel sans le hook.

## 1. Grep exhaustif

Recherche sur `src/components` (et vérification de `src/app`, qui ne
contient aucun composant client avec état local d'ouverture) via
`fixed inset-0`, `inset-0`, `z-50`/`z-40` et `fixed ` : **10 fichiers**
correspondent au pattern « panneau plein écran avec état local
ouvert/fermé » :

| Fichier | Hook déjà présent ? |
|---|---|
| `ui/modale-confirmation.tsx` | ✅ déjà |
| `chaussures-catalogue.tsx` (`ChaussureDetail`) | ✅ déjà |
| `fab-creation-rapide.tsx` | ✅ déjà |
| `notifications-cloche.tsx` | ✅ déjà |
| `officine-switcher.tsx` | ✅ déjà |
| `recherche-globale.tsx` | ✅ déjà |
| `taches-list.tsx` (`ModaleEditionTache`) | ❌ manquant |
| `agenda/planning-equipe.tsx` (panneau détail créneau) | ❌ manquant |
| `agenda/planning-equipe-mois.tsx` (`ModaleDetailJour`) | ❌ manquant |
| `agenda/agenda-vue-globale-mois.tsx` (`ModaleDetailJour`) | ❌ manquant |

`agenda/agenda-vue-globale.tsx` (vue semaine) n'a **pas** de panneau plein
écran propre à elle : elle réutilise directement `ModaleEditionTache`
importée de `taches-list.tsx` — corriger ce dernier suffit à la couvrir
aussi.

Deux autres fichiers matchaient `inset-0` mais s'avèrent hors sujet :
`pleins-rayon-camera.tsx` et `chaussures-scanner.tsx` n'ont qu'un `absolute
inset-0` (overlay de chargement *à l'intérieur* d'une carte photo, pas un
panneau plein écran avec état ouvert/fermé).

### Composants de la liste de départ finalement hors périmètre

La liste de départ fournie avec la tâche citait aussi `cno-liste.tsx`,
`fournisseurs-liste.tsx`, `regularisations-liste.tsx`, `suggestions.tsx`,
`carnet-adresses.tsx`, `gestion-officines.tsx`, `fil-de-messages.tsx` et
`agenda-vue-globale.tsx`. Vérification individuelle : **aucun de ces
fichiers ne contient `fixed`/`inset-0`/`z-50`**. Leurs formulaires
d'édition (`formOuvert`, `enEdition`, etc.) sont des sections qui
s'insèrent **dans le flux normal de la page** (`rounded-[20px] bg-surface
shadow-card p-3`), pas des overlays plein écran — voir par exemple
`cno-liste.tsx` lignes 134-158 : le formulaire d'ajout apparaît entre la
barre de recherche et la liste, sans `fixed`/`z-50`. Le retour du téléphone
n'y a donc rien à « sauter par-dessus » : fermer une section inline ne
consomme pas d'historique. Ces fichiers utilisent déjà `ModaleConfirmation`
pour leurs confirmations de suppression, qui embarque le hook en interne.
**Laissés de côté**, à raison : pas de panneau `fixed inset-0` à corriger.

## 2. Panneaux corrigés

### `taches-list.tsx` — `ModaleEditionTache`

Composant démonté quand fermé (`{tacheEnEdition && <ModaleEditionTache .../>}`
chez les 3 appelants : `TachesList`, `agenda-vue-globale.tsx`,
`agenda-vue-globale-mois.tsx`) : `ouvert` vaut donc toujours `true` tant
qu'il existe.

```tsx
useFermerAvecRetour(true, onFerme)
```

### `agenda/planning-equipe.tsx` — panneau détail créneau

Panneau géré par un état classique (`creneauDetail !== null`) au niveau du
composant parent, comme `chaussures-catalogue.tsx` :

```tsx
useFermerAvecRetour(creneauDetail !== null, fermerDetail)
```

### `agenda/planning-equipe-mois.tsx` — `ModaleDetailJour`

Même pattern « toujours montée = ouverte » que `ModaleEditionTache`, plus
`signalerNavigation()` avant le `router.replace()` de « Voir cette semaine »
(voir §4).

### `agenda/agenda-vue-globale-mois.tsx` — `ModaleDetailJour`

Même pattern, plus `signalerNavigation()` pour le `<Link>` régularisation
rendu par `ItemLigne` à l'intérieur (voir §4).

## 3. Empilement panneau + confirmation : bug réel trouvé et corrigé

### Cas testés

Deux empilements réels existent déjà dans le code (contrairement à
`taches-list.tsx`, où `ModaleEditionTache` n'a pas de bouton de suppression
— la confirmation de suppression d'une tâche se fait depuis la carte de la
liste, jamais en même temps que l'édition ; ce n'est donc **pas** un cas
d'empilement, malgré ce que suggérait l'énoncé de la tâche) :

1. **`agenda/planning-equipe.tsx`** : le panneau détail d'un créneau
   (`creneauDetail`) ouvre `ModaleConfirmation` par-dessus (bouton
   Supprimer), laquelle peut elle-même enchaîner sur une seconde
   `ModaleConfirmation` (choix « toute la série » / « cette occurrence »
   pour un créneau récurrent).
2. **`agenda/agenda-vue-globale-mois.tsx`** : `ModaleDetailJour` ouvre
   `ModaleEditionTache` par-dessus (clic sur une tâche du jour, via
   `onEditerTache`).

### Bug découvert pendant l'implémentation

En simulant ces deux empilements avec une vraie navigation d'historique
(voir méthode ci-dessous), le **premier retour physique fermait les DEUX
panneaux d'un coup** au lieu d'un niveau à la fois. Cause : `window` ne
porte qu'une seule cible d'évènements `popstate`. Deux instances du hook
montées en même temps (une par panneau) enregistrent chacune leur propre
`addEventListener('popstate', ...)`, mais un unique retour physique ne
déclenche qu'un seul évènement `popstate`, livré à **tous** les
gestionnaires enregistrés — pas seulement à celui du panneau du dessus. Le
hook original ne distinguait pas « c'est mon entrée d'historique qui vient
d'être consommée » de « une entrée quelconque a été consommée », donc les
deux panneaux se fermaient systématiquement ensemble.

**Correctif appliqué à `use-fermer-avec-retour.ts`** (seule modification du
hook lui-même sur ce chantier, comme prévu par la consigne en cas de bug
réel découvert) : chaque instance du hook pousse désormais une entrée
d'historique portant un identifiant unique (`monId`, compteur global
incrémenté à chaque ouverture). `onPopState` et le nettoyage à la fermeture
ignorent l'évènement si `history.state` ne correspond plus à leur propre
identifiant — un panneau ne réagit qu'au retour qui consomme *sa* marque,
pas celle d'un panneau empilé par-dessus. Comparaison par identifiant
numérique plutôt que par référence d'objet, car `history.state` est cloné
(pas la même référence) d'un `pushState` à l'autre. API du hook strictement
inchangée (mêmes paramètres, même `signalerNavigation()` retourné) —
aucun appelant existant à modifier.

### Méthode de vérification

Aucun navigateur réel/PWA disponible dans cet environnement (pas de
compte Supabase authentifié ni de données seedées pour naviguer dans
l'app). Vérification faite avec une vraie navigation d'historique
(jsdom + React 19, `react-dom/client`, `history.pushState`/`back()` réels,
évènements `popstate` réels — pas une simulation manuelle du hook) :

1. **Scénario A** (= `planning-equipe.tsx`) : un composant de test avec
   `useFermerAvecRetour(detailOuvert, ...)` monte la vraie
   `ModaleConfirmation` du repo par-dessus. Séquence : ouverture détail →
   ouverture confirmation → retour → retour → retour.
   - **Avant le correctif** : 1 retour fermait détail *et* confirmation en
     même temps.
   - **Après le correctif** : 1er retour ferme uniquement la confirmation
     (détail reste ouvert), 2e retour ferme le détail, 3e retour sort
     normalement vers la page précédente (`history.state === null`).
2. **Scénario B** (= `agenda-vue-globale-mois.tsx`) : deux panneaux
   « toujours montés = ouverts » imbriqués (reproduisant `ModaleDetailJour`
   + `ModaleEditionTache`). Même résultat : 1er retour ferme seulement le
   panneau du dessus, 2e retour ferme l'autre.
3. **Scénario C** (fermeture programmatique, pas via retour) : clic sur
   « Annuler » de la confirmation pendant que le panneau détail reste
   ouvert → la confirmation se ferme et auto-consomme silencieusement sa
   propre entrée fictive (comportement documenté dans le hook) ; un seul
   retour ensuite ferme directement le panneau détail restant, sans retour
   fantôme nécessaire.

Script de test conservé localement pendant le développement (dépendances
`jsdom`/`tsx` installées avec `--no-save`, jamais ajoutées à
`package.json`/`package-lock.json`), supprimé avant le commit final — non
committé, il ne fait pas partie de la livraison.

### Limite assumée

Ce test reproduit fidèlement le mécanisme réel (React 19, vraie API
`history`, vrais évènements `popstate`) mais pas un vrai geste retour sur
appareil mobile ni le vrai bundle Next.js. Un test manuel sur PWA réelle
reste recommandé pour confirmer le ressenti final, mais le mécanisme exact
du bug et sa disparition avec le correctif sont vérifiés au niveau de
l'API d'historique, pas seulement déduits par lecture de code.

## 4. Échappatoire `signalerNavigation()` pour les vraies navigations

Deux endroits déclenchent une navigation Next.js réelle pendant qu'un
panneau reste ouvert (le state d'ouverture n'est pas réinitialisé avant de
naviguer) :

- **`agenda/planning-equipe-mois.tsx`** : le bouton « Voir cette semaine »
  de `ModaleDetailJour` appelle `router.replace(...)`.
- **`agenda/agenda-vue-globale-mois.tsx`** : `ItemLigne`
  (`agenda-item-ligne.tsx`) rend un `<Link href="/regularisations">` pour
  les items de type régularisation, cliquable depuis l'intérieur de
  `ModaleDetailJour`.

Dans les deux cas, `signalerNavigation()` (retourné par le hook) est
maintenant appelé juste avant que la navigation ne parte, exactement comme
le font déjà `notifications-cloche.tsx` et `recherche-globale.tsx` :

```tsx
// planning-equipe-mois.tsx
onClick={() => {
  signalerNavigation()
  onVoirCetteSemaine()
}}

// agenda-item-ligne.tsx
<Link href="/regularisations" onClick={onNaviguer} className="flex gap-3">
```

`ItemLigne` reçoit un `onNaviguer` optionnel : câblé sur
`signalerNavigation` uniquement par `agenda-vue-globale-mois.tsx` (le seul
appelant qui l'affiche dans un panneau `fixed inset-0`) ; `agenda-vue-globale.tsx`
(vue semaine) affiche les mêmes items en ligne, hors panneau, et ne le
passe pas — sans effet pour ce cas.

`taches-list.tsx` (`ModaleEditionTache`) et `agenda/planning-equipe.tsx`
(panneau détail créneau) ne déclenchent aucune navigation Next.js
(uniquement des server actions) : aucun `signalerNavigation()` nécessaire.

## Composants volontairement laissés de côté

| Composant | Raison |
|---|---|
| `cno-liste.tsx`, `fournisseurs-liste.tsx`, `regularisations-liste.tsx`, `suggestions.tsx`, `carnet-adresses.tsx`, `gestion-officines.tsx`, `fil-de-messages.tsx` | Formulaires d'édition inline (dans le flux de la page), pas de panneau `fixed inset-0` — rien pour le retour à « sauter par-dessus ». Leurs confirmations de suppression utilisent déjà `ModaleConfirmation`, qui embarque le hook. |
| `agenda/agenda-vue-globale.tsx` (vue semaine) | Pas de panneau `fixed inset-0` propre à ce fichier ; réutilise `ModaleEditionTache` de `taches-list.tsx`, déjà corrigée. |
| `pleins-rayon-camera.tsx`, `chaussures-scanner.tsx` | `absolute inset-0` = overlay de chargement à l'intérieur d'une carte photo, pas un panneau plein écran avec état ouvert/fermé. |

## Fichiers modifiés (5 commits atomiques)

1. `src/components/taches-list.tsx`
2. `src/components/agenda/planning-equipe.tsx`
3. `src/lib/use-fermer-avec-retour.ts` (bug d'empilement découvert et corrigé, cf. §3)
4. `src/components/agenda/planning-equipe-mois.tsx`
5. `src/components/agenda/agenda-vue-globale-mois.tsx` + `src/components/agenda/agenda-item-ligne.tsx`

## Vérifications techniques

- `npx tsc --noEmit` : 0 erreur, après chaque commit et sur l'état final.
- `npx eslint` sur chaque fichier modifié : 0 erreur/avertissement. Un
  `npx eslint .` global final ne relève que des problèmes pré-existants
  dans `switch-identite.tsx` (hors périmètre, fichier non touché).
- Aucune dépendance ajoutée à `package.json`/`package-lock.json` (jsdom/tsx
  utilisés uniquement en local pour le test d'empilement, `--no-save`,
  supprimés avant les commits).
- Aucun changement visuel/CSS : uniquement l'ajout du hook et de
  `signalerNavigation()`.
- Pas de migration Supabase (aucun changement de schéma).
