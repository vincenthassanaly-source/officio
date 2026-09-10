import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Appelée en fetch brut depuis public/sw.js (notificationclick) : un service
// worker ne peut pas invoquer une server action (marquerNotificationLue()
// dans src/app/actions/notifications.ts), d'où cette Route Handler dédiée.
// Même effet, même garde : RLS (`notifications_update`, profil_id =
// auth.uid()) borne déjà l'update à l'utilisateur courant, aucun
// officine_id/profil_id à revérifier ici.
export async function POST(request: Request) {
  let id: unknown
  try {
    ;({ id } = await request.json())
  } catch {
    return NextResponse.json({ erreur: 'JSON invalide.' }, { status: 400 })
  }

  if (typeof id !== 'string' || !id) {
    return NextResponse.json({ erreur: 'id requis.' }, { status: 400 })
  }

  const supabase = await createClient()
  const { error } = await supabase.from('notifications').update({ lu: true }).eq('id', id)

  if (error) return NextResponse.json({ erreur: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
