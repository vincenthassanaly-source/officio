-- Enrichit l'url stockée dans `notifications` (et transmise à send-push)
-- pour les 3 déclencheurs qui pointaient jusqu'ici vers '/liaison' sans
-- référence à l'élément précis — résultat : cliquer sur une notification
-- n'amenait jamais au message/à la tâche concerné, et sur /liaison le clic
-- ne produisait visiblement rien (router.push vers la même URL).
--
-- Nouveau format :
--   messages                          -> /liaison?onglet=fil&message=<id>
--   taches_assignees/taches_non_assignees -> /liaison?onglet=taches&tache=<id>
--
-- agenda_rappel (src/app/api/cron/rappels-agenda/route.ts) n'est pas
-- concerné : déjà '/agenda', hors périmètre ici.
--
-- Append-only : recrée les fonctions actives en base (create or replace,
-- même nom -> les triggers existants s'y raccrochent automatiquement, pas
-- besoin de les recréer) plutôt que de modifier scripts/migration-
-- notifications-in-app-triggers.sql ou scripts/migration-notifications-
-- messages-elargies.sql, déjà appliquées.

-- Reprend le corps de notifier_nouveau_message() (scripts/migration-
-- notifications-messages-elargies.sql), seule la valeur de 'url' change.
create or replace function notifier_nouveau_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur_prenom text;
  corps_tronque text;
  titre_notif text;
  url_notif text;
begin
  select split_part(nom_complet, ' ', 1) into auteur_prenom
  from profils
  where id = new.auteur_id;

  corps_tronque := left(new.contenu, 100);
  if length(new.contenu) > 100 then
    corps_tronque := corps_tronque || '…';
  end if;

  titre_notif := case
    when new.categorie = 'urgent' then 'Message urgent de ' || coalesce(auteur_prenom, 'un collègue')
    else 'Nouveau message de ' || coalesce(auteur_prenom, 'un collègue')
  end;

  url_notif := '/liaison?onglet=fil&message=' || new.id;

  perform net.http_post(
    url := 'https://hjerdcehdzfjhzefnnel.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_pOJAnLUbz1AELiFnXUYU_w_N7GOxXqJ'
    ),
    body := jsonb_build_object(
      'officineId', new.officine_id,
      'categorie', 'messages',
      'titre', titre_notif,
      'corps', corps_tronque,
      'url', url_notif,
      'exclureProfilIds', jsonb_build_array(new.auteur_id)
    )
  );

  -- Fil in-app : une ligne par membre de l'officine, sauf l'auteur.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  select
    new.officine_id,
    a.profil_id,
    'messages',
    titre_notif,
    corps_tronque,
    url_notif
  from adhesions a
  where a.officine_id = new.officine_id
    and a.profil_id <> new.auteur_id;

  return new;
end;
$$;

-- Reprend le corps de notifier_tache_assignee() (scripts/migration-
-- notifications-in-app-triggers.sql), seule la valeur de 'url' change.
create or replace function notifier_tache_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  corps_notif text;
  url_notif text;
begin
  if new.assigne_id is null then
    return new;
  end if;

  -- UPDATE OF assigne_id se déclenche dès que la colonne apparaît dans le
  -- SET, même si la valeur ne change pas réellement (ex: UPDATE ... SET
  -- assigne_id = assigne_id) : on filtre ce cas ici.
  if tg_op = 'UPDATE' and old.assigne_id is not distinct from new.assigne_id then
    return new;
  end if;

  -- Pas de notification si la personne s'assigne elle-même la tâche.
  if new.assigne_id = auth.uid() then
    return new;
  end if;

  corps_notif := new.titre;
  if new.echeance is not null then
    corps_notif := corps_notif || ' — échéance le ' || to_char(new.echeance, 'DD/MM/YYYY');
  end if;

  url_notif := '/liaison?onglet=taches&tache=' || new.id;

  perform net.http_post(
    url := 'https://hjerdcehdzfjhzefnnel.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_pOJAnLUbz1AELiFnXUYU_w_N7GOxXqJ'
    ),
    body := jsonb_build_object(
      'officineId', new.officine_id,
      'categorie', 'taches_assignees',
      'titre', 'Nouvelle tâche assignée',
      'corps', corps_notif,
      'url', url_notif,
      'profilIds', jsonb_build_array(new.assigne_id)
    )
  );

  -- Fil in-app : une seule ligne, pour l'assigné.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  values (new.officine_id, new.assigne_id, 'taches_assignees', 'Nouvelle tâche assignée', corps_notif, url_notif);

  return new;
end;
$$;

-- Reprend le corps de notifier_tache_non_assignee() (scripts/migration-
-- notifications-messages-elargies.sql), seule la valeur de 'url' change.
create or replace function notifier_tache_non_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  url_notif text;
begin
  url_notif := '/liaison?onglet=taches&tache=' || new.id;

  perform net.http_post(
    url := 'https://hjerdcehdzfjhzefnnel.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_pOJAnLUbz1AELiFnXUYU_w_N7GOxXqJ'
    ),
    body := jsonb_build_object(
      'officineId', new.officine_id,
      'categorie', 'taches_non_assignees',
      'titre', 'Nouvelle tâche à faire',
      'corps', new.titre,
      'url', url_notif,
      -- created_by est renseigné par l'app à la création (creerTache), mais
      -- reste nullable en base : on ne construit l'exclusion que s'il y a
      -- effectivement un créateur à exclure.
      'exclureProfilIds', case
        when new.created_by is not null then jsonb_build_array(new.created_by)
        else '[]'::jsonb
      end
    )
  );

  -- Fil in-app : une ligne par membre de l'officine, sauf le créateur.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  select
    new.officine_id,
    a.profil_id,
    'taches_non_assignees',
    'Nouvelle tâche à faire',
    new.titre,
    url_notif
  from adhesions a
  where a.officine_id = new.officine_id
    and (new.created_by is null or a.profil_id <> new.created_by);

  return new;
end;
$$;
