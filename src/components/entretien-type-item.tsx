import type { TypeItemEntretien } from '@/lib/data/entretiens'
import { Icone, type NomIcone } from '@/components/entretien-ui'

type TypeItemRenseigne = NonNullable<TypeItemEntretien>

// Le type d'un item n'est jamais porté par la couleur seule : chaque type a
// une icône ET un libellé texte, en plus de sa couleur. Uniquement des
// tokens de globals.css. Contrastes WCAG mesurés : texte en `ink` (≥ 14:1 sur
// chaque fond), icônes et bordures ≥ 3:1 (rec 3,7:1 sur rec-soft, green
// 3,4:1 sur green-soft, primary 4,9:1 sur primary-soft).
const META: Record<
  TypeItemRenseigne,
  { badge: string; actionFaite: string; classeFond: string; classeIcone: string; icone: NomIcone }
> = {
  question: {
    badge: 'Question à poser',
    actionFaite: 'Question posée',
    classeFond: 'bg-primary-soft',
    classeIcone: 'text-primary',
    icone: 'question',
  },
  explication: {
    badge: 'À expliquer',
    actionFaite: 'Point expliqué',
    classeFond: 'bg-green-soft',
    classeIcone: 'text-green',
    icone: 'explication',
  },
  alerte: {
    badge: 'Signal d’alerte',
    actionFaite: 'Signal vérifié',
    classeFond: 'border border-rec bg-surface',
    classeIcone: 'text-rec',
    icone: 'alerte',
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

// Classes de la ligne d'un item en mode Entretien. Non typé, question et
// explication : fond neutre (le badge porte le type). Alerte : l'élément le
// plus marqué de l'écran (fond teinté et bordure de 2 px sur tout le
// contour). Coché : fond neutre et texte `muted` (5,2:1 sur bg, toujours
// lisible) — y compris pour l'alerte, dont le fond teinté serait sinon sous
// 4,5:1 avec du texte `muted` (4,3:1) ; son badge reste. La bordure
// transparente garde les lignes strictement alignées.
export function classesLigneItem(type: TypeItemEntretien, coche: boolean): string {
  if (type === 'alerte' && !coche) return 'border-2 border-rec bg-rec-soft'
  return 'border-2 border-transparent bg-bg'
}

// Badge « type » : icône + libellé texte.
// - « pastille » (défaut) : sur sa propre ligne, avec la consigne d'orientation
//   pour l'alerte (mode Édition).
// - « inline » : compact, à poser devant le texte de l'item (question et
//   explication en mode Entretien : évite une ligne de badge par item sur un
//   script de 45 questions).
export function BadgeTypeItem({
  type,
  variante = 'pastille',
}: {
  type: TypeItemRenseigne
  variante?: 'pastille' | 'inline'
}) {
  const meta = META[type]

  if (variante === 'inline') {
    return (
      <span
        className={`mr-1.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-baseline text-[12px] font-semibold leading-tight text-ink ${meta.classeFond}`}
      >
        <Icone nom={meta.icone} taille={14} className={meta.classeIcone} />
        {meta.badge}
      </span>
    )
  }

  return (
    <span
      className={`inline-flex w-fit max-w-full items-center gap-1.5 rounded-xl px-2.5 py-1 text-[12px] font-semibold leading-tight text-ink ${meta.classeFond}`}
    >
      <Icone nom={meta.icone} taille={16} className={meta.classeIcone} />
      <span>
        {meta.badge}
        {type === 'alerte' && <span className="font-bold"> · à orienter vers le médecin</span>}
      </span>
    </span>
  )
}

// En-tête d'un item d'alerte en mode Entretien : icône plus grande, libellé
// en gras et consigne d'orientation sur sa propre ligne.
export function EnteteAlerte() {
  return (
    <span className="flex flex-col gap-0.5 leading-tight text-ink">
      <span className="inline-flex items-center gap-1.5 text-[14px] font-bold">
        <Icone nom="alerte" taille={20} className="text-rec" />
        {META.alerte.badge}
      </span>
      <span className="text-[13px] font-semibold">À orienter vers le médecin</span>
    </span>
  )
}
