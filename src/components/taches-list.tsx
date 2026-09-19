'use client'

import {
  useEffect,
  useOptimistic,
  useState,
  useTransition,
  type TransitionStartFunction,
} from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import { creerTache, toggleTache, supprimerTache, togglePouceTache } from '@/app/actions/taches'
import { ChampPhoto } from '@/components/champ-photo'
import { ChampAudio } from '@/components/champ-audio'
import type { Tache } from '@/lib/data/taches'
import type { MembreEquipe } from '@/lib/data/equipe'
import { COULEUR_PAR_DEFAUT } from '@/lib/avatar-couleur'
import type { CouleurAvatar } from '@/lib/data/couleurs-membres'
import { EVENEMENT_NOTIFICATION_CIBLE } from '@/lib/notifications/evenement-cible'
import { ModaleConfirmation } from '@/components/ui/modale-confirmation'
import { LightboxImage } from '@/components/lightbox-image'
import { useToast } from '@/components/ui/toast-provider'
import { useRetraitAnime } from '@/lib/use-retrait-anime'
import { vibrer } from '@/lib/haptics'

// Chargée seulement à l'ouverture d'une tâche (voir {tacheEnEdition &&
// <ModaleEditionTache .../>} plus bas) : évite d'embarquer ChampPhoto
// (compression d'image) dans le JS initial de la liste, jamais visible tant
// qu'aucune tâche n'est ouverte en édition. ssr:false : la modale ne fait
// jamais partie du premier rendu (portail vers document.body, absent côté
// serveur — voir modale-edition-tache.tsx).
const ModaleEditionTache = dynamic(() => import('@/components/modale-edition-tache'), { ssr: false })

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

