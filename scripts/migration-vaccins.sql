-- Module "Vaccins" — base de référence en lecture seule (schémas vaccinaux,
-- statut obligatoire/recommandé, conditions de prescription, remboursement).
-- Contrairement à tous les autres modules du projet (peremptions,
-- regularisations_ordonnances, contacts, chaussures_orthopediques…), cette
-- table N'A PAS de colonne officine_id : le contenu est identique pour
-- toutes les officines (calendrier vaccinal national), donc partagé entre
-- tous les tenants plutôt que dupliqué par officine.
--
-- Aucune donnée patient : ce n'est pas un module de suivi (pas de lien avec
-- cno_patients ni aucun autre module patient), uniquement une fiche de
-- référence consultable par l'équipe.
create table vaccins (
  id uuid primary key default gen_random_uuid(),
  nom_commercial text not null,
  valences text[] not null default '{}',
  schema_vaccinal text not null,
  statut text not null check (statut in ('obligatoire', 'recommandé')),
  conditions_prescription text not null,
  remboursement text not null,
  cas_particuliers text,
  source text not null,
  date_maj date not null,
  created_at timestamptz not null default now()
);

alter table vaccins enable row level security;

-- Lecture seule côté app : n'importe quel utilisateur authentifié (peu
-- importe l'officine, contrairement à est_membre(officine_id) utilisé
-- partout ailleurs) peut consulter la table. Volontairement PAS de policy
-- insert/update/delete — le contenu est peuplé et mis à jour manuellement en
-- SQL (voir le rapport scripts/RAPPORT-vaccins-2026-08-19.md pour la marche
-- à suivre), ~1x/an au rythme du calendrier vaccinal, jamais depuis l'app.
create policy "vaccins_select" on vaccins
  for select using (auth.role() = 'authenticated');

create index vaccins_nom_commercial_idx on vaccins (nom_commercial);

-- Le contenu (insert) vit dans un fichier séparé, scripts/migration-vaccins-donnees-2026.sql,
-- pour pouvoir être remplacé/mis à jour indépendamment du schéma — voir ce
-- fichier pour les données réelles (calendrier vaccinal 2026), déjà
-- appliquées à la base. Les 4 lignes d'exemple initialement prévues ici pour
-- test ont été retirées : le contenu réel a été fourni plus tôt que prévu et
-- inséré directement, sans étape de placeholder.
