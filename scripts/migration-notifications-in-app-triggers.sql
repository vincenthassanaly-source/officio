-- Étend les deux triggers de notification push déjà existants
-- (scripts/migration-notifications-messages-urgents.sql et
-- scripts/migration-notifications-taches-assignees.sql) pour qu'ils
-- écrivent aussi dans la table `notifications` (scripts/migration-
-- notifications-in-app.sql), en plus de l'appel net.http_post vers
-- send-push déjà en place. Les deux mécanismes restent déclenchés au même
-- endroit pour ne jamais diverger.
--
-- Choix assumé : le fil in-app reste EXHAUSTIF, indépendant de
-- `notification_preferences` (l'opt-out ne concerne que l'interruption
-- active du push, pas la visibilité passive dans le fil — voir le rapport
-- pour le détail du raisonnement). Aucune lecture de
-- notification_preferences n'est donc nécessaire ici.
--
-- Pour le cas "toute l'officine sauf l'auteur" (message urgent), send-push
-- résout lui-même la liste des membres côté edge function (Deno) — mais ce
-- trigger SQL ne peut pas réutiliser ce résultat (net.http_post est
-- asynchrone, fire-and-forget) : il doit énumérer les membres via
-- `adhesions` de son côté pour insérer une ligne par destinataire. Léger
-- doublon de logique de ciblage, mais les deux mécanismes (push vs in-app)
-- sont des systèmes d'écriture indépendants qui ne peuvent pas partager un
-- seul appel réseau asynchrone.

create or replace function notifier_message_urgent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur_prenom text;
  corps_tronque text;
begin
  select split_part(nom_complet, ' ', 1) into auteur_prenom
  from profils
  where id = new.auteur_id;

  corps_tronque := left(new.contenu, 100);
  if length(new.contenu) > 100 then
    corps_tronque := corps_tronque || '…';
  end if;

  perform net.http_post(
    url := 'https://hjerdcehdzfjhzefnnel.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_pOJAnLUbz1AELiFnXUYU_w_N7GOxXqJ'
    ),
    body := jsonb_build_object(
      'officineId', new.officine_id,
      'categorie', 'messages_urgents',
      'titre', 'Message urgent de ' || coalesce(auteur_prenom, 'un collègue'),
      'corps', corps_tronque,
      'url', '/liaison',
      'exclureProfilIds', jsonb_build_array(new.auteur_id)
    )
  );

  -- Fil in-app : une ligne par membre de l'officine, sauf l'auteur.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  select
    new.officine_id,
    a.profil_id,
    'messages_urgents',
    'Message urgent de ' || coalesce(auteur_prenom, 'un collègue'),
    corps_tronque,
    '/liaison'
  from adhesions a
  where a.officine_id = new.officine_id
    and a.profil_id <> new.auteur_id;

  return new;
end;
$$;

create or replace function notifier_tache_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  corps_notif text;
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
      'url', '/liaison',
      'profilIds', jsonb_build_array(new.assigne_id)
    )
  );

  -- Fil in-app : une seule ligne, pour l'assigné.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  values (new.officine_id, new.assigne_id, 'taches_assignees', 'Nouvelle tâche assignée', corps_notif, '/liaison');

  return new;
end;
$$;
