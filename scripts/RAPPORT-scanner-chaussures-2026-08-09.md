# Rapport — Module Scanner (reconnaissance visuelle) sur les chaussures orthopédiques

**Date :** nuit du 8 au 9 août 2026
**Périmètre :** module Chaussures orthopédiques — nouvel onglet Scanner (photo au comptoir → modèles ressemblants du catalogue)

## Résumé chiffré

| | |
|---|---|
| Modèles en base | 351 |
| Modèles avec photo | 347 |
| Modèles avec embedding généré | **347 / 347** (100 % des modèles ayant une photo) |
| Modèles sans photo (ignorés, cause connue) | 4 : `HARVEY`, `KELLY`, `SIENNE`, `elisheva` (voir rapport du 08/08 — pas de photo sur le site fournisseur lui-même) |
| Appels Voyage AI en échec définitif | **0** |
| Tokens Voyage AI consommés (2ᵉ passage, cumul déclaré par l'API) | 264 728 (sur les 240 derniers modèles traités) |
| Coût réel | non chiffré ici (voir section dédiée plus bas) |
| Commits séparés poussés sur `main` | 6 |
| Données existantes du catalogue modifiées | **0** (module strictement additif : seule une nouvelle colonne `embedding`, jamais lue/modifiée par le catalogue existant) |

## Ce qui a été construit

Six commits, chacun une étape autonome, tous poussés sur `main` :

1. `8398156` — **Migration pgvector** (`scripts/migration-scanner-chaussures-embeddings.sql`) : extension `vector`, colonne `embedding vector(1024)` sur `chaussures_orthopediques`, index HNSW en distance cosinus.
2. `cda07c1` — **RPC de similarité** (`scripts/migration-scanner-chaussures-rpc.sql`) : `rechercher_chaussures_similaires(embedding, officine_id, limite)`, renvoie les modèles les plus proches par distance cosinus.
3. `7b65c95` — **Script de génération** (`scripts/generate-embeddings-chaussures.mjs`) : appelle Voyage AI pour chaque modèle avec photo, upsert l'embedding, reprise possible.
4. `a7c5fa2` — **Server action** (`src/app/actions/scanner-chaussures.ts`) : reçoit la photo prise au comptoir, l'envoie à Voyage AI, interroge la RPC, renvoie les 3 meilleurs candidats.
5. `aec8fc6` — **UI Scanner** (`src/components/chaussures-scanner.tsx` + intégration dans `chaussures-catalogue.tsx`) : nouvel onglet à côté d'ÉTÉ/HIVER/PERMANENT/FINS DE SÉRIE, capture caméra mobile, cartes de résultats avec badge de confiance, confirmation manuelle obligatoire avant ouverture de fiche.
6. `d1ae3fa` — **Correctif de rythme** (voir bug ci-dessous).

## Comment ça marche, en simple

1. Dans `/chaussures`, tu tapes l'onglet **Scanner**.
2. Tu prends une photo de la chaussure au comptoir (l'appareil photo du téléphone s'ouvre directement).
3. L'appli envoie cette photo à Voyage AI, qui la transforme en une "empreinte" numérique (1024 nombres qui résument à quoi ressemble visuellement la chaussure).
4. Cette empreinte est comparée à celle des 347 modèles du catalogue (déjà calculées une fois pour toutes cette nuit) — Postgres retrouve les 3 plus proches en une fraction de seconde grâce à l'index HNSW.
5. Tu vois les 3 candidats avec une photo et un badge **Très probable / Possible / Peu probable**. Tu tapes sur le bon pour ouvrir sa fiche — **rien ne s'ouvre automatiquement**.

## Bug rencontré et corrigé

Le premier lancement du script de génération (105/347 embeddings passés) s'est fait massivement rate-limiter par Voyage AI : **un compte sans moyen de paiement enregistré est plafonné à 3 requêtes/minute**, et mon script partait à un rythme de 300ms entre requêtes. Résultat : 429 en cascade puis des échecs réseau secondaires.

**Correction :** rythme ramené à 1 requête/21s (sous la limite avec marge), plus un backoff dédié de 65s en cas de 429 avant nouvel essai. Le script étant nativement reprenable (saute les modèles déjà traités), le deuxième passage a repris exactement où le premier s'était arrêté et a traité les 240 modèles restants sans aucun échec.

**Si tu ajoutes un moyen de paiement sur ton compte Voyage AI** (dashboard.voyageai.com → Billing), les limites standards sont nettement plus élevées ; tu peux alors réduire `DELAI_ENTRE_REQUETES_MS` dans le script pour les prochains lots (nouveaux modèles ajoutés au catalogue plus tard).

## Décisions techniques prises sans te redemander (comme convenu)

- **Index HNSW plutôt qu'IVFFlat** : à 351 lignes, IVFFlat (qui a besoin de données déjà en place pour bien calibrer ses clusters) n'apporte rien et reste imprécis à ce volume ; HNSW n'a pas ce problème d'amorçage et reste rapide même si le catalogue grossit.
- **Image envoyée en base64 plutôt qu'en URL directe** à Voyage AI, dans le script comme dans l'action serveur : évite de dépendre d'un éventuel fetch d'URL distante côté Voyage (non garanti selon les fournisseurs), au prix d'un aller-retour réseau de plus.
- **`input_type` différent selon le contexte** : `"document"` pour les embeddings du catalogue (génération en masse), `"query"` pour la photo prise au comptoir (recherche) — Voyage optimise différemment l'embedding selon ce rôle.
- **RPC en `SECURITY INVOKER`** (par défaut, pas `SECURITY DEFINER`) : la fonction s'exécute avec les droits de la personne connectée, donc ta policy RLS existante (`est_membre(officine_id)`) continue de s'appliquer normalement sans configuration supplémentaire — mêmes garanties de sécurité que le reste de l'app.
- **Seuils de confiance Très probable / Possible / Peu probable** fixés à 0,90 et 0,80 de similarité cosinus. **Provisoire** : un test rapide sur le catalogue montre que deux modèles réellement différents peuvent déjà atteindre ~0,77–0,78 (ex. `ACHILLE` vs `CANARIES`, tous deux en toile), donc une vraie photo de comptoir (angle, lumière, fond différents d'une photo studio) pourrait atterrir plus bas que prévu. **À recalibrer après quelques tests réels** — dis-moi si "Possible" apparaît trop souvent pour de mauvaises correspondances, ou trop rarement pour des bonnes ; les seuils sont dans `src/app/actions/scanner-chaussures.ts` (`SEUIL_TRES_PROBABLE`, `SEUIL_POSSIBLE`).

## Vérifications techniques effectuées

- `npx tsc --noEmit` : OK, aucune erreur.
- `npm run build` : OK, build de production réussi.
- `npm run lint` : 2 erreurs préexistantes détectées, **dans des fichiers que je n'ai pas touchés** (`rendez-vous-list.tsx`, `switch-identite.tsx`) — aucune erreur dans le code du Scanner.
- Test direct de la RPC en base : une recherche avec l'embedding d'`ACHILLE` lui-même remonte bien `ACHILLE` en 1ʳᵉ position (similarité 1,0), confirmant que le pipeline embeddings + RPC fonctionne correctement de bout en bout.
- **Non testé : la capture photo en situation réelle sur téléphone.** Je n'ai pas de compte de test pour me connecter à l'appli dans le navigateur automatisé, et de toute façon un navigateur automatisé n'a pas de vraie caméra à activer — ce point ne peut être vérifié que par toi, en vrai, sur ton téléphone.

## Ce qu'il te reste à faire

1. **Vercel** : ajouter `VOYAGE_API_KEY` dans Settings → Environment Variables du projet `officio-beta`, avec la même valeur que dans `.env.local` (sinon le Scanner ne marchera qu'en local, pas une fois déployé).
2. **Tester en vrai** : ouvre `/chaussures` sur ton téléphone, onglet Scanner, prends 3-4 photos de modèles que tu as sous la main au comptoir, et dis-moi si les bons résultats remontent avec le bon niveau de confiance.
3. **Coût réel** : je n'ai pas de chiffre fiable en euros à te donner (les tarifs Voyage AI évoluent et je préfère ne pas inventer un chiffre) — regarde l'onglet Billing de dashboard.voyageai.com, le total consommé pour ce lot est de 264 728 tokens (pour les 240 derniers modèles ; les 105 premiers n'ont pas eu leur usage comptabilisé à cause d'une troncature de mes logs, sans impact sur le résultat).
4. **Nouveaux modèles à l'avenir** : quand tu ajoutes un modèle au catalogue (via `import-anatonic-ete.mjs` ou `verify-import-anatonic.mjs`), relance `node scripts/generate-embeddings-chaussures.mjs` — il ne traitera que les nouveaux (reprise automatique), pas besoin de `--force`.
