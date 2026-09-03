# Audit de couverture fluidité UX — Officio

**Date :** 2026-09-03
**Commit audité :** `597a7da` (clone frais de `vincenthassanaly-source/officio`, branche `main`)
**Nature de la session :** audit exploratoire uniquement — **aucune modification de code, aucun commit**.

---

## 1. Méthode et périmètre

Inventaire des modules croisé sur trois sources plutôt que sur la liste fournie :

- `find src/app -maxdepth 4 -name "page.tsx"` → 19 routes sous `(app)` + 4 routes hors app (`login`, `inscription`, `bienvenue`, `rejoindre/[code]`, hors périmètre).
- `src/lib/nav-items.ts` → 5 entrées de navigation principale (`NAV_ITEMS`) + 12 modules secondaires (`MODULES_SECONDAIRES`).
- Lecture de chaque `page.tsx` et de ses composants clients.

**Écarts relevés vs. la liste du brief :**

- Il n'y a **pas de route `/taches`** : les tâches sont un onglet du Cahier de liaison (`src/components/cahier-de-liaison.tsx`, composant `TachesList`) et un encart de l'Accueil (`accueil-dashboard.tsx`). Elles sont donc auditées sous « Liaison » et « Accueil ».
- **`/diagnostics` n'est pas dans `nav-items.ts`** : route accessible uniquement par URL directe, réservée au titulaire (`redirect('/')` sinon).
- **`/inviter` n'est pas dans `nav-items.ts`** non plus (accès depuis le Profil).
- L'**Accueil (`/`)** doit être traité comme un module à part entière : c'est la route la plus chargée du repo (12 requêtes en parallèle, `force-dynamic`, `prefetch={false}`).

Conforme aux contraintes : les 3 routes à `prefetch={false}` intentionnel (`/`, `/liaison`, `/agenda`, cf. `sidebar-nav.tsx:62` et `bottom-nav.tsx:41`) ne sont pas remises en cause ; aucune librairie externe n'est proposée ; Péremptions / Pleins de rayon sont absents du repo et hors audit.

### État des trois systèmes existants

| Système | État | Détail |
|---|---|---|
| **Skeleton** | 16 `loading.tsx` sur 19 routes | 15 délèguent à `PageLoading` (`src/components/page-loading.tsx`), **1 seul** a une forme dédiée (`vaccins/loading.tsx` → `VaccinsSquelette`). Manquants : `activite`, `diagnostics`, `inviter` — **liste confirmée, inchangée**. |
| **UI optimiste** | 5 fichiers, 5 interactions | `ruptures-stock-liste.tsx`, `produits-a-recommander-liste.tsx`, `suggestions.tsx`, `regularisations-liste.tsx`, `taches-list.tsx`. Pattern homogène : `useOptimistic` + mutation dans `startTransition` + `toast` d'erreur. |
| **Animations** | 3 keyframes CSS, 0 animation de liste | `globals.css` : transition de page (View Transitions, 180 ms), toasts (180 ms), glissement d'agenda (220 ms) — chacune avec son garde `prefers-reduced-motion`. Côté composants : seulement des micro-interactions (`active:scale-90`, `transition-shadow` de surlignage, accordéons `grid-rows-[0fr]→[1fr]`). **Aucun élément de liste n'a de transition d'entrée ou de sortie dans tout le repo.** |

---

## 2. Tableau par module

Priorité = fréquence d'usage probable × visibilité de la lacune. Effort = travail d'implémentation estimé pour combler l'ensemble des lacunes de la ligne.

