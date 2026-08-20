-- Module "Grossesse & allaitement" — index léger BDPM (nom de médicament ->
-- lien direct vers sa fiche officielle), synchronisé chaque semaine depuis
-- le fichier ouvert CIS_bdpm.txt par /api/cron/sync-bdpm — voir
-- scripts/RAPPORT-grossesse-allaitement-2026-08-20.md pour le mapping des
-- colonnes réellement présentes dans ce fichier (pas de colonne "Lien BDPM"
-- littérale : le lien est reconstruit à partir du CIS).
--
-- Comme `vaccins`, cette table N'A PAS de colonne officine_id : le
-- référentiel médicaments (BDPM) est identique pour toutes les officines,
-- donc partagé entre tous les tenants plutôt que dupliqué. Aucune donnée
-- patient, et surtout aucun verdict de compatibilité grossesse/allaitement
-- calculé ou stocké ici — uniquement de quoi retrouver la fiche officielle,
-- à charge du pharmacien de la consulter.
create table bdpm_index (
  cis text primary key,
  denomination text not null,
  lien_bdpm text not null,
  forme_pharmaceutique text,
  updated_at timestamptz not null default now()
);

alter table bdpm_index enable row level security;

-- Lecture ouverte à tout utilisateur authentifié, quelle que soit son
-- officine (même logique que vaccins_select). Volontairement PAS de policy
-- insert/update/delete : l'écriture se fait uniquement via le cron
-- /api/cron/sync-bdpm, qui utilise le client service_role (contourne RLS) —
-- jamais depuis l'app.
create policy "bdpm_index_select" on bdpm_index
  for select using (auth.role() = 'authenticated');
