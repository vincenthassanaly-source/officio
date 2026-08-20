import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

type TacheARappeler = {
  id: string
  officine_id: string
  titre: string
  assigne_id: string
  echeance: string
  echeance_heure: string
}

function formatHeure(echeanceHeure: string): string {
  // 'HH:MM:SS' -> 'HHhMM'
  return echeanceHeure.slice(0, 5).replace(':', 'h')
}

/**
 * Cron toutes les 15 minutes (voir vercel.json) : rappelle à la personne
 * assignée les tâches dont l'heure de rappel (echeance + echeance_heure)
 * tombe pile maintenant. Vient en complément du rappel quotidien générique
 * de 7h (rappels-taches/route.ts, rappel_echeance_envoye_le) — les deux
 * coexistent quand une heure est renseignée, celui-ci n'est pas concerné
 * par ce cron-ci. La fenêtre et la gestion du fuseau horaire (echeance/
 * echeance_heure = date/heure locale Europe/Paris) sont calculées côté
 * base par taches_a_rappeler_heure() — voir scripts/migration-taches-
 * heure-rappel.sql pour le détail, même mécanique que
 * rendez_vous_a_rappeler() (scripts/migration-rendez-vous-rappel.sql).
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

  const { data: taches, error } = await supabase.rpc('taches_a_rappeler_heure')

  if (error) {
    console.error('rappels-taches-heure', error)
    return NextResponse.json({ erreur: error.message }, { status: 500 })
  }

  let envoyees = 0

  for (const tache of (taches ?? []) as TacheARappeler[]) {
    const titreNotif = `Tâche à faire — ${formatHeure(tache.echeance_heure)}`

    try {
      await fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          officineId: tache.officine_id,
          categorie: 'taches_echeance',
          titre: titreNotif,
          corps: tache.titre,
          url: `/liaison?onglet=taches&tache=${tache.id}`,
          // Comme rappels-taches (quotidien) : seul l'assigné, pas toute
          // l'officine — contrairement à rappels-agenda où un rendez-vous
          // concerne potentiellement toute l'équipe.
          profilIds: [tache.assigne_id],
        }),
      })
      envoyees++
    } catch (e) {
      // Une erreur réseau sur une tâche ne doit pas empêcher de traiter les
      // suivantes — même choix que rappels-taches/rappels-agenda.
      console.error('rappels-taches-heure: envoi', tache.id, e)
    }

    // Fil in-app : exhaustif, indépendant de la préférence de push (voir
    // scripts/migration-notifications-in-app-triggers.sql).
    const { error: erreurNotif } = await supabase.from('notifications').insert({
      officine_id: tache.officine_id,
      profil_id: tache.assigne_id,
      categorie: 'taches_echeance',
      titre: titreNotif,
      corps: tache.titre,
      url: `/liaison?onglet=taches&tache=${tache.id}`,
    })
    if (erreurNotif) {
      console.error('rappels-taches-heure: notification in-app', tache.id, erreurNotif)
    }

    // Marqué "envoyé" que l'appel ait réussi ou non : pas de logique de
    // retry pour cette première version, même choix que les autres crons.
    await supabase.from('taches').update({ rappel_heure_envoye: true }).eq('id', tache.id)
  }

  return NextResponse.json({ traitees: taches?.length ?? 0, envoyees })
}
