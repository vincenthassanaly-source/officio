'use client'

import { useEffect, useState, useTransition, type TransitionStartFunction } from 'react'
import { useSearchParams } from 'next/navigation'
import { creerTache, toggleTache, supprimerTache, modifierTache } from '@/app/actions/taches'
import { ChampPhoto } from '@/components/champ-photo'
import type { Tache } from '@/lib/data/taches'
import type { MembreEquipe } from '@/lib/data/equipe'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'

// Même format que formatHeure() dans rappels-agenda/route.ts ('HH:MM:SS' ou
// 'HH:MM' -> 'HHhMM'). Exportée pour être réutilisée par
// agenda-vue-globale.tsx (badge "Tâche").
export function formatHeureCourte(heure: string): string {
  return heure.slice(0, 5).replace(':', 'h')
}

// Exportée pour être réutilisée par agenda-vue-globale.tsx (même code
// couleur/urgence que dans cette liste). Type relâché à Pick<...> plutôt que
// Tache entière : la vue globale de l'agenda ne récupère que id/titre/
// statut/echeance/echeance_heure (getTachesEcheancePeriode), pas
// assigne/photoUrl.
export function dueInfo(
  tache: Pick<Tache, 'statut' | 'echeance' | 'echeance_heure'>
): { label: string; className: string } {
  if (tache.statut === 'fait') {
    return { label: 'Fait', className: 'bg-neutral-soft text-muted' }
  }
  if (!tache.echeance) {
    return { label: 'À définir', className: 'bg-primary-soft text-primary' }
  }

  // Heure facultative : accolée au label existant plutôt que dans un badge
  // séparé, pour rester lisible sur une seule ligne (ex. "Aujourd'hui ·
  // 14h30").
  const suffixeHeure = tache.echeance_heure ? ` · ${formatHeureCourte(tache.echeance_heure)}` : ''

  const aujourdhui = new Date()
  aujourdhui.setHours(0, 0, 0, 0)
  const echeance = new Date(`${tache.echeance}T00:00:00`)
  const diffJours = Math.round((echeance.getTime() - aujourdhui.getTime()) / 86_400_000)

  if (diffJours < 0) return { label: `En retard${suffixeHeure}`, className: 'bg-rec-soft text-rec' }
  if (diffJours === 0) return { label: `Aujourd'hui${suffixeHeure}`, className: 'bg-accent-soft text-accent' }
  if (diffJours === 1) return { label: `Demain${suffixeHeure}`, className: 'bg-accent-soft text-accent' }
  return {
    label: `${echeance.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}${suffixeHeure}`,
    className: 'bg-primary-soft text-primary',
  }
}

