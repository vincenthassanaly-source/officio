import { Document, Page, View, Text, Svg, Circle, Rect, Path, Font, StyleSheet } from '@react-pdf/renderer'

// Traduction fidèle du gabarit "Pharmacy Price Tag.dc.html" fourni par
// l'utilisateur (claude.ai/design), pas une réinterprétation : mêmes
// valeurs (couleurs, tailles, espacements) que le fichier source, converties
// de pixels vers points via SCALE_PX_VERS_PT. Couleurs en constantes
// locales à ce module, indépendantes de la palette Tailwind de l'app.
export const VERT_PHARMACIE = '#0e3b2e'
export const OR_PHARMACIE = '#c9a24b'
export const BLANC_PHARMACIE = '#ffffff'

// Le gabarit source est dessiné sur un canevas de 1050x1500px (ratio ~A4).
// On convertit chaque valeur en pixels du gabarit vers des points PDF au
// prorata de la largeur A4 (595.28pt), plutôt que de forcer un cadre de
// taille fixe 1050x1500 sur la page — le cadre remplit naturellement la
// page via flex:1, aux proportions du gabarit près.
const SCALE_PX_VERS_PT = 595.28 / 1050
function px(valeur: number): number {
  return valeur * SCALE_PX_VERS_PT
}

// Le gabarit précise "Helvetica,Arial,sans-serif". La police Helvetica
// intégrée à react-pdf (une des 14 polices PDF standard, non embarquée)
// positionne mal le glyphe d'accent sur certaines majuscules accentées
// (ex. "CRÈME" affichait un accent flottant, détaché de la lettre — bug
// constaté à la vérification, pas une supposition). Arimo (Google Fonts)
// est un clone métriquement compatible d'Arial/Helvetica avec un rendu de
// glyphes fiable une fois embarqué en TTF : même style visuel, sans ce
// défaut. Fichiers auto-hébergés dans public/fonts/ (voir la note
// équivalente dans le formulaire pour pourquoi Font.register ne peut pas
// passer par next/font).
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

// Le corps 88 du gabarit est calibré pour "NOM DU PRODUIT" (14 caractères,
// tient sur 1 ligne dans le cadre). Réduit pour les noms plus longs afin
// qu'ils restent lisibles sur 2-3 lignes plutôt que de déborder — le
// retour à la ligne lui-même est géré nativement par le flex du <Text>,
// pas de découpage manuel des mots.
function taillePoliceNom(nomProduit: string): number {
  if (nomProduit.length > 28) return 44
  if (nomProduit.length > 20) return 57
  if (nomProduit.length > 14) return 70
  return 88
}

// Même logique pour le prix : le corps 96 du gabarit suppose un prix à 2
// chiffres ("XX,xx €", 7-8 caractères) dans l'encart de 719px de large.
function taillePolicePrix(texte: string): number {
  if (texte.length > 10) return 60
  if (texte.length > 8) return 78
  return 96
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: BLANC_PHARMACIE,
    padding: px(32),
    fontFamily: 'Arimo',
    color: VERT_PHARMACIE,
  },
  cadre: {
    flex: 1,
    border: `${px(2)}pt solid ${VERT_PHARMACIE}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: px(60),
    paddingHorizontal: px(60),
    paddingBottom: px(50),
    position: 'relative',
  },
  ligneEnseigne: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(18),
    marginTop: px(28),
  },
  filetOr: { width: px(90), height: px(1), backgroundColor: OR_PHARMACIE },
  enseigne: { fontFamily: 'Arimo', fontWeight: 600, fontSize: px(22), letterSpacing: px(6) },
  centre: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  // Pas de width explicite ici : avec width:'100%', react-pdf ne respecte
  // pas textAlign:'center' (bug constaté à la vérification — le texte
  // revient à gauche). Sans largeur forcée, le texte qui passe à la ligne
  // prend naturellement la largeur disponible du conteneur et se centre
  // correctement, ligne par ligne, via textAlign seul.
  nomProduit: {
    fontFamily: 'Arimo',
    fontWeight: 700,
    letterSpacing: px(1),
    lineHeight: 1.05,
    textAlign: 'center',
  },
  separateurRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    gap: px(14),
    marginBottom: px(44),
  },
  separateurLigne: { width: px(130), height: px(1), backgroundColor: OR_PHARMACIE },
  separateurPoint: { width: px(8), height: px(8), borderRadius: px(4), backgroundColor: OR_PHARMACIE },
  pastillePrix: {
    width: px(719),
    height: px(248),
    border: `${px(2)}pt solid ${OR_PHARMACIE}`,
    borderRadius: px(60),
    backgroundColor: VERT_PHARMACIE,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: px(60),
  },
  prix: { fontFamily: 'Arimo', fontWeight: 700, letterSpacing: px(2), color: BLANC_PHARMACIE },
  feuille: { position: 'absolute', bottom: px(70), left: '50%', marginLeft: -px(23) },
  filetBasGauche: { position: 'absolute', bottom: 0, left: 0, width: px(140), height: px(1), backgroundColor: VERT_PHARMACIE },
  filetBasDroit: { position: 'absolute', bottom: 0, right: 0, width: px(140), height: px(1), backgroundColor: VERT_PHARMACIE },
})

export function AffichePDF({ nomProduit, prix }: { nomProduit: string; prix: number }) {
  const nom = nomProduit.trim().toUpperCase()
  const prixTexte = formatPrixAffiche(prix)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.cadre}>
          {/* Logo / symbole pharmacie */}
          <Svg width={px(96)} height={px(96)} viewBox="0 0 96 96">
            <Circle cx={48} cy={48} r={46.5} fill={VERT_PHARMACIE} stroke={OR_PHARMACIE} strokeWidth={3} />
            <Rect x={42} y={26} width={12} height={44} fill={OR_PHARMACIE} />
            <Rect x={26} y={42} width={44} height={12} fill={OR_PHARMACIE} />
          </Svg>

          {/* Nom de la pharmacie */}
          <View style={styles.ligneEnseigne}>
            <View style={styles.filetOr} />
            <Text style={styles.enseigne}>PHARMACIE ROME VILLAGE</Text>
            <View style={styles.filetOr} />
          </View>

          <View style={styles.centre}>
            <Text style={[styles.nomProduit, { fontSize: px(taillePoliceNom(nom)) }]}>{nom}</Text>

            <View style={[styles.separateurRow, { marginTop: px(30) }]}>
              <View style={styles.separateurLigne} />
              <View style={styles.separateurPoint} />
              <View style={styles.separateurLigne} />
            </View>

            <View style={styles.pastillePrix}>
              <Text style={[styles.prix, { fontSize: px(taillePolicePrix(prixTexte)) }]}>{prixTexte}</Text>
            </View>
          </View>

          {/* Feuille dorée stylisée */}
          <View style={styles.feuille}>
            <Svg width={px(46)} height={px(46)} viewBox="0 0 46 46">
              <Path d="M23 46 V22" stroke={OR_PHARMACIE} strokeWidth={3} />
              <Path d="M23 22 C23 10 12 6 4 8 C6 18 14 24 23 22 Z" fill={OR_PHARMACIE} />
              <Path d="M23 22 C23 8 34 4 42 8 C40 18 32 24 23 22 Z" fill={OR_PHARMACIE} />
            </Svg>
          </View>

          {/* Filets de pied de page */}
          <View style={styles.filetBasGauche} />
          <View style={styles.filetBasDroit} />
        </View>
      </Page>
    </Document>
  )
}
