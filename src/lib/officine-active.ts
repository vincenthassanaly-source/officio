import { cookies } from 'next/headers'

const COOKIE_NAME = 'officine_active'

export async function lireOfficineActiveCookie(): Promise<string | null> {
  const store = await cookies()
  return store.get(COOKIE_NAME)?.value ?? null
}

export async function ecrireOfficineActiveCookie(officineId: string) {
  const store = await cookies()
  store.set(COOKIE_NAME, officineId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  })
}

export async function effacerOfficineActiveCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}
