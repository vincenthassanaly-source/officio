# Rapport — Module « Promesses patients » (2026-09-25)

Nouveau module indépendant : noter au comptoir les patients à rappeler quand un médicament en rupture arrive, les retrouver en tapant le nom du médicament reçu, puis marquer la promesse « Traitée ». Aucun lien avec le module « Ruptures de stock » (saisie libre du nom de médicament).

**Données nominatives** : nom, téléphone, médicament attendu, statut de facturation, statut traité — rien d'autre. Choix assumé par Vincent pour ce module (usage interne, infra non-HDS). Pas de champ ordonnance, pas de note libre, pas d'historique de santé. Le module est **volontairement absent de la recherche globale** et du **journal d'activité**, pour que les noms de patients restent dans le module.

---

## 1. Phase `shape` (impeccable) — décisions

Contexte chargé via `impeccable context` (PRODUCT.md + DESIGN.md) ; mode **Operate**. Trois décisions tranchées par Vincent :

| Question | Choix |
|---|---|
| Couleur de module (toutes les paires existantes déjà prises) | Nouveau token **teal** |
| Tuile d'accueil | **Oui**, avec compteur « N en attente » |
| Corrections d'erreur de saisie | **Annuler « Traitée »** (depuis l'historique), **supprimer** une promesse, **basculer « Facturé »** |

Brief retenu :

- **Qui / quand** : membre de l'équipe, debout au comptoir, interrompu. Deux gestes : *noter* une promesse en quelques secondes ; *taper le médicament reçu* pour savoir qui rappeler.
- **Structure** : une page, deux onglets (« En attente » avec badge de compte, « Historique »).
- **En attente** : recherche en haut (instantanée, tolérante) → bouton « Nouvelle promesse » / formulaire **en ligne** (pas de modale : la tâche ne demande ni interruption ni focus protégé) → promesses **regroupées par médicament**, triées alphabétiquement.
- **Ligne patient** : nom, téléphone **directement cliquable** (`tel:`), pastille Facturé/Non facturé basculable, bouton plein « Traitée », suppression (avec confirmation).
- **Historique** : recherche serveur médicament *ou* patient, date du rappel, « Remettre en attente ».

## 2. Base de données

Migration : `scripts/migration-promesses-patients-2026-09-25.sql` (nouveau fichier ; aucun fichier existant modifié), appliquée via Supabase MCP `execute_sql`.

| Colonne | Type | Notes |
|---|---|---|
| `id` | uuid PK | `gen_random_uuid()` |
| `officine_id` | uuid NOT NULL → `officines` | `on delete cascade` ; **dérivé côté serveur** (`getOfficineActive()`), jamais envoyé par le client |
| `nom_medicament` | text NOT NULL | 1–200 caractères (CHECK) |
| `nom_patient` | text NOT NULL | 1–120 caractères (CHECK) |
| `telephone_patient` | text NOT NULL | 6–30 caractères ; stocké formaté (`06 12 34 56 78`) |
| `facture` | boolean NOT NULL | défaut `false` |
| `statut` | text NOT NULL | `'actif'` \| `'traite'` (CHECK), défaut `'actif'` |
| `cree_par` / `traite_par` | uuid → `profils` | `on delete set null` |
| `created_at` | timestamptz | défaut `now()` |
| `traite_at` | timestamptz | CHECK : renseigné **si et seulement si** `statut = 'traite'` |
| `recherche` | text **générée** | `médicament + patient` en minuscules, sans accents (`translate` + `œ/æ`) |

