import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

// 'HH:MM:SS' -> 'HHhMM'
function formatHeure(echeanceHeure: string): string {
  return echeanceHeure.slice(0, 5).replace(':', 'h')
}

/**
 * Cron quotidien (voir vercel.json) : rappelle aux personnes assignées les
 * tâches non terminées dont l'échéance est aujourd'hui. Ne concerne que les
 * tâches avec une échéance ET un assigné — pas de rappel pour une tâche non
 * assignée (personne à qui l'envoyer) ni sans échéance (rien à rappeler).
 *
 * Couvre aussi les tâches avec une heure de rappel (`echeance_heure`) : il
 * n'y a plus de cron dédié toutes les 15 minutes pour ça (le plan Vercel
 * Hobby limite chaque cron à 1 exécution/jour, ce qui rendait cette cadence
 * invalide et bloquait tout déploiement — voir git log). Le rappel n'arrive
 * donc plus pile à l'heure choisie mais au moment de ce cron quotidien, avec
 * un message qui rappelle l'heure prévue.
 *
 * Exécuté par Vercel Cron : GET, protégé par le header Authorization que
 * Vercel ajoute automatiquement dès que la variable d'environnement
 * CRON_SECRET est définie sur le projet.
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

  // Le cron tourne à 7h UTC (voir vercel.json), soit 8-9h heure de Paris
  // selon l'heure d'été/hiver — largement après minuit à Paris, donc la
  // date UTC du moment correspond toujours à la date du jour à Paris (pas
  // de risque de décalage de date entre les deux fuseaux à cette heure-là).
  const aujourdhui = new Date().toISOString().slice(0, 10)

  const { data: taches, error } = await supabase
    .from('taches')
    .select('id, officine_id, titre, assigne_id, echeance_heure')
    .eq('statut', 'a_faire')
    .eq('echeance', aujourdhui)
    .not('assigne_id', 'is', null)
    .or(`rappel_echeance_envoye_le.is.null,rappel_echeance_envoye_le.neq.${aujourdhui}`)

  if (error) {
    console.error('rappels-taches', error)
    return NextResponse.json({ erreur: error.message }, { status: 500 })
  }

  let envoyees = 0

  for (const tache of taches ?? []) {
    const titreNotif = tache.echeance_heure
      ? `Tâche à faire — ${formatHeure(tache.echeance_heure)}`
      : "Échéance aujourd'hui"
    const urlNotif = `/liaison?onglet=taches&tache=${tache.id}`

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
          url: urlNotif,
          profilIds: [tache.assigne_id],
        }),
      })
      envoyees++
    } catch (e) {
      // Une erreur réseau sur une tâche ne doit pas empêcher de traiter
      // les suivantes, ni de marquer celle-ci comme traitée (pas de
      // logique de retry pour cette première version — cf. contraintes).
      console.error('rappels-taches: envoi', tache.id, e)
    }

    // Fil in-app : exhaustif, indépendant de la préférence de push (voir
    // scripts/migration-notifications-in-app-triggers.sql).
    const { error: erreurNotif } = await supabase.from('notifications').insert({
      officine_id: tache.officine_id,
      profil_id: tache.assigne_id,
      categorie: 'taches_echeance',
      titre: titreNotif,
      corps: tache.titre,
      url: urlNotif,
    })
    if (erreurNotif) {
      console.error('rappels-taches: notification in-app', tache.id, erreurNotif)
    }

    // Marqué "envoyé" que l'appel ait réussi ou non : le cron ne tourne
    // qu'une fois par jour, pas de valeur à retenter dans la même journée.
    await supabase
      .from('taches')
      .update({ rappel_echeance_envoye_le: aujourdhui })
      .eq('id', tache.id)
  }

  return NextResponse.json({ traitees: taches?.length ?? 0, envoyees })
}
