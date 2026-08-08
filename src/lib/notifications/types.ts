// Catégories de notification — à garder synchronisées avec la contrainte
// CHECK de notification_preferences (scripts/migration-notifications.sql).
// Certaines catégories ne sont pas encore déclenchées par du code métier :
// elles existent dès maintenant pour que le centre de préférences soit
// complet, les déclencheurs réels arrivent dans des prompts suivants.
export type CategorieNotification =
  | 'messages_urgents'
  | 'taches_assignees'
  | 'taches_echeance'
  | 'agenda_rappel'

export const CATEGORIES_NOTIFICATION: {
  value: CategorieNotification
  label: string
  description: string
}[] = [
  {
    value: 'messages_urgents',
    label: 'Messages urgents',
    description: 'Nouveau message marqué « Urgent » dans le Cahier de liaison.',
  },
  {
    value: 'taches_assignees',
    label: 'Tâches assignées',
    description: "Une tâche t'est assignée par un collègue.",
  },
  {
    value: 'taches_echeance',
    label: 'Échéances de tâches',
    description: "Rappel quand une de tes tâches arrive à échéance.",
  },
  {
    value: 'agenda_rappel',
    label: 'Rappels de rendez-vous',
    description: "Rappel avant un rendez-vous à l'agenda.",
  },
]
