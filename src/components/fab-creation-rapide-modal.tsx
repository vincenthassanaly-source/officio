'use client'

import { useRef, useState, useTransition } from 'react'
import { IconLiaison, IconRegularisation, IconNote } from '@/components/nav-icons'
import { ChampPhoto } from '@/components/champ-photo'
import { ChampAudio } from '@/components/champ-audio'
import { envoyerMessage } from '@/app/actions/liaison'
import { creerTache } from '@/app/actions/taches'
import { ajouterRegularisation } from '@/app/actions/regularisations'
import { creerNote } from '@/app/actions/notes'
import { ChampsFormulaire } from '@/components/regularisations-liste'
import { toISODate } from '@/lib/dates'
import { useFermerAvecRetour } from '@/lib/use-fermer-avec-retour'
import { usePiegeFocus } from '@/lib/use-piege-focus'
import type { Categorie } from '@/lib/data/messages'
import type { MembreEquipe } from '@/lib/data/equipe'
import type { VueFabCreationRapide } from '@/components/fab-creation-rapide'

// Mêmes catégories/couleurs que le formulaire de fil-de-messages.tsx.
const CATEGORIES: { value: Categorie; label: string; className: string }[] = [
  { value: 'info', label: 'Info', className: 'bg-primary-soft text-primary' },
  { value: 'urgent', label: 'Urgent', className: 'bg-rec-soft text-rec' },
]

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

