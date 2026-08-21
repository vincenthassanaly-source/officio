'use client'

import { useState, useTransition } from 'react'
import { IconLiaison, IconRegularisation } from '@/components/nav-icons'
import { ChampPhoto } from '@/components/champ-photo'
import { envoyerMessage } from '@/app/actions/liaison'
import { creerTache } from '@/app/actions/taches'
import { ajouterRegularisation } from '@/app/actions/regularisations'
import { ChampsFormulaire } from '@/components/regularisations-liste'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { toISODate } from '@/lib/dates'
import type { Categorie } from '@/lib/data/messages'
import type { MembreEquipe } from '@/lib/data/equipe'

type Vue = 'ferme' | 'menu' | 'message' | 'tache' | 'regularisation'

// Mêmes catégories/couleurs que le formulaire de fil-de-messages.tsx.
const CATEGORIES: { value: Categorie; label: string; className: string }[] = [
  { value: 'info', label: 'Info', className: 'bg-primary-soft text-primary' },
  { value: 'urgent', label: 'Urgent', className: 'bg-rec-soft text-rec' },
]

function IconPlus({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

// Même style que les icônes de nav-icons.tsx — pas de "tâche" existante là-bas
// (les tâches vivent dans un onglet du Cahier de liaison, pas un lien de nav).
function IconTache({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 12l2.5 2.5L16 9" />
    </svg>
  )
}

function MenuChoix({ onChoisir }: { onChoisir: (vue: 'message' | 'tache' | 'regularisation') => void }) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <div className="mb-1 text-center font-heading text-lg text-ink">Créer</div>
      <button
        type="button"
        onClick={() => onChoisir('message')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <IconLiaison className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouveau message</div>
          <div className="text-[11.5px] text-muted">Écrire au cahier de liaison</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChoisir('tache')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconTache className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouvelle tâche</div>
          <div className="text-[11.5px] text-muted">Assigner un rappel à l&rsquo;équipe</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChoisir('regularisation')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-soft text-purple">
          <IconRegularisation className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouvelle régularisation</div>
          <div className="text-[11.5px] text-muted">Enregistrer une ordonnance à régulariser</div>
        </div>
      </button>
    </div>
  )
}

function FormulaireMessage({ onEnvoye }: { onEnvoye: () => void }) {
  const [categorie, setCategorie] = useState<Categorie>('info')
  const [contenu, setContenu] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await envoyerMessage(formData)
          setContenu('')
          onEnvoye()
        })
      }}
      className="flex flex-col gap-3 p-4"
    >
      <div className="font-heading text-lg text-ink">Nouveau message</div>
      <div className="flex gap-1.5">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategorie(c.value)}
            className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
              categorie === c.value ? c.className : 'bg-bg text-muted'
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
      <input type="hidden" name="categorie" value={categorie} />
      <input
        name="contenu"
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        placeholder="Écrire une consigne à l'équipe…"
        className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={isPending || !contenu.trim()}
        className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        Envoyer
      </button>
    </form>
  )
}

function FormulaireTache({
  equipe,
  profilActuelId,
  onCree,
}: {
  equipe: MembreEquipe[]
  profilActuelId: string
  onCree: () => void
}) {
  const [photo, setPhoto] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        if (photo) formData.set('photo', photo)
        startTransition(async () => {
          await creerTache(formData)
          onCree()
        })
      }}
      className="flex flex-col gap-3 p-4"
    >
      <div className="font-heading text-lg text-ink">Nouvelle tâche</div>
      <input
        name="titre"
        required
        placeholder="Titre de la tâche"
        className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
      />
      <div className="flex gap-2">
        <select
          name="assigne_id"
          defaultValue=""
          className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        >
          <option value="">Non assignée (toute l&rsquo;équipe)</option>
          {equipe.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === profilActuelId ? 'Moi' : m.nom_complet}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="echeance"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        {/* Facultative : si renseignée, le rappel quotidien de 7h mentionne
            cette heure dans son message — voir
            src/app/api/cron/rappels-taches/route.ts. */}
        <input
          type="time"
          name="echeance_heure"
          className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
      </div>
      <ChampPhoto onChange={setPhoto} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        Ajouter la tâche
      </button>
    </form>
  )
}

function FormulaireRegularisation({ onCree }: { onCree: () => void }) {
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await ajouterRegularisation(formData)
          onCree()
        })
      }}
      className="flex flex-col gap-3 p-4"
    >
      <div className="font-heading text-lg text-ink">Nouvelle régularisation</div>
      <ChampsFormulaire dateRegularisationParDefaut={toISODate(new Date())} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
      >
        Ajouter la régularisation
      </button>
    </form>
  )
}

export function FabCreationRapide({
  equipe,
  profilActuelId,
}: {
  equipe: MembreEquipe[]
  profilActuelId: string
}) {
  const [vue, setVue] = useState<Vue>('ferme')

  function fermer() {
    setVue('ferme')
  }

  useFermerAvecRetour(vue !== 'ferme', fermer)

  return (
    <>
      {vue === 'ferme' && (
        <button
          type="button"
          onClick={() => setVue('menu')}
          aria-label="Créer"
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg lg:bottom-8"
        >
          <IconPlus className="h-6 w-6" />
        </button>
      )}

      {vue !== 'ferme' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 lg:items-center">
          <button type="button" aria-label="Fermer" onClick={fermer} className="absolute inset-0" />
          <div className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-surface lg:max-w-lg lg:rounded-3xl">
            <button
              type="button"
              onClick={fermer}
              aria-label="Fermer"
              className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white"
            >
              ×
            </button>

            {vue === 'menu' && <MenuChoix onChoisir={setVue} />}
            {vue === 'message' && <FormulaireMessage onEnvoye={fermer} />}
            {vue === 'tache' && (
              <FormulaireTache equipe={equipe} profilActuelId={profilActuelId} onCree={fermer} />
            )}
            {vue === 'regularisation' && <FormulaireRegularisation onCree={fermer} />}
          </div>
        </div>
      )}
    </>
  )
}
