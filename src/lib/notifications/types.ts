// Catégories de notification — à garder synchronisées avec la contrainte
// CHECK de notification_preferences et notifications (scripts/migration-
// notifications-messages-elargies.sql, qui a le détail le plus récent) et
// avec CATEGORIES_VALIDES dans supabase/functions/send-push/index.ts.
export type CategorieNotification =
  | 'messages'
  | 'taches_assignees'
  | 'taches_non_assignees'
  | 'taches_echeance'
  | 'agenda_rappel'

export const CATEGORIES_NOTIFICATION: {
  value: CategorieNotification
  label: string
  description: string
}[] = [
  {
    value: 'messages',
    label: 'Messages',
    description: 'Nouveau message dans le Cahier de liaison (le titre précise « Urgent » le cas échéant).',
  },
  {
    value: 'taches_assignees',
    label: 'Tâches assignées',
    description: "Une tâche t'est assignée par un collègue.",
  },
  {
    value: 'taches_non_assignees',
    label: 'Tâches non assignées',
    description: "Une nouvelle tâche est créée sans être assignée à quelqu'un en particulier.",
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
