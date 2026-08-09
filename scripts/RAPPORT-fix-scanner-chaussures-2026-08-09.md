# Rapport — Correctif du crash Scanner (chaussures orthopédiques)

**Date :** 9 août 2026, matinée
**Périmètre :** module Chaussures orthopédiques — onglet Scanner uniquement (aucun autre fichier du catalogue touché)

## Cause racine trouvée

Dans les logs Vercel (Production → Logs, requête `POST /chaussures` du 9 août 13:38:06, User-Agent Android réel) :

```
Error: Body exceeded 1 MB limit.
To configure the body size limit for Server Actions, see:
https://nextjs.org/docs/app/api-reference/next-config-js/serverActions#bodysizelimit
statusCode: 413
digest: '3735630078@E394'
```

**Ce n'était pas la clé Voyage AI ni une migration Supabase manquante.** Les deux ont été vérifiées et sont saines :
- `VOYAGE_API_KEY` est bien présente sur Vercel (Development/Preview/Production) — quelqu'un l'avait déjà ajoutée avant cette intervention.
- Sur Supabase distant (`hjerdcehdzfjhzefnnel`) : extension `vector` installée, colonne `embedding` présente, RPC `rechercher_chaussures_similaires` bien déployée en `SECURITY INVOKER`, 347/351 modèles avec embedding — conforme au rapport de la nuit précédente.

La vraie cause : Next.js limite par défaut à **1 Mo** le corps d'une requête envoyée à une Server Action. Une vraie photo prise avec l'appareil photo d'un téléphone dépasse presque toujours cette limite (une photo à pleine résolution pèse généralement 1 à 4 Mo). La requête était donc rejetée par le framework **avant même** que le code de `identifierChaussure` ne s'exécute — d'où l'absence totale d'appel sortant vers Voyage AI dans les logs de la fonction. Le digest affiché à l'écran était le résultat générique de ce rejet.

## Corrections apportées (2 commits)

1. **`fix(chaussures): augmenter la limite de taille des Server Actions à 10 Mo`** (`next.config.ts`)
   Ajout de `experimental.serverActions.bodySizeLimit: '10mb'`. Confirmé dans la sortie de `npm run build` (`Experiments: serverActions`) et testé : le pipeline complet (Voyage AI + RPC) fonctionne désormais avec une photo de test réaliste de 12 mégapixels (résolution standard d'un smartphone).

2. **`fix(chaussures): messages d'erreur clairs pour le Scanner au lieu du digest Next.js générique`** (`src/app/actions/scanner-chaussures.ts`, `src/components/chaussures-scanner.tsx`)
   Découverte en creusant le sujet : en production, une Server Action qui fait `throw new Error(...)` voit **systématiquement** son message remplacé par le message générique Next.js avant d'atteindre le client — les messages spécifiques déjà écrits (« clé Voyage AI manquante », « échec de l'analyse », etc.) n'étaient donc **jamais** visibles par toi, quelle que soit la cause réelle du problème. C'est un comportement de sécurité de Next.js, pas un bug isolé à ce module.
   `identifierChaussure` renvoie maintenant un résultat typé (`{ succes: true, candidats }` ou `{ succes: false, message }`) au lieu de `throw`, et logue systématiquement le détail réel côté serveur avec `console.error` (visible dans Vercel → Logs) avant de renvoyer un message clair et actionnable au client. Le composant Scanner affiche ce message tel quel, avec un message de secours générique uniquement pour les échecs de transport réseau (avant même l'exécution de l'action).

## Vérifications effectuées

- `npx tsc --noEmit` : OK.
- `npm run build` : OK, `experimental.serverActions` bien actif dans la sortie du build.
- `npm run lint` : mêmes 2 erreurs préexistantes que la veille, dans des fichiers non touchés (`rendez-vous-list.tsx`, `switch-identite.tsx`) — rien dans le Scanner.
- **Test de bout en bout du pipeline** (script jetable, supprimé après usage) avec une photo de test générée à une résolution réaliste de smartphone (4032×3024, ~0,8 Mo) : appel Voyage AI réussi, embedding à 1024 dimensions, RPC Supabase renvoie bien le bon modèle en tête (le modèle source de la photo test, similarité 0,86).
- Déploiement en production confirmé (`0ae9e58`, statut Ready) sur `officio-beta.vercel.app`.
- **Non testé : la vraie prise de photo depuis un téléphone.** Comme la nuit dernière, un navigateur automatisé n'a pas de vraie caméra — seul le pipeline serveur a pu être vérifié directement.

## Point de vigilance découvert en testant (informatif, aucune action prise)

En testant avec une photo générée à très haute résolution (6000×4500), Voyage AI a renvoyé une erreur 400 distincte : *"The image resolution is not within the permitted range"*. Ce n'est pas la cause du bug d'aujourd'hui (résolutions de téléphone courantes comme 12 Mpx passent sans problème), mais si un téléphone à très haute résolution capture parfois ce cas à l'avenir, le message clair ajouté aujourd'hui ("Échec de l'analyse de la photo. Réessayez dans quelques instants.") s'affichera correctement au lieu du digest générique — pas d'action supplémentaire nécessaire pour l'instant.

## Mise à jour — deuxième cause trouvée après ton premier test réel

Ton premier test sur téléphone (photo réelle) a fait remonter un nouveau message : *"Impossible de contacter le serveur pour analyser la photo."* Vérification dans les logs Vercel : **aucune requête `POST /chaussures` n'apparaît** au moment du test — la requête n'a jamais atteint le serveur.

Cause : **Vercel impose un plafond strict et non configurable de 4,5 Mo** sur le corps de toute requête vers une fonction serverless (`FUNCTION_PAYLOAD_TOO_LARGE`), quelle que soit la config `bodySizeLimit` de Next.js. Le correctif précédent (10 Mo côté Next.js) n'avait donc aucun effet réel : une vraie photo de téléphone à pleine résolution peut dépasser 4,5 Mo, auquel cas la plateforme rejette la requête *avant* qu'elle n'atteigne Next.js ou notre code — d'où l'absence totale de trace dans les logs applicatifs, et une erreur de transport générique côté client plutôt qu'un message clair.

**Correction (3ᵉ commit, `f27db57`)** : la photo est maintenant systématiquement redimensionnée et recompressée **dans le navigateur** avant l'envoi (1600 px de long côté max, JPEG qualité 0,85), avec repli sur le fichier original si la compression échoue pour une raison quelconque. Sur la photo de test réaliste (12 Mpx, ~0,8 Mo), la taille finale tombe à ~120 Ko — largement sous la limite Vercel, et aussi sous la limite de résolution de Voyage AI repérée plus haut. `bodySizeLimit` ramené à 4 Mo dans `next.config.ts` pour rester cohérent avec la vraie contrainte de la plateforme (Vercel, pas Next.js, a le dernier mot).

## Ce qu'il te reste à faire

**Retester en vrai sur ton téléphone** : ouvre `/chaussures` → onglet Scanner → reprends une photo réelle d'un modèle du comptoir. Cette fois la photo est compressée avant l'envoi, ce qui devrait passer sous le plafond Vercel. Dis-moi si le bon résultat remonte, ou si un message d'erreur clair (et non plus générique) s'affiche en cas de souci restant.
