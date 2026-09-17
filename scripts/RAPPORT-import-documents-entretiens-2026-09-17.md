# Import des documents officiels de référence — Entretiens pharmaceutiques

Date : 2026-09-17
Officine : Pharmacie Rome Village (`officine_id` résolu en base : `a60c85dd-8d58-4f73-bf6c-6b186b3570d8`)

## Résumé

- **Documents identifiés (manifeste) : 18**, répartis sur 7 des 8 types d'entretien.
- **Type sans document trouvé : 1** — Entretien femme enceinte.
- **Documents réellement importés en base à ce stade : 0.** L'import (étape 5 de la
  tâche) n'a pas pu être exécuté dans cette session — voir « Points bloquants »
  ci-dessous. Le manifeste, le script d'import et le script de vérification sont
  livrés et prêts à être exécutés par Vincent dans un environnement disposant des
  identifiants Supabase et d'un accès réseau sortant vers les 4 sites officiels.

## État de la base avant import (vérifié via Supabase MCP)

- Les 8 types d'entretien existent déjà pour Pharmacie Rome Village
  (AVK, AOD, asthme, anticancéreux oraux, BPM, femme enceinte, opioïdes, bilan de
  prévention).
- `entretien_documents` est actuellement **vide** pour cette officine : aucun risque
  de doublon avec l'existant, seuls les doublons internes au manifeste sont à
  surveiller (gérés par le script d'import).

## Documents trouvés par type d'entretien

### Entretien AVK (2 documents)
- **Entretien pharmaceutique AVK - grille officielle** (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/5393/document/entretien-pharmaceutique-avk_assurance-maladie.pdf>
- **Carnet AVK - carnet d'information et de suivi du traitement** (support_patient) — cespharm.fr
  <https://www.cespharm.fr/content/download/45785/file/carnet-avk-carnet-d-information-et-de-suivi-du-traitement.pdf>

### Entretien AOD (1 document)
- **Entretien pharmaceutique AOD - fiche de suivi** (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/5394/document/entretien-pharmaceutique-aod-fiche-suivi_assurance-maladie.pdf>

### Entretien asthme (1 document)
- **Entretiens pharmaceutiques asthme - fiches de suivi** (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/fileadmin/user_upload/documents/2016203_EntretiensPharmaceutiques_asthme_FichesSuivi.pdf>

### Entretien anticancéreux oraux (3 documents)
Le programme ameli.fr est **spécifique à chaque molécule** (plus de 50 fiches
individuelles) : il n'existe pas de grille générique unique. Trois fiches
représentatives ont été retenues à titre d'exemple :
- Sorafénib (Nexavar) — entretien effets indésirables (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/650_SORAFENIB_entretien_quot_effets_indesirables.pdf>
- Palbociclib (Ibrance) — entretien initial (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/675-PALBOCICLIB_entretien_initial.pdf>
- Anastrozol — entretien initial (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/604_ANASTROZOL_entretien_initial.pdf>

*Point d'attention pour Vincent : à compléter au cas par cas selon les molécules
réellement dispensées à l'officine — la liste complète est sur la page ameli.fr
« Accompagnement pharmaceutique des patients sous anticancéreux par voie orale ».*

### Bilan partagé de médication (BPM) (4 documents)
- BPM - formulaire d'adhésion (autre) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/502_BPM_formulaire_adhesion.pdf>
- BPM - entretien de recueil d'information (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/503_BPM_bilan_entretien_recueil_info.pdf>
- BPM - analyse des traitements du patient (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/504_BPM_formulaire_bilan_analyse_traitements.pdf>
- BPM - entretien-conseil avec le patient (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/505_BPM_entretien_conseil.pdf>

### Entretien femme enceinte — **aucun document trouvé**
La page ameli.fr dédiée (`/pharmacien/sante-prevention/accompagnements/entretien-femme-enceinte`)
existe et mentionne un « Mémo pharmacien - Accompagnement femme enceinte » ainsi
qu'un flyer ANSM téléchargeables, mais aucune URL de fichier direct n'a pu être
établie avec certitude par recherche web, et l'environnement de cette session ne
permet pas de charger la page pour en extraire le lien exact (voir « Points
bloquants »). Conformément à la consigne de ne jamais inventer de document,
**rien n'a été ajouté au manifeste pour ce type**. À compléter manuellement par
Vincent en consultant directement la page ameli.fr.

### Entretien opioïdes (4 documents)
- Accompagnement opioïdes - fiche entretien pharmacien (fiche_suivi) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/Fiche-pharmacien-accompagnement-opioides.pdf>
- De la prévention du trouble de l'usage à la prise en charge des surdoses d'opioïdes (autre) — has-sante.fr
  <https://www.has-sante.fr/upload/docs/application/pdf/2022-03/de_la_prevention_du_trouble_de_lusage_et_des_surdoses_a_la_prise_en_charge_des_surdoses_dopioides_-_fiche.pdf>
- Bon usage des médicaments opioïdes - recommandation HAS (autre) — has-sante.fr
  <https://www.has-sante.fr/upload/docs/application/pdf/2022-03/reco_opioides.pdf>
- Fentanyl à libération rapide (Actiq) - guide pharmacien MARR (autre) — ansm.sante.fr
  <https://ansm.sante.fr/uploads/2025/04/08/20250408-marr-actiq-guide-pharmacien-2025-03.pdf>

### Bilan de prévention (3 documents)
Aucune grille d'entretien professionnelle publique n'a été trouvée (HAS/ameli
indiquent que les grilles d'entretien et fiches de prévention détaillées sont
réservées aux pharmaciens formés, derrière un accès authentifié). Trois supports
patients officiels ont en revanche été identifiés :
- Mon bilan prévention - livret de présentation (support_patient) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/Mon-bilan-prevention-livret-presentation.pdf>
- Mon bilan prévention - autoquestionnaire 45-50 ans (support_patient) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/Mon-bilan-prevention-autoquestionnaire-45-50ans.pdf>
- Mon bilan prévention - autoquestionnaire 60-65 ans (support_patient) — ameli.fr
  <https://www.ameli.fr/sites/default/files/Documents/Mon-bilan-prevention-autoquestionnaire-60-65ans.pdf>

## Points bloquants rencontrés

1. **`.env.local` absent de cet environnement.** Le script d'import s'arrête
   immédiatement (`Variables manquantes : NEXT_PUBLIC_SUPABASE_URL et/ou
   SUPABASE_SERVICE_ROLE_KEY`) — vérifié en l'exécutant réellement. Cette session
   distante n'a jamais eu accès aux identifiants Supabase applicatifs (seul l'outil
   MCP Supabase, avec ses propres droits, est disponible ici). **Le script doit être
   exécuté par Vincent sur un poste où `.env.local` existe** (ou les variables
   d'environnement injectées différemment).

2. **Accès réseau sortant bloqué vers les 4 domaines officiels dans cet
   environnement.** `ameli.fr`, `has-sante.fr`, `cespharm.fr` et `ansm.sante.fr`
   sont tous refusés par le proxy d'egress de cette session (`EGRESS_BLOCKED`).
   Conséquence directe :
   - Les URLs du manifeste n'ont **pas pu être vérifiées par un fetch réel**
     (statut HTTP, Content-Type, poids du fichier) — elles proviennent des
     résultats de recherche web (WebSearch), qui a fonctionné normalement.
   - Le script d'import, s'il tournait ici, ne pourrait de toute façon pas
     télécharger les fichiers pour la même raison.
   - **Recommandation : exécuter le script depuis un poste/réseau ayant un accès
     internet standard** (le poste de travail habituel de Vincent, par exemple),
     avec `.env.local` renseigné. Le script vérifie lui-même le `Content-Type` de
     chaque téléchargement et ignore/logue toute entrée invalide plutôt que
     d'importer un fichier incorrect — donc même une URL erronée du manifeste
     échouera proprement (log d'erreur) sans corrompre la base.

3. **Le RPC `ajouter_document_entretien` ne peut pas être appelé tel quel par un
   script service-role.** Vérifié via Supabase MCP : `auth.uid()` (utilisé par
   `est_membre()`, appelé par le RPC) renvoie `NULL` pour toute requête
   authentifiée uniquement avec la clé service role (pas de `sub` dans son JWT).
   Le RPC échouerait donc systématiquement avec `Non autorisé.` dans ce contexte.
   Le script d'import **insère directement dans `entretien_documents`** avec les
   mêmes colonnes que celles écrites par le RPC (upload Storage identique,
   `ajoute_par` renseigné avec le compte de Vincent résolu par email plutôt que
   laissé vide). Ce choix est documenté en tête du script.

## Ce qui reste à faire (par Vincent, en local)

1. Vérifier/compléter le manifeste `scripts/data/entretiens-documents-manifest.json`
   si besoin (notamment ajouter le document « Entretien femme enceinte » après
   consultation directe de la page ameli.fr correspondante, et ajuster la liste
   des molécules pour « Entretien anticancéreux oraux » selon les besoins réels
   de l'officine).
2. Exécuter `node scripts/import-documents-entretiens-2026-09-17.mjs` sur un poste
   avec `.env.local` et accès internet standard.
3. Exécuter `node scripts/verify-import-documents-entretiens-2026-09-17.mjs` pour
   confirmer que chaque document est bien en base et son fichier bien présent dans
   le bucket `entretiens`.

## Résumé final

- **Documents identifiés (manifeste) : 18**
- **Documents réellement importés en production : 0** (exécution non réalisable
  dans cet environnement — voir points bloquants 1 et 2)
- **Types sans document trouvé : 1** (Entretien femme enceinte)
- **Points bloquants : 3** (identifiants Supabase absents, accès réseau aux 4
  sites officiels bloqué, RPC applicatif non utilisable tel quel depuis un script
  service-role — ce dernier point est résolu dans le script livré)
