-- Remplace le cron Vercel quotidien (src/app/api/cron/rappels-taches/
-- route.ts, supprimé par ce même commit) par un cron pg_cron + pg_net
-- côté Supabase, appelé toutes les minutes. Pattern repris du projet Kilio
-- de Vincent (scripts/migration-cron-rappels-taches-2026-09-01.sql,
-- fonction envoyer-rappels-taches) — voir RAPPORT-cron-rappels-taches-
-- 2026-09-06.md pour le détail des écarts (multi-tenant officine_id,
-- respect de notification_preferences, fonctions SQL de sélection au lieu
-- d'un filtrage DST côté JS).
--
-- Couvre les DEUX cas jusqu'ici gérés par le cron Vercel quotidien, comme
-- deux branches désormais mutuellement exclusives (une tâche n'est jamais
-- candidate aux deux à la fois, echeance_heure tranche) :
--   1. échéance aujourd'hui, sans heure précise -> taches_a_rappeler_
--      echeance_jour() (nouvelle fonction, reprend la logique de l'ancienne
--      route avec rappel_echeance_envoye_le, adaptée à Europe/Paris plutôt
--      que la date UTC — le cron ne tourne plus une fois par jour après
--      minuit Paris, la date UTC du moment ne coïncide donc plus toujours
--      avec la date Paris)
--   2. échéance avec heure précise -> taches_a_rappeler_heure() (recréée,
--      base identique à scripts/migration-taches-heure-rappel.sql avant sa
--      suppression par migration-drop-taches-rappel-heure-cron.sql, fenêtre
--      resserrée pour coller à la cadence à la minute)

-- 1. Colonne de suivi d'envoi du rappel "à l'heure précise", supprimée par
-- migration-drop-taches-rappel-heure-cron.sql faute de cron pour
-- l'exploiter à l'époque (plan Vercel Hobby limité à 1 exécution/jour).
alter table taches add column if not exists rappel_heure_envoye boolean not null default false;

-- 2. Fonctions de sélection.
--
-- echeance/echeance_heure sont des colonnes naïves (sans fuseau) qui
-- représentent la date/heure locale Europe/Paris (même convention que
-- rendez_vous.date/heure_debut, voir scripts/migration-rendez-vous-
-- rappel.sql). `at time zone 'Europe/Paris'` convertit vers l'instant UTC
-- réel en tenant compte du changement heure d'été/hiver, géré nativement
-- par la base de fuseaux de Postgres — c'est ce même mécanisme qui gère le
-- passage DST ici, sans réimplémentation côté Edge Function (contrairement
-- au pattern Intl.DateTimeFormat de Kilio, qui n'a pas d'équivalent SQL à
-- réutiliser dans son propre codebase — voir RAPPORT pour le détail).
--
-- Fenêtre resserrée à 1 minute (au lieu des 15 minutes de l'ancienne
-- version, jamais déployée) pour coller à la cadence pg_cron elle-même à la
-- minute : `<= now()` (l'heure de rappel est passée) et `> now() - 1 min`
-- (pas plus vieille qu'un tick de cron) donne un rappel qui arrive juste
-- après l'heure choisie, jamais avant — corrige la sémantique de l'ancienne
-- fenêtre `[now(), now() + 15 min)` qui pouvait notifier jusqu'à 15 minutes
-- en avance.
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
    and (echeance + echeance_heure) at time zone 'Europe/Paris' <= now()
    and (echeance + echeance_heure) at time zone 'Europe/Paris' > now() - interval '1 minute'
$$;

-- Cas "échéance aujourd'hui, sans heure précise" : reprend la logique de
-- l'ancienne route (rappel_echeance_envoye_le comme garde anti-doublon,
-- une valeur par jour) en calculant "aujourd'hui" en Europe/Paris plutôt
-- qu'en UTC — nécessaire maintenant que le cron tourne toute la journée
-- (l'ancien cron ne tournait qu'à 7h UTC, largement après minuit Paris,
-- donc la date UTC coïncidait toujours avec la date Paris à ce moment-là ;
-- ce n'est plus vrai à toute heure). `echeance_heure is null` exclut les
-- tâches gérées par taches_a_rappeler_heure() ci-dessus : les deux
-- fonctions sont mutuellement exclusives, jamais les deux à la fois pour
-- une même tâche.
create or replace function taches_a_rappeler_echeance_jour()
returns table (
  id uuid,
  officine_id uuid,
  titre text,
  assigne_id uuid,
  echeance date
)
language sql
stable
set search_path = public
as $$
  select id, officine_id, titre, assigne_id, echeance
  from taches
  where statut = 'a_faire'
    and assigne_id is not null
    and echeance_heure is null
    and echeance = (now() at time zone 'Europe/Paris')::date
    and (
      rappel_echeance_envoye_le is null
      or rappel_echeance_envoye_le <> (now() at time zone 'Europe/Paris')::date
    )
$$;

-- 3. Extensions. pg_net est déjà active (installée en schéma public par une
-- migration antérieure) ; pg_cron ne l'est pas encore sur ce projet
-- (vérifié via Supabase:list_extensions avant d'écrire cette migration).
create extension if not exists pg_net;
create extension if not exists pg_cron with schema pg_catalog;

grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

-- 4. Secrets Vault pour l'appel HTTP pg_net -> Edge Function, pattern
-- identique à Kilio (scripts/migration-cron-rappels-taches-2026-09-01.sql
-- dans /tmp/kilio-ref) : l'URL du projet et la clé anon/publishable (pas
-- secrète au sens strict — déjà exposée au client via
-- NEXT_PUBLIC_SUPABASE_ANON_KEY, voir NOTIFICATIONS.md) servent uniquement
-- à passer la vérification JWT de la fonction (verify_jwt: true). La
-- fonction utilise ensuite en interne SUPABASE_SERVICE_ROLE_KEY (injectée
-- automatiquement par Supabase) pour les opérations base de données.
select vault.create_secret('https://hjerdcehdzfjhzefnnel.supabase.co', 'project_url');
select vault.create_secret(
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqZXJkY2VoZHpmamh6ZWZubmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU2ODI2MjksImV4cCI6MjEwMTI1ODYyOX0.3xCfa2w1BiwGfxKLr1jIPDTvqx5h3mgThYf9b-gcnTk',
  'publishable_key'
);

-- 5. Planification : toutes les minutes, vers la nouvelle Edge Function
-- autonome supabase/functions/envoyer-rappels-taches (n'appelle pas
-- send-push, voir en-tête de ce fichier).
select cron.schedule(
  'rappels-taches',
  '* * * * *',
  $$
  select net.http_post(
      url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/envoyer-rappels-taches',
      headers := jsonb_build_object(
        'Content-type', 'application/json',
        'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
      ),
      body := '{}'::jsonb
  ) as request_id;
  $$
);
