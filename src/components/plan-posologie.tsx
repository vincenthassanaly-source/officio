'use client'

import { useMemo, useState } from 'react'
import { reinitialiserPlanPosologie } from '@/app/actions/plan-posologie'
import type { LigneMedicament } from '@/lib/data/plan-posologie'

const CHAMP_CLASS =
  'rounded-xl border border-border bg-bg px-3 py-2.5 text-[16px] text-ink outline-none focus:border-primary'

const CHAMP_MOMENT_CLASS =
  'w-full rounded-lg border border-border bg-bg px-2 py-2 text-center text-[15px] text-ink outline-none focus:border-primary'

type MomentPrise = 'matin' | 'midi' | 'soir' | 'coucher'

const MOMENTS: [MomentPrise, string][] = [
  ['matin', 'Matin'],
  ['midi', 'Midi'],
  ['soir', 'Soir'],
  ['coucher', 'Coucher'],
]

function nouvelleLigne(): LigneMedicament {
  return {
    id: crypto.randomUUID(),
    nom: '',
    matin: '',
    midi: '',
    soir: '',
    coucher: '',
    instructions: '',
    duree: '',
  }
}

function dateDuJour(): string {
  return new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function PlanPosologie({
  nomOfficine,
  lignesInitiales,
}: {
  nomOfficine: string
  lignesInitiales: LigneMedicament[]
}) {
  const [lignes, setLignes] = useState<LigneMedicament[]>(() =>
    lignesInitiales.length > 0 ? lignesInitiales : [nouvelleLigne()]
  )

  function ajouterLigne() {
    setLignes((l) => [...l, nouvelleLigne()])
  }

  function supprimerLigne(id: string) {
    setLignes((l) => (l.length > 1 ? l.filter((ligne) => ligne.id !== id) : l))
  }

  function modifierLigne(id: string, champs: Partial<Omit<LigneMedicament, 'id'>>) {
    setLignes((l) => l.map((ligne) => (ligne.id === id ? { ...ligne, ...champs } : ligne)))
  }

  const lignesRenseignees = useMemo(() => lignes.filter((l) => l.nom.trim() !== ''), [lignes])

  async function reinitialiser() {
    setLignes([nouvelleLigne()])
    await reinitialiserPlanPosologie()
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex flex-col gap-3 print:hidden">
        <div className="flex flex-col gap-2">
          {lignes.map((ligne, index) => (
            <div key={ligne.id} className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={ligne.nom}
                  onChange={(e) => modifierLigne(ligne.id, { nom: e.target.value })}
                  placeholder={`Médicament ${index + 1} (ex. Doliprane 1000mg)`}
                  className={`min-w-0 flex-1 ${CHAMP_CLASS}`}
                />
                <button
                  type="button"
                  onClick={() => supprimerLigne(ligne.id)}
                  disabled={lignes.length <= 1}
                  aria-label="Supprimer ce médicament"
                  className="shrink-0 text-muted hover:text-rec disabled:opacity-30"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {MOMENTS.map(([champ, libelle]) => (
                  <div key={champ}>
                    <label className="mb-1 block text-center text-[10px] font-semibold uppercase tracking-wide text-muted">
                      {libelle}
                    </label>
                    <input
                      type="text"
                      value={ligne[champ]}
                      onChange={(e) => modifierLigne(ligne.id, { [champ]: e.target.value })}
                      placeholder="—"
                      className={CHAMP_MOMENT_CLASS}
                    />
                  </div>
                ))}
              </div>

              <input
                type="text"
                value={ligne.instructions}
                onChange={(e) => modifierLigne(ligne.id, { instructions: e.target.value })}
                placeholder="Instructions particulières (ex. à jeun, pendant le repas)"
                className={`w-full ${CHAMP_CLASS}`}
              />

              <input
                type="text"
                value={ligne.duree}
                onChange={(e) => modifierLigne(ligne.id, { duree: e.target.value })}
                placeholder="Durée du traitement (ex. 7 jours, en continu)"
                className={`w-full ${CHAMP_CLASS}`}
              />
            </div>
          ))}
        </div>

        <button type="button" onClick={ajouterLigne} className="self-start text-xs font-semibold text-primary">
          + Ajouter un médicament
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="self-start rounded-xl bg-primary px-4 py-2.5 text-[13px] font-semibold text-white"
          >
            Imprimer le plan
          </button>
          <button
            type="button"
            onClick={reinitialiser}
            className="self-start rounded-xl border border-border px-4 py-2.5 text-[13px] font-semibold text-ink"
          >
            Réinitialiser
          </button>
        </div>
      </div>

      {/* Aperçu imprimable : rendu en temps réel à l'écran, et seul élément
          visible à l'impression (voir globals.css, règle .plan-posologie-impression). */}
      <div className="plan-posologie-impression rounded-[20px] bg-surface shadow-card p-4 print:rounded-none print:p-0 print:shadow-none">
        <div className="mb-4 flex items-start justify-between gap-3 print:mb-6">
          <h2 className="font-heading text-lg font-bold text-ink">Plan de posologie</h2>
          <p className="shrink-0 text-[12.5px] text-muted">{dateDuJour()}</p>
        </div>

        {lignesRenseignees.length === 0 ? (
          <p className="text-[13px] text-muted">Ajoutez un médicament pour générer l&apos;aperçu du plan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[12.5px] print:text-[11px]">
              <thead>
                <tr>
                  <th className="border border-border p-2 text-left font-semibold text-ink">Médicament</th>
                  <th className="border border-border p-2 text-center font-semibold text-ink">Matin</th>
                  <th className="border border-border p-2 text-center font-semibold text-ink">Midi</th>
                  <th className="border border-border p-2 text-center font-semibold text-ink">Soir</th>
                  <th className="border border-border p-2 text-center font-semibold text-ink">Coucher</th>
                  <th className="border border-border p-2 text-left font-semibold text-ink">Instructions</th>
                  <th className="border border-border p-2 text-left font-semibold text-ink">Durée</th>
                </tr>
              </thead>
              <tbody>
                {lignesRenseignees.map((ligne) => (
                  <tr key={ligne.id}>
                    <td className="border border-border p-2 font-medium text-ink">{ligne.nom.trim()}</td>
                    <td className="border border-border p-2 text-center text-ink">{ligne.matin.trim() || '—'}</td>
                    <td className="border border-border p-2 text-center text-ink">{ligne.midi.trim() || '—'}</td>
                    <td className="border border-border p-2 text-center text-ink">{ligne.soir.trim() || '—'}</td>
                    <td className="border border-border p-2 text-center text-ink">{ligne.coucher.trim() || '—'}</td>
                    <td className="border border-border p-2 text-ink">{ligne.instructions.trim() || '—'}</td>
                    <td className="border border-border p-2 text-ink">{ligne.duree.trim() || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="mt-4 border-t border-border pt-3 text-center text-[11.5px] text-muted">{nomOfficine}</p>
      </div>
    </div>
  )
}