| Module | Skeleton | UI optimiste | Animation listes/cartes | Priorité | Effort |
|---|---|---|---|---|---|
| **Accueil** `/` | ⚠️ Présent mais générique. C'est la route la plus visible du repo (`force-dynamic` + `fetchCache: 'force-no-store'` + `prefetch={false}`) : le skeleton s'affiche à **chaque** visite, et sa forme (5 blocs empilés) n'a rien à voir avec le rendu réel (encart tâches + encart messages + grille de 14 tuiles). | ❌ `accueil-dashboard.tsx:81` — `toggleTache` sans `useOptimistic`, et `disabled={isPending}` sur **toute** la liste : cocher une tâche fige l'encart entier jusqu'au retour serveur. Interaction quotidienne, risque d'échec quasi nul. Le pattern existe déjà à 2 fichiers de là. | ❌ La tâche cochée disparaît de l'encart d'un coup, sans fade ni collapse. | 🔴 **Haute** | Faible |
| **Liaison** `/liaison` (messages + tâches) | ⚠️ Présent, générique. Forme réelle = onglets + fil de cartes ; écart visuel net au chargement. | ⚠️ **Partiel.** Fait : pouce sur tâche (`taches-list.tsx:117`). Manquants, tous en usage quotidien : `taches-list.tsx:425` `toggleTache` (le geste n°1 de l'app — la tâche doit migrer vers la section « archivées »), `taches-list.tsx:529` `supprimerTache`, `taches-list.tsx:686` `toggleTache` depuis la modale, `fil-de-messages.tsx:562` `togglePouceMessage` (identique au pouce déjà optimiste sur les tâches — incohérence directe), `fil-de-messages.tsx:447` `supprimerMessage`. Un seul `isPending` est partagé par tout le fil (`fil-de-messages.tsx:63`) : un pouce désactive tous les boutons de tous les messages. | ❌ Aucune transition sur ajout de message, suppression, ou passage d'une tâche en archive. Existant : `transition-shadow` de surlignage (`taches-list.tsx:407`) et accordéon d'archive (`:333`). | 🔴 **Haute** | Moyen |
| **Agenda** `/agenda` | ⚠️ Présent, générique — et c'est le module où l'écart de forme est le plus grand (grille semaine / calendrier mois vs. 4 blocs empilés). À noter : la navigation semaine/mois passe par `router.replace` avec préchargement des ±2 périodes (`agenda.tsx:144-167`), donc le skeleton n'apparaît qu'au premier chargement — l'impact est réel mais ponctuel. | ❌ `agenda-vue-globale.tsx:51` et `agenda-vue-globale-mois.tsx:53` — `toggleTache` (la tâche cochée disparaît de la vue, cf. commentaire `agenda-vue-globale.tsx:63-65`), `agenda-vue-globale.tsx:158` / `-mois.tsx:114` `supprimerRendezVous`, `planning-equipe.tsx:87` et `:96` `supprimerCreneau`. Bon point existant : deux `useTransition` séparés pour ne pas faire concourir suppression de RDV et cochage de tâche (`agenda-vue-globale.tsx:38-42`). | ✅ **Partiel** — glissement directionnel au changement de semaine/mois (`agenda-glisse-*`, `globals.css:203-231`), le seul vrai système d'animation du repo. ❌ Rien sur ajout/suppression d'un RDV ou d'un créneau dans la liste du jour. | 🟠 **Moyenne-haute** | Moyen |
| **Documents** `/documents` | ⚠️ Présent, générique (liste de cartes → forme proche, écart acceptable). | ➖ **Non pertinent.** Seule mutation = `ajouterDocument` (`documents-list.tsx:94`), un upload de fichier : taux d'échec trop élevé pour de l'optimiste. Pas de suppression dans le module. ⚠️ *À part :* cet appel est le seul `await` de mutation du repo **sans `try/catch` ni toast** — un upload qui échoue est silencieux. Correctif hors périmètre fluidité mais à noter. | ❌ Le document uploadé apparaît sans transition (peu visible, action peu fréquente). | 🟢 Basse | Faible |
| **Carnet** `/carnet` | ✅ Présent, générique — forme proche du rendu (cartes contacts). | ❌ `carnet-adresses.tsx:128` ajout, `:165` modification, `:271` suppression. Usage modéré (le carnet se consulte plus qu'il ne s'édite) ; la suppression est le meilleur candidat. | ❌ | 🟡 Moyenne | Faible |
| **Huiles essentielles** `/huiles-essentielles` | ⚠️ Présent, générique. Forme réelle = onglets de statut + compteurs + liste. | ❌ Aucun `useOptimistic`, mais **un palliatif maison** : `marquerTransition` (`huiles-essentielles-liste.tsx:93`) maintient un `Set` d'ids en cours et applique `scale-[0.98] opacity-40` à la carte (`:363`). Résultat : la carte reste visible dans le mauvais onglet, grisée, jusqu'au retour serveur. `changerStatutHuile` (`:280`) est une interaction fréquente (préparation de commande) et à faible risque → candidat de premier plan pour remplacer ce palliatif par `useOptimistic`. Idem `modifierVolumeACommander` (`:112`, même mécanique avec `idsVolumeEnSauvegarde`), `ajouterHuile` (`:213`), `supprimerHuile` (`:464`). | ⚠️ Un `transition-all duration-200` existe sur la carte, mais il sert le feedback de pending, pas l'entrée/sortie : quand la carte change d'onglet, elle disparaît brutalement. | 🟠 **Moyenne-haute** | Moyen |
| **Fournisseurs** `/fournisseurs` | ✅ Présent, générique — forme proche. | ❌ `fournisseurs-liste.tsx:164` ajout, `:204` modification, `:329` suppression. Usage occasionnel. | ❌ | 🟢 Basse | Faible |
| **Chaussures orthopédiques** `/chaussures` | ✅ Présent, générique — forme proche. | ❌ `chaussures-catalogue.tsx:46` `modifierPrixChaussure` — édition inline au blur. Sans optimiste **ni rollback ni toast** : si l'appel échoue, `setEnEdition(false)` s'exécute quand même et l'ancien prix réapparaît sans explication. Le module scanner (`chaussures-scanner.tsx`) appelle une IA : latence longue et incertaine, optimiste non pertinent. | ➖ Catalogue en lecture, pas d'ajout/suppression de cartes. | 🟢 Basse | Faible |
| **Suivi CNO** `/suivi-cno` | ✅ Présent, générique — forme proche. | ❌ `cno-liste.tsx:37` `modifierQuantiteCno` (édition inline, rollback local uniquement), `:139` ajout, `:201` suppression. Usage régulier mais pas quotidien. | ❌ | 🟡 Moyenne | Faible |
| **Régularisations** `/regularisations` | ✅ Présent, générique — forme proche. | ⚠️ **Partiel et incohérent.** Vue liste : `regularisations-liste.tsx:198` `changerStatutOptimiste` ✅ sur `marquerFacture`/`marquerAFaire` (`:326`, `:379`). Vue calendrier : **la même action** `regularisations-calendrier.tsx:152` est appelée **sans optimiste**. Basculer d'onglet change donc le ressenti sur un geste identique. Manquent aussi l'ajout (`liste:256`, `calendrier:169`) et la suppression (`liste:401`). | ❌ | 🟠 **Moyenne-haute** (l'incohérence liste/calendrier est le point saillant) | Faible |
| **Suggestions** `/suggestions` | ✅ Présent, générique — forme proche. | ⚠️ Partiel : bascule « fait » optimiste (`suggestions.tsx:37`) ✅ ; ajout (`:48`) et suppression (`:156`) non optimistes. Usage faible. | ❌ | 🟢 Basse | Faible |
| **Vaccins** `/vaccins` | ✅✅ **Référence du repo** — `VaccinsSquelette` (`vaccins-liste.tsx:276`) reproduit la forme réelle (filtres pastilles + champ + grille de 6 cartes repliées), avec commentaire explicatif à l'appui. C'est le modèle à généraliser. | ➖ Module en lecture seule (aucune server action). | ➖ Pas d'ajout/suppression ; l'accordéon des cartes a déjà sa transition (`:195`, `:214`). | ➖ Rien à faire | — |
| **Ruptures de stock** `/ruptures-stock` | ✅ Présent, générique — forme proche. | ✅ **Le mieux couvert.** Retrait optimiste sur les deux listes (`ruptures-stock-liste.tsx:12`, `produits-a-recommander-liste.tsx:10`). Reste non optimiste : l'ajout (`ruptures-stock-liste.tsx:22`, `produits-a-recommander-liste.tsx:19`) — mais l'ajout via `formData` est le cas le plus délicat à rendre optimiste (id temporaire) et le moins rentable. | ❌ L'item coché disparaît instantanément : c'est justement le module où un fade/collapse de sortie serait le plus lisible, puisque le retrait est déjà instantané. | 🟡 Moyenne (animation seule) | Faible |
| **Notes** `/notes` | ✅ Présent, générique — forme proche. | ❌ `notes.tsx:99` création, `:181` suppression, `:333` modification. | ❌ Existant : `transition duration-300` de feedback d'appui long (`:250`), pas d'entrée/sortie. | 🟡 Moyenne | Faible |
| **Activité** `/activite` | ❌ **Absent — justifié.** `activite/page.tsx:12-16` lance 3 requêtes en parallèle (journal paginé, équipe, couleurs) avant tout rendu. | ➖ Module en lecture seule. **Mais** : au changement de filtre (`journal-activite.tsx:52`) la liste reste affichée telle quelle, périmée, pendant tout le `isPending` — aucun indicateur. Un état de chargement local (opacité réduite ou lignes squelette) est la vraie lacune du module, plus que l'optimiste. | ❌ « Charger plus » (`:75`) concatène les entrées sans transition ; le remplacement au filtrage est brutal. | 🟠 **Moyenne-haute** (skeleton + feedback de filtrage) | Faible |
| **Diagnostics** `/diagnostics` | ❌ **Absent — justifié mais faible enjeu.** `diagnostics/page.tsx:12` fait une requête (50 erreurs) après un `getOfficineActive`. Page réservée au titulaire, consultée rarement. Un `loading.tsx` d'une ligne pour la cohérence, pas pour l'impact. | ➖ Lecture seule. | ➖ | 🟢 Basse | Faible (trivial) |
| **Profil** `/profil` | ✅ Présent, générique. Page à 5 requêtes dont une séquentielle (`profil/page.tsx:29`) — le skeleton est utile ici. | ⚠️ **Optimiste artisanal, non aligné.** `notifications-parametres.tsx:53` fait un `setPreferences(...)` local avant l'`await` : c'est de l'optimiste manuel, **sans rollback en cas d'échec** (l'interrupteur reste dans le mauvais état). C'est exactement ce que `useOptimistic` fournit gratuitement. `profil-form.tsx` utilise `useActionState` — approprié, ne pas toucher. | ➖ Pas de liste dynamique. | 🟡 Moyenne (1 fichier, gain de robustesse réel) | Faible |
| **Inviter** `/inviter` | ❌ **Absent — justifié.** `inviter/page.tsx` enchaîne `getOfficineActive` → `getOfficine` puis 3 requêtes en parallèle : c'est la page la plus séquentielle du lot. Usage occasionnel. | ➖ Régénération de code = action rare et destructive (`inviter-card.tsx:43`), l'optimiste serait contre-indiqué. | ➖ Liste de membres statique. | 🟢 Basse | Faible (trivial) |
| **Plan de posologie** `/plan-posologie` | ✅ Présent, mais **inutile en pratique** : la page ne fait qu'un `getOfficineActive` (`plan-posologie/page.tsx:6`) et le composant est 100 % état local. Ne rien changer (le retirer coûterait plus que ça ne rapporte). | ➖ Aucune écriture serveur — tout est dans `useState` (`plan-posologie.tsx:52-53`). L'optimiste n'a pas d'objet ici. | ❌ Ajout/suppression de ligne médicament (`:98`, `:143`) sans transition — instantané côté état, mais visuellement sec. Cosmétique. | 🟢 Basse | Faible |

### Lecture rapide du tableau

- **Skeleton :** 3 absents (tous justifiés), 15 présents mais génériques, 1 seul à la forme réelle.
- **UI optimiste :** 5 interactions couvertes sur ~35 mutations recensées dans `src/app/actions/`. Trois incohérences franches : pouce optimiste sur tâche mais pas sur message ; statut optimiste en vue liste mais pas en vue calendrier des régularisations ; cochage de tâche optimiste nulle part alors que c'est le geste le plus fréquent.
- **Animations :** aucun module n'anime l'entrée ou la sortie d'un élément de liste.

---

## 3. Lacunes transverses (hors tableau)

Trois constats qui ne relèvent d'aucun module en particulier mais conditionnent le ressenti global.

**a) Les modales et bottom-sheets apparaissent sans transition.** `ui/modale-confirmation.tsx:72`, `taches-list.tsx` (`ModaleEditionTache`), `fenetre-aujourdhui.tsx:73`, `lightbox-image.tsx:42`, `notes.tsx` (`ModaleEditionNote`) : toutes montées via `createPortal` et rendues d'un coup, opacité 1, sans slide-up. Sur une PWA mobile où ces panneaux montent du bas de l'écran, c'est la lacune d'animation la plus perceptible du repo — et la plus rentable, puisqu'un unique couple de keyframes (`sheet-in` / `overlay-in`) appliqué à 5 composants réglerait le tout. Le keyframe `toast-in` (`globals.css:161`) fournit déjà la durée, l'easing et le garde `prefers-reduced-motion` à réutiliser.

**b) Le `isPending` global fige des listes entières.** Motif récurrent : un seul `useTransition` au niveau du composant liste, propagé en `disabled={isPending}` sur chaque item (`fil-de-messages.tsx:63`, `accueil-dashboard.tsx:46`, `taches-list.tsx`, `cno-liste.tsx:100`, `suggestions.tsx:35`). Cocher une tâche désactive donc tous les boutons de toutes les autres. `useOptimistic` supprime le besoin de ce `disabled` : c'est le bénéfice secondaire, souvent plus visible que la mise à jour optimiste elle-même. `agenda-vue-globale.tsx:38-42` (deux transitions séparées) et `huiles-essentielles-liste.tsx:89` (`Set` d'ids en cours) montrent que le problème a déjà été contourné localement, sans être généralisé.

