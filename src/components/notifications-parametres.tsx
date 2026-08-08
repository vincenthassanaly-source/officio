'use client'

import { useEffect, useState, useTransition } from 'react'
import { definirPreferenceNotification } from '@/app/actions/notifications'
import {
  activerNotificationsPush,
  desactiverNotificationsPush,
  estIOS,
  estModeStandalone,
  notificationsActivesSurCetAppareil,
} from '@/lib/notifications/client'
import { CATEGORIES_NOTIFICATION, type CategorieNotification } from '@/lib/notifications/types'
import type { PreferenceNotification } from '@/lib/data/notifications'

export function NotificationsParametres({
  preferences: preferencesInitiales,
}: {
  preferences: PreferenceNotification[]
}) {
  const [preferences, setPreferences] = useState(preferencesInitiales)
  const [actif, setActif] = useState<boolean | null>(null)
  const [erreur, setErreur] = useState<string | null>(null)
  const [iosSansStandalone, setIosSansStandalone] = useState(false)
  const [pendingCategorie, setPendingCategorie] = useState<CategorieNotification | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    // Détection côté client uniquement (navigator/window indisponibles côté
    // serveur) — évite un décalage d'hydratation en gardant le premier
    // rendu identique serveur/client.
    Promise.resolve().then(() => setIosSansStandalone(estIOS() && !estModeStandalone()))
    notificationsActivesSurCetAppareil().then(setActif)
  }, [])

  function toggleActivation() {
    setErreur(null)
    startTransition(async () => {
      if (actif) {
        await desactiverNotificationsPush()
        setActif(false)
        return
      }

      const resultat = await activerNotificationsPush()
      if (resultat.succes) {
        setActif(true)
      } else {
        setErreur(resultat.erreur)
      }
    })
  }

  function togglePreference(categorie: CategorieNotification, valeurActuelle: boolean) {
    setPendingCategorie(categorie)
    setPreferences((p) =>
      p.map((pref) => (pref.categorie === categorie ? { ...pref, active: !valeurActuelle } : pref))
    )
    startTransition(async () => {
      await definirPreferenceNotification(categorie, !valeurActuelle)
      setPendingCategorie(null)
    })
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-4">
      <div>
        <h2 className="font-heading text-lg text-ink">Notifications</h2>
        <p className="mt-0.5 text-[12.5px] text-muted">Reçois des alertes même quand Officio est fermé.</p>
      </div>

      {iosSansStandalone ? (
        <p className="rounded-xl bg-accent-soft px-3.5 py-3 text-[13px] leading-relaxed text-accent">
          Sur iPhone/iPad, ajoute d&rsquo;abord Officio à ton écran d&rsquo;accueil (bouton Partager de
          Safari → « Sur l&rsquo;écran d&rsquo;accueil ») pour pouvoir activer les notifications.
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={toggleActivation}
            disabled={isPending || actif === null}
            className={`self-start rounded-xl px-4 py-2.5 text-[13.5px] font-semibold disabled:opacity-60 ${
              actif ? 'border border-border text-muted' : 'bg-primary text-white'
            }`}
          >
            {actif === null
              ? 'Vérification…'
              : actif
                ? 'Désactiver sur cet appareil'
                : 'Activer sur cet appareil'}
          </button>
          {erreur && <p className="text-[12px] font-medium text-rec">{erreur}</p>}
        </div>
      )}

      <div className="flex flex-col divide-y divide-border border-t border-border">
        {CATEGORIES_NOTIFICATION.map((cat) => {
          const pref = preferences.find((p) => p.categorie === cat.value)
          const active = pref?.active ?? true
          return (
            <div key={cat.value} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <div className="text-[13.5px] font-semibold text-ink">{cat.label}</div>
                <div className="mt-0.5 text-[11.5px] leading-snug text-muted">{cat.description}</div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={active}
                aria-label={cat.label}
                disabled={pendingCategorie === cat.value}
                onClick={() => togglePreference(cat.value, active)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
                  active ? 'bg-primary' : 'bg-neutral-soft'
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-all ${
                    active ? 'left-[22px]' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
