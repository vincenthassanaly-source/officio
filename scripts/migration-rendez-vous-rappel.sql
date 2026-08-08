-- Suivi d'envoi du rappel d'agenda (cron toutes les 15 minutes, voir
-- src/app/api/cron/rappels-agenda/route.ts) : évite de renvoyer le même
-- rappel plusieurs fois. false par défaut = jamais envoyé.
alter table rendez_vous add column rappel_envoye boolean not null default false;

-- date/heure_debut sont des colonnes naïves (sans fuseau) qui représentent
-- l'heure locale Europe/Paris — comme partout ailleurs dans Officio, aucune
-- conversion de fuseau n'est faite au moment de la saisie. `at time zone
-- 'Europe/Paris'` convertit ce couple (date, heure) en instant UTC réel en
-- tenant compte du changement heure d'été/hiver, ce que Postgres gère
-- nativement via sa base de fuseaux — plus fiable que de réimplémenter ce
-- calcul à la main côté JS dans la route de cron.
--
-- Fenêtre de 60 minutes, cron toutes les 15 minutes : un rendez-vous entre
-- dans la fenêtre à un instant T (entre 45 et 60 minutes avant son heure),
-- et le prochain passage du cron (au plus tard 15 minutes après T) le
-- détectera forcément avant qu'il ne commence — d'où la plage "~45 à 60
-- minutes avant" mentionnée dans la demande.
create or replace function rendez_vous_a_rappeler()
returns table (
  id uuid,
  officine_id uuid,
  titre text,
  categorie text,
  date date,
  heure_debut time,
  note text
)
language sql
stable
set search_path = public
as $$
  select id, officine_id, titre, categorie, date, heure_debut, note
  from rendez_vous
  where rappel_envoye = false
    and (date + heure_debut) at time zone 'Europe/Paris' between now() and now() + interval '60 minutes'
$$;