**c) Aucun feedback pendant les rechargements côté client.** `journal-activite.tsx` (filtres) et `recherche-globale.tsx` sont les deux endroits où un `await` recharge une liste sans que l'utilisateur voie autre chose qu'un bouton grisé. `recherche-globale.tsx:60` a un spinner ; le journal n'a rien.

---

## 4. Mutualisation des skeletons

**Il n'y a pas de duplication à corriger** — c'est plutôt l'inverse. Les 16 `loading.tsx` font 5 lignes chacun et 15 d'entre eux sont **strictement identiques** :

```tsx
import { PageLoading } from '@/components/page-loading'
export default function Loading() { return <PageLoading /> }
```

`PageLoading` (`src/components/page-loading.tsx`, 11 lignes) rend un titre + 4 blocs `bg-neutral-soft` en `animate-pulse`. La factorisation est donc **déjà faite et propre** ; le problème est ailleurs : un skeleton unique pour 15 pages de formes très différentes produit un saut visuel au moment où le contenu réel remplace les blocs — exactement ce que le commentaire de `VaccinsSquelette` (`vaccins-liste.tsx:273-275`) explicite comme motivation.

**Recommandation :** ne pas déplacer les `loading.tsx` existants, mais introduire des **primitives de squelette composables** dans `src/components/page-loading.tsx` (ou un `skeletons.tsx` voisin), sur le modèle de ce que `VaccinsSquelette` fait à la main :

