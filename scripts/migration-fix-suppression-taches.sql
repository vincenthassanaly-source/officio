-- Corrige la suppression des tâches, même bug que scripts/migration-fix-suppression-messages.sql :
-- la table `taches` a RLS activé mais n'avait que INSERT/SELECT/UPDATE, pas
-- de policy DELETE. supprimerTache() dans src/app/actions/taches.ts appelait
-- bien `.delete()`, mais RLS bloquait silencieusement (0 ligne affectée,
-- aucune erreur) — le bouton "×" semblait fonctionner mais ne supprimait rien.
--
-- Contrairement à messages/suggestions (auteur uniquement), les tâches sont
-- une liste d'équipe partagée : la policy UPDATE existante autorise déjà
-- n'importe quel membre à cocher/décocher une tâche assignée à quelqu'un
-- d'autre (est_membre(officine_id), pas de vérification created_by), et
-- l'UI (taches-list.tsx) affiche le bouton de suppression à tout le monde
-- sans distinction d'auteur. La policy DELETE suit donc le même modèle que
-- UPDATE, pas le modèle "auteur uniquement" de messages/suggestions.
create policy "supprimer une tache de mes officines" on taches
  for delete using (est_membre(officine_id));
