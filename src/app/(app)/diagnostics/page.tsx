import { redirect } from 'next/navigation'
import { getOfficineActive } from '@/lib/data/officine-active'
import { getErreursClientRecentes } from '@/lib/data/erreurs-client'
import { LienRetour } from '@/components/lien-retour'

// Accès restreint au titulaire de l'officine active : même garde-fou que la
// policy client_errors_select (scripts/migration-client-errors.sql), mais
// vérifiée ici pour renvoyer un écran cohérent plutôt qu'une liste vide.
export default async function DiagnosticsPage() {
  const officine = await getOfficineActive()
  if (!officine || officine.role !== 'titulaire') redirect('/')

  const erreurs = await getErreursClientRecentes(officine.officine_id)

  return (
    <>
      <LienRetour />
      <h1 className="mb-1 font-heading text-2xl text-ink">Diagnostics</h1>
      <p className="mb-4 text-[12.5px] text-muted">Les 50 erreurs les plus récentes rencontrées dans l&rsquo;appli.</p>

      <div className="flex flex-col gap-2.5">
        {erreurs.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">Aucune erreur récente.</p>
        ) : (
          erreurs.map((e) => (
            <div key={e.id} className="rounded-[20px] bg-surface shadow-card p-3.5">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[13px] font-semibold text-ink">{e.message}</span>
                <span className="shrink-0 text-[10.5px] text-muted">
                  {new Date(e.createdAt).toLocaleString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              {e.stackPremiereLigne && (
                <p className="mt-1 truncate font-mono text-[11px] text-muted">{e.stackPremiereLigne}</p>
              )}
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10.5px] text-muted">
                {e.url && <span className="truncate">{e.url}</span>}
                {e.digest && <span className="shrink-0 rounded-full bg-neutral-soft px-2 py-0.5">{e.digest}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </>
  )
}
