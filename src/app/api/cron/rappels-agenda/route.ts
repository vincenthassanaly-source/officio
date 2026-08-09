import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const LABELS_CATEGORIE: Record<string, string> = {
  rdv: 'Rendez-vous',
  livraison: 'Livraison',
  formation: 'Formation',
  autre: 'Événement',
}

const LONGUEUR_MAX_NOTE = 80

type RendezVousARappeler = {
  id: string
  officine_id: string
  titre: string
  categorie: string
  date: string
  heure_debut: string
  note: string | null
}

function formatHeure(heureDebut: string): string {
  // 'HH:MM:SS' -> 'HHhMM'
  return heureDebut.slice(0, 5).replace(':', 'h')
}

function construireCorps(rdv: RendezVousARappeler): string {
  const categorie = LABELS_CATEGORIE[rdv.categorie] ?? 'Événement'
  let corps = `${categorie} à ${formatHeure(rdv.heure_debut)}`
  if (rdv.note && rdv.note.length <= LONGUEUR_MAX_NOTE) {
    corps += ` — ${rdv.note}`
  }
  return corps
}

/**
 * Cron toutes les 15 minutes (voir vercel.json) : rappelle à toute
 * l'officine (pas une personne en particulier — contrairement aux tâches
 * assignées, un rendez-vous/livraison concerne potentiellement toute
 * l'équipe) les événements de l'agenda dont l'heure de début tombe dans
 * les ~45 à 60 prochaines minutes. La fenêtre et la gestion du fuseau
 * horaire (date/heure_debut = heure locale Europe/Paris) sont calculées
 * côté base par rendez_vous_a_rappeler() — voir
 * scripts/migration-rendez-vous-rappel.sql pour le détail.
 */
export async function GET(request: Request) {
  const enTete = request.headers.get('authorization')
  if (enTete !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ erreur: 'Configuration Supabase manquante.' }, { status: 500 })
  }

  const supabase = createServiceRoleClient()

  const { data: rendezVous, error } = await supabase.rpc('rendez_vous_a_rappeler')

  if (error) {
    console.error('rappels-agenda', error)
    return NextResponse.json({ erreur: error.message }, { status: 500 })
  }

  let envoyes = 0

  for (const rdv of (rendezVous ?? []) as RendezVousARappeler[]) {
    const titreNotif = `Rappel — ${rdv.titre}`
    const corpsNotif = construireCorps(rdv)

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          officineId: rdv.officine_id,
          categorie: 'agenda_rappel',
          titre: titreNotif,
          corps: corpsNotif,
          url: '/agenda',
          // Pas de profilIds : toute l'officine, filtrée par la préférence
          // agenda_rappel (contrairement aux tâches assignées).
        }),
      })
      envoyes++
    } catch (e) {
      // Une erreur réseau sur un rendez-vous ne doit pas empêcher de
      // traiter les suivants — même choix que pour rappels-taches.
      console.error('rappels-agenda: envoi', rdv.id, e)
    }

    // Fil in-app : une ligne par membre de l'officine, comme send-push sans
    // profilIds ci-dessus. Contrairement au push (filtré par préférence),
    // le fil in-app reste exhaustif — voir scripts/migration-notifications-
    // in-app-triggers.sql pour le raisonnement.
    const { data: membres, error: erreurMembres } = await supabase
      .from('adhesions')
      .select('profil_id')
      .eq('officine_id', rdv.officine_id)

    if (erreurMembres) {
      console.error('rappels-agenda: membres', rdv.id, erreurMembres)
    } else if (membres && membres.length > 0) {
      await supabase.from('notifications').insert(
        membres.map((m) => ({
          officine_id: rdv.officine_id,
          profil_id: m.profil_id,
          categorie: 'agenda_rappel',
          titre: titreNotif,
          corps: corpsNotif,
          url: '/agenda',
        }))
      )
    }

    await supabase.from('rendez_vous').update({ rappel_envoye: true }).eq('id', rdv.id)
  }

  return NextResponse.json({ traites: rendezVous?.length ?? 0, envoyes })
}
