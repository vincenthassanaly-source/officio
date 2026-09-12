# Réorganisation du module Entretiens pharmaceutiques + suivi patient — rapport

Périmètre : nettoyage de contenu, regroupement de la méthodologie par
étape, nouveau mode « réaliser un entretien ». La section Documents
(upload de fichiers) n'a **pas été touchée**, comme demandé.

## Étape A — Nettoyage de contenu (via Supabase `execute_sql`)

### 1. Doublon du barème de Girerd (BPM)

- Gardé : item `methodologie` ordre 13 (id `89e3b18f-…`) — explication
  complète du questionnaire et du barème.
- Supprimé : item `questions` ordre 6 (id `4950c16d-…`, contenu
  « Questionnaire de Girerd — barème : … »), doublon quasi identique.
- Renumérotation : les 20 items `questions` restants de BPM aux anciens
  ordres 7 à 26 ont été décalés à 6–25 (`ordre = ordre - 1`), sans trou.
  Les 6 questions du questionnaire de Girerd lui-même (ordre 0 à 5)
  restent inchangées.

### 2. Note de score POMI (Opioïdes)

- L'item `questions` ordre 5 (id `dec2a68a-…`, « Questionnaire POMI
  (Prescription Opioid Misuse Index…) — un score de 2 réponses « oui »… »)
  n'était pas une question posée au patient mais une note d'interprétation
  de score : déplacé et fusionné dans l'item `methodologie` ordre 15
  (id `fd04218f-…`) qui évoquait déjà « en cas de score ≥ 2, alerter… ».
- Contenu fusionné (methodologie, ordre 15) :
  > Faire passer le questionnaire POMI (Prescription Opioid Misuse Index,
  > version française validée POMI-5F) avant chaque renouvellement pour
  > évaluer le risque de mésusage ; un score de 2 réponses « oui » ou plus
  > suggère un risque actuel de mésusage — dans ce cas, alerter le médecin
  > prescripteur et le médecin traitant via MSS (source : Delage N,
  > Cantagrel N, Delorme J, Pereira B, Dualé C, Bertin C. et al., Can J
  > Anesth 2022)
- L'item dupliqué dans `questions` a été supprimé (il était en dernière
  position : aucune renumérotation nécessaire pour les 5 questions
  restantes, ordre 0–4 inchangé).

**Écart pris** : le prompt demandait de « fusionner à proximité » ; j'ai
interprété cela comme une fusion textuelle dans l'item méthodologie
existant plutôt qu'un simple item adjacent, pour éviter la redite du même
seuil (score ≥ 2) dans deux items voisins.

## Étape B — Colonne `etape` (migration + réaffectation de données)

### Schéma

Migration `entretien_items_etape` : ajout de `entretien_items.etape text`
(nullable), avec deux contraintes CHECK :
- valeurs autorisées : `annee1_entretien1`, `annee1_entretien2`,
  `annee1_entretien3`, `annees_suivantes`, ou `NULL` ;
- `etape` ne peut être non-NULL que si `section = 'methodologie'`.

Commentaire de colonne documentant les valeurs, comme demandé.

Migration `entretien_items_rpc_etape` : `creer_item_entretien` et
`modifier_item_entretien` acceptent désormais un paramètre optionnel
`p_etape text` (défaut `NULL`), suivant le pattern SECURITY DEFINER déjà en
place pour ce module.

### Réaffectation (`execute_sql`, patterns `ILIKE` insensibles à la casse)

| Pattern | → etape |
|---|---|
| `Année 1, 1er entretien%` | `annee1_entretien1` |
| `Année 1, 2e entretien%` | `annee1_entretien2` |
| `Année 1, 3e entretien%` | `annee1_entretien3` |
| `Année 2 et suivantes%` / `Années suivantes%` | `annees_suivantes` |
| tout le reste (déjà en `methodologie`) | `NULL` |

### Mapping obtenu par type (vérifié après coup)

| Type | NULL (général) | annee1_entretien1 | annee1_entretien2 | annee1_entretien3 | annees_suivantes |
|---|---|---|---|---|---|
| AOD | 0 | 1 | 1 | 1 | 1 |
| Asthme | 12 | 1 | 1 | 1 | 1 |
| Anticancéreux oraux | 1 | 1 | 1 | 1 | 1 |
| BPM | 15 | 1 | 1 | 1 | 1 |
| Opioïdes | 17 | 0 | 0 | 0 | 0 |
| AVK | — (aucun item methodologie) | | | | |
| Femme enceinte / Bilan de prévention | — (aucun contenu) | | | | |

