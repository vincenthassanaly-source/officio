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

-- Données d'exemple pour test uniquement (4 lignes) — PAS le contenu
-- définitif. Le contenu complet/à jour du calendrier vaccinal sera fourni et
-- inséré séparément ; ces lignes pourront être conservées, complétées ou
-- supprimées à ce moment-là.
insert into vaccins
  (nom_commercial, valences, schema_vaccinal, statut, conditions_prescription, remboursement, cas_particuliers, source, date_maj)
values
  (
    'Infanrix Hexa',
    array['Diphtérie', 'Tétanos', 'Coqueluche', 'Poliomyélite', 'Haemophilus influenzae b', 'Hépatite B'],
    '3 doses : 2 mois, 4 mois, puis rappel à 11 mois (schéma 2+1).',
    'obligatoire',
    'Prescription et injection possibles en pharmacie par un pharmacien formé, selon les conditions en vigueur pour les mineurs de plus de 11 ans et adultes ; nourrissons pris en charge en centre de vaccination ou par le médecin/la sage-femme.',
    'Pris en charge à 65 % par l’Assurance Maladie, le reste par la mutuelle.',
    'Report possible en cas de fièvre ou maladie aiguë au moment de l’injection ; se référer au carnet de santé pour le rattrapage.',
    'Calendrier des vaccinations 2026, Ministère de la Santé',
    '2026-01-01'
  ),
  (
    'M-M-RVAXPRO',
    array['Rougeole', 'Oreillons', 'Rubéole'],
    '2 doses : 12 mois, puis 16-18 mois.',
    'obligatoire',
    'Prescription et injection possibles en pharmacie par un pharmacien formé pour les personnes de 11 ans et plus.',
    'Pris en charge à 65 % par l’Assurance Maladie, le reste par la mutuelle.',
    'Contre-indiqué en cas de grossesse (vaccin vivant atténué) ; à éviter aussi en cas d’immunodépression sévère — orienter vers le médecin traitant.',
    'Calendrier des vaccinations 2026, Ministère de la Santé',
    '2026-01-01'
  ),
  (
    'Gardasil 9',
    array['Papillomavirus humains (HPV) 6, 11, 16, 18, 31, 33, 45, 52, 58'],
    '2 doses espacées de 6 à 13 mois entre 11 et 14 ans ; 3 doses (schéma 0-2-6 mois) si débuté entre 15 et 19 ans révolus.',
    'recommandé',
    'Prescription et injection possibles en pharmacie par un pharmacien formé pour les personnes de 11 ans et plus.',
    'Pris en charge à 65 % par l’Assurance Maladie, le reste par la mutuelle.',
    'Rattrapage recommandé jusqu’à 19 ans révolus ; jusqu’à 26 ans pour les hommes ayant des relations sexuelles avec des hommes.',
    'Calendrier des vaccinations 2026, Ministère de la Santé',
    '2026-01-01'
  ),
  (
    'Efluelda',
    array['Grippe saisonnière (dose renforcée)'],
    '1 dose annuelle, en amont de la saison hivernale (généralement dès début octobre).',
    'recommandé',
    'Prescription et injection possibles en pharmacie par un pharmacien, notamment dans le cadre de la campagne de vaccination antigrippale annuelle.',
    'Pris en charge à 100 % pour les publics ciblés par la campagne (65 ans et plus, personnes à risque, femmes enceintes, entourage de nourrissons à risque) ; 65 % sinon.',
    'Formulation à dose renforcée réservée aux personnes de 65 ans et plus ; se référer aux recommandations de la campagne en cours pour les autres publics.',
    'Calendrier des vaccinations 2026, Ministère de la Santé',
    '2026-01-01'
  );