// Même pattern que vaccins-liste.tsx (non exportée là-bas) : icône propre à
// l'accordéon, dupliquée plutôt que partagée pour rester cohérent avec le
// reste du fichier (IconCloche/IconRecherche sont aussi définies par
// composant plutôt que dans nav-icons.tsx).
function IconChevron({ className }: { className?: string }) {
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
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

export function TachesList({
  taches,
  equipe,
  profilActuelId,
  couleurs,
}: {
  taches: Tache[]
  equipe: MembreEquipe[]
  profilActuelId: string
  couleurs: Map<string, CouleurAvatar>
}) {
  const searchParams = useSearchParams()
  const [filtre, setFiltre] = useState('tous')
  const [formOuvert, setFormOuvert] = useState(false)
  const [photo, setPhoto] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  // Tâche ciblée par une notification (?tache=<id>) : mise en évidence
  // temporairement le temps que l'utilisateur la repère dans la liste.
  const [idSurligne, setIdSurligne] = useState<string | null>(() => searchParams.get('tache'))
  // Tâche ouverte dans la modale d'édition (clic sur le corps de la carte,
  // hors case à cocher et bouton de suppression). Fonctionne aussi bien pour
  // une tâche active qu'une tâche archivée.
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  // Accordéon "Tâches archivées". Fermé par défaut, sauf si la tâche visée
  // par ?tache=<id> au chargement est elle-même archivée (calculé ici plutôt
  // que dans un effect : évite un rendu en cascade pour un état qu'on connaît
  // déjà à l'initialisation, cf. la même logique que idSurligne ci-dessus).
  const [archiveOuverte, setArchiveOuverte] = useState(() => {
    const idParam = searchParams.get('tache')
    return !!idParam && taches.find((t) => t.id === idParam)?.statut === 'fait'
  })

  const visibles = filtre === 'tous' ? taches : taches.filter((t) => t.assigne?.id === filtre)
  const actives = visibles.filter((t) => t.statut === 'a_faire')
  const archivees = visibles.filter((t) => t.statut === 'fait')

  // Défile jusqu'à la tâche ciblée par une notification, avec un délai plus
  // long si elle est archivée : le temps que l'accordéon "Tâches archivées"
  // (ouvert séparément par l'appelant) ait fini sa transition (200ms, cf.
  // `duration-200` plus bas) avant de calculer la position de scroll — tant
  // qu'il est refermé (grid-rows-[0fr]) la carte n'a pas de position de
  // défilement significative, même si son contenu n'est jamais démonté.
  function defilerVersTache(id: string) {
    const estArchivee = taches.find((t) => t.id === id)?.statut === 'fait'
    setTimeout(
      () => document.getElementById(`tache-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }),
      estArchivee ? 220 : 0
    )
  }

  // Cible initiale (arrivée depuis une notification ou un lien direct) :
  // défile jusqu'à la tâche au montage. Un nouveau montage a lieu à chaque
  // nouvelle cible grâce à la `key` posée sur CahierDeLiaison (voir
  // liaison/page.tsx) — pas besoin de resynchroniser sur un changement d'URL.
  useEffect(() => {
    if (!idSurligne) return
    defilerVersTache(idSurligne)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Notification cliquée alors qu'on est déjà sur la bonne tâche/onglet : le
  // routeur ne se déclenche pas (même URL), notifications-cloche.tsx émet cet
  // évènement pour forcer quand même le scroll + la mise en évidence. Ouvre
  // aussi l'accordéon si la cible est archivée (même logique que ci-dessus,
  // mais ici déclenchée par la souscription à l'évènement plutôt qu'au
  // montage, donc sans le rendu en cascade que l'initialisation évite).
  useEffect(() => {
    function ecouteur(e: Event) {
      const url = (e as CustomEvent<{ url: string }>).detail?.url
      const tacheId = url && new URL(url, window.location.origin).searchParams.get('tache')
      if (!tacheId) return
      if (taches.find((t) => t.id === tacheId)?.statut === 'fait') setArchiveOuverte(true)
      defilerVersTache(tacheId)
      setIdSurligne(tacheId)
    }
    window.addEventListener(EVENEMENT_NOTIFICATION_CIBLE, ecouteur)
    return () => window.removeEventListener(EVENEMENT_NOTIFICATION_CIBLE, ecouteur)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Disparition en fondu de la mise en évidence après ~2s.
  useEffect(() => {
    if (!idSurligne) return
    const minuteur = setTimeout(() => setIdSurligne(null), 2000)
    return () => clearTimeout(minuteur)
  }, [idSurligne])

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="flex items-center gap-2">
        <div className="flex flex-1 gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFiltre('tous')}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
              filtre === 'tous' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
            }`}
          >
            Tous
          </button>
          {equipe.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setFiltre(m.id)}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold ${
                filtre === m.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              {m.id === profilActuelId ? 'Moi' : m.nom_complet.split(' ')[0]}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-lg leading-none text-white"
        >
          {formOuvert ? '×' : '+'}
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            if (photo) formData.set('photo', photo)
            startTransition(async () => {
              await creerTache(formData)
              setFormOuvert(false)
              setPhoto(null)
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <input
            name="titre"
            required
            placeholder="Titre de la tâche"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
          />
          <select
            name="assigne_id"
            defaultValue=""
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
          >
            <option value="">Non assignée (toute l&rsquo;équipe)</option>
            {equipe.map((m) => (
              <option key={m.id} value={m.id}>
                {m.id === profilActuelId ? 'Moi' : m.nom_complet}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="date"
              name="echeance"
              className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            />
            {/* Facultative : si renseignée, le rappel quotidien de 7h
                mentionne cette heure dans son message — voir
                src/app/api/cron/rappels-taches/route.ts. */}
            <input
              type="time"
              name="echeance_heure"
              className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
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
      )}

      <div className="flex flex-1 flex-col gap-2.5">
        {actives.length === 0 && archivees.length === 0 && (
          <p className="py-10 text-center text-sm text-muted">Aucune tâche pour l&rsquo;instant.</p>
        )}
        {actives.map((t) => (
          <CarteTache
            key={t.id}
            tache={t}
            couleurs={couleurs}
            idSurligne={idSurligne}
            isPending={isPending}
            startTransition={startTransition}
            onEditer={setTacheEnEdition}
          />
        ))}
      </div>

      {archivees.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
          <button
            type="button"
            onClick={() => setArchiveOuverte((o) => !o)}
            aria-expanded={archiveOuverte}
            className="flex items-center justify-between gap-2 text-left"
          >
            <span className="text-[13.5px] font-semibold text-ink">Tâches archivées ({archivees.length})</span>
            <IconChevron
              className={`h-4 w-4 shrink-0 text-muted transition-transform duration-200 ${
                archiveOuverte ? 'rotate-180' : ''
              }`}
            />
          </button>
          <div
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${
              archiveOuverte ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
            }`}
          >
            <div className="overflow-hidden">
              <div className="flex flex-col gap-2.5 pt-2.5">
                {archivees.map((t) => (
                  <CarteTache
                    key={t.id}
                    tache={t}
                    couleurs={couleurs}
                    idSurligne={idSurligne}
                    isPending={isPending}
                    startTransition={startTransition}
                    onEditer={setTacheEnEdition}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tacheEnEdition && (
        <ModaleEditionTache
          key={tacheEnEdition.id}
          tache={tacheEnEdition}
          equipe={equipe}
          profilActuelId={profilActuelId}
          onFerme={() => setTacheEnEdition(null)}
        />
      )}
    </div>
  )
}

// Carte individuelle, réutilisée par la liste active et l'accordéon
// "Tâches archivées" (voir TachesList ci-dessus) : mêmes checkbox/clic pour
// éditer/suppression/photo/badge d'échéance qu'avant l'extraction.
function CarteTache({
  tache,
  couleurs,
  idSurligne,
  isPending,
  startTransition,
  onEditer,
}: {
  tache: Tache
  couleurs: Map<string, CouleurAvatar>
  idSurligne: string | null
  isPending: boolean
  startTransition: TransitionStartFunction
  onEditer: (tache: Tache) => void
}) {
  const due = dueInfo(tache)
  const couleurAssigne = (tache.assigne ? couleurs.get(tache.assigne.id) : null) ?? COULEUR_PAR_DEFAUT

  return (
    <div
      id={`tache-${tache.id}`}
      className={`flex items-center gap-2 rounded-[20px] bg-surface shadow-card p-3.5 transition-shadow duration-700 ${
        idSurligne === tache.id ? 'ring-2 ring-primary' : ''
      }`}
    >
      {tache.photoUrl && (
        <a href={tache.photoUrl} target="_blank" rel="noopener noreferrer" className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL signée Supabase Storage, pas une image du projet */}
          <img src={tache.photoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
        </a>
      )}
      <button
        type="button"
        onClick={() => startTransition(() => toggleTache(tache.id, tache.statut))}
        disabled={isPending}
        aria-label={tache.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
        className="flex h-8 w-8 shrink-0 items-center justify-center disabled:opacity-70"
      >
        <div
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
            tache.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
          }`}
        >
          {tache.statut === 'fait' && <span className="text-xs font-bold text-white">✓</span>}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onEditer(tache)}
        disabled={isPending}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:opacity-70"
      >
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${tache.statut === 'fait' ? 'text-muted line-through' : 'text-ink'}`}>
            {tache.titre}
          </div>
          {tache.assigne && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
              <span
                className={`flex h-[18px] w-[18px] items-center justify-center rounded-full text-[8.5px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
              >
                {tache.assigne.initiales}
              </span>
              {tache.assigne.nom_complet}
            </div>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold ${due.className}`}>
          {due.label}
        </span>
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => {
          if (confirm(`Supprimer la tâche « ${tache.titre} » ?`)) {
            startTransition(() => supprimerTache(tache.id))
          }
        }}
        aria-label="Supprimer la tâche"
        className="shrink-0 text-muted hover:text-rec disabled:opacity-50"
      >
        ×
      </button>
    </div>
  )
}

function ModaleEditionTache({
  tache,
  equipe,
  profilActuelId,
  onFerme,
}: {
  tache: Tache
  equipe: MembreEquipe[]
  profilActuelId: string
  onFerme: () => void
}) {
  const [photo, setPhoto] = useState<File | null>(null)
  // Distinct de `photo === null` au repos (aucun changement) : mis à true
  // uniquement si l'utilisateur retire explicitement la photo actuelle sans
  // en choisir une nouvelle. Voir le commentaire sur ChampPhoto.
  const [photoSupprimee, setPhotoSupprimee] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onFerme}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        action={(formData) => {
          if (photo) formData.set('photo', photo)
          if (photoSupprimee) formData.set('photo_supprimee', 'true')
          startTransition(async () => {
            await modifierTache(tache.id, formData)
            onFerme()
          })
        }}
        className="flex w-full flex-col gap-2 rounded-t-[20px] bg-surface shadow-card p-4 sm:w-96 sm:rounded-[20px]"
      >
        <div className="mb-1 flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">Modifier la tâche</h2>
          <button type="button" onClick={onFerme} aria-label="Fermer sans enregistrer" className="text-muted">
            ×
          </button>
        </div>
        <input
          name="titre"
          required
          defaultValue={tache.titre}
          placeholder="Titre de la tâche"
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
        />
        <select
          name="assigne_id"
          defaultValue={tache.assigne?.id ?? ''}
          className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
        >
          <option value="">Non assignée (toute l&rsquo;équipe)</option>
          {equipe.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id === profilActuelId ? 'Moi' : m.nom_complet}
            </option>
          ))}
        </select>
        <div className="flex gap-2">
          <input
            type="date"
            name="echeance"
            defaultValue={tache.echeance ?? ''}
            className="flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
          />
          <input
            type="time"
            name="echeance_heure"
            defaultValue={tache.echeance_heure?.slice(0, 5) ?? ''}
            className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
          />
        </div>
        <ChampPhoto
          photoInitiale={tache.photoUrl}
          onChange={(fichier) => {
            setPhoto(fichier)
            setPhotoSupprimee(fichier === null)
          }}
        />
        <button
          type="submit"
          disabled={isPending}
          className="mt-1 rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold text-white disabled:opacity-60"
        >
          Enregistrer
        </button>
      </form>
    </div>
  )
}
