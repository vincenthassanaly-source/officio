// Edge Function "envoyer-rappels-taches" — remplace le cron Vercel
// quotidien (ancien src/app/api/cron/rappels-taches/route.ts, supprimé).
// Appelée toutes les minutes par pg_cron + pg_net, voir
// scripts/migration-cron-rappels-taches-2026-09-06.sql.
//
// Contrairement aux autres déclencheurs de notification (messages, tâches
// assignées/non assignées, notes, agenda), qui passent tous par l'Edge
// Function send-push, celle-ci est AUTONOME : elle réimplémente elle-même
// l'envoi Web Push (pattern repris du projet Kilio de Vincent, fonction
// envoyer-rappels-taches). send-push reste inchangée pour les autres flux.
// Voir RAPPORT-cron-rappels-taches-2026-09-06.md pour le détail de cet
// écart et pourquoi il est délibéré (pg_cron appelle une Edge Function en
// HTTP direct ; ajouter un second saut HTTP vers send-push n'apporterait
// rien).
//
// Couvre les deux cas fusionnés de l'ancien cron quotidien, comme deux
// branches mutuellement exclusives (voir les fonctions SQL
// taches_a_rappeler_heure / taches_a_rappeler_echeance_jour) :
//   - échéance aujourd'hui, sans heure précise
//   - échéance avec une heure précise (echeance_heure)
//
// Le fuseau Europe/Paris et le changement heure d'été/hiver (DST) sont
// gérés côté SQL via `at time zone 'Europe/Paris'` (base de fuseaux native
// de Postgres), pas ici en JS — Officio a déjà ce pattern ailleurs
// (rendez_vous_a_rappeler, ex-taches_a_rappeler_heure), contrairement à
// Kilio qui n'avait pas de fonction SQL équivalente à réutiliser et a dû
// réimplémenter le calcul de fuseau via Intl.DateTimeFormat côté Deno.

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type TacheHeure = {
  id: string
  officine_id: string
  titre: string
  assigne_id: string
  echeance_heure: string
}

type TacheJour = {
  id: string
  officine_id: string
  titre: string
  assigne_id: string
  echeance: string
}

type Candidat = {
  id: string
  officineId: string
  assigneId: string
  titreNotif: string
  corps: string
  marquer: () => Promise<{ error: { message: string } | null }>
}

// 'HH:MM:SS' -> 'HHhMM'
function formatHeure(echeanceHeure: string): string {
  return echeanceHeure.slice(0, 5).replace(':', 'h')
}

function reponseJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async () => {
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  const vapidConfigured = Boolean(vapidPublicKey && vapidPrivateKey && vapidSubject)
  if (vapidConfigured) {
    webpush.setVapidDetails(vapidSubject!, vapidPublicKey!, vapidPrivateKey!)
  }

  const [{ data: tachesHeure, error: erreurHeure }, { data: tachesJour, error: erreurJour }] =
    await Promise.all([
      supabase.rpc('taches_a_rappeler_heure'),
      supabase.rpc('taches_a_rappeler_echeance_jour'),
    ])

  if (erreurHeure) return reponseJson({ erreur: erreurHeure.message }, 500)
  if (erreurJour) return reponseJson({ erreur: erreurJour.message }, 500)

  const candidats: Candidat[] = [
    ...((tachesHeure as TacheHeure[]) ?? []).map((t) => ({
      id: t.id,
      officineId: t.officine_id,
      assigneId: t.assigne_id,
      titreNotif: `Tâche à faire — ${formatHeure(t.echeance_heure)}`,
      corps: t.titre,
      marquer: () =>
        supabase.from('taches').update({ rappel_heure_envoye: true }).eq('id', t.id),
    })),
    ...((tachesJour as TacheJour[]) ?? []).map((t) => ({
      id: t.id,
      officineId: t.officine_id,
      assigneId: t.assigne_id,
      titreNotif: "Échéance aujourd'hui",
      corps: t.titre,
      marquer: () =>
        supabase
          .from('taches')
          .update({ rappel_echeance_envoye_le: t.echeance })
          .eq('id', t.id),
    })),
  ]

  if (candidats.length === 0) {
    return reponseJson({ traitees: 0, envoyes: 0, echecs: 0, supprimes: 0 })
  }

  // Préférences : opt-out par catégorie 'taches_echeance', même convention
  // que send-push (actif par défaut si aucune ligne).
  const assigneIds = [...new Set(candidats.map((c) => c.assigneId))]
  const officineIds = [...new Set(candidats.map((c) => c.officineId))]

  const { data: preferences, error: erreurPrefs } = await supabase
    .from('notification_preferences')
    .select('profil_id, officine_id, active')
    .eq('categorie', 'taches_echeance')
    .in('profil_id', assigneIds)
    .in('officine_id', officineIds)

  if (erreurPrefs) return reponseJson({ erreur: erreurPrefs.message }, 500)

  const desactives = new Set(
    (preferences ?? [])
      .filter((p) => !p.active)
      .map((p) => `${p.officine_id}:${p.profil_id}`)
  )

  let envoyes = 0
  let echecs = 0
  const aSupprimer = new Set<string>()

  for (const candidat of candidats) {
    const url = `/liaison?onglet=taches&tache=${candidat.id}`

    // Fil in-app : exhaustif, indépendant de la préférence de push (même
    // convention que l'ancienne route et que send-push).
    const { error: erreurNotif } = await supabase.from('notifications').insert({
      officine_id: candidat.officineId,
      profil_id: candidat.assigneId,
      categorie: 'taches_echeance',
      titre: candidat.titreNotif,
      corps: candidat.corps,
      url,
    })
    if (erreurNotif) {
      console.error('envoyer-rappels-taches: notification in-app', candidat.id, erreurNotif)
    }

    const desactive = desactives.has(`${candidat.officineId}:${candidat.assigneId}`)

    if (!desactive && vapidConfigured) {
      const { data: abonnements, error: erreurAbos } = await supabase
        .from('push_subscriptions')
        .select('id, endpoint, p256dh, auth')
        .eq('officine_id', candidat.officineId)
        .eq('profil_id', candidat.assigneId)

      if (erreurAbos) {
        console.error('envoyer-rappels-taches: abonnements', candidat.id, erreurAbos)
      } else {
        const payload = JSON.stringify({
          titre: candidat.titreNotif,
          corps: candidat.corps,
          url,
        })

        await Promise.all(
          (abonnements ?? []).map(async (abo) => {
            try {
              await webpush.sendNotification(
                { endpoint: abo.endpoint, keys: { p256dh: abo.p256dh, auth: abo.auth } },
                payload
              )
              envoyes++
            } catch (e) {
              echecs++
              const statusCode = (e as { statusCode?: number })?.statusCode
              if (statusCode === 404 || statusCode === 410) {
                aSupprimer.add(abo.id as string)
              }
            }
          })
        )
      }
    }

    // Marqué "envoyé" que l'envoi push ait réussi, échoué ou été sauté
    // (préférence désactivée, secrets VAPID absents) : la cadence à la
    // minute ne laisse pas de valeur à retenter, le fil in-app fait déjà
    // foi de manière exhaustive.
    const { error: erreurMarquage } = await candidat.marquer()
    if (erreurMarquage) {
      console.error('envoyer-rappels-taches: marquage', candidat.id, erreurMarquage)
    }
  }

  if (aSupprimer.size > 0) {
    await supabase.from('push_subscriptions').delete().in('id', [...aSupprimer])
  }

  return reponseJson({
    traitees: candidats.length,
    envoyes,
    echecs,
    supprimes: aSupprimer.size,
  })
})