// Remplace les glyphes « + »/« × » du bouton qui ouvre/ferme le formulaire
// d'ajout.
function IconAjouter({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function IconFermer({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  )
}

// Remplace le glyphe « ✓ » de la case cochée.
function IconCoche({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}

// Remplace l'émoji « 👍 » du bouton de pouce. Dupliquée depuis
// fil-de-messages.tsx (même convention que IconAppareilPhoto entre
// champ-photo.tsx et champ-photos.tsx) plutôt que factorisée.
function IconPouce({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 10v12" />
      <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2a3.13 3.13 0 0 1 3 3.88Z" />
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
  const [audio, setAudio] = useState<File | null>(null)
  const [isPending, startTransition] = useTransition()
  // Tâche ciblée par une notification (?tache=<id>) : mise en évidence
  // temporairement le temps que l'utilisateur la repère dans la liste.
  const [idSurligne, setIdSurligne] = useState<string | null>(() => searchParams.get('tache'))
  // Tâche ouverte dans la modale d'édition (clic sur le corps de la carte,
  // hors case à cocher et bouton de suppression). Fonctionne aussi bien pour
  // une tâche active qu'une tâche archivée.
  const [tacheEnEdition, setTacheEnEdition] = useState<Tache | null>(null)
  const toast = useToast()
  // Deux mises à jour optimistes sur la même liste, distinguées par le champ
  // `type` de l'action plutôt que par deux useOptimistic concurrents (un seul
  // état optimiste par liste, sinon le second écraserait le premier) :
  //
  // - 'pouce'  : bascule le pouce du profil courant dans le tableau `pouces`
  //   de la tâche ciblée (ajout si absent, retrait si présent). L'initiale
  //   utilisée pour l'ajout vient de `equipe` (toujours à jour, contrairement
  //   à un état séparé).
  // - 'statut' : bascule a_faire <-> fait. La tâche change alors de section
  //   (liste active <-> accordéon "Tâches archivées") immédiatement, puisque
  //   `actives`/`archivees` plus bas dérivent de cet état optimiste.
  // - 'suppression' : retire la tâche de la liste dès la confirmation.
  const [tachesOptimistes, appliquerOptimiste] = useOptimistic(
    taches,
    (etat, action: { type: 'pouce' | 'statut' | 'suppression'; id: string }) => {
      if (action.type === 'suppression') return etat.filter((t) => t.id !== action.id)
      return etat.map((t) => {
        if (t.id !== action.id) return t
        if (action.type === 'statut') {
          return { ...t, statut: t.statut === 'fait' ? ('a_faire' as const) : ('fait' as const) }
        }
        const dejaPouce = t.pouces.some((p) => p.profil_id === profilActuelId)
        if (dejaPouce) return { ...t, pouces: t.pouces.filter((p) => p.profil_id !== profilActuelId) }
        const mesInitiales = equipe.find((m) => m.id === profilActuelId)?.initiales ?? '?'
        return { ...t, pouces: [...t.pouces, { profil_id: profilActuelId, initiales: mesInitiales }] }
      })
    }
  )
  // Bascule le pouce en optimiste puis appelle le serveur : passée à
  // CarteTache, qui l'appelle déjà dans son propre startTransition (gestion
  // d'erreur/toast inchangée là-bas).
  function basculerPouce(id: string) {
    vibrer()
    appliquerOptimiste({ type: 'pouce', id })
    return togglePouceTache(id)
  }
  // Cochage/décochage. Contrairement au pouce, la transition est ouverte ici
  // et non chez l'appelant : ModaleEditionTache appelle aussi cette fonction
  // puis se ferme aussitôt, et une transition ouverte dans un composant qui
  // se démonte dans la foulée n'aurait plus de propriétaire monté pour porter
  // l'état optimiste.
  const { estEnSortie, retirerApresAnimation } = useRetraitAnime()

  // Même raison que basculerStatut d'ouvrir la transition ici : la carte qui
  // porte la ModaleConfirmation disparaît avec la tâche supprimée.
  function supprimer(id: string) {
    retirerApresAnimation(id, () =>
      startTransition(async () => {
        vibrer()
        appliquerOptimiste({ type: 'suppression', id })
        try {
          await supprimerTache(id)
          toast({ type: 'succes', message: 'Tâche supprimée.' })
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la suppression de la tâche.',
          })
        }
      })
    )
  }

  // Cocher une tâche la fait changer de section (active <-> archivée) : c'est
  // un retrait de sa liste d'origine, animé comme tel. La carte réapparaît en
  // fondu de l'autre côté, `item-entree` se jouant à son remontage.
  function basculerStatut(tache: Tache) {
    retirerApresAnimation(tache.id, () =>
      startTransition(async () => {
        vibrer()
        appliquerOptimiste({ type: 'statut', id: tache.id })
        try {
          await toggleTache(tache.id, tache.statut)
        } catch (err) {
          toast({
            type: 'erreur',
            message: err instanceof Error ? err.message : 'Échec de la mise à jour du statut de la tâche.',
          })
        }
      })
    )
  }
  // Accordéon "Tâches archivées". Fermé par défaut, sauf si la tâche visée
  // par ?tache=<id> au chargement est elle-même archivée (calculé ici plutôt
  // que dans un effect : évite un rendu en cascade pour un état qu'on connaît
  // déjà à l'initialisation, cf. la même logique que idSurligne ci-dessus).
  const [archiveOuverte, setArchiveOuverte] = useState(() => {
    const idParam = searchParams.get('tache')
    return !!idParam && taches.find((t) => t.id === idParam)?.statut === 'fait'
  })

  const visibles = filtre === 'tous' ? tachesOptimistes : tachesOptimistes.filter((t) => t.assigne?.id === filtre)
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
            className="-my-3.5 flex min-h-11 shrink-0 items-center rounded-full px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span
              className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                filtre === 'tous' ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
              }`}
            >
              Tous
            </span>
          </button>
          {equipe.map((m) => (
            <button
              type="button"
              key={m.id}
              onClick={() => setFiltre(m.id)}
              className="-my-3.5 flex min-h-11 shrink-0 items-center rounded-full px-0.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold ${
                  filtre === m.id ? 'border-primary bg-primary text-white' : 'border-border bg-surface text-muted'
                }`}
              >
                {m.id === profilActuelId ? 'Moi' : m.nom_complet.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setFormOuvert((v) => !v)}
          aria-label={formOuvert ? "Fermer le formulaire d'ajout" : 'Ajouter une tâche'}
          aria-expanded={formOuvert}
          className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-white">
            {formOuvert ? <IconFermer className="h-4 w-4" /> : <IconAjouter className="h-4 w-4" />}
          </span>
        </button>
      </div>

      {formOuvert && (
        <form
          action={(formData) => {
            if (photo) formData.set('photo', photo)
            if (audio) formData.set('audio', audio)
            startTransition(async () => {
              try {
                await creerTache(formData)
                setFormOuvert(false)
                setPhoto(null)
                setAudio(null)
                toast({ type: 'succes', message: 'Tâche ajoutée.' })
              } catch (err) {
                toast({ type: 'erreur', message: err instanceof Error ? err.message : "Échec de l'ajout de la tâche." })
              }
            })
          }}
          className="flex flex-col gap-2 rounded-[20px] bg-surface shadow-card p-3"
        >
          <label htmlFor="titre-nouvelle-tache" className="sr-only">
            Titre de la tâche
          </label>
          <input
            id="titre-nouvelle-tache"
            name="titre"
            required
            placeholder="Titre de la tâche"
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
          />
          <label htmlFor="assigne-nouvelle-tache" className="sr-only">
            Assigner à
          </label>
          <select
            id="assigne-nouvelle-tache"
            name="assigne_id"
            defaultValue=""
            className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
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
              aria-label="Date d'échéance"
              className="min-w-0 flex-1 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
            />
            {/* Facultative : si renseignée, un rappel push + in-app arrive
                pile à cette heure (au lieu du rappel générique "Échéance
                aujourd'hui") — voir supabase/functions/envoyer-rappels-
                taches et scripts/migration-cron-rappels-taches-2026-09-06.
                sql. */}
            <input
              type="time"
              name="echeance_heure"
              aria-label="Heure d'échéance"
              className="w-28 rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ChampPhoto onChange={setPhoto} />
            <ChampAudio onChange={setAudio} />
          </div>
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
            profilActuelId={profilActuelId}
            idSurligne={idSurligne}
            isPending={isPending}
            startTransition={startTransition}
            onEditer={setTacheEnEdition}
            onBasculerPouce={basculerPouce}
            onBasculerStatut={basculerStatut}
            onSupprimer={supprimer}
            enSortie={estEnSortie(t.id)}
          />
        ))}
      </div>

      {archivees.length > 0 && (
        <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
          <button
            type="button"
            onClick={() => setArchiveOuverte((o) => !o)}
            aria-expanded={archiveOuverte}
            className="flex min-h-11 items-center justify-between gap-2 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <span className="text-[13.5px] font-semibold text-ink">Tâches archivées ({archivees.length})</span>
            <IconChevron
              className={`h-4 w-4 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200 ${
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
                    profilActuelId={profilActuelId}
                    idSurligne={idSurligne}
                    isPending={isPending}
                    startTransition={startTransition}
                    onEditer={setTacheEnEdition}
                    onBasculerPouce={basculerPouce}
                    onBasculerStatut={basculerStatut}
                    onSupprimer={supprimer}
                    enSortie={estEnSortie(t.id)}
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
          onBasculerStatut={basculerStatut}
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
  profilActuelId,
  idSurligne,
  isPending,
  startTransition,
  onEditer,
  onBasculerPouce,
  onBasculerStatut,
  onSupprimer,
  enSortie,
}: {
  tache: Tache
  couleurs: Map<string, CouleurAvatar>
  profilActuelId: string
  idSurligne: string | null
  isPending: boolean
  startTransition: TransitionStartFunction
  onEditer: (tache: Tache) => void
  onBasculerPouce: (id: string) => Promise<void>
  onBasculerStatut: (tache: Tache) => void
  onSupprimer: (id: string) => void
  enSortie: boolean
}) {
  const due = dueInfo(tache)
  const couleurAssigne = (tache.assigne ? couleurs.get(tache.assigne.id) : null) ?? COULEUR_PAR_DEFAUT
  const monPouce = tache.pouces.some((p) => p.profil_id === profilActuelId)
  // État local à la carte plutôt que remonté à TachesList : chaque carte
  // porte déjà sa propre tâche, une seule peut être en confirmation de
  // suppression à la fois (pas besoin d'un id à retenir côté parent).
  const [confirmationOuverte, setConfirmationOuverte] = useState(false)
  const [photoAgrandie, setPhotoAgrandie] = useState(false)
  const toast = useToast()

  return (
    <>
      <div
        id={`tache-${tache.id}`}
        className={`flex items-center gap-2 rounded-[20px] bg-surface shadow-card p-3.5 transition-shadow duration-700 ${
          idSurligne === tache.id ? 'ring-2 ring-primary' : ''
        } ${enSortie ? 'item-sortie' : 'item-entree'}`}
      >
      {tache.photoUrl && (
        <button
          type="button"
          onClick={() => setPhotoAgrandie(true)}
          aria-label="Agrandir la photo"
          className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-lg"
        >
          <Image src={tache.photoUrl} alt="" fill sizes="40px" className="object-cover" />
        </button>
      )}
      {photoAgrandie && tache.photoUrl && (
        <LightboxImage src={tache.photoUrl} onFerme={() => setPhotoAgrandie(false)} />
      )}
      {/* Ni `disabled` ni attente : la bascule est optimiste côté TachesList,
          la case reflète le nouvel état au clic. Désactiver le bouton pendant
          la transition figerait toutes les cartes de la liste (un seul
          isPending partagé) pour une action déjà affichée comme terminée. */}
      <button
        type="button"
        onClick={() => onBasculerStatut(tache)}
        aria-label={tache.statut === 'fait' ? 'Marquer à faire' : 'Marquer comme fait'}
        className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full p-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        <div
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-2 ${
            tache.statut === 'fait' ? 'border-primary bg-primary' : 'border-border'
          }`}
        >
          {tache.statut === 'fait' && <IconCoche className="h-3 w-3 text-white" />}
        </div>
      </button>
      <button
        type="button"
        onClick={() => onEditer(tache)}
        disabled={isPending}
        className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-70"
      >
        <div className="min-w-0 flex-1">
          <div className={`text-sm font-semibold ${tache.statut === 'fait' ? 'text-muted line-through' : 'text-ink'}`}>
            {tache.titre}
          </div>
          {tache.assigne && (
            <div className="mt-0.5 flex items-center gap-1.5 text-[12px] text-muted">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${couleurAssigne.fond} ${couleurAssigne.texte}`}
              >
                {tache.assigne.initiales}
              </span>
              {tache.assigne.nom_complet}
            </div>
          )}
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[12px] font-bold ${due.className}`}>
          {due.label}
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-1">
        {tache.pouces.length > 0 && (
          <div className="flex" title={`Pouce de ${tache.pouces.length} personne${tache.pouces.length > 1 ? 's' : ''}`}>
            {tache.pouces.map((p, i) => {
              const c = couleurs.get(p.profil_id) ?? COULEUR_PAR_DEFAUT
              return (
                <div
                  key={p.profil_id}
                  className={`-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-surface text-[12px] font-bold first:ml-0 ${c.fond} ${c.texte}`}
                  style={{ zIndex: tache.pouces.length - i }}
                >
                  {p.initiales}
                </div>
              )
            })}
          </div>
        )}
        {/* Déjà optimiste (onBasculerPouce) : plus de `disabled` ici non plus,
            pour la même raison que la case à cocher ci-dessus. */}
        <button
          type="button"
          onClick={() =>
            startTransition(async () => {
              try {
                await onBasculerPouce(tache.id)
              } catch (err) {
                toast({
                  type: 'erreur',
                  message: err instanceof Error ? err.message : "Échec de l'envoi du pouce.",
                })
              }
            })
          }
          aria-label={monPouce ? 'Retirer mon pouce' : 'Mettre un pouce'}
          aria-pressed={monPouce}
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary motion-safe:active:scale-90 ${
            monPouce ? 'text-primary' : 'text-muted hover:text-primary'
          }`}
        >
          <IconPouce className="h-[18px] w-[18px]" />
        </button>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setConfirmationOuverte(true)}
        aria-label="Supprimer la tâche"
        className="-m-1.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:text-rec focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
      >
        <IconFermer className="h-4 w-4" />
      </button>
      </div>

      <ModaleConfirmation
        ouvert={confirmationOuverte}
        titre={`Supprimer la tâche « ${tache.titre} » ?`}
        onConfirmer={() => {
          onSupprimer(tache.id)
          setConfirmationOuverte(false)
        }}
        onAnnuler={() => setConfirmationOuverte(false)}
      />
    </>
  )
}

