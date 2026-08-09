-- Statut "traité" sur les suggestions d'amélioration (voir
-- migration-suggestions.sql). Contrairement à la suppression (réservée à
-- l'auteur), cocher une suggestion comme faite doit être possible par
-- n'importe quel membre de l'équipe — d'où une policy UPDATE distincte,
-- absente jusqu'ici (aucune mise à jour n'était possible sur cette table).
alter table suggestions add column fait boolean not null default false;

create policy "suggestions_update" on suggestions
  for update using (est_membre(officine_id)) with check (est_membre(officine_id));
