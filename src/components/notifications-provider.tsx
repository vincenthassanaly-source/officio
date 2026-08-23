'use client'

import { createContext, startTransition, useContext, useState, type ReactNode } from 'react'
import { getNotificationsFraiches } from '@/app/actions/notifications'
import type { NotificationInApp } from '@/lib/data/notifications'

type EtatNotifications = {
  notifications: NotificationInApp[]
  nombreNonLues: number
}

type ContexteNotifications = EtatNotifications & {
  rafraichir: () => void
}

const Contexte = createContext<ContexteNotifications | null>(null)

// AppLayout (src/app/(app)/layout.tsx) reste la seule source des données
// initiales (rendu serveur, à chaque navigation ou après une action comme
// marquerNotificationLue → revalidatePath). Ce provider ne fait que
// permettre de rafraîchir isolément le fil de notifications ensuite — ex:
// EcouteurRepriseApp au retour au premier plan de l'app — sans passer par
// `router.refresh()`, qui re-exécuterait aussi le reste d'AppLayout
// (adhésions, profil actif, couleurs équipe) alors que ces données-là
// changent rarement en cours de session.
//
// `override` ne contient un résultat que suite à un appel à `rafraichir()` ;
// tant qu'AppLayout n'a pas refourni de nouvelles props, il prévaut sur
// elles. Dès que les props changent (nouveau rendu serveur), on les
// resynchronise directement pendant le rendu plutôt que dans un effet (voir
// "Adjusting state when a prop changes" dans la doc React) : elles
// redeviennent alors la source de vérité.
export function NotificationsProvider({
  notifications,
  nombreNonLues,
  children,
}: EtatNotifications & { children: ReactNode }) {
  const [propsVues, setPropsVues] = useState({ notifications, nombreNonLues })
  const [override, setOverride] = useState<EtatNotifications | null>(null)

  if (propsVues.notifications !== notifications || propsVues.nombreNonLues !== nombreNonLues) {
    setPropsVues({ notifications, nombreNonLues })
    setOverride(null)
  }

  function rafraichir() {
    startTransition(() => {
      getNotificationsFraiches().then(setOverride)
    })
  }

  return (
    <Contexte.Provider value={{ ...(override ?? { notifications, nombreNonLues }), rafraichir }}>
      {children}
    </Contexte.Provider>
  )
}

export function useNotificationsInApp() {
  const contexte = useContext(Contexte)
  if (!contexte) throw new Error('useNotificationsInApp doit être utilisé sous NotificationsProvider')
  return contexte
}
