-- Suivi d'envoi du rappel d'échéance (cron quotidien, voir
-- src/app/api/cron/rappels-taches/route.ts) : évite de renvoyer le même
-- rappel plusieurs fois si le cron est rejoué le même jour. NULL = jamais
-- envoyé. Une fois l'échéance passée (ou la tâche marquée faite), la
-- valeur ne sera plus jamais réévaluée pour cette tâche — pas besoin de la
-- réinitialiser.
alter table taches add column rappel_echeance_envoye_le date;
