-- Corrige la suppression des messages du Cahier de liaison.
--
-- La table `messages` a RLS activé mais n'avait jamais eu de policy DELETE
-- (seulement INSERT et SELECT) : supprimerMessage() dans
-- src/app/actions/liaison.ts appelait bien `.delete()`, mais RLS bloquait
-- silencieusement la suppression (0 ligne affectée, aucune erreur renvoyée)
-- — le bouton "Supprimer" semblait fonctionner mais ne supprimait rien.
--
-- L'auteur peut supprimer son propre message, comme pour l'INSERT
-- (auteur_id = auth.uid()). Les accusés de lecture (messages_lus) sont
-- nettoyés automatiquement par la contrainte messages_lus_message_id_fkey,
-- déjà en ON DELETE CASCADE : pas besoin de policy DELETE sur messages_lus.
create policy "supprimer ses propres messages" on messages
  for delete using (auteur_id = auth.uid());
