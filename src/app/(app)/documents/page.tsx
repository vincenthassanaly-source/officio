import { getOfficineActive } from '@/lib/data/officine-active'
import { getDocuments } from '@/lib/data/documents'
import { DocumentsList } from '@/components/documents-list'

export default async function DocumentsPage() {
  const officine = await getOfficineActive()
  if (!officine) return null

  const documents = await getDocuments(officine.officine_id)

  return (
    <>
      <h1 className="mb-4 font-heading text-2xl text-ink">Documents</h1>
      <DocumentsList documents={documents} />
    </>
  )
}
