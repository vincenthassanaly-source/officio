import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function RejoindrePage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const { code } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/inscription?invite=${encodeURIComponent(code)}`)
  }

  redirect(`/bienvenue?invite=${encodeURIComponent(code)}`)
}
