# Rapport — Audit des couleurs du catalogue Chaussures vs anatonic.fr

**Date :** 26/08/2026
**Script :** `scripts/audit-couleurs-anatonic.mjs` (lecture seule, aucune écriture ni upsert Supabase à aucun moment — vérifié : le fichier ne contient que des `.select()`)
**Déclencheur :** Vincent a remarqué que CHANTAL n'a pas la couleur CAMEL et BRIGITTE n'a pas la couleur PLATINE en base, et voulait savoir si d'autres modèles sont concernés.

## Résumé chiffré

| | |
|---|---|
| Fiches `chaussures_orthopediques` en base pour Pharmacie Rome Village | 197 |
| Produits fournisseur distincts après regroupement des fiches scindées (voir méthode) | **191** |
| Produits introuvables sur le site | **0** |
| Produits avec au moins une couleur réellement manquante ou en trop (sélecteur couleur achetable) | **5** |
| Total couleurs manquantes trouvées (site → base) | **3** |
| Total couleurs en base mais absentes du sélecteur du site (potentiellement retirées par le fournisseur) | **2** |
| Produits où le texte descriptif de la fiche cite une couleur non disponible à l'achat actuellement | 39 (signal secondaire, voir plus bas — non fiable à 100 %, souvent du texte marketing non maintenu) |

## Réponse directe : CHANTAL/CAMEL et BRIGITTE/PLATINE

**Ce ne sont PAS des couleurs manquantes au sens "achetable sur le site et absente de la base".**

- **CHANTAL** : le sélecteur de couleur réel de la fiche (celui qu'un client utilise pour commander) ne propose que **GRIS et NOIR** — exactement ce qu'il y a en base. Mais le paragraphe descriptif de la fiche dit *"Couleurs disponibles : Camel, Gris, Noir"* → Camel est cité dans le texte marketing, alors qu'il n'existe **aucune option Camel sélectionnable** sur la page produit aujourd'hui.
- **BRIGITTE** : le sélecteur réel ne propose que **ARGENT** — exactement ce qu'il y a en base. Le texte descriptif dit *"Coloris disponibles : Noir, Platine, Argent"* → Noir **et** Platine sont cités dans le texte (pas seulement Platine), mais ni l'un ni l'autre n'est sélectionnable sur la page.

Vérifié manuellement dans un navigateur sur les deux fiches (`sandale-confort/...chantal...` et `sandale/...brigitte...`) pour confirmer que ce n'est pas un bug d'extraction du script : le sélecteur de couleur (radios) ne contient bien que les couleurs listées en base, alors que le paragraphe de texte libre en cite davantage.

**Conclusion : la base est fidèle à ce qui est réellement commandable aujourd'hui sur anatonic.fr pour ces deux modèles.** L'écart vient d'une incohérence côté site fournisseur lui-même (texte marketing pas mis à jour quand une couleur est retirée de la vente), pas d'un oubli de l'import. Et ce n'est pas propre à CHANTAL/BRIGITTE : **39 des 191 produits** (environ 1 sur 5) présentent la même incohérence texte/sélecteur — voir tableau en bas de rapport. Vincent ne peut de toute façon pas commander Camel ou Platine/Noir sur ces deux fiches en l'état actuel du site.

## Les 5 vrais écarts trouvés (sélecteur de couleur réel vs base)

| nom_modele | couleurs manquantes (site → à ajouter) | couleurs en trop / à vérifier (base → absentes du site) | commentaire |
|---|---|---|---|
| **8388** | NOIR | — | Le site propose désormais NOIR en plus de BLANC. Couleur à ajouter. |
| **CHENI** | MARIN | — | Le site propose désormais MARIN (variante d'orthographe/couleur proche de MARINE — à vérifier si c'est une nouvelle couleur ou une reformulation du fournisseur) en plus de BEIGE/BLANC/NOIR. |
| **MATOU** | NOIR | — | Le site propose désormais NOIR en plus de BEIGE/MARINE. Couleur à ajouter. |
| **LAMALO** | — | BEIGE | BEIGE est en base mais n'apparaît plus dans le sélecteur du site (qui n'a que 11 couleurs contre 12 en base). Probablement retiré de la vente par le fournisseur — **à ne pas supprimer**, à confirmer avec Vincent. |
| **BELLA** | — | BRONZE | BRONZE est en base mais le site ne propose plus que NOIR/MARINE (2 couleurs contre 3 en base). Probablement retiré de la vente par le fournisseur — **à ne pas supprimer**, à confirmer avec Vincent. |

Aucune autre fiche du catalogue (186 sur 191) n'a d'écart entre sa liste de couleurs en base et le sélecteur de couleur réel du site.

## Note de méthode importante : un faux positif évité (BAROUR / BAROUR IMPRIMÉ)