- **RLS** : `select/insert/update/delete` via `est_membre(officine_id)`, même pattern que `ruptures_stock`/`suggestions`. Aucune écriture n'est réservée à un sous-ensemble de membres, donc **pas de fonction SECURITY DEFINER** (elle n'aurait rien protégé de plus). Les server actions ajoutent `.eq('officine_id', officineActive)` en plus de la RLS : un membre de deux officines ne peut modifier que l'officine active.
- **Recherche sans extension** : `unaccent` n'est pas installé et n'est pas IMMUTABLE (donc inutilisable dans une colonne générée). `translate()` l'est ; le terme cherché est normalisé à l'identique côté serveur (`normaliserRecherche`). Contrôle : `'Œstrogel Éfferalgan Bérénice Lætitia'` → `oestrogel efferalgan berenice laetitia`.
- **Index** : `(officine_id, statut, created_at)`, `(officine_id, traite_at desc) where statut='traite'`, plus `cree_par` et `traite_par` (pour que l'advisor ne signale pas de clés étrangères non indexées).
- **Advisors** (`get_advisors`, avant/après) : **sécurité inchangée** (2 / 35 / 35 / 1 constats, tous préexistants). **Performance** : seuls 4 nouveaux `unused_index` (INFO) sur les index de la table, attendus pour une table neuve et vide.

## 3. Couche data et server actions

- `src/lib/data/promesses-patients.ts` (toutes les lectures dans `cache()`) :
  - `getPromessesActives` ;
  - `getNombrePromessesActives` (`count` + `head: true` : l'accueil ne charge aucune donnée nominative) ;
  - `getPromessesTraitees(officineId, terme)` : 50 dernières, `ilike` sur `recherche` pour chaque mot, jokers `%`/`_` échappés.
- `src/app/actions/promesses-patients.ts` :
  - `creerPromesse` (validation refaite côté serveur, téléphone formaté) ;
  - `marquerPromesseTraitee` (`traite_at`, `traite_par`) ;
  - `remettrePromesseEnAttente` ;
  - `basculerPromesseFacturee` ;
  - `supprimerPromesse` ;
  - `rechercherPromessesTraitees`.
  - Même squelette que `contacts.ts`/`suggestions.ts` : `getCurrentProfil()` + `getOfficineActive()`, `throw new Error(message)`, `revalidatePath`.
- `src/lib/promesses-patients.ts` (pur, partagé client/serveur) :
  - **Téléphone** : français (`0X…`, `+33`, `0033`, séparateurs tolérés) ou international E.164. Mis en forme à la sortie du champ et à l'enregistrement.
  - **Recherche tolérante** de la liste « En attente » : sous-chaîne, sinon distance de Damerau bornée sur le début des mots. 1 faute dès 4 lettres, 2 dès 8, inversion de lettres voisines comptée comme une faute. Tous les mots doivent correspondre.
    - Trouvés : `doliprnae` → Doliprane, `amoxcilline` → Amoxicilline, `levotirox` → Levothyrox, `doli 1000` → Doliprane 1000 mg, `oestro` → Œstrogel.
    - Sans faux positif : `dafalgan` ↛ Doliprane, `dol` ↛ Ventoline.
  - **Dates** (`depuisQuand`, `quandTraitee`) avec `Intl` en `Europe/Paris` (voir l'audit).

## 4. Interface

| Fichier | Rôle |
|---|---|
| `(app)/promesses-patients/page.tsx` | Page serveur, `force-dynamic` + `fetchCache = 'force-no-store'` ; `Cache-Control: no-store` ajouté dans `next.config.ts` (et la route est exclue du cache court par défaut) |
| `promesses-patients-onglets.tsx` | Onglets ARIA (flèches, Origine/Fin, tabIndex roving). **Les deux panneaux restent montés** (l'inactif en `hidden`), contrairement à Huiles essentielles : un formulaire à moitié rempli ne doit pas être perdu parce qu'on a regardé l'historique |
| `promesses-patients-en-attente.tsx` | Recherche, groupes, formulaire, actions optimistes |
| `promesses-patients-historique.tsx` | Historique et recherche serveur |
| `lib/focus-apres-retrait.ts` | Conserve le focus clavier quand une ligne disparaît |

Choix notables :

- **Optimiste partout** (`useOptimistic` + `startTransition`, sortie animée via `useRetraitAnime`, comme les autres toggles) : création (ligne temporaire à 60 % d'opacité), « Traitée », facturation, suppression, « Remettre en attente ».
- **Formulaire comptoir** :
  - pré-rempli avec la recherche en cours, ou le médicament du groupe via son bouton « + » ;
  - focus sur le premier champ vide seulement quand le formulaire est ouvert par un geste ;
  - **autocomplétion navigateur désactivée** (ce sont les coordonnées du patient, pas celles du membre de l'équipe) ;
  - facturation « Non, à facturer » / « Oui, facturé » en radios natives stylées ;
  - erreurs sous chaque champ (`text-[12px] text-rec`, `aria-describedby`, `aria-invalid`), comme DESIGN.md le prévoit, sans contour rouge ;
  - focus sur le premier champ en erreur à l'envoi.
- **États vides** :
  - aucune promesse : message qui explique l'usage, formulaire ouvert d'office ;
  - aucun patient pour la recherche : « Personne n'attend « X » » + action « Noter une promesse pour « X » » ;
  - historique vide ; aucun résultat ;
  - échec de chargement de l'historique : n'affecte que cet onglet, la liste à rappeler reste visible ;
  - échec de recherche (`role="alert"`).
  - Le nombre de résultats est annoncé via `role="status"`.
- **Couleurs** : Facturé = `green` (fait), Non facturé = `accent` (à faire à la venue du patient) ; aucun rouge hors suppression.
- **Desktop** : groupes en deux colonnes « maçonnerie » (`columns-2`), sans trous entre des groupes de hauteurs différentes.

## 5. Navigation

- `--color-teal: oklch(50% 0.1 195)` / `--color-teal-soft: oklch(94% 0.04 195)` : contraste calculé de **5,58:1 sur blanc** et **4,75:1 sur teal-soft**, conforme à la règle du contraste de DESIGN.md. Documenté dans DESIGN.md (frontmatter + section Colors).
- `IconPromesses` (combiné + flèche entrante : « on vous rappelle »), trait 2, viewBox 24.
- Entrée dans `MODULES_SECONDAIRES` (panneau « Plus » mobile). Tuile d'accueil « N en attente », qui affiche « — » en cas d'échec, comme les autres tuiles.

## 6. Audit impeccable (mode Operate) + web-design-guidelines + react-best-practices

Détecteur mécanique (`impeccable detect`, lancé une fois) : 2 constats *advisory* de taille de police. 14,5 px est dans la plage documentée ; le titre de groupe est passé de 15 à 16 px (palier `title`).

| # | Sév. | Constat | Correction |
|---|---|---|---|
| 1 | P1 | Libellés de date calculés en UTC au rendu serveur puis à Paris au client : heure décalée et erreur d'hydratation | `Intl.DateTimeFormat` avec `timeZone: 'Europe/Paris'` ; vérifié serveur UTC / navigateur Paris, et autour de minuit |
| 2 | P1 | Un « Traitée » en cours désactivait toutes les autres lignes : impossible d'enchaîner à l'arrivée d'un médicament attendu par plusieurs patients | Seules les lignes temporaires sont désactivées ; double tap déjà neutralisé par `useRetraitAnime` ; vérifié |
| 3 | P2 | Transition partagée : « Enregistrement… » affiché pendant un « Traitée » | Transition dédiée à la création |
| 4 | P2 | Focus perdu (retour sur `<body>`) après « Traitée » / « Remettre en attente » (passe `polish`) | `preparerFocusApresRetrait` : focus sur l'action équivalente de la ligne suivante ; vérifié au clavier |
| 5 | P3 | Pas de retour au survol sur le « + » de groupe et la pastille de facturation | `group-hover` |
| 6 | P3 | Vide de 18 px sous la recherche quand elle est vide ; absence de résultat non annoncée | Ligne d'état sans hauteur réservée ; annonce en `sr-only` |
| 7 | P3 | Composant défini dans un composant (`rerender-no-inline-components`) | `MessageErreur` remonté au niveau du module |

Écarts assumés (non corrigés) :

- **Onglet non reflété dans l'URL** (guideline « URL reflects state ») : l'état est conservé au pull-to-refresh, et le lien profond vers l'historique n'a pas d'usage identifié.
- **Placeholders sans « … »** : cohérent avec le reste de l'app.
- **Badge « En attente »** : il suit le compte serveur, qui se met à jour après la revalidation (~300 ms), et non le compte optimiste.
- **Icônes dupliquées dans chaque fichier** : c'est la convention explicite du code (cf. `suggestions.tsx`).

Scores (après corrections) :

| Dimension | Note |
|---|---|
| Accessibilité | 4 |
| Performance | 4 |
| Responsive | 4 |
| Thème | 3 (pas de mode sombre dans l'app, hors périmètre) |
| Intégrité de l'implémentation | 4 |
| **Total** | **19/20** |

## 7. Vérifications

- `tsc --noEmit` et `npm run lint` avant chaque commit. Lint : 0 erreur ; les 4 avertissements viennent tous de `switch-identite.tsx`, préexistant.
- `next build` de production OK.
- Banc d'essai temporaire (route `/api/banc-promesses-temp` avec données fictives + `.env.local` factice), Chromium via Playwright :
  - viewports 320, 375 et 1280 px ;
  - aucun débordement horizontal ;
  - navigation clavier des onglets, un seul panneau visible ;
  - ordre de tabulation logique ;
  - aucune erreur d'hydratation.
  - Banc et `.env.local` **supprimés, jamais versionnés**.
- Captures : `scripts/captures-module-promesses-patients-2026-09-25/`. Les numéros 02–07 datent d'avant les corrections de l'audit (titres de groupe à 15 px, vide sous la recherche) ; 20–21 sont postérieures.

**Non vérifié en conditions réelles** :

- création, traitement et recherche serveur contre la vraie base avec une session réelle (le banc n'a pas de session : l'échec de la recherche d'historique y a servi à tester l'état d'erreur) ;
- lecteur d'écran réel (VoiceOver/TalkBack) ;
- appel `tel:` sur téléphone.

## 8. Commits

1. `e063459` feat(promesses-patients) : migration de la table promesses_patients
2. `6f32509` feat(promesses-patients) : couche data et server actions
3. `ad2c509` feat(promesses-patients) : écran « En attente » — recherche et création rapide
4. `17aba9b` feat(promesses-patients) : onglet Historique et bascule d'onglets
5. `7ac2b77` feat(promesses-patients) : navigation, tuile d'accueil et token teal
6. `714952f` fix(promesses-patients) : corrections de l'audit impeccable (mode Operate)
7. `bd7e5ff` polish(promesses-patients) : focus conservé après « Traitée » et « Remettre en attente »
8. (ce rapport + captures)

## 9. Évolution (même jour) : quantité promise et téléphone facultatif

À la demande de Vincent :

- **Quantité** : colonne `quantite integer not null default 1 check (1–999)`. Les promesses existantes passent à 1.
  - Dans le formulaire, un champ court « Quantité » à côté du médicament. Laissé vide, il vaut 1.
  - Une valeur hors 1–999 ou non entière est signalée sous le champ.
  - Affichage : pastille « × N » à côté du nom du patient, « × N » dans l'historique, et « N au total » dans l'en-tête du groupe quand le total diffère du nombre de patients (ce qu'il faut mettre de côté à la livraison).
- **Téléphone facultatif** : `telephone_patient` accepte désormais NULL (la contrainte de longueur ne s'applique qu'à un numéro renseigné).
  - Un champ vide n'empêche plus d'enregistrer ; seul un numéro saisi mais invalide est encore refusé, pour ne pas stocker un numéro inutilisable.
  - Libellé « Téléphone (facultatif) » ; sans numéro, la ligne affiche « Pas de téléphone ».
- Migration : `scripts/migration-promesses-patients-quantite-telephone-facultatif-2026-09-25.sql`, appliquée via Supabase MCP.
- Vérifié :
  - validation : sans téléphone ni quantité → aucune erreur ; téléphone incomplet → erreur ; quantités 0 / abc / 1000 / 2.5 → erreur ;
  - rendu à 320 et 375 px sans débordement (banc temporaire supprimé, non versionné).
