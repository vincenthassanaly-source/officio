'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatDateCourte } from '@/lib/dates'

const DELAI_DEBOUNCE_MS = 300
const LONGUEUR_MIN_RECHERCHE = 3
const MAX_RESULTATS = 20

type ResultatBdpm = {
  cis: string
  denomination: string
  forme_pharmaceutique: string | null
  lien_bdpm: string
  updated_at: string
}

function IconExterne({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </svg>
  )
}

function LiensCrat({ terme }: { terme: string }) {
  const [copie, setCopie] = useState(false)

  return (
    <div className="flex flex-col gap-2.5 rounded-[20px] bg-surface shadow-card p-3.5">
      <div className="text-[13.5px] font-semibold text-ink">Vérifier sur le CRAT</div>
      <p className="text-[12.5px] leading-relaxed text-muted">
        Le CRAT (Centre de Référence sur les Agents Tératogènes) n&rsquo;a pas de lien direct par produit — copiez
        le terme puis collez-le dans son moteur de recherche.
      </p>

      <div className="flex items-center gap-2">
        <span className="flex-1 truncate rounded-xl border border-border bg-bg px-3 py-2 text-[13px] text-ink">
          {terme}
        </span>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(terme)
            setCopie(true)
            setTimeout(() => setCopie(false), 2000)
          }}
          className="shrink-0 rounded-xl bg-primary-soft px-3 py-2 text-[12.5px] font-semibold text-primary"
        >
          {copie ? 'Copié ✓' : 'Copier'}
        </button>
      </div>

      <div className="flex flex-col gap-1.5">
        <a
          href="https://www.lecrat.fr/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[13px] font-semibold text-primary"
        >
          <IconExterne className="h-3.5 w-3.5" />
          Ouvrir lecrat.fr
        </a>
        <a
          href={`https://www.google.com/search?q=site:lecrat.fr+${encodeURIComponent(terme)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-[12px] text-muted"
        >
          <IconExterne className="h-3 w-3" />
          Lien de secours (recherche Google sur lecrat.fr)
        </a>
      </div>
    </div>
  )
}

export function GrossesseAllaitementRecherche() {
  const [terme, setTerme] = useState('')
  const [resultats, setResultats] = useState<ResultatBdpm[]>([])
  const [erreur, setErreur] = useState(false)
  // Terme correspondant aux `resultats`/`erreur` actuels : tant qu'il diffère
  // du terme saisi, la recherche est en cours (évite un setState synchrone
  // dans le corps de l'effet, qui déclenche des rendus en cascade — le
  // chargement se déduit plutôt de cet écart).
  const [termeRecherche, setTermeRecherche] = useState('')

  const termeNettoye = terme.trim()
  const rechercheActive = termeNettoye.length >= LONGUEUR_MIN_RECHERCHE
  const chargement = rechercheActive && termeRecherche !== termeNettoye

  useEffect(() => {
    if (termeNettoye.length < LONGUEUR_MIN_RECHERCHE) return

    const minuteur = setTimeout(() => {
      const supabase = createClient()
      supabase
        .from('bdpm_index')
        .select('cis, denomination, forme_pharmaceutique, lien_bdpm, updated_at')
        .ilike('denomination', `%${termeNettoye}%`)
        .order('denomination')
        .limit(MAX_RESULTATS)
        .then(({ data, error }) => {
          if (error) {
            console.error('grossesse-allaitement: recherche', error)
            setErreur(true)
            setResultats([])
          } else {
            setErreur(false)
            setResultats(data ?? [])
          }
          setTermeRecherche(termeNettoye)
        })
    }, DELAI_DEBOUNCE_MS)

    return () => clearTimeout(minuteur)
  }, [termeNettoye])

  const aucunResultat = rechercheActive && !chargement && !erreur && resultats.length === 0

  return (
    <div className="flex flex-1 flex-col gap-3">
      <div className="rounded-2xl border border-rec bg-rec-soft px-3.5 py-3 text-[12.5px] leading-relaxed text-rec">
        <span className="font-bold">Officio ne donne aucun verdict de sécurité.</span> Ce module se contente de
        pointer vers les sources officielles — consultez-les systématiquement avant tout conseil au comptoir.
      </div>

      <input
        value={terme}
        onChange={(e) => setTerme(e.target.value)}
        placeholder="Nom du produit (3 caractères minimum)…"
        className="rounded-xl border border-border bg-bg px-3 py-2.5 text-[13.5px] text-ink outline-none focus:border-primary"
      />

      {termeNettoye.length > 0 && termeNettoye.length < LONGUEUR_MIN_RECHERCHE && (
        <p className="text-[12px] text-muted">Continuez à taper (3 caractères minimum)…</p>
      )}

      {rechercheActive && chargement && <p className="text-[12.5px] text-muted">Recherche…</p>}

      {rechercheActive && !chargement && erreur && (
        <p className="rounded-xl bg-rec-soft px-3 py-2 text-[12.5px] text-rec">La recherche a échoué — réessayez.</p>
      )}

      {rechercheActive && !chargement && resultats.length > 0 && (
        <div className="flex flex-col gap-2">
          {resultats.map((r) => (
            <a
              key={r.cis}
              href={r.lien_bdpm}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col gap-1 rounded-[20px] bg-surface shadow-card p-3.5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1 text-[13.5px] font-semibold text-ink">{r.denomination}</div>
                <IconExterne className="h-3.5 w-3.5 shrink-0 text-muted" />
              </div>
              {r.forme_pharmaceutique && <div className="text-[12px] text-muted">{r.forme_pharmaceutique}</div>}
              <div className="mt-0.5 text-[10.5px] text-muted">
                Base de Données Publique des Médicaments · MAJ {formatDateCourte(r.updated_at.slice(0, 10))}
              </div>
            </a>
          ))}
        </div>
      )}

      {aucunResultat && (
        <p className="rounded-xl bg-neutral-soft px-3 py-2.5 text-[12.5px] leading-relaxed text-muted">
          Aucune fiche médicament officielle trouvée pour ce terme — vérifiez sur CRAT ou s&rsquo;il s&rsquo;agit
          d&rsquo;un complément/produit de parapharmacie, aucune base officielle structurée n&rsquo;existe,
          consultez CRAT et/ou l&rsquo;ANSES (nutrivigilance) manuellement.
        </p>
      )}

      {rechercheActive && <LiensCrat terme={termeNettoye} />}
    </div>
  )
}
