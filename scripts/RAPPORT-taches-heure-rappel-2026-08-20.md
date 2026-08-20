# Rapport — Tâches : heure de rappel (2026-08-20)

## Objectif

Permettre de renseigner une heure facultative sur une tâche (en plus de la date
d'échéance) et envoyer un rappel push + notification in-app à la personne
assignée pile à l'heure choisie, en complément du rappel quotidien générique
existant.

## Fichiers touchés

- `scripts/migration-taches-heure-rappel.sql` (nouveau, appliqué en réel via
  Supabase MCP) — ajoute les colonnes `echeance_heure` (`time`, nullable) et
  `rappel_heure_envoye` (`boolean not null default false`) à `taches`, et crée
  la fonction `taches_a_rappeler_heure()`.
- `src/components/taches-list.tsx` — nouveau champ `<input type="time"
  name="echeance_heure">` (facultatif) dans le formulaire de création ; export
  de `formatHeureCourte()` ; `dueInfo()` accepte désormais `echeance_heure` et
  l'affiche en suffixe (`· HHhMM`) sur les labels "En retard", "Aujourd'hui",
  "Demain" et la date de secours.
- `src/app/actions/taches.ts` — `creerTache` lit et insère `echeance_heure`.
- `src/lib/data/taches.ts` — `Tache` et `TacheEcheance` exposent
  `echeance_heure` ; `getTaches` et `getTachesEcheancePeriode` la
  sélectionnent.
- `src/components/agenda/agenda-vue-globale.tsx` — le badge "Tâche" de la vue
  globale affiche `Tâche · HHhMM` quand une heure est renseignée (réutilise
  `formatHeureCourte`).
- `src/app/api/cron/rappels-taches-heure/route.ts` (nouveau) — cron miroir de
  `rappels-agenda/route.ts` (même authentification par `CRON_SECRET`, même
  client service-role, même structure de boucle avec `try/catch` autour de
  l'appel `send-push` et insertion `notifications` in-app systématique).
- `vercel.json` — ajout de l'entrée `{"path":
  "/api/cron/rappels-taches-heure", "schedule": "*/15 * * * *"}`.

## Logique de la fenêtre du cron (15 minutes)

`taches_a_rappeler_heure()` sélectionne les tâches où :

```sql
statut = 'a_faire'
and assigne_id is not null
and echeance_heure is not null
and rappel_heure_envoye = false
and (echeance + echeance_heure) at time zone 'Europe/Paris'
    between now() and now() + interval '15 minutes'
```

Le cron lui-même tourne toutes les 15 minutes (`*/15 * * * *`), donc la
fenêtre de la fonction SQL est calée sur la cadence du cron : chaque créneau
de 15 minutes n'est couvert que par une seule exécution, sans trou ni
recouvrement. C'est délibérément différent de `rendez_vous_a_rappeler()`
(fenêtre de 60 minutes) car ce dernier est appelé par `rappels-agenda`, qui ne
tourne qu'une fois par jour (`0 8 * * *`) et doit donc couvrir toute une
journée de rendez-vous à l'avance avec une seule marge large — pas un rappel
"pile à l'heure".

`rappel_heure_envoye` (propre à ce cron, distinct de `rappel_echeance_envoye_le`
utilisé par le rappel quotidien `rappels-taches/route.ts`) garantit qu'une
tâche donnée n'est notifiée qu'une seule fois par ce mécanisme, même si le
cron tourne plusieurs fois avant que la fenêtre ne se referme.

## Points d'attention

- **Fuseau horaire** : `echeance` (date) et `echeance_heure` (heure) sont
  stockées comme des valeurs locales "naïves" (sans fuseau), interprétées en
  `Europe/Paris` au moment de la comparaison via `at time zone`. C'est le même
  mécanisme que `rendez_vous_a_rappeler()`. Aucun changement d'heure
  été/hiver n'est géré différemment de l'existant : Postgres résout
  `Europe/Paris` dynamiquement à la date de la ligne.
- **Pas d'édition de tâche existante** : il n'existe actuellement aucune
  action serveur pour modifier une tâche déjà créée (seulement créer,
  cocher/décocher, supprimer). `echeance_heure` ne peut donc être défini qu'à
  la création, et `rappel_heure_envoye` n'a pas besoin d'être remis à `false`
  ailleurs qu'à l'insertion (où il vaut `false` par défaut). Si une
  fonctionnalité d'édition de tâche est ajoutée plus tard et permet de changer
  `echeance_heure` après coup, il faudra alors remettre `rappel_heure_envoye`
  à `false` dans cette action pour que le rappel soit à nouveau envoyé —
  aucun code actuel ne le fait, ce n'était pas nécessaire pour cette version.
- **Aucune notification à toute l'officine** : comme le rappel quotidien
  (`rappels-taches`), seul l'assigné reçoit la notification (`profilIds:
  [tache.assigne_id]`), contrairement à `rappels-agenda` qui diffuse à toute
  l'équipe. Une tâche sans assigné n'a pas d'`echeance_heure` traitée par ce
  cron (`assigne_id is not null` dans la fonction SQL).
- **Catégorie de notification réutilisée** : `taches_echeance`, la même que le
  rappel quotidien — aucune nouvelle catégorie n'a été ajoutée à
  `CATEGORIES_VALIDES` ni à `notification_preferences`.
- **Cron existant non modifié** : `rappels-taches/route.ts` et la colonne
  `rappel_echeance_envoye_le` n'ont pas été touchés ; les deux mécanismes de
  rappel coexistent indépendamment.