function MenuChoix({
  onChoisir,
}: {
  onChoisir: (vue: 'message' | 'tache' | 'regularisation' | 'note') => void
}) {
  return (
    <div className="flex flex-col gap-2 p-4">
      <h2 id="fab-creation-titre-menu" className="mb-1 text-center font-heading text-lg text-ink">
        Créer
      </h2>
      <button
        type="button"
        onClick={() => onChoisir('message')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <IconLiaison className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouveau message</div>
          <div className="text-[12px] text-muted">Écrire au cahier de liaison</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChoisir('tache')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <IconTache className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouvelle tâche</div>
          <div className="text-[12px] text-muted">Assigner un rappel à l&rsquo;équipe</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChoisir('regularisation')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-purple-soft text-purple">
          <IconRegularisation className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouvelle régularisation</div>
          <div className="text-[12px] text-muted">Enregistrer une ordonnance à régulariser</div>
        </div>
      </button>
      <button
        type="button"
        onClick={() => onChoisir('note')}
        className="flex items-center gap-3 rounded-[20px] bg-surface shadow-card p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
          <IconNote className="h-5 w-5" />
        </div>
        <div>
          <div className="text-[14px] font-semibold text-ink">Nouvelle note</div>
          <div className="text-[12px] text-muted">Partager une note avec l&rsquo;équipe</div>
        </div>
      </button>
    </div>
  )
}

function FormulaireMessage({ onEnvoye }: { onEnvoye: () => void }) {
  const [categorie, setCategorie] = useState<Categorie>('info')
  const [contenu, setContenu] = useState('')
  const [audio, setAudio] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        if (audio) formData.set('audio', audio)
        startTransition(async () => {
          await envoyerMessage(formData)
          setContenu('')
          setAudio(null)
          onEnvoye()
        })
      }}
      className="flex flex-col gap-3 p-4"
    >
      <h2 id="fab-creation-titre-message" className="font-heading text-lg text-ink">
        Nouveau message
      </h2>
      <div className="flex gap-1.5">
        {CATEGORIES.map((c) => (
          // Bouton englobant à 44 px (padding compensé par une marge
          // négative) ; le pastille visible à l'intérieur garde sa taille de
          // puce compacte — même principe que LienRetour.
          <button
            key={c.value}
            type="button"
            onClick={() => setCategorie(c.value)}
            className="-my-3.5 flex min-h-11 items-center rounded-full px-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className={`rounded-full px-3 py-1.5 text-[12px] font-semibold motion-safe:transition ${
                categorie === c.value ? c.className : 'bg-bg text-muted'
              }`}
            >
              {c.label}
            </span>
          </button>
        ))}
      </div>
      <input type="hidden" name="categorie" value={categorie} />
      <div className="flex items-center gap-2">
        <input
          name="contenu"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message…"
          aria-label="Écrire un message…"
          className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        <ChampAudio onChange={setAudio} />
      </div>
      <button
        type="submit"
        disabled={isPending || (!contenu.trim() && !audio)}
        className="rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
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
  const [audio, setAudio] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        if (photo) formData.set('photo', photo)
        if (audio) formData.set('audio', audio)
        startTransition(async () => {
          await creerTache(formData)
          onCree()
        })
      }}
      className="flex flex-col gap-3 p-4"
    >
      <h2 id="fab-creation-titre-tache" className="font-heading text-lg text-ink">
        Nouvelle tâche
      </h2>
      <textarea
        name="titre"
        required
        placeholder="Titre de la tâche"
        aria-label="Titre de la tâche"
        className="min-h-24 max-h-48 resize-none overflow-y-auto rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
      />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          name="assigne_id"
          defaultValue=""
          aria-label="Assigner à"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
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
          aria-label="Date d'échéance"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
        {/* Facultative : si renseignée, un rappel push + in-app arrive pile
            à cette heure (au lieu du rappel générique "Échéance
            aujourd'hui") — voir supabase/functions/envoyer-rappels-taches
            et scripts/migration-cron-rappels-taches-2026-09-06.sql. */}
        <input
          type="time"
          name="echeance_heure"
          aria-label="Heure d'échéance"
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <ChampPhoto onChange={setPhoto} />
        <ChampAudio onChange={setAudio} />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
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
      <h2 id="fab-creation-titre-regularisation" className="font-heading text-lg text-ink">
        Nouvelle régularisation
      </h2>
      <ChampsFormulaire dateRegularisationParDefaut={toISODate(new Date())} />
      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        Ajouter la régularisation
      </button>
    </form>
  )
}

function FormulaireNote({ onCree }: { onCree: () => void }) {
  const [titre, setTitre] = useState('')
  const [contenu, setContenu] = useState('')
  const [isPending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await creerNote(formData)
          setTitre('')
          setContenu('')
          onCree()
        })
      }}
      className="flex flex-col gap-3 p-4"
    >
      <h2 id="fab-creation-titre-note" className="font-heading text-lg text-ink">
        Nouvelle note
      </h2>
      <input
        name="titre"
        value={titre}
        onChange={(e) => setTitre(e.target.value)}
        placeholder="Titre de la note"
        aria-label="Titre de la note"
        className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] font-semibold text-ink outline-none focus:border-primary"
      />
      <textarea
        name="contenu"
        value={contenu}
        onChange={(e) => setContenu(e.target.value)}
        placeholder="Contenu de la note"
        rows={4}
        className="resize-none rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
      />
      <button
        type="submit"
        disabled={isPending || !titre.trim() || !contenu.trim()}
        className="rounded-xl bg-primary py-3 text-[13.5px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60"
      >
        Ajouter la note
      </button>
    </form>
  )
}

// Contenu lourd du FAB de création rapide (menu + 4 formulaires, dont deux
// embarquent ChampPhoto/ChampAudio — compression d'image et MediaRecorder/
// micro) : extrait de fab-creation-rapide.tsx pour être chargé via
// next/dynamic uniquement à l'ouverture du FAB, voir ce fichier pour le
// point de montage et le pourquoi de `ssr: false`.
export default function FabCreationRapideModal({
  vue,
  equipe,
  profilActuelId,
  onChoisir,
  onFermer,
}: {
  vue: Exclude<VueFabCreationRapide, 'ferme'>
  equipe: MembreEquipe[]
  profilActuelId: string
  onChoisir: (vue: 'message' | 'tache' | 'regularisation' | 'note') => void
  onFermer: () => void
}) {
  // Un id de titre par vue (chacune porte son propre <h2>, voir plus haut) :
  // aria-labelledby doit suivre le titre réellement affiché, pas un titre
  // générique fixe.
  const idTitre = {
    menu: 'fab-creation-titre-menu',
    message: 'fab-creation-titre-message',
    tache: 'fab-creation-titre-tache',
    regularisation: 'fab-creation-titre-regularisation',
    note: 'fab-creation-titre-note',
  }[vue]

  const boiteRef = useRef<HTMLDivElement>(null)
  // Toujours montée seulement quand ouverte (voir {vue !== 'ferme' && <FabCreationRapideModal .../>}
  // dans fab-creation-rapide.tsx), comme ModaleEditionTache : `true` en
  // permanence, le nettoyage (retour du focus, déverrouillage du scroll)
  // s'exécute au démontage.
  useFermerAvecRetour(true, onFermer)
  usePiegeFocus(true, boiteRef)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={idTitre}
      className="fixed inset-0 z-50 flex items-end justify-center overscroll-contain bg-black/40 lg:items-center"
    >
      <button type="button" aria-label="Fermer" onClick={onFermer} className="absolute inset-0" />
      <div
        ref={boiteRef}
        className="relative flex max-h-[90vh] w-full flex-col overflow-y-auto overscroll-contain rounded-t-3xl bg-surface lg:max-w-lg lg:rounded-3xl"
      >
        <button
          type="button"
          onClick={onFermer}
          aria-label="Fermer"
          className="absolute right-3 top-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/40 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        {vue === 'menu' && <MenuChoix onChoisir={onChoisir} />}
        {vue === 'message' && <FormulaireMessage onEnvoye={onFermer} />}
        {vue === 'tache' && (
          <FormulaireTache equipe={equipe} profilActuelId={profilActuelId} onCree={onFermer} />
        )}
        {vue === 'regularisation' && <FormulaireRegularisation onCree={onFermer} />}
        {vue === 'note' && <FormulaireNote onCree={onFermer} />}
      </div>
    </div>
  )
}
