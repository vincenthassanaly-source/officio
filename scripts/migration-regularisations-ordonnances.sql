-- Module "Régularisation ordonnances" — suivi des ordonnances à régulariser
-- (facturation différée) pour l'équipe officine. Contient des données
-- patient nominatives (nom, prénom) ; hébergement Supabase actuel accepté
-- en connaissance de cause par le titulaire (pas de disclaimer UI requis
-- pour ce module, contrairement au module CNO).
create table regularisations_ordonnances (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references officines(id) on delete cascade,
  patient_nom text not null,
  patient_prenom text not null,
  date_ordonnance date not null,
  date_regularisation date not null,
  statut text not null default 'a_faire' check (statut in ('a_faire', 'facture')),
  note text,
  cree_par uuid references profils(id),
  facture_par uuid references profils(id),
  facture_le timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table regularisations_ordonnances enable row level security;

-- Même pattern que la table `contacts` : n'importe quel membre de
-- l'officine peut voir/ajouter/modifier/supprimer (pas de restriction par
-- auteur).
create policy "regularisations_ordonnances_select" on regularisations_ordonnances
  for select using (est_membre(officine_id));

create policy "regularisations_ordonnances_insert" on regularisations_ordonnances
  for insert with check (est_membre(officine_id));

create policy "regularisations_ordonnances_update" on regularisations_ordonnances
  for update using (est_membre(officine_id));

create policy "regularisations_ordonnances_delete" on regularisations_ordonnances
  for delete using (est_membre(officine_id));

-- Vue liste (tri par date de régularisation) et vue calendrier mensuelle.
create index regularisations_ordonnances_date_regularisation_idx
  on regularisations_ordonnances (officine_id, date_regularisation);

-- Section "En retard" / filtre par statut.
create index regularisations_ordonnances_statut_idx
  on regularisations_ordonnances (officine_id, statut);
