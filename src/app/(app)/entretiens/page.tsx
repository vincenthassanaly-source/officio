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

// Version stub : uniquement le sélecteur, pas de persistance (pas de table,
// pas de server action) — le module sera complété plus tard.
export default function EntretiensPage() {
  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Entretiens pharmaceutiques</h1>

      <div className="rounded-[20px] bg-surface shadow-card p-4">
        <select
          name="type_entretien"
          defaultValue=""
          className="w-full rounded-xl border border-border bg-bg px-3 py-2.5 text-[13px] text-ink outline-none focus:border-primary"
        >
          <option value="" disabled>
            Sélectionner un type d&rsquo;entretien
          </option>
          {TYPES_ENTRETIEN.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </div>
    </>
  )
}
