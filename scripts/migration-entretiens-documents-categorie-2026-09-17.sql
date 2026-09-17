-- Ajoute une catégorisation aux documents d'entretien pharmaceutique
-- (entretien_documents), même pattern que documents.categorie /
-- contacts.categorie (colonne text + CHECK sur un petit enum).
--
-- entretien_documents contient 0 ligne à ce jour : NOT NULL DEFAULT
-- 'autre' est donc sans risque et cohérent avec la contrainte des tables
-- soeurs, sans backfill à faire.
--
-- Valeurs retenues (à valider par Vincent — voir RAPPORT de session) :
--   support_patient  — support remis/laissé au patient
--   fiche_suivi      — fiche de suivi de l'entretien
--   affiche_support  — affiche ou support de communication officine
--   autre            — tout le reste (valeur par défaut)
--
-- Append-only, appliqué via Supabase MCP execute_sql sur le projet
-- hjerdcehdzfjhzefnnel, suivi d'un get_advisors (aucune nouvelle
-- catégorie d'alerte attendue).

alter table entretien_documents add column if not exists categorie text not null default 'autre';

alter table entretien_documents add constraint entretien_documents_categorie_check
  check (categorie = any (array['support_patient', 'fiche_suivi', 'affiche_support', 'autre']));

comment on column entretien_documents.categorie is
  'Catégorie du document : support_patient, fiche_suivi, affiche_support, autre (défaut).';

create or replace function public.ajouter_document_entretien(
  p_type_entretien_id uuid,
  p_officine_id uuid,
  p_nom text,
  p_chemin_stockage text,
  p_type_fichier text,
  p_taille_octets bigint,
  p_categorie text default 'autre'
)
returns entretien_documents
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  nouvelle_ligne entretien_documents;
begin
  if not est_membre(p_officine_id) then
    raise exception 'Non autorisé.';
  end if;

  if not exists (
    select 1 from types_entretien
    where id = p_type_entretien_id and officine_id = p_officine_id
  ) then
    raise exception 'Type d''entretien introuvable pour cette officine.';
  end if;

  insert into entretien_documents (
    type_entretien_id, officine_id, nom, chemin_stockage, type_fichier, taille_octets, ajoute_par, categorie
  )
  values (
    p_type_entretien_id, p_officine_id, p_nom, p_chemin_stockage, p_type_fichier, p_taille_octets, auth.uid(), coalesce(p_categorie, 'autre')
  )
  returning * into nouvelle_ligne;

  return nouvelle_ligne;
end;
$function$;
