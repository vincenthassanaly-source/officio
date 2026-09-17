-- Migration : suppression du suivi patient par patient des entretiens pharmaceutiques
-- Date : 2026-09-17
-- Contexte : le module "Entretiens pharmaceutiques" conserve uniquement la fiche
-- protocole par type (types_entretien, entretien_items, entretien_documents).
-- Le suivi individuel des entretiens réalisés (entretien_realises,
-- entretien_realise_reponses) et ses fonctions RPC associées sont supprimés.
-- Vérifié via Supabase MCP (list_tables verbose) avant écriture : les deux
-- tables sont vides (0 lignes) sur le projet hjerdcehdzfjhzefnnel.

drop table if exists public.entretien_realise_reponses cascade;
drop table if exists public.entretien_realises cascade;

drop function if exists public.creer_entretien_realise(
  p_type_entretien_id uuid,
  p_officine_id uuid,
  p_patient_nom text,
  p_patient_prenom text,
  p_annee_accompagnement text,
  p_numero_entretien integer,
  p_date_entretien date
);

drop function if exists public.modifier_entretien_realise(
  p_id uuid,
  p_patient_nom text,
  p_patient_prenom text,
  p_annee_accompagnement text,
  p_numero_entretien integer,
  p_date_entretien date
);

drop function if exists public.modifier_notes_entretien_realise(
  p_id uuid,
  p_notes text
);

drop function if exists public.supprimer_entretien_realise(
  p_id uuid
);

drop function if exists public.definir_reponse_entretien_realise(
  p_entretien_realise_id uuid,
  p_item_id uuid,
  p_statut text
);