En regroupant d'abord les fiches base par `reference` exacte (nécessaire à cause du split du 22/08 — voir `migration-split-modeles-chaussures.sql` — qui a extrait des sous-groupes de couleurs en fiches séparées comme DAVINA/DAVINA MÉTAL ou PIERRE ×2), la fiche **BAROUR IMPRIMÉ** est restée isolée car sa `reference` en base ("BAROUR IMPRIME") diffère de celle de la fiche d'origine **BAROUR** ("BAROUR"), alors que les deux fiches correspondent à la même page produit unique sur le site. Sans correction, cela aurait fait apparaître à tort BAROUR comme manquant 5 couleurs (FLEURI, COEUR, FRUIT, BACCARA, AUTOMNE) — qui sont en réalité déjà en base, simplement rattachées à la fiche sœur BAROUR IMPRIMÉ. Le script détecte maintenant ce cas (fiches sans aucune `url_source` propre, dont le nom/la référence est inclus dans celui d'un autre groupe) et fusionne les deux avant comparaison. Résultat : BAROUR/BAROUR IMPRIMÉ ✓, aucun écart réel.

## Signal secondaire : couleurs citées dans le texte de fiche mais non vendables actuellement (39 modèles)

Le script a aussi extrait la phrase "Couleurs disponibles : ..." / "Coloris disponibles : ..." du paragraphe descriptif de chaque fiche (texte libre écrit par le fournisseur, pas une donnée structurée) et l'a comparée à la fois à la base et au sélecteur réel. C'est un **signal informatif, pas une liste d'action** : l'extraction par texte libre est imprécise (elle capture parfois des bouts de phrase marketing plutôt que de vraies couleurs, ex. "un choix chic, polyvalent" pour GARDENIA), et surtout **ces couleurs ne sont pas commandables** puisqu'absentes du sélecteur réel — les ajouter en base donnerait de fausses options d'achat à l'officine.

| nom_modele | couleur(s) citée(s) dans le texte mais absente(s) du sélecteur |
|---|---|
| LIAM | Chocolat |
| DAVINA MÉTAL / DAVINA | Bleu, rouge, or |
| GARDENIA | *(texte imprécis, probablement pas une vraie couleur)* |
| HARMONY | Beige, Bronze |
| ANGELO | Camel |
| VICTORIA | Blanc |
| DUCHESSE | Rose |
| DANY | Blanc, gris ou blanc-marine |
| NOLWENN | Platine ou argent |
| GRENADE | *(texte imprécis, probablement pas une vraie couleur)* |
| OMER | Kaki |
| VICKYLEO | Noir, beige, kaki, brandy |
| YANNICK | Blanc (zèbre & argent), Noir (léopard & or) |
| ABBY | Noir profond, Taupe élégant, Corail vitaminé |
| AMELIE | Marron |
| BETTINA | Platine (éclat doré délicat) |
| JOELLE | Beige (imprimé serpent) |
| JODY | Beige (avec imprimé léopard) |
| **BRIGITTE** | **Noir, Platine** |
| MARION | Corail |
| IRENE | Beige (imprimé serpent) |
| LUCIENNE | Gris, Beige |
| REGINE | Gris, Marine (avec imprimé animalier) |
| ALIZA | Noir |
| GINA | Bronze (Éclat rosé) |
| ARIEL | Jean |
| MATHILDE | Beige léopard, Noir léopard |
| JULIE | Blanc, Bleu, Lilas |
| ORIANA | Lilas |
| CAMELIA | *(texte imprécis, probablement pas une vraie couleur)* |
| DANA | Taupe (métallisé), Noir (mat) |
| CHARLES | Noir Marron |
| ACHILLE | Noir, Marine |
| COCO | Jean (bleu chiné), Kaki |
| LUCIEN | Marine |
| RIO | Noir, Kaki |
| **CHANTAL** | **Camel** |
| ANAIS | Noir (cristaux sombres), Multi (éclat floral multicolore) |
| TITIANA | Or |

Si Vincent veut, ces couleurs pourraient être proposées à l'officine sous forme de "précommande fournisseur" plutôt qu'ajoutées telles quelles au catalogue — mais c'est une décision commerciale qui dépasse le périmètre diagnostic de cet audit.

## Méthode

1. **Base** : lecture de toutes les fiches `chaussures_orthopediques` + `chaussures_variantes.couleur` de l'officine Pharmacie Rome Village (197 fiches), regroupées par `reference` fournisseur (fallback `nom_modele` si `reference` vide) pour neutraliser le split du 22/08/2026 — 191 groupes.
2. **Site** : pour chaque groupe, si une `url_source` existe en base, la fiche produit est rechargée en direct (pas de réutilisation du cache du 08/08, jugé trop ancien vu que c'est justement l'objet de l'audit) ; la liste de couleurs est lue dans le vrai sélecteur `.product-variants-item` (select ou radios), comme dans `verify-import-anatonic.mjs`, sans télécharger de photo (pas nécessaire ici). Même user-agent et délai de 700 ms entre requêtes.
3. **Repli** : pour les groupes sans `url_source` exploitable, indexation des 31 catégories du site (même arbre `CATEGORY_TREE`) puis recherche du modèle par nom/référence dans les URLs — déclenché une seule fois pour BAROUR IMPRIMÉ avant la correction du regroupement (voir note ci-dessus), plus nécessaire après correction.
4. **Comparaison** : couleurs normalisées (accents/casse/espaces) puis différence d'ensembles dans les deux sens (site → base = manquantes ; base → site = en trop/à vérifier).
5. Aucune écriture Supabase à aucun moment. Fichiers de cache/rapport bruts dans `scripts/output/` (déjà ignoré par git) : `audit-couleurs-produits.json`, `audit-couleurs-rapport.json`, `audit-couleurs-site-index.json`, `audit-couleurs-run.log`.

## Vérifications techniques

- `npx tsc --noEmit` : OK (le fichier `.mjs` n'est de toute façon pas dans le périmètre TypeScript du projet, comme les autres scripts de ce dossier).
- `npm run lint` (et `npx eslint scripts/audit-couleurs-anatonic.mjs` directement) : OK, aucune erreur ni avertissement sur le nouveau fichier. Les 2 erreurs/avertissements restants du projet (`rendez-vous-list.tsx`, `switch-identite.tsx`) sont préexistants et sans rapport avec ce travail.
- Aucune donnée modifiée en base : script strictement en lecture, aucun `insert`/`update`/`upsert`/`delete` Supabase dans `audit-couleurs-anatonic.mjs`.
