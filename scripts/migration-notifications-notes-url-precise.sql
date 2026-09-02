-- Enrichit l'url stockée dans `notifications` (et transmise à send-push)
-- pour la catégorie `notes`, qui pointait jusqu'ici vers '/notes' sans
-- référence à la note précise — même limitation déjà corrigée pour
-- messages/taches_assignees/taches_non_assignees dans scripts/migration-
-- notifications-urls-precises.sql. Résultat avant ce correctif : cliquer sur
-- une notification de nouvelle note n'amenait jamais à la note concernée, et
-- sur /notes le clic ne produisait visiblement rien (router.push vers la
-- même URL).
--
-- Nouveau format : notes -> /notes?note=<id>
--
-- Append-only : recrée la fonction active en base (create or replace, même
-- nom -> le trigger existant s'y raccroche automatiquement) plutôt que de
-- modifier scripts/migration-notifications-notes.sql, déjà appliquée.

-- Reprend le corps de notifier_nouvelle_note() (scripts/migration-
-- notifications-notes.sql), seule la valeur de 'url' change.
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

  url_notif := '/notes?note=' || new.id;

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
    url_notif
  from adhesions a
  where a.officine_id = new.officine_id
    and a.profil_id <> new.auteur_id;

  return new;
end;
$$;