Conforme à l'attendu du prompt : chaque étape a au moins un item pour
AOD/Asthme/Anticancéreux/BPM, et Opioïdes reste entièrement `NULL` (pas de
structure année/entretien dans son contenu) — rien forcé.

## Étape C — UI groupée (méthodologie)

- `src/lib/data/entretiens.ts` : nouveau type `EtapeMethodologie`, champ
  `etape` sur `ItemEntretien`, lecture dans `getItemsEntretien`.
- `src/app/actions/entretiens.ts` : `creerItemEntretien` et
  `modifierItemEntretien` acceptent un 4ᵉ paramètre `etape` optionnel
  (forcé à `null` hors section `methodologie`).
- `src/components/entretien-detail.tsx` : nouveau composant
  `SectionMethodologie` qui remplace la liste plate pour la section
  méthodologie :
  - items `etape = NULL` affichés en premier, sans étiquette ;
  - puis un `<details>` pliable par étape non vide, dans l'ordre Année 1 —
    1er / 2e / 3e entretien, Années suivantes ;
  - formulaire d'ajout et mode édition dotés d'un `<select>` d'étape
    (optionnel, « Contenu général » par défaut) ;
  - réordonnancement (▲/▼) désormais scopé au groupe visuel affiché (plus
    naturel qu'un réordonnancement global qui mélangerait les groupes) —
    seul écart de comportement par rapport à l'existant, nécessaire pour
    que « monter/descendre » ait un sens une fois les items groupés.
  - Le reducer `useOptimistic` partagé (`reducerItems`) a été corrigé au
    passage : le cas `reorder` ne remplaçait auparavant l'état que par les
    ids passés (silencieusement correct tant qu'on passait toujours la
    liste complète) ; il fusionne maintenant dans l'état existant, ce qui
    est nécessaire pour un réordonnancement par sous-groupe et n'a aucun
    effet visible sur facturation/questions (toujours réordonnés en
    entier).
  - Sections Facturation/Questions et Documents strictement inchangées.

## Étape D — Mode « réaliser un entretien »

### Schéma (migration `entretiens_realises_schema`)

- `entretien_realises` : `id`, `officine_id`, `type_entretien_id`,
  `patient_nom`/`patient_prenom` (texte libre, pattern
  `regularisations_ordonnances`/`cno_patients` — pas de table patients),
  `annee_accompagnement` (text, nullable), `numero_entretien` (int,
  nullable), `date_entretien`, `notes`, `cree_par`, `created_at`,
  `updated_at`.
- `entretien_realise_reponses` : `id`, `entretien_realise_id` (FK cascade),
  `item_id` (FK `entretien_items`, **cascade** — écart pris, voir
  ci-dessous), `statut` (`CHECK IN ('acquis','partiel','non_acquis')`),
  unicité `(entretien_realise_id, item_id)`.
- RLS : SELECT scopé `est_membre(officine_id)` sur les deux tables (jointure
  via `entretien_realises` pour les réponses) — pas d'INSERT/UPDATE/DELETE
  en RLS directe.
- Écritures via fonctions SECURITY DEFINER (vérifié dans les migrations
  existantes : c'est bien le pattern déjà en place pour
  `entretien_items`/`entretien_documents`, pas celui, plus simple, de
  `regularisations_ordonnances`) : `creer_entretien_realise`,
  `modifier_entretien_realise`, `modifier_notes_entretien_realise`,
  `supprimer_entretien_realise`, `definir_reponse_entretien_realise`
  (upsert `ON CONFLICT`).

**Écart pris** : `item_id` en `ON DELETE CASCADE` (non précisé dans le
prompt, qui ne spécifie la cascade que pour `entretien_realise_id`).
Justification : sans cascade, la suppression d'un item de méthodologie
existant (fonctionnalité déjà en place) échouerait par violation de
contrainte dès qu'un entretien réalisé y aurait répondu.

### Data + actions

- `src/lib/data/entretiens-realises.ts` : `getEntretienRealisesParType`,
  `getEntretienRealise`, `getReponsesEntretienRealise` (tous `cache()`).
- `src/app/actions/entretiens-realises.ts` : `creerEntretienRealise`,
  `modifierEntretienRealise`, `modifierNotesEntretienRealise`,
  `supprimerEntretienRealise`, `definirReponseEntretienRealise` —
  `officine_id` toujours dérivé de `getOfficineActive()` côté serveur.

### UI

- Bouton « Réaliser un entretien » ajouté en haut de la fiche d'un type
  (`entretien-detail.tsx`), lien vers la nouvelle page.
- Nouvelle route `src/app/(app)/entretiens-pharmaceutiques/[id]/realiser/page.tsx`
  (+ composant `src/components/entretien-realiser.tsx`) :
  - historique des entretiens réalisés pour le type (patient, date,
    année/n°), chaque ligne est un lien `?id=…` qui recharge l'entretien ;
  - formulaire patient en modale (`createPortal` + montage différé via
    `useSyncExternalStore`, même pattern que
    `ModaleAjoutDepuisStock`) : prénom/nom/date, + année et n° d'entretien
    si le type a des items groupés par étape (détecté via
    `items.methodologie.some(i => i.etape !== null)`) ;
  - une fois un entretien sélectionné/créé : checklist méthodologie
    (filtrée sur l'étape déduite de année+n°, plus les items généraux — ou
    non filtrée si le type n'a pas d'étapes, cf. Opioïdes/Femme
    enceinte/Bilan de prévention) et checklist questions (toujours
    complète), chaque item avec 3 boutons Acquis/Partiel/Non acquis en
    état optimiste (`useOptimistic` + `startTransition`) ;
  - zone de notes libres (« Conclusions de l'entretien ») avec bouton
    d'enregistrement explicite ;
  - bouton Modifier (rouvre la modale patient pré-remplie) et Supprimer
    (via `ModaleConfirmation` existante).

### Recherche globale

- `src/app/actions/recherche.ts` : nouvelle catégorie « Entretiens
  réalisés », recherche par nom/prénom patient (même pattern que
  `cno_patients`/`regularisations_ordonnances`), lien direct vers
  `/entretiens-pharmaceutiques/[type]/realiser?id=[entretien]`.

## Vérifications

- `npx tsc --noEmit` : ✅ aucune erreur (après `npm ci`, `node_modules`
  n'existait pas au démarrage de la session).
- `npm run lint` : ✅ 0 erreur, 4 warnings pré-existants dans
  `switch-identite.tsx` (`_retire` non utilisé), sans lien avec ce
  chantier.
- `mcp__Supabase__get_advisors` (security) après chaque migration de
  schéma : uniquement des avertissements déjà présents avant ce chantier
  (extensions `pg_net`/`vector` en `public`, fonctions SECURITY DEFINER
  exécutables par `anon`/`authenticated` — pattern intentionnel déjà
  utilisé partout dans l'app, chaque fonction vérifie `est_membre()` en
  interne —, protection mot de passe compromis désactivée). Rien de
  nouveau introduit par les nouvelles tables/fonctions au-delà de ce même
  pattern déjà accepté.
- `get_advisors` (performance) : idem, uniquement des avertissements
  déjà systématiques dans la base (FK sans index de couverture, RLS
  `auth.<fn>()` non enveloppé en `select`) — cohérent avec le fait
  qu'aucune autre table de l'app n'a ces index/optimisations non plus ;
  non traité pour rester dans le périmètre du prompt.

## Écarts pris par rapport au prompt (récapitulatif)

1. Fusion du POMI = fusion textuelle réelle dans l'item méthodologie
   existant (pas juste un item voisin).
2. `entretien_realise_reponses.item_id` en `ON DELETE CASCADE`.
3. Réordonnancement de la méthodologie désormais scopé par groupe visuel
   (nécessaire suite au regroupement demandé par étape B/C).
4. La note d'`AGENTS.md` (« Ce n'est pas le Next.js que vous connaissez »,
   renvoyant vers `node_modules/next/dist/docs/`) a été vérifiée : ce
   dossier n'existe pas dans le paquet `next@16.2.12` installé, et
   `node_modules` n'était même pas installé au démarrage de la session
   (`npm ci` exécuté avant de pouvoir lancer `tsc`/`lint`). Ignorée sans
   incidence : le code écrit suit les conventions déjà en place dans le
   reste du repo (Next.js App Router, server actions, `cache()`), qui
   compilent et lintent sans erreur.

## Fichiers modifiés/créés

- `src/lib/data/entretiens.ts`, `src/app/actions/entretiens.ts`,
  `src/components/entretien-detail.tsx` (étapes B/C)
- `src/lib/data/entretiens-realises.ts`,
  `src/app/actions/entretiens-realises.ts`,
  `src/components/entretien-realiser.tsx`,
  `src/app/(app)/entretiens-pharmaceutiques/[id]/realiser/page.tsx`
  (étape D)
- `src/app/actions/recherche.ts` (étape D, recherche)
- Migrations Supabase : `entretien_items_etape`,
  `entretien_items_rpc_etape`, `entretiens_realises_schema`
- Nettoyage de données (`execute_sql`, non versionné en migration, détaillé
  ci-dessus)