- `SqueletteTitre`, `SquelettePastilles({ n })`, `SqueletteChamp`, `SqueletteCarteListe({ n })`, `SqueletteGrilleTuiles({ n })` — chacune un simple `div` `bg-neutral-soft` aux dimensions des composants réels correspondants ;
- `PageLoading` reste tel quel comme repli par défaut pour les modules dont la forme est déjà proche (Carnet, Fournisseurs, Notes, Suggestions, Ruptures, CNO, Chaussures, Documents) ;
- seuls les 4 modules à fort écart de forme obtiennent un squelette dédié composé de ces primitives : **Accueil** (encarts + grille de tuiles), **Agenda** (grille semaine), **Liaison** (onglets + fil), **Huiles essentielles** (onglets + compteurs).

Ça évite à la fois la duplication (les primitives sont partagées) et le squelette « taille unique » (chaque page à fort enjeu a sa forme).

Point d'attention : `VaccinsSquelette` est exporté depuis `vaccins-liste.tsx`, donc un fichier `'use client'`. Ça fonctionne, mais si d'autres squelettes dédiés suivent, mieux vaut les regrouper dans un module serveur dédié pour ne pas embarquer du JS client dans un fallback.

---

## 5. Recommandation de périmètre pour la prochaine session

Cinq lots, du plus rentable au plus cosmétique. Chacun est autonome et livrable seul.

