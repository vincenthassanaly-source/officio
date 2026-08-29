-- Message vocal optionnel dans le Cahier de liaison (module Messages), sur
-- le modèle de la photo optionnelle des tâches (scripts/migration-taches-
-- photo.sql) : bucket privé dédié, policies storage.objects filtrées par
-- est_membre() sur le premier segment du chemin (officine_id).
alter table messages add column audio_chemin_stockage text;

insert into storage.buckets (id, name, public) values ('messages-audio', 'messages-audio', false);

create policy "deposer des audios de messages dans mes officines" on storage.objects
  for insert with check (bucket_id = 'messages-audio' and est_membre(((storage.foldername(name))[1])::uuid));

create policy "voir les audios de messages de mes officines" on storage.objects
  for select using (bucket_id = 'messages-audio' and est_membre(((storage.foldername(name))[1])::uuid));

-- Comme pour taches-photos (et contrairement à documents) : nécessaire à la
-- fois pour le rollback sur échec d'insert (envoyerMessage) et pour un futur
-- nettoyage du fichier à la suppression du message.
create policy "supprimer les audios de messages de mes officines" on storage.objects
  for delete using (bucket_id = 'messages-audio' and est_membre(((storage.foldername(name))[1])::uuid));

-- Un message uniquement vocal (contenu vide, cf. envoyerMessage) a désormais
-- un corps de notification de repli distinct, plutôt que de notifier avec un
-- corps vide. Reprend telle quelle la version actuellement active de
-- notifier_nouveau_message() (scripts/migration-notifications-urls-
-- precises.sql, vérifiée en base avant d'écrire ce fichier) : seule la
-- construction de corps_tronque change. Append-only comme les migrations de
-- notifications précédentes (create or replace, même nom -> le trigger
-- messages_push existant s'y raccroche automatiquement).
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
