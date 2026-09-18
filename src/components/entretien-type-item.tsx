import type { TypeItemEntretien } from '@/lib/data/entretiens'

type TypeItemRenseigne = NonNullable<TypeItemEntretien>

// Le type d'un item n'est jamais porté par la couleur seule : chaque type a
// une icône ET un libellé texte, en plus de sa couleur. Uniquement des
// tokens de globals.css. Contrastes WCAG mesurés : texte du badge en `ink`
// (≥ 14:1 sur chaque fond), icônes et bordures ≥ 3:1 (rec 3,7:1 sur
// rec-soft, green 3,4:1 sur green-soft, primary 4,9:1 sur primary-soft).
const META: Record<
  TypeItemRenseigne,
  { badge: string; actionFaite: string; classeBadge: string; classeIcone: string; classeBordure: string }
> = {
  question: {
    badge: 'Question à poser',
    actionFaite: 'Question posée',
    classeBadge: 'bg-primary-soft',
    classeIcone: 'text-primary',
    classeBordure: 'border-l-4 border-primary',
  },
  explication: {
    badge: 'À expliquer',
    actionFaite: 'Point expliqué',
    classeBadge: 'bg-green-soft',
    classeIcone: 'text-green',
    classeBordure: 'border-l-4 border-green',
  },
  alerte: {
    badge: 'Signal d’alerte',
    actionFaite: 'Signal vérifié',
    classeBadge: 'border border-rec bg-surface',
    classeIcone: 'text-rec',
    classeBordure: 'border-l-4 border-rec',
  },
}

export const LIBELLE_ACTION_NON_TYPE = 'Étape faite'

// Libellé accessible de la case à cocher, adapté au type de l'item.
export function libelleActionItem(type: TypeItemEntretien): string {
  return type ? META[type].actionFaite : LIBELLE_ACTION_NON_TYPE
}

// Options du sélecteur de type (mode Édition). La valeur vide = non typé.
export const OPTIONS_TYPE_ITEM: { valeur: TypeItemRenseigne | ''; label: string }[] = [
  { valeur: '', label: 'Non typé' },
  { valeur: 'question', label: 'Question' },
  { valeur: 'explication', label: 'À expliquer' },
  { valeur: 'alerte', label: 'Alerte' },
]

export function typeItemDepuisValeur(valeur: string): TypeItemEntretien {
  return valeur === 'question' || valeur === 'explication' || valeur === 'alerte' ? valeur : null
}

// Classes de la ligne d'un item en mode Entretien. Non typé : rendu neutre
// d'origine. Coché : fond neutre et texte `muted` (5,2:1 sur bg, toujours
// lisible) — y compris pour l'alerte, dont le fond teinté serait sinon sous
// 4,5:1 avec du texte `muted` (4,3:1). Le trait latéral du type reste.
export function classesLigneItem(type: TypeItemEntretien, coche: boolean): string {
  if (!type) return 'bg-bg'
  const { classeBordure } = META[type]
  if (type === 'alerte' && !coche) return 'border-2 border-rec bg-rec-soft'
  return `bg-bg ${classeBordure}`
}

function IconeType({ type }: { type: TypeItemRenseigne }) {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {type === 'question' && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </>
      )}
      {type === 'explication' && (
        <>
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </>
      )}
      {type === 'alerte' && (
        <>
          <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </>
      )}
    </svg>
  )
}

// Badge « type » : icône + libellé texte (+ consigne d'orientation pour
// l'alerte, le type le plus marqué visuellement).
export function BadgeTypeItem({ type }: { type: TypeItemRenseigne }) {
  const meta = META[type]
  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1 text-[12px] font-semibold leading-tight text-ink ${meta.classeBadge}`}
    >
      <span className={meta.classeIcone}>
        <IconeType type={type} />
      </span>
      <span>
        {meta.badge}
        {type === 'alerte' && <span className="font-bold"> · à orienter vers le médecin</span>}
      </span>
    </span>
  )
}
