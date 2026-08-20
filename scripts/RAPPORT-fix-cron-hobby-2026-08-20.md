# Rapport — Fix déploiement : cron 15 min incompatible plan Hobby (2026-08-20)

## Problème

Depuis le commit `15689ad` ("feat: heure de rappel facultative sur les
tâches"), `vercel.json` contenait un cron toutes les 15 minutes :

```json
{ "path": "/api/cron/rappels-taches-heure", "schedule": "*/15 * * * *" }
```

Le plan Vercel Hobby limite chaque cron à 1 exécution/jour maximum. Ce cron
étant invalide pour le plan, Vercel rejetait tous les déploiements depuis ce
commit, y compris le suivant (`eb0cf6a`, "feat: modale d'édition de tâche"),
pourtant indépendant.

## Correctif

Plutôt que de simplement changer la fréquence du cron dédié (qui n'aurait
alors plus eu aucune raison d'exister séparément, vu qu'il ne pourrait de
toute façon plus tourner qu'une fois par jour comme le cron quotidien), sa
logique a été fondue dans le cron quotidien existant :

- `vercel.json` — suppression de l'entrée `/api/cron/rappels-taches-heure`.
  Il ne reste que les deux crons existants, tous deux ≤ 1×/jour :
  `rappels-taches` (7h) et `rappels-agenda` (8h).
- `src/app/api/cron/rappels-taches-heure/route.ts` — supprimé.
- `src/app/api/cron/rappels-taches/route.ts` — sélectionne désormais aussi
  `echeance_heure` ; si elle est renseignée, le message de la notification
  devient `Tâche à faire — HHhMM` (au lieu de "Échéance aujourd'hui").
  `rappel_echeance_envoye_le` reste l'unique marqueur d'envoi (le rappel
  n'est plus "pile à l'heure" mais envoyé au moment du cron, 7h UTC).
- `src/components/taches-list.tsx` — commentaire du champ heure mis à jour
  (ne référence plus l'ancien cron).
- `scripts/migration-drop-taches-rappel-heure-cron.sql` (nouveau, appliqué
  en réel via Supabase MCP) — supprime la fonction `taches_a_rappeler_heure()`
  et la colonne `rappel_heure_envoye`, propres à l'ancien cron dédié. La
  colonne `echeance_heure` est conservée (toujours utilisée par le
  formulaire de tâche et son affichage).

## Fonctionnalités préservées

- Champ heure de rappel facultative sur les tâches (`echeance_heure`) :
  inchangé, formulaire de création et modale d'édition intacts.
- Modale d'édition de tâche : indépendante de ce correctif, non touchée.

## Limite acceptée

Le rappel pour une tâche avec heure n'arrive plus pile à l'heure choisie,
mais au plus tôt lors du cron quotidien de 7h UTC — limite du plan Hobby,
actée avec Vincent.
