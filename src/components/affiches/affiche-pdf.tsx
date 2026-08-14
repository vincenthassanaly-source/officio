import { Document, Page, Svg, Text, Rect, Circle, Line, Path, Font, StyleSheet } from '@react-pdf/renderer'

// Couleurs et coordonnées reprises telles quelles du gabarit SVG fourni par
// l'utilisateur (210x297, unités = mm) — reproduites à l'identique plutôt
// que réinterprétées, pour rester fidèles au modèle d'origine. Constantes
// locales à ce module, indépendantes de la palette Tailwind de l'app.
export const VERT_PHARMACIE = '#063F32'
export const OR_PHARMACIE = '#C9A45C'
export const BLANC_PHARMACIE = '#FFFFFF'

// Le gabarit d'origine spécifie "Arial, Helvetica, sans-serif". La police
// Helvetica intégrée à react-pdf (une des 14 polices PDF standard, non
// embarquée) rend mal certains caractères accentés en majuscules à grande
// taille (glyphe d'accent mal positionné, ex. "CRÈME") — bug constaté à la
// vérification, pas une supposition. Arimo (Google Fonts) est un clone
// métriquement compatible d'Arial/Helvetica avec un rendu de glyphes fiable
// une fois embarqué en TTF : même style visuel, sans ce défaut. Fichiers
// auto-hébergés dans public/fonts/ (voir la note équivalente dans le
// formulaire pour pourquoi Font.register ne peut pas passer par next/font).
Font.register({
  family: 'Arimo',
  fonts: [
    { src: '/fonts/Arimo-Regular.ttf', fontWeight: 400 },
    { src: '/fonts/Arimo-Bold.ttf', fontWeight: 700 },
  ],
})

export function formatPrixAffiche(prix: number): string {
  return `${prix.toFixed(2).replace('.', ',')} €`
}

// Répartit le nom du produit sur 1 ou 2 lignes (comme le gabarit d'origine,
// qui a "NOM DU" / "PRODUIT" en dur) en coupant au mot le plus équilibré,
// plutôt que de couper au milieu d'un mot.
function repartirEnLignes(nomProduit: string): string[] {
  const texte = nomProduit.trim().toUpperCase()
  const mots = texte.split(/\s+/)
  if (mots.length <= 1 || texte.length <= 16) return [texte]

  let meilleurIndex = 1
  let meilleurEcart = Infinity
  for (let i = 1; i < mots.length; i += 1) {
    const ecart = Math.abs(mots.slice(0, i).join(' ').length - mots.slice(i).join(' ').length)
    if (ecart < meilleurEcart) {
      meilleurEcart = ecart
      meilleurIndex = i
    }
  }
  return [mots.slice(0, meilleurIndex).join(' '), mots.slice(meilleurIndex).join(' ')]
}

// Le cadre offre environ 190 unités (mm) de largeur utile pour le texte. Le
// gabarit d'origine fixe le corps à 27 pour des lignes courtes ("NOM DU",
// "PRODUIT", 6-7 caractères) : au-delà, on réduit le corps pour que la ligne
// la plus longue tienne dans cette largeur plutôt que de déborder du cadre
// (0.62 = largeur moyenne d'une capitale grasse, en fraction du corps —
// approximation empirique, pas une mesure exacte des glyphes).
const LARGEUR_UTILE_MM = 190
const RATIO_CARACTERE_GRAS = 0.62
const TAILLE_MAX_NOM = 27
const TAILLE_MIN_NOM = 13

function taillePoliceNom(lignes: string[]): number {
  const plusLongue = Math.max(...lignes.map((l) => l.length))
  const tailleAjustee = LARGEUR_UTILE_MM / (plusLongue * RATIO_CARACTERE_GRAS)
  return Math.min(TAILLE_MAX_NOM, Math.max(TAILLE_MIN_NOM, tailleAjustee))
}

// Même logique pour le prix : le corps 30 du gabarit suppose un prix à 2
// chiffres ("XX,XX €", 7 caractères) dans un encart de 162 de large.
const LARGEUR_UTILE_PRIX_MM = 130
const TAILLE_MAX_PRIX = 30
const TAILLE_MIN_PRIX = 18

function taillePolicePrix(texte: string): number {
  const tailleAjustee = LARGEUR_UTILE_PRIX_MM / (texte.length * RATIO_CARACTERE_GRAS)
  return Math.min(TAILLE_MAX_PRIX, Math.max(TAILLE_MIN_PRIX, tailleAjustee))
}

