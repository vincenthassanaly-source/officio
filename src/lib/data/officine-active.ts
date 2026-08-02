import { cache } from 'react'
import { getMesAdhesions, type Adhesion } from './adhesions'
import { lireOfficineActiveCookie } from '@/lib/officine-active'

export const getOfficineActive = cache(async (): Promise<Adhesion | null> => {
  const adhesions = await getMesAdhesions()
  if (adhesions.length === 0) return null

  const cookieId = await lireOfficineActiveCookie()
  return adhesions.find((a) => a.officine_id === cookieId) ?? adhesions[0]
})
