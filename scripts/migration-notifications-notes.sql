-- Notifications (push + fil in-app) à la création d'une note (module Notes,
-- src/app/actions/notes.ts, creerNote). Même modèle que
-- notifier_nouveau_message() (scripts/migration-notifications-messages-
-- elargies.sql) : trigger AFTER INSERT qui appelle net.http_post vers
-- l'edge function send-push ET insère directement dans `notifications`,
-- pour tous les membres de l'officine sauf l'auteur.
--
-- Contraintes CHECK retirées puis réintroduites en fin de fichier (avec la
-- liste finale des catégories, 'notes' incluse) pour ne jamais avoir d'état
-- transitoire où une valeur écrite ci-dessous serait rejetée — même
-- précaution que dans migration-notifications-messages-elargies.sql.
alter table notification_preferences drop constraint notification_preferences_categorie_check;
alter table notifications drop constraint notifications_categorie_check;

create function notifier_nouvelle_note()
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
begin
  select split_part(nom_complet, ' ', 1) into auteur_prenom
  from profils
  where id = new.auteur_id;

  titre_notif := 'Nouvelle note de ' || coalesce(auteur_prenom, 'un collègue');

  -- Le titre de la note est préfixé au corps (avant troncature) pour rester
  -- visible même si le contenu est long : "{titre} — {contenu}", tronqué à
  -- 100 caractères au total, comme corps_tronque dans
  -- notifier_nouveau_message().
  corps_brut := new.titre || ' — ' || new.contenu;
  corps_tronque := left(corps_brut, 100);
  if length(corps_brut) > 100 then
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
      'categorie', 'notes',
      'titre', titre_notif,
      'corps', corps_tronque,
      'url', '/notes',
      'exclureProfilIds', jsonb_build_array(new.auteur_id)
    )
  );

  -- Fil in-app : une ligne par membre de l'officine, sauf l'auteur.
  insert into notifications (officine_id, profil_id, categorie, titre, corps, url)
  select
    new.officine_id,
    a.profil_id,
    'notes',
    titre_notif,
    corps_tronque,
    '/notes'
  from adhesions a
  where a.officine_id = new.officine_id
    and a.profil_id <> new.auteur_id;

  return new;
end;
$$;

create trigger notes_push
  after insert on notes
  for each row
  execute function notifier_nouvelle_note();

-- Contraintes CHECK réintroduites avec 'notes' ajoutée à la liste. À garder
-- synchronisé avec src/lib/notifications/types.ts (CATEGORIES_NOTIFICATION)
-- et supabase/functions/send-push/index.ts (CATEGORIES_VALIDES).
alter table notification_preferences add constraint notification_preferences_categorie_check
  check (categorie in ('messages', 'taches_assignees', 'taches_echeance', 'agenda_rappel', 'taches_non_assignees', 'notes'));

alter table notifications add constraint notifications_categorie_check
  check (categorie in ('messages', 'taches_assignees', 'taches_echeance', 'agenda_rappel', 'taches_non_assignees', 'notes'));