### Lot 1 — Le cochage de tâche, partout 🔴
**Type :** UI optimiste + animation de sortie · **Effort : faible** · **Impact : maximal**

Une seule interaction, déclinée sur les 4 surfaces où elle existe : `accueil-dashboard.tsx:81`, `taches-list.tsx:425` et `:686`, `agenda-vue-globale.tsx:51`, `agenda-vue-globale-mois.tsx:53`. C'est le geste le plus fréquent de l'app, il est optimiste nulle part, et le pattern à répliquer est dans le même fichier (`taches-list.tsx:117`). À coupler avec la suppression du `disabled={isPending}` devenu inutile, et avec un fade/collapse de sortie quand la tâche quitte la liste.

**Le meilleur point de départ si Vincent ne veut qu'un seul lot.**

### Lot 2 — Cohérences manquantes 🟠
**Type :** UI optimiste · **Effort : faible** · **Impact : élevé**

Trois endroits où un pattern déjà présent n'a pas été propagé à son jumeau :

- `fil-de-messages.tsx:562` — pouce sur message (le pouce sur tâche est déjà optimiste) ;
- `regularisations-calendrier.tsx:152` — `marquerFacture`/`marquerAFaire` (déjà optimiste en vue liste) ;
- `notifications-parametres.tsx:53` — remplacer l'optimiste manuel sans rollback par `useOptimistic`.

Lot court, à faible risque, qui élimine trois incohérences visibles à l'usage.

