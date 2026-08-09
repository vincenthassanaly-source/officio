// Edge Function "send-push" — fondations Web Push d'Officio.
//
// Reçoit une officine + une catégorie + un payload, résout les profils
// cibles (liste explicite ou toute l'officine), filtre par préférence de
// notification (opt-out : actif par défaut) puis envoie via le protocole
// Web Push (VAPID). Les abonnements qui répondent 404/410 (expirés,
// désinstallés) sont supprimés automatiquement.
//
// Aucun déclencheur métier ici : cette fonction est appelée par du code
// serveur de confiance (prochains prompts), jamais directement par le
// client. Voir NOTIFICATIONS.md pour la configuration des secrets
// (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

type CategorieNotification =
  | 'messages'
  | 'taches_assignees'
  | 'taches_non_assignees'
  | 'taches_echeance'
  | 'agenda_rappel'

const CATEGORIES_VALIDES: CategorieNotification[] = [
  'messages',
  'taches_assignees',
  'taches_non_assignees',
  'taches_echeance',
  'agenda_rappel',
]

type SendPushRequest = {
  // Toujours requis : définit le tenant (isolation) et le scope des
  // préférences de notification (elles sont enregistrées par officine).
  officineId: string
  categorie: CategorieNotification
  titre: string
  corps: string
  url?: string
  // Optionnel : restreint l'envoi à ces profils (sinon = toute l'officine).
  profilIds?: string[]
  // Optionnel : exclut ces profils (ex: l'auteur d'un message ne reçoit
  // pas de notification pour son propre message).
  exclureProfilIds?: string[]
}

function reponseJson(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function validerRequete(body: Partial<SendPushRequest>): string | null {
  if (!body || typeof body !== 'object') return 'Corps de requête manquant.'
  if (!body.officineId) return 'officineId requis.'
  if (!body.categorie || !CATEGORIES_VALIDES.includes(body.categorie)) {
    return `categorie invalide (attendu: ${CATEGORIES_VALIDES.join(', ')}).`
  }
  if (!body.titre || !body.corps) return 'titre et corps requis.'
  return null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return reponseJson({ erreur: 'Méthode non supportée, utilise POST.' }, 405)
  }

  let body: Partial<SendPushRequest>
  try {
    body = await req.json()
  } catch {
    return reponseJson({ erreur: 'JSON invalide.' }, 400)
  }

  const erreurValidation = validerRequete(body)
  if (erreurValidation) {
    return reponseJson({ erreur: erreurValidation }, 400)
  }
  const requete = body as SendPushRequest

  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')
  const vapidSubject = Deno.env.get('VAPID_SUBJECT')
  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return reponseJson(
      { erreur: 'Clés VAPID non configurées côté serveur (voir NOTIFICATIONS.md).' },
      500
    )
  }
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // 1. Profils cibles : liste explicite (intersectée avec l'officine
  // n'est pas nécessaire ici, la jointure se fait via push_subscriptions
  // plus bas) ou tous les membres de l'officine.
  let profilIds: string[]
  if (requete.profilIds && requete.profilIds.length > 0) {
    profilIds = requete.profilIds
  } else {
    const { data, error } = await supabase
      .from('adhesions')
      .select('profil_id')
      .eq('officine_id', requete.officineId)

    if (error) return reponseJson({ erreur: error.message }, 500)
    profilIds = (data ?? []).map((a) => a.profil_id as string)
  }

  const exclus = new Set(requete.exclureProfilIds ?? [])
  profilIds = profilIds.filter((id) => !exclus.has(id))

  if (profilIds.length === 0) {
    return reponseJson({ envoyes: 0, echecs: 0, supprimes: 0 })
  }

  // 2. Filtre par préférence — opt-out : actif par défaut si aucune ligne.
  const { data: preferences, error: erreurPrefs } = await supabase
    .from('notification_preferences')
    .select('profil_id, active')
    .eq('officine_id', requete.officineId)
    .eq('categorie', requete.categorie)
    .in('profil_id', profilIds)

  if (erreurPrefs) return reponseJson({ erreur: erreurPrefs.message }, 500)

  const desactives = new Set(
    (preferences ?? []).filter((p) => !p.active).map((p) => p.profil_id as string)
  )
  const profilIdsANotifier = profilIds.filter((id) => !desactives.has(id))

  if (profilIdsANotifier.length === 0) {
    return reponseJson({ envoyes: 0, echecs: 0, supprimes: 0 })
  }

  // 3. Abonnements actifs correspondants.
  const { data: abonnements, error: erreurAbos } = await supabase
    .from('push_subscriptions')
    .select('id, endpoint, p256dh, auth')
    .eq('officine_id', requete.officineId)
    .in('profil_id', profilIdsANotifier)

  if (erreurAbos) return reponseJson({ erreur: erreurAbos.message }, 500)

  const payload = JSON.stringify({
    titre: requete.titre,
    corps: requete.corps,
    url: requete.url ?? '/',
  })

  let envoyes = 0
  let echecs = 0
  const aSupprimer: string[] = []

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
          aSupprimer.push(abo.id as string)
        }
      }
    })
  )

  if (aSupprimer.length > 0) {
    await supabase.from('push_subscriptions').delete().in('id', aSupprimer)
  }

  return reponseJson({ envoyes, echecs, supprimes: aSupprimer.length })
})
