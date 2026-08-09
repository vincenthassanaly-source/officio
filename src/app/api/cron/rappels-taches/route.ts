import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Cron quotidien (voir vercel.json) : rappelle aux personnes assignées les
 * tâches non terminées dont l'échéance est aujourd'hui. Ne concerne que les
 * tâches avec une échéance ET un assigné — pas de rappel pour une tâche non
 * assignée (personne à qui l'envoyer) ni sans échéance (rien à rappeler).
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
    .select('id, officine_id, titre, assigne_id')
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
    const titreNotif = "Échéance aujourd'hui"

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
          url: '/liaison',
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
      url: '/liaison',
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
