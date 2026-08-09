-- Élargit les notifications de messages à TOUS les messages du cahier de
-- liaison (pas seulement ceux marqués 'urgent'), avec un titre différent
-- selon le cas. Étend aussi le mécanisme aux tâches créées sans assigné
-- (voir plus bas dans ce fichier).
--
-- Catégorie de préférence — décision : renommer 'messages_urgents' en
-- 'messages' (migration des lignes existantes), plutôt que d'introduire une
-- nouvelle catégorie à côté de l'ancienne.
--
-- Pourquoi un renommage et pas une catégorie séparée : le déclencheur ne
-- concerne plus seulement les messages urgents — garder le nom
-- 'messages_urgents' pour un événement qui couvre maintenant tous les
-- messages serait trompeur pour quiconque relit le schéma plus tard.
-- Introduire à la place une catégorie 'messages' séparée, en laissant
-- 'messages_urgents' inutilisée dans la contrainte, aurait un effet de bord
-- silencieux et indésirable : le modèle est opt-out (voir
-- src/lib/notifications/preferences.ts, `estActive`) — une catégorie sans
-- ligne de préférence est active par défaut. Un utilisateur ayant
-- désactivé 'messages_urgents' se serait retrouvé, sans le savoir et sans
-- action de sa part, à recevoir la notification de TOUS les messages (plus
-- fréquente), puisque son opt-out ne s'appliquerait plus à rien. Un vrai
-- renommage avec migration des lignes existantes préserve le choix de
-- chacun. Au moment d'écrire cette migration, `notification_preferences` et
-- `notifications` sont vides (vérifié via execute_sql — aucun utilisateur
-- réel n'a encore de préférence enregistrée) : 0 ligne concernée en
-- pratique, mais la migration reste écrite proprement pour rester correcte
-- si ce n'était plus le cas.
--
-- Les contraintes CHECK sont retirées ici et réintroduites à la toute fin
-- de ce fichier (avec la liste finale des catégories, 'messages' +
-- 'taches_non_assignees' inclus) pour ne jamais avoir un état transitoire
-- où une valeur écrite par le code ci-dessous serait rejetée.
alter table notification_preferences drop constraint notification_preferences_categorie_check;
alter table notifications drop constraint notifications_categorie_check;

update notification_preferences set categorie = 'messages' where categorie = 'messages_urgents';
update notifications set categorie = 'messages' where categorie = 'messages_urgents';

-- Renommée depuis notifier_message_urgent() : elle ne se limite plus aux
-- messages urgents, un nom qui reste correct dans tous les cas est plus
-- clair pour la suite. Reprend le corps de la version la plus récente en
-- production (celle de scripts/migration-notifications-in-app-triggers.sql,
-- qui écrit aussi dans `notifications` pour le fil in-app), pas celle du
-- tout premier fichier de ce nom.
drop trigger messages_urgent_push on messages;
drop function notifier_message_urgent();

create function notifier_nouveau_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur_prenom text;
  corps_tronque text;
  titre_notif text;
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
      'url', '/liaison',
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
    '/liaison'
  from adhesions a
  where a.officine_id = new.officine_id
    and a.profil_id <> new.auteur_id;

  return new;
end;
$$;

-- Plus de `when (new.categorie = 'urgent')` : se déclenche sur tout insert.
create trigger messages_push
  after insert on messages
  for each row
  execute function notifier_nouveau_message();
