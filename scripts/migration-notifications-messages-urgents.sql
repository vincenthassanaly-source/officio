-- Déclencheur : message urgent → notification push à toute l'officine
-- (sauf l'auteur), via l'edge function send-push (fondations posées dans
-- scripts/migration-notifications.sql).
--
-- Choix : trigger Postgres + pg_net plutôt qu'un Database Webhook créé via
-- le dashboard Supabase. Les deux reposent sur le même mécanisme sous le
-- capot (pg_net), mais le dashboard produit une configuration qui ne vit
-- nulle part dans ce repo — quelqu'un lisant le code ne verrait jamais
-- qu'un message urgent déclenche une notification. Un trigger SQL tracké
-- ici est reproductible (migration rejouable), versionné, et garde toute
-- la logique de construction du payload (titre avec le prénom de l'auteur,
-- corps tronqué) au même endroit que le reste du schéma. pg_net n'était pas
-- encore activé sur ce projet (vérifié avant d'écrire ce fichier).
create extension if not exists pg_net;

-- SECURITY DEFINER (comme est_membre()) : le trigger doit pouvoir lire
-- profils au-delà de ce que l'auteur du message peut voir via RLS (même si
-- ici il ne lit que son propre profil) et appeler net.http_post, dont
-- l'exécution n'est pas garantie pour le rôle authenticated selon la
-- configuration de l'extension.
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

  -- Le jeton utilisé ici est la clé publishable (anon), pas service_role :
  -- send-push exige seulement un JWT Supabase valide (verify_jwt=true) et
  -- utilise en interne sa propre clé service_role pour lire au-delà d'un
  -- seul utilisateur (voir supabase/functions/send-push/index.ts). La clé
  -- publishable est déjà publique par conception (embarquée côté client
  -- via NEXT_PUBLIC_SUPABASE_ANON_KEY) : l'écrire ici n'introduit aucun
  -- secret nouveau, contrairement à service_role qui n'aurait dû être
  -- stockée que via Supabase Vault.
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

  return new;
end;
$$;

-- Toute la logique de ciblage (membres de l'officine, préférences
-- messages_urgents en opt-out, abonnements existants) est déjà gérée par
-- send-push lui-même : le trigger n'a qu'à lui passer officine_id +
-- l'auteur à exclure. Un échec HTTP (pg_net est asynchrone, ne bloque
-- jamais la transaction) ou une erreur d'un abonnement individuel dans
-- send-push ne remonte jamais jusqu'ici — l'insertion du message ne peut
-- pas échouer à cause d'un souci de notification.
create trigger messages_urgent_push
  after insert on messages
  for each row
  when (new.categorie = 'urgent')
  execute function notifier_message_urgent();
