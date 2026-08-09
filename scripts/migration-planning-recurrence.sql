-- Récurrence pour les créneaux du Planning équipe (src/components/agenda/planning-equipe.tsx).
--
-- Approche retenue : pas de table de séries récurrentes séparée. On génère
-- plusieurs lignes individuelles dans `plannings` au moment de la création
-- (une ligne = une occurrence, exactement comme aujourd'hui pour un créneau
-- ponctuel), reliées entre elles par `serie_id` uniquement quand elles
-- proviennent du même formulaire récurrent. Un créneau ponctuel garde
-- `serie_id` à NULL.
--
-- Pourquoi pas une vraie notion de série en base : `getPlannings` consulte
-- déjà le planning par simple plage de dates (WHERE date BETWEEN ...) —
-- générer les occurrences à la création laisse cette lecture strictement
-- inchangée, sans expansion virtuelle des règles de récurrence à la lecture
-- (pas de gestion d'exceptions, de fuseau horaire ou de fin de mois à
-- réimplémenter). `serie_id` sert uniquement à retrouver "les autres
-- créneaux de la même série" au moment de la suppression.
alter table plannings add column serie_id uuid;

comment on column plannings.serie_id is
  'Regroupe les occurrences générées ensemble par un créneau récurrent (voir creerCreneau). NULL pour un créneau ponctuel. Utilisé pour "supprimer toute la série" (DELETE ... WHERE serie_id = ...).';

create index if not exists plannings_serie_id_idx on plannings (serie_id) where serie_id is not null;
