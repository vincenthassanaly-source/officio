import { LienRetour } from '@/components/lien-retour'

// Types d'entretiens conventionnés, dans l'ordre attendu à l'écran.
const TYPES_ENTRETIEN = [
  'Entretien AVK',
  'Entretien AOD',
  'Entretien asthme',
  'Bilan Partagé de Médication (BPM)',
  'Entretien anticancéreux oraux',
  'Entretien femme enceinte',
  'Entretien opioïdes',
  'Bilan de prévention',
] as const

// Version stub : un menu déroulant par type d'entretien, pas de persistance
// (pas de table, pas de server action) — chaque menu reste vide (aucune
// option sélectionnable) jusqu'à ce que le module soit complété.
export default function EntretiensPage() {
  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Entretiens pharmaceutiques</h1>

      <div className="flex flex-col gap-3">
        {TYPES_ENTRETIEN.map((type) => (
          <div key={type} className="rounded-[20px] bg-surface shadow-card p-4">
            <label htmlFor={`entretien-${type}`} className="mb-2 block text-[13.5px] font-semibold text-ink">
              {type}
            </label>
            <select
              id={`entretien-${type}`}
              name={`entretien_${type}`}
              defaultValue=""
              className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
            >
              <option value="" disabled>
                Aucun entretien pour l&rsquo;instant
              </option>
            </select>
          </div>
        ))}
      </div>
    </>
  )
}
