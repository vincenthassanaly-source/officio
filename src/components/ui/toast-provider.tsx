'use client'

import { createContext, useCallback, useContext, useRef, useState } from 'react'

export type TypeToast = 'succes' | 'erreur' | 'info'

type Toast = {
  id: number
  type: TypeToast
  message: string
  enSortie: boolean
}

type ParametresToast = { type: TypeToast; message: string }

type ToastContextValue = {
  toast: (parametres: ParametresToast) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

// Succès/info : assez long pour être lu sans traîner. Erreur : plus long,
// le temps de comprendre ce qui a échoué (le texte est souvent plus dense).
const DUREE_PAR_TYPE: Record<TypeToast, number> = {
  succes: 3500,
  info: 3500,
  erreur: 5000,
}

// Même durée que l'animation d'entrée (voir .toast-entree/.toast-sortie
// dans globals.css) : le toast reste monté le temps de jouer la sortie
// avant d'être retiré de la liste.
const DUREE_ANIMATION_SORTIE = 180

const STYLE_PAR_TYPE: Record<TypeToast, string> = {
  succes: 'border-green/20 bg-green-soft text-green',
  erreur: 'border-rec/20 bg-rec-soft text-rec',
  info: 'border-primary/20 bg-primary-soft text-primary',
}

let prochainId = 0

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const minuteursAutoFermeture = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  const retirer = useCallback((id: number) => {
    const minuteur = minuteursAutoFermeture.current.get(id)
    if (minuteur) {
      clearTimeout(minuteur)
      minuteursAutoFermeture.current.delete(id)
    }
    setToasts((t) => t.map((toast) => (toast.id === id ? { ...toast, enSortie: true } : toast)))
    setTimeout(() => {
      setToasts((t) => t.filter((toast) => toast.id !== id))
    }, DUREE_ANIMATION_SORTIE)
  }, [])

  const toast = useCallback(
    ({ type, message }: ParametresToast) => {
      const id = prochainId++
      setToasts((t) => [...t, { id, type, message, enSortie: false }])
      const minuteur = setTimeout(() => retirer(id), DUREE_PAR_TYPE[type])
      minuteursAutoFermeture.current.set(id, minuteur)
    },
    [retirer]
  )

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(4.5rem+0.75rem+env(safe-area-inset-bottom))] z-[60] flex flex-col items-center gap-2 px-4 lg:inset-x-auto lg:bottom-6 lg:right-6 lg:items-end lg:px-0"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onFermer={() => retirer(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

function ToastItem({ toast, onFermer }: { toast: Toast; onFermer: () => void }) {
  return (
    <div
      role={toast.type === 'erreur' ? 'alert' : 'status'}
      className={`pointer-events-auto flex w-full max-w-sm items-start gap-2.5 rounded-2xl border px-4 py-3 shadow-card motion-reduce:animate-none ${
        toast.enSortie ? 'toast-sortie' : 'toast-entree'
      } ${STYLE_PAR_TYPE[toast.type]}`}
    >
      <p className="min-w-0 flex-1 text-[13.5px] font-medium leading-snug">{toast.message}</p>
      <button
        type="button"
        onClick={onFermer}
        aria-label="Fermer"
        className="shrink-0 text-current opacity-70 hover:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast doit être utilisé à l’intérieur d’un ToastProvider')
  return ctx.toast
}
