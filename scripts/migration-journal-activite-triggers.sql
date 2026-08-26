-- Triggers de journalisation : un trigger AFTER INSERT/UPDATE/DELETE par
-- table métier concernée, chacun appelant journaliser_activite() (voir
-- scripts/migration-journal-activite.sql) avec un titre lisible en
-- français. SECURITY DEFINER (comme journaliser_activite elle-même) pour
-- pouvoir insérer dans journal_activite malgré l'absence de policy INSERT.
--
-- Résolution de l'auteur (p_profil_id) : le prompt d'origine demandait
-- d'utiliser la colonne d'auteur de la table quand elle existe (auteur_id /
-- created_by / cree_par / ajoute_par / uploaded_by), sinon auth.uid().
-- Décision prise en cours de route (voir RAPPORT) : pour un INSERT, la
-- colonne d'auteur (renseignée par l'app à la création) est prioritaire,
-- avec repli sur auth.uid() si elle est nulle. Pour un UPDATE/DELETE en
-- revanche, auth.uid() (qui agit réellement sur la ligne maintenant) est
-- prioritaire, avec repli sur la colonne d'auteur d'origine si auth.uid()
-- est nul (contexte cron/service_role) — plus fidèle à "l'auteur de
-- l'action" que la colonne figée à la création. Pour les tables sans
-- aucune colonne d'auteur (huiles_essentielles, cno_patients), auth.uid()
-- est utilisé directement et peut donc être null (cron), jamais en échec.
--
-- URL : seules `messages` et `rendez_vous` avaient une URL précisée dans le
-- prompt d'origine. Pour les autres modules, l'URL pointe vers la page de
-- liste du module (utile pour un clic depuis le fil) sur creation/
-- modification, et est laissée null sur suppression (la ligne ciblée
-- n'existe plus).

-- ============================================================
-- messages (liaison) — INSERT uniquement
-- ============================================================
create or replace function journal_message_cree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  auteur_prenom text;
  titre_journal text;
begin
  select split_part(nom_complet, ' ', 1) into auteur_prenom
  from profils
  where id = new.auteur_id;

  titre_journal := case
    when new.categorie = 'urgent' then 'Message urgent de ' || coalesce(auteur_prenom, 'un collègue')
    else 'Nouveau message de ' || coalesce(auteur_prenom, 'un collègue')
  end;

  perform journaliser_activite(
    new.officine_id,
    coalesce(new.auteur_id, auth.uid()),
    'liaison',
    'creation',
    titre_journal,
    '/liaison?onglet=fil&message=' || new.id
  );

  return new;
end;
$$;

drop trigger if exists journal_messages_insert on messages;
create trigger journal_messages_insert
  after insert on messages
  for each row execute function journal_message_cree();

-- ============================================================
-- taches — INSERT / UPDATE (changement de statut) / DELETE
-- ============================================================
create or replace function journal_tache_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  url_tache text;
begin
  if tg_op = 'INSERT' then
    url_tache := '/liaison?onglet=taches&tache=' || new.id;
    perform journaliser_activite(
      new.officine_id, coalesce(new.created_by, auth.uid()), 'taches', 'creation',
      'Tâche créée : ' || new.titre, url_tache
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.statut is distinct from old.statut then
      url_tache := '/liaison?onglet=taches&tache=' || new.id;
      if new.statut = 'fait' then
        perform journaliser_activite(
          new.officine_id, coalesce(auth.uid(), new.created_by), 'taches', 'modification',
          'Tâche terminée : ' || new.titre, url_tache
        );
      elsif new.statut = 'a_faire' then
        perform journaliser_activite(
          new.officine_id, coalesce(auth.uid(), new.created_by), 'taches', 'modification',
          'Tâche réouverte : ' || new.titre, url_tache
        );
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.created_by), 'taches', 'suppression',
      'Tâche supprimée : ' || old.titre, null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_taches_evenement on taches;
create trigger journal_taches_evenement
  after insert or update or delete on taches
  for each row execute function journal_tache_evenement();

-- ============================================================
-- rendez_vous (agenda) — INSERT / UPDATE / DELETE
-- ============================================================
create or replace function journal_rendez_vous_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.created_by, auth.uid()), 'agenda', 'creation', new.titre, '/agenda'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform journaliser_activite(
      new.officine_id, coalesce(auth.uid(), new.created_by), 'agenda', 'modification', new.titre, '/agenda'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.created_by), 'agenda', 'suppression', old.titre, '/agenda'
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_rendez_vous_evenement on rendez_vous;
create trigger journal_rendez_vous_evenement
  after insert or update or delete on rendez_vous
  for each row execute function journal_rendez_vous_evenement();

