-- Volume à commander (mL), indépendant du volume_reference_ml utilisé pour
-- le prix. Renseigné uniquement quand l'huile est "à commander"/"en
-- commande" ; ne remplace ni ne modifie volume_reference_ml.
alter table huiles_essentielles add column volume_a_commander_ml integer null;
