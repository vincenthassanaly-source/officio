-- Étend la portée documentée du champ entretien_items.etape à la section
-- "questions" (en plus de "methodologie"). Purement déclaratif : la
-- contrainte CHECK existante (4 valeurs) et les données actuelles ne
-- changent pas — les items de facturation restent à etape = NULL.
--
-- Append-only, appliqué via Supabase MCP execute_sql sur le projet
-- hjerdcehdzfjhzefnnel, suivi d'un get_advisors (aucune nouvelle
-- catégorie d'alerte attendue).

comment on column entretien_items.etape is
  'Sous-étape de regroupement pour l''affichage, pertinente pour les sections methodologie et questions (NULL = contenu général/non séquencé). Valeurs : annee1_entretien1, annee1_entretien2, annee1_entretien3, annees_suivantes. Toujours NULL pour section = facturation.';