-- ============================================================
-- notes — INSERT / UPDATE / DELETE
-- ============================================================
create or replace function journal_note_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.auteur_id, auth.uid()), 'notes', 'creation', new.titre, '/notes'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform journaliser_activite(
      new.officine_id, coalesce(auth.uid(), new.auteur_id), 'notes', 'modification', new.titre, '/notes'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.auteur_id), 'notes', 'suppression', old.titre, null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_notes_evenement on notes;
create trigger journal_notes_evenement
  after insert or update or delete on notes
  for each row execute function journal_note_evenement();

-- ============================================================
-- suggestions — INSERT / UPDATE (passage de `fait` à true)
-- ============================================================
create or replace function journal_suggestion_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.auteur_id, auth.uid()), 'suggestions', 'creation',
      'Nouvelle suggestion', '/suggestions'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.fait = true and old.fait is distinct from new.fait then
      perform journaliser_activite(
        new.officine_id, coalesce(auth.uid(), new.auteur_id), 'suggestions', 'modification',
        'Suggestion traitée', '/suggestions'
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_suggestions_evenement on suggestions;
create trigger journal_suggestions_evenement
  after insert or update on suggestions
  for each row execute function journal_suggestion_evenement();

-- ============================================================
-- ruptures_stock — INSERT / DELETE
-- ============================================================
create or replace function journal_rupture_stock_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.cree_par, auth.uid()), 'ruptures_stock', 'creation',
      new.nom_produit, '/ruptures-stock'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.cree_par), 'ruptures_stock', 'suppression',
      old.nom_produit, null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_ruptures_stock_evenement on ruptures_stock;
create trigger journal_ruptures_stock_evenement
  after insert or delete on ruptures_stock
  for each row execute function journal_rupture_stock_evenement();

-- ============================================================
-- produits_a_recommander — INSERT / DELETE
-- ============================================================
create or replace function journal_produit_a_recommander_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.cree_par, auth.uid()), 'produits_a_recommander', 'creation',
      new.nom_produit, '/ruptures-stock'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.cree_par), 'produits_a_recommander', 'suppression',
      old.nom_produit, null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_produits_a_recommander_evenement on produits_a_recommander;
create trigger journal_produits_a_recommander_evenement
  after insert or delete on produits_a_recommander
  for each row execute function journal_produit_a_recommander_evenement();

-- ============================================================
-- pleins_rayon — INSERT uniquement
-- ============================================================
create or replace function journal_plein_rayon_cree()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform journaliser_activite(
    new.officine_id, coalesce(new.cree_par, auth.uid()), 'pleins_rayon', 'creation',
    coalesce(new.nom_produit, 'Produit sans nom') || ' (' || new.quantite || ')',
    '/pleins-rayon'
  );
  return new;
end;
$$;

drop trigger if exists journal_pleins_rayon_insert on pleins_rayon;
create trigger journal_pleins_rayon_insert
  after insert on pleins_rayon
  for each row execute function journal_plein_rayon_cree();

