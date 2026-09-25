-- Module "Promesses patients" — patients à rappeler quand un médicament en
-- rupture arrive enfin à l'officine. Indépendant du module "Ruptures de
-- stock" (aucune clé vers ruptures_stock) : l'équipe tape librement le nom
-- du médicament, au comptoir, sans devoir le rattacher à une rupture.
--
-- Données nominatives minimales, assumées pour ce module précis (usage
-- interne uniquement, infra non-HDS) : nom du patient, téléphone,
-- médicament attendu, statut de facturation, statut traité. Volontairement
-- AUCUN champ ordonnance, note libre ou historique de santé — ce n'est pas
-- un dossier patient (voir RAPPORT-module-promesses-patients-2026-09-25.md).
--
-- Même pattern RLS que ruptures_stock/suggestions : tout membre de
-- l'officine peut voir/créer/modifier/supprimer (pas de restriction par
-- auteur ni par rôle, la promesse appartient à l'équipe). Aucune écriture
-- n'étant réservée à un sous-ensemble de membres, pas de fonction
-- SECURITY DEFINER ici : la policy est_membre(officine_id) suffit.
create table promesses_patients (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  nom_medicament text not null check (length(btrim(nom_medicament)) between 1 and 200),
  nom_patient text not null check (length(btrim(nom_patient)) between 1 and 120),
  telephone_patient text not null check (length(telephone_patient) between 6 and 30),
  facture boolean not null default false,
  statut text not null default 'actif' check (statut in ('actif', 'traite')),
  cree_par uuid references profils(id) on delete set null,
  traite_par uuid references profils(id) on delete set null,
  created_at timestamptz not null default now(),
  traite_at timestamptz,
  -- traite_at n'a de sens que pour une promesse traitée, et l'est toujours.
  constraint promesses_patients_traite_at_coherent
    check ((statut = 'traite') = (traite_at is not null)),
  -- Colonne de recherche normalisée (minuscules, sans accents) : permet une
  -- recherche ilike insensible à la casse ET aux accents sans l'extension
  -- unaccent (absente du projet, et non IMMUTABLE donc inutilisable dans
  -- une colonne générée). translate() est IMMUTABLE ; œ/æ sont des
  -- ligatures à deux lettres, d'où les replace() dédiés. Le terme recherché
  -- est normalisé de la même façon côté serveur (normaliserRecherche).
  recherche text generated always as (
    replace(replace(translate(lower(nom_medicament || ' ' || nom_patient),
      'àâäáãåçéèêëíìîïñóòôöõúùûüýÿ', 'aaaaaaceeeeiiiinooooouuuuyy'),
      'œ', 'oe'), 'æ', 'ae')
  ) stored
);

alter table promesses_patients enable row level security;

create policy "promesses_patients_select" on promesses_patients
  for select using (est_membre(officine_id));

create policy "promesses_patients_insert" on promesses_patients
  for insert with check (est_membre(officine_id));

create policy "promesses_patients_update" on promesses_patients
  for update using (est_membre(officine_id)) with check (est_membre(officine_id));

create policy "promesses_patients_delete" on promesses_patients
  for delete using (est_membre(officine_id));

-- Liste "En attente" (statut = 'actif', plus ancienne d'abord) et
-- historique (statut = 'traite', plus récemment traitée d'abord).
create index promesses_patients_officine_statut_created_idx
  on promesses_patients (officine_id, statut, created_at);
create index promesses_patients_officine_traite_at_idx
  on promesses_patients (officine_id, traite_at desc) where statut = 'traite';

-- Index des clés étrangères vers profils (sinon signalées par l'advisor
-- "unindexed_foreign_keys").
create index promesses_patients_cree_par_idx on promesses_patients (cree_par);
create index promesses_patients_traite_par_idx on promesses_patients (traite_par);
