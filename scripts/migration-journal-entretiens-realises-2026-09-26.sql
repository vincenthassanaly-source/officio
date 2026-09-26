-- Migration : journal manuel des entretiens réalisés
-- Date : 2026-09-26
-- Contexte : le module "Entretiens pharmaceutiques" ne garde que le protocole
-- par type (types_entretien, entretien_items, entretien_documents) depuis
-- migration-suppression-entretien-realises-2026-09-17.sql (suppression des
-- tables entretien_realises / entretien_realise_reponses, avec réponses par
-- item et statistiques). entretien_journal est une fonctionnalité différente
-- et volontairement minimale : un simple journal manuel (date + patient +
-- type), sans lien avec les items du protocole ni aucune statistique de
-- réalisation.

create table public.entretien_journal (
  id uuid primary key default gen_random_uuid(),
  officine_id uuid not null references public.officines(id),
  type_entretien_id uuid not null references public.types_entretien(id) on delete restrict,
  patient_nom text not null,
  date_entretien date not null default current_date,
  realise_par_id uuid references public.profils(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.entretien_journal enable row level security;

create policy "voir les entrees de journal de mes officines"
  on public.entretien_journal
  for select
  using (est_membre(officine_id));

create policy "creer une entree de journal dans une de mes officines"
  on public.entretien_journal
  for insert
  with check (est_membre(officine_id));

create policy "modifier une entree de journal de mes officines"
  on public.entretien_journal
  for update
  using (est_membre(officine_id));

create policy "supprimer une entree de journal de mes officines"
  on public.entretien_journal
  for delete
  using (est_membre(officine_id));