-- ============================================================
-- huiles_essentielles — INSERT / UPDATE (changement de statut)
-- Pas de colonne d'auteur sur cette table : profil_id = auth.uid()
-- directement (peut être null si appelé hors contexte authentifié).
-- ============================================================
create or replace function journal_huile_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  libelle_statut text;
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, auth.uid(), 'huiles_essentielles', 'creation',
      new.nom || ' ajoutée', '/huiles-essentielles'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.statut is distinct from old.statut then
      libelle_statut := case new.statut
        when 'en_stock' then 'En stock'
        when 'a_commander' then 'À commander'
        when 'en_commande' then 'En commande'
        else new.statut
      end;
      perform journaliser_activite(
        new.officine_id, auth.uid(), 'huiles_essentielles', 'modification',
        new.nom || ' : ' || libelle_statut, '/huiles-essentielles'
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_huiles_essentielles_evenement on huiles_essentielles;
create trigger journal_huiles_essentielles_evenement
  after insert or update on huiles_essentielles
  for each row execute function journal_huile_evenement();

-- ============================================================
-- fournisseurs — INSERT / UPDATE / DELETE
-- ============================================================
create or replace function journal_fournisseur_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.ajoute_par, auth.uid()), 'fournisseurs', 'creation',
      new.nom, '/fournisseurs'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform journaliser_activite(
      new.officine_id, coalesce(auth.uid(), new.ajoute_par), 'fournisseurs', 'modification',
      new.nom, '/fournisseurs'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.ajoute_par), 'fournisseurs', 'suppression',
      old.nom, null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_fournisseurs_evenement on fournisseurs;
create trigger journal_fournisseurs_evenement
  after insert or update or delete on fournisseurs
  for each row execute function journal_fournisseur_evenement();

-- ============================================================
-- documents — INSERT / DELETE
-- ============================================================
create or replace function journal_document_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.uploaded_by, auth.uid()), 'documents', 'creation',
      new.nom || ' ajouté', '/documents'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.uploaded_by), 'documents', 'suppression',
      old.nom || ' supprimé', null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_documents_evenement on documents;
create trigger journal_documents_evenement
  after insert or delete on documents
  for each row execute function journal_document_evenement();

-- ============================================================
-- contacts — INSERT / UPDATE / DELETE
-- ============================================================
create or replace function journal_contact_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.ajoute_par, auth.uid()), 'contacts', 'creation',
      new.nom, '/carnet'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    perform journaliser_activite(
      new.officine_id, coalesce(auth.uid(), new.ajoute_par), 'contacts', 'modification',
      new.nom, '/carnet'
    );
    return new;
  elsif tg_op = 'DELETE' then
    perform journaliser_activite(
      old.officine_id, coalesce(auth.uid(), old.ajoute_par), 'contacts', 'suppression',
      old.nom, null
    );
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_contacts_evenement on contacts;
create trigger journal_contacts_evenement
  after insert or update or delete on contacts
  for each row execute function journal_contact_evenement();

-- ============================================================
-- cno_patients (module 'cno') — INSERT / UPDATE (changement de
-- quantite_restante). Pas de colonne d'auteur sur cette table :
-- profil_id = auth.uid() directement.
-- ============================================================
create or replace function journal_cno_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, auth.uid(), 'cno', 'creation',
      'Fiche CNO créée : ' || new.nom_patient, '/suivi-cno'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.quantite_restante is distinct from old.quantite_restante then
      perform journaliser_activite(
        new.officine_id, auth.uid(), 'cno', 'modification',
        'CNO mis à jour : ' || new.nom_patient, '/suivi-cno'
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_cno_evenement on cno_patients;
create trigger journal_cno_evenement
  after insert or update on cno_patients
  for each row execute function journal_cno_evenement();

-- ============================================================
-- regularisations_ordonnances (module 'regularisations') — INSERT /
-- UPDATE (passage du statut à 'facture')
-- ============================================================
create or replace function journal_regularisation_evenement()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    perform journaliser_activite(
      new.officine_id, coalesce(new.cree_par, auth.uid()), 'regularisations', 'creation',
      'Régularisation créée : ' || new.patient_prenom || ' ' || new.patient_nom, '/regularisations'
    );
    return new;
  elsif tg_op = 'UPDATE' then
    if new.statut = 'facture' and old.statut is distinct from new.statut then
      perform journaliser_activite(
        new.officine_id, coalesce(auth.uid(), new.facture_par), 'regularisations', 'modification',
        'Régularisation facturée : ' || new.patient_prenom || ' ' || new.patient_nom, '/regularisations'
      );
    end if;
    return new;
  end if;
  return null;
end;
$$;

drop trigger if exists journal_regularisations_evenement on regularisations_ordonnances;
create trigger journal_regularisations_evenement
  after insert or update on regularisations_ordonnances
  for each row execute function journal_regularisation_evenement();