// Le typage de SVGTextProps.style (@react-pdf/types) n'expose que les
// attributs de présentation SVG (fill, stroke…), pas les propriétés de
// police — pourtant bien supportées à l'exécution par react-pdf pour un
// <Text> en contexte <Svg> (cf. leur doc "SVG Text"). Passer par
// StyleSheet.create (plutôt qu'un littéral inline) contourne l'écart de
// typage sans recourir à `any`.
const stylesTexte = StyleSheet.create({
  enseigne: { fontFamily: 'Arimo', fontWeight: 400, fontSize: 7, letterSpacing: 2 },
  nomProduit: { fontFamily: 'Arimo', fontWeight: 700, letterSpacing: 0.5 },
  prix: { fontFamily: 'Arimo', fontWeight: 700 },
})

export function AffichePDF({ nomProduit, prix }: { nomProduit: string; prix: number }) {
  const lignesNom = repartirEnLignes(nomProduit)
  const taillePolice = taillePoliceNom(lignesNom)
  // Positions verticales du gabarit d'origine (91 et 119) pour 2 lignes ;
  // centrées sur leur milieu (105) quand le nom tient sur une seule ligne.
  const positionsY = lignesNom.length === 2 ? [91, 119] : [105]

  return (
    <Document>
      <Page size="A4">
        <Svg width="100%" height="100%" viewBox="0 0 210 297">
          <Rect x={0} y={0} width={210} height={297} fill={BLANC_PHARMACIE} />

          {/* Cadre extérieur */}
          <Rect x={5} y={5} width={200} height={287} fill="none" stroke={VERT_PHARMACIE} strokeWidth={0.6} />

          {/* Logo / symbole pharmacie */}
          <Circle cx={105} cy={28} r={11} fill={VERT_PHARMACIE} stroke={OR_PHARMACIE} strokeWidth={0.8} />
          <Rect x={102.5} y={20.5} width={5} height={15} fill={OR_PHARMACIE} />
          <Rect x={97.5} y={25.5} width={15} height={5} fill={OR_PHARMACIE} />

          {/* Nom de la pharmacie */}
          <Line x1={22} y1={46} x2={43} y2={46} stroke={OR_PHARMACIE} strokeWidth={0.7} />
          <Text x={105} y={48} textAnchor="middle" style={stylesTexte.enseigne} fill={VERT_PHARMACIE}>
            PHARMACIE ROME VILLAGE
          </Text>
          <Line x1={167} y1={46} x2={188} y2={46} stroke={OR_PHARMACIE} strokeWidth={0.7} />

          {/* Nom du produit */}
          {lignesNom.map((ligne, index) => (
            <Text
              key={ligne + index}
              x={105}
              y={positionsY[index]}
              textAnchor="middle"
              style={[stylesTexte.nomProduit, { fontSize: taillePolice }]}
              fill={VERT_PHARMACIE}
            >
              {ligne}
            </Text>
          ))}

          {/* Séparateur */}
          <Line x1={68} y1={137} x2={94} y2={137} stroke={OR_PHARMACIE} strokeWidth={0.7} />
          <Circle cx={105} cy={137} r={1.5} fill={OR_PHARMACIE} />
          <Line x1={116} y1={137} x2={142} y2={137} stroke={OR_PHARMACIE} strokeWidth={0.7} />

          {/* Bloc prix */}
          <Rect
            x={24}
            y={151}
            width={162}
            height={62}
            rx={12}
            fill={VERT_PHARMACIE}
            stroke={OR_PHARMACIE}
            strokeWidth={1}
          />
          <Text
            x={105}
            y={190}
            textAnchor="middle"
            style={[stylesTexte.prix, { fontSize: taillePolicePrix(formatPrixAffiche(prix)) }]}
            fill={BLANC_PHARMACIE}
          >
            {formatPrixAffiche(prix)}
          </Text>

          {/* Élément décoratif bas (tige + feuilles) */}
          <Path d="M105 270 C105 264, 105 258, 105 253" fill="none" stroke={OR_PHARMACIE} strokeWidth={1.2} />
          <Path
            d="M105 264 C99 262, 96 257, 96 253 C101 253, 105 257, 105 264Z"
            fill="none"
            stroke={OR_PHARMACIE}
            strokeWidth={1}
          />
          <Path
            d="M105 260 C109 255, 114 252, 116 252 C115 258, 111 262, 105 264Z"
            fill="none"
            stroke={OR_PHARMACIE}
            strokeWidth={1}
          />

          {/* Cadre : interruptions basses (mêmes coordonnées que le gabarit) */}
          <Rect x={5} y={285} width={50} height={7} fill={BLANC_PHARMACIE} />
          <Rect x={155} y={285} width={50} height={7} fill={BLANC_PHARMACIE} />
          <Line x1={5} y1={292} x2={55} y2={292} stroke={VERT_PHARMACIE} strokeWidth={0.6} />
          <Line x1={155} y1={292} x2={205} y2={292} stroke={VERT_PHARMACIE} strokeWidth={0.6} />
        </Svg>
      </Page>
    </Document>
  )
}