### Lot 3 — Modules d'usage régulier, mutations de liste 🟠
**Type :** UI optimiste · **Effort : moyen**

Suppressions et bascules de statut sur les modules travaillés au quotidien :

- **Huiles essentielles** — `changerStatutHuile` (`:280`) et `modifierVolumeACommander` (`:112`) : remplacer le palliatif `idsEnTransition`/`opacity-40` par `useOptimistic` ;
- **Liaison** — `supprimerMessage` (`fil-de-messages.tsx:447`), `supprimerTache` (`taches-list.tsx:529`) ;
- **CNO** — `modifierQuantiteCno` (`:37`) et `supprimerPatientCno` (`:201`) ;
- **Agenda** — `supprimerRendezVous` (`agenda-vue-globale.tsx:158`, `-mois.tsx:114`) et `supprimerCreneau` (`planning-equipe.tsx:87`, `:96`).

Les ajouts (`ajouter*`/`creer*` via `formData`) sont volontairement **exclus** : id temporaire à fabriquer, gain moindre, complexité nettement supérieure. À traiter séparément si le besoin se confirme.

### Lot 4 — Animations : entrées/sorties de liste et panneaux 🟠
**Type :** keyframes CSS · **Effort : moyen** · **Impact : très visible**

Deux chantiers indépendants, à faire dans cet ordre :

1. **Modales et bottom-sheets** (`modale-confirmation.tsx`, `ModaleEditionTache`, `ModaleEditionNote`, `fenetre-aujourdhui.tsx`, `lightbox-image.tsx`) : un couple `sheet-in` / `overlay-in` dans `globals.css`, calqué sur `toast-in` (180 ms, `ease-out`, garde `prefers-reduced-motion`). Cinq composants pour un seul keyframe — **le meilleur ratio du lot**.
2. **Entrée/sortie d'items de liste** sur les modules où le retrait est déjà instantané et donc le plus sec : Ruptures de stock, Suggestions, Notes, Liaison. Un keyframe `item-sortie` (fade + collapse) et un `item-entree`, appliqués par classe.

Note technique pour l'implémentation : une sortie animée suppose de garder l'élément monté le temps de l'animation, ce que `useOptimistic` seul ne permet pas (il retire l'item immédiatement). Prévoir soit un délai local avant retrait, soit — et c'est la piste à privilégier ici — les View Transitions déjà activées dans `next.config.ts` (`experimental.viewTransition`), qui sont le mécanisme natif pour ça et restent dans le cadre « keyframes CSS, pas de librairie ».

### Lot 5 — Skeletons : combler et affiner 🟡
**Type :** Suspense · **Effort : faible**

- Ajouter les 3 `loading.tsx` manquants — `activite`, `diagnostics`, `inviter` — en réutilisant `PageLoading` (3 fichiers de 5 lignes, quelques minutes) ;
- ajouter le feedback de chargement au filtrage du journal d'Activité (`journal-activite.tsx:52`), qui est la vraie lacune du module ;
- introduire les primitives de squelette de la section 4 et les appliquer à **Accueil** puis **Agenda** (les deux plus gros écarts de forme). Liaison et Huiles essentielles peuvent attendre un second passage.

### Regroupements suggérés

| Si Vincent veut… | Prendre |
|---|---|
| L'effet le plus net pour le moins d'effort | **Lot 1** seul |
| Une passe « cohérence » rapide et sans risque | **Lots 1 + 2** |
| Une vraie passe fluidité sur les interactions | **Lots 1 + 2 + 3** |
| Une passe visuelle plutôt que comportementale | **Lot 4** (commencer par les modales) + **Lot 5** |
| Tout, en deux sessions | Session A : lots 1 + 2 + 5 · Session B : lots 3 + 4 |

---

## 6. Points relevés hors périmètre fluidité

Trois anomalies croisées pendant l'audit, sans lien avec skeleton/optimiste/animations, signalées pour décision séparée :

1. `documents-list.tsx:94` — `await ajouterDocument(formData)` sans `try/catch` : un upload qui échoue ne produit aucun toast, le formulaire se ferme comme si tout allait bien. Seule mutation du repo dans ce cas.
2. `chaussures-catalogue.tsx:46` — `modifierPrixChaussure` sans gestion d'erreur ni rollback : l'ancien prix réapparaît silencieusement en cas d'échec.
3. `plan-posologie/loading.tsx` — squelette pour une page qui ne fait qu'une requête triviale. Sans conséquence, mentionné pour l'inventaire.
