-- Déclencheur : (nouvelle) assignation d'une tâche → notification push à la
-- seule personne assignée (pas toute l'officine), sauf auto-assignation.
-- Même mécanisme que scripts/migration-notifications-messages-urgents.sql
-- (trigger + pg_net, déjà activé).
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
  -- auth.uid() reste celui de l'appelant d'origine malgré SECURITY DEFINER
  -- (même comportement déjà vérifié pour est_membre()).
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
      -- Ciblage individuel : seule la personne assignée, jamais toute
      -- l'officine (contrairement au trigger messages urgents).
      'profilIds', jsonb_build_array(new.assigne_id)
    )
  );

  return new;
end;
$$;

create trigger taches_assignation_push
  after insert or update of assigne_id on taches
  for each row
  execute function notifier_tache_assignee();
