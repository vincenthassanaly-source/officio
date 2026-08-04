import { getOfficineActive } from '@/lib/data/officine-active'
import { getContacts } from '@/lib/data/contacts'
import { CarnetAdresses } from '@/components/carnet-adresses'

export default async function CarnetPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const contacts = await getContacts(officine.officine_id)

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Carnet d&rsquo;adresses</h1>
      <CarnetAdresses contacts={contacts} />
    </>
  )
}
