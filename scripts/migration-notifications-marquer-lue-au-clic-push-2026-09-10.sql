-- Relie chaque notification push envoyée à sa ligne `notifications` in-app,
-- pour que le clic sur la notif système (public/sw.js) puisse marquer cette
-- ligne comme lue (POST /api/notifications/marquer-lue), comme le fait déjà
-- le clic sur une notification in-app (marquerNotificationLue()).
--
-- Jusqu'ici, aucun lien n'existait entre la ligne insérée dans `notifications`
-- et le payload envoyé à send-push : les deux écritures (insert + net.http_post)
-- étaient indépendantes. Ce correctif :
--   1. Insère d'abord la/les ligne(s) `notifications` (au lieu d'après, comme
--      avant) pour récupérer leur(s) id(s).
--   2. Ajoute cet/ces id(s) au corps envoyé à send-push :
--      - `notificationId` (id unique) pour notifier_tache_assignee, qui n'a
--        qu'un seul destinataire.
--      - `notificationIds` (tableau `{profilId, notificationId}`) pour les
--        trois triggers en fan-out (un envoi push, plusieurs destinataires,
--        donc plusieurs lignes `notifications` distinctes à faire
--        correspondre à chaque abonnement par profil_id côté send-push).
--
-- Append-only : recrée les 4 fonctions actives en base (create or replace,
-- même nom -> les triggers existants s'y raccrochent automatiquement),
-- reprises telles quelles sinon (mêmes textes de titre/corps/url).

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
  mapping_notifs jsonb;
begin
  select split_part(nom_complet, ' ', 1) into auteur_prenom
  from profils
  where id = new.auteur_id;

  if new.contenu = '' and new.audio_chemin_stockage is not null then
    corps_tronque := '🎤 Message vocal de ' || coalesce(auteur_prenom, 'un collègue');
  else
    corps_tronque := left(new.contenu, 100);
    if length(new.contenu) > 100 then
      corps_tronque := corps_tronque || '…';
    end if;
  end if;

  titre_notif := case
    when new.categorie = 'urgent' then 'Message urgent de ' || coalesce(auteur_prenom, 'un collègue')
    else 'Nouveau message de ' || coalesce(auteur_prenom, 'un collègue')
  end;

  url_notif := '/liaison?onglet=fil&message=' || new.id;

  -- Fil in-app d'abord (une ligne par destinataire) pour récupérer les ids
  -- à faire correspondre à chaque abonnement push par profil_id.
  with lignes_inserees as (
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
      and a.profil_id <> new.auteur_id
    returning id, profil_id
  )
  select jsonb_agg(jsonb_build_object('profilId', profil_id, 'notificationId', id))
  into mapping_notifs
  from lignes_inserees;

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
      'exclureProfilIds', jsonb_build_array(new.auteur_id),
      'notificationIds', coalesce(mapping_notifs, '[]'::jsonb)
    )
  );

  return new;
end;
$$;

create or replace function notifier_nouvelle_note()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur_prenom text;
  corps_brut text;
  corps_tronque text;
  titre_notif text;
  url_notif text;
  mapping_notifs jsonb;
begin
  select split_part(nom_complet, ' ', 1) into auteur_prenom
  from profils
  where id = new.auteur_id;

  titre_notif := 'Nouvelle note de ' || coalesce(auteur_prenom, 'un collègue');

  corps_brut := new.titre || ' — ' || new.contenu;
  corps_tronque := left(corps_brut, 100);
  if length(corps_brut) > 100 then
    corps_tronque := corps_tronque || '…';
  end if;

  url_notif := '/notes?note=' || new.id;

  with lignes_inserees as (
    insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
    select
      new.officine_id,
      a.profil_id,
      'notes',
      titre_notif,
      corps_tronque,
      url_notif
    from adhesions a
    where a.officine_id = new.officine_id
      and a.profil_id <> new.auteur_id
    returning id, profil_id
  )
  select jsonb_agg(jsonb_build_object('profilId', profil_id, 'notificationId', id))
  into mapping_notifs
  from lignes_inserees;

  perform net.http_post(
    url := 'https://hjerdcehdzfjhzefnnel.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer sb_publishable_pOJAnLUbz1AELiFnXUYU_w_N7GOxXqJ'
    ),
    body := jsonb_build_object(
      'officineId', new.officine_id,
      'categorie', 'notes',
      'titre', titre_notif,
      'corps', corps_tronque,
      'url', url_notif,
      'exclureProfilIds', jsonb_build_array(new.auteur_id),
      'notificationIds', coalesce(mapping_notifs, '[]'::jsonb)
    )
  );

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
  url_notif text;
  notif_id uuid;
begin
  if new.assigne_id is null then
    return new;
  end if;

  if tg_op = 'UPDATE' and old.assigne_id is not distinct from new.assigne_id then
    return new;
  end if;

  if new.assigne_id = auth.uid() then
    return new;
  end if;

  corps_notif := new.titre;
  if new.echeance is not null then
    corps_notif := corps_notif || ' — échéance le ' || to_char(new.echeance, 'DD/MM/YYYY');
  end if;

  url_notif := '/liaison?onglet=taches&tache=' || new.id;

  -- Fil in-app d'abord (un seul destinataire) pour récupérer l'id à
  -- transmettre à send-push.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  values (new.officine_id, new.assigne_id, 'taches_assignees', 'Nouvelle tâche assignée', corps_notif, url_notif)
  returning id into notif_id;

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
      'profilIds', jsonb_build_array(new.assigne_id),
      'notificationId', notif_id
    )
  );

  return new;
end;
$$;

create or replace function notifier_tache_non_assignee()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  url_notif text;
  mapping_notifs jsonb;
begin
  url_notif := '/liaison?onglet=taches&tache=' || new.id;

  with lignes_inserees as (
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
      and (new.created_by is null or a.profil_id <> new.created_by)
    returning id, profil_id
  )
  select jsonb_agg(jsonb_build_object('profilId', profil_id, 'notificationId', id))
  into mapping_notifs
  from lignes_inserees;

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
      'exclureProfilIds', case
        when new.created_by is not null then jsonb_build_array(new.created_by)
        else '[]'::jsonb
      end,
      'notificationIds', coalesce(mapping_notifs, '[]'::jsonb)
    )
  );

  return new;
end;
$$;
