-- Heure de rappel facultative pour une tâche, en complément du rappel
-- quotidien "échéance aujourd'hui" (cron 7h UTC, voir src/app/api/cron/
-- rappels-taches/route.ts et rappel_echeance_envoye_le) qui reste
-- inchangé : les deux rappels coexistent quand une heure est renseignée
-- (matin générique + rappel pile à l'heure).
alter table taches add column echeance_heure time;
alter table taches add column rappel_heure_envoye boolean not null default false;

-- echeance/echeance_heure sont des colonnes naïves (sans fuseau) qui
-- représentent la date/heure locale Europe/Paris — même convention que
-- date/heure_debut sur rendez_vous (voir scripts/migration-rendez-vous-
-- rappel.sql). `at time zone 'Europe/Paris'` convertit ce couple en instant
-- UTC réel en tenant compte du changement heure d'été/hiver, géré
-- nativement par Postgres.
--
-- Fenêtre de 15 minutes plutôt que les 60 de rendez_vous_a_rappeler() :
-- rendez_vous_a_rappeler() prévient 45-60 min AVANT l'heure (le temps de se
-- préparer) ; ici il s'agit d'un rappel "pile à l'heure" ("à faire à
-- 14h30" = notification vers 14h30, pas avant). Le cron tourne lui-même
-- toutes les 15 minutes (voir vercel.json) : une fenêtre plus large que ce
-- pas de scrutation enverrait le rappel jusqu'à 15 minutes après l'heure
-- sans bénéfice, donc la fenêtre reste bornée à [now, now + 15 min).
create or replace function taches_a_rappeler_heure()
returns table (
  id uuid,
  officine_id uuid,
  titre text,
  assigne_id uuid,
  echeance date,
  echeance_heure time
)
language sql
stable
set search_path = public
as $$
  select id, officine_id, titre, assigne_id, echeance, echeance_heure
  from taches
  where statut = 'a_faire'
    and assigne_id is not null
    and echeance_heure is not null
    and rappel_heure_envoye = false
    and (echeance + echeance_heure) at time zone 'Europe/Paris' between now() and now() + interval '15 minutes'
$$;
