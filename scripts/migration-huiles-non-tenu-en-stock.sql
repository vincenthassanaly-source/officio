-- Ajout du statut `non_tenu_en_stock` (huile non tenue en stock), sans
-- créer de 4e onglet côté UI : cohabite avec `en_stock` sous un même
-- onglet "Huiles essentielles", distingué par un toggle interne.
--
-- 1) Contrainte CHECK sur huiles_essentielles.statut : définition
-- vérifiée au préalable via le MCP Supabase —
-- huiles_essentielles_statut_check = CHECK (statut = ANY (ARRAY['en_stock',
-- 'en_commande', 'a_commander'])). On la remplace pour inclure la 4e
-- valeur.
alter table huiles_essentielles drop constraint huiles_essentielles_statut_check;
alter table huiles_essentielles add constraint huiles_essentielles_statut_check
  check (statut = any (array['en_stock', 'en_commande', 'a_commander', 'non_tenu_en_stock']));

-- 2) Journal d'activité : libellé français pour le nouveau statut dans le
-- trigger journal_huile_evenement (scripts/migration-journal-activite-triggers.sql).
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
        when 'non_tenu_en_stock' then 'Non tenu en stock'
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
