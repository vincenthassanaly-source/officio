import { Document, Page, View, Text, Svg, Circle, Rect, Path, Font, StyleSheet } from '@react-pdf/renderer'

// Couleurs propres à l'affiche prix, indépendantes de la palette Tailwind
// de l'app (--color-primary etc., qui reste violette) : constantes locales
// à ce module uniquement.
export const VERT_PHARMACIE = '#1a4d3a'
export const OR_PHARMACIE = '#c9a05c'
export const CREME_PHARMACIE = '#fdfbf6'

// Polices chargées depuis /public/fonts (fichiers Google Fonts téléchargés
// une fois pour toutes) plutôt que next/font/google : Font.register de
// react-pdf a besoin d'une URL de fichier de police directement fetchable
// (au moment du rendu, côté navigateur), pas d'un style CSS injecté au
// build comme le fait next/font — les deux mécanismes sont incompatibles.
// La page de prévisualisation (affiches-formulaire.tsx), elle, utilise bien
// next/font/google pour l'aperçu HTML à l'écran.
Font.register({
  family: 'Poppins',
  fonts: [
    { src: '/fonts/Poppins-SemiBold.ttf', fontWeight: 600 },
    { src: '/fonts/Poppins-ExtraBold.ttf', fontWeight: 800 },
  ],
})
Font.register({
  family: 'Playfair Display',
  fonts: [{ src: '/fonts/PlayfairDisplay-Bold.ttf', fontWeight: 700 }],
})

export function formatPrixAffiche(prix: number): string {
  return `${prix.toFixed(2).replace('.', ',')} €`
}

// Taille du nom de produit dégressive selon la longueur, pour rester lisible
// sur 1 à 2 lignes sans déborder du cadre plutôt que de forcer un calcul de
// redimensionnement dynamique complexe côté PDF.
function taillePolicenomProduit(nomProduit: string): number {
  if (nomProduit.length > 32) return 26
  if (nomProduit.length > 22) return 32
  if (nomProduit.length > 13) return 42
  return 52
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: CREME_PHARMACIE,
  },
  cadre: {
    flex: 1,
    margin: 28,
    padding: 36,
    border: `1pt solid ${VERT_PHARMACIE}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  entete: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  ligneEnseigne: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  filetOr: {
    width: 36,
    height: 1,
    backgroundColor: OR_PHARMACIE,
    marginHorizontal: 10,
  },
  enseigne: {
    fontFamily: 'Poppins',
    fontWeight: 600,
    fontSize: 11,
    letterSpacing: 3,
    color: VERT_PHARMACIE,
  },
  centre: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
  },
  nomProduit: {
    fontFamily: 'Poppins',
    fontWeight: 800,
    color: VERT_PHARMACIE,
    textAlign: 'center',
    textTransform: 'uppercase',
    lineHeight: 1.08,
  },
  separateurRow: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    width: '55%',
    marginTop: 26,
    marginBottom: 26,
  },
  separateurLigne: {
    flex: 1,
    height: 1,
    backgroundColor: OR_PHARMACIE,
  },
  separateurPoint: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: OR_PHARMACIE,
    marginHorizontal: 8,
  },
  pastilleprix: {
    backgroundColor: VERT_PHARMACIE,
    borderColor: OR_PHARMACIE,
    borderWidth: 1.5,
    borderRadius: 44,
    paddingVertical: 20,
    paddingHorizontal: 48,
  },
  prix: {
    fontFamily: 'Playfair Display',
    fontWeight: 700,
    fontSize: 46,
    color: '#ffffff',
    textAlign: 'center',
  },
  piedDePage: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  ligneFooter: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
  },
  filetVert: {
    width: 64,
    height: 1,
    backgroundColor: VERT_PHARMACIE,
  },
  espaceFooter: {
    width: 36,
  },
})

export function AffichePDF({ nomProduit, prix }: { nomProduit: string; prix: number }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.cadre}>
          <View style={styles.entete}>
            <Svg width={62} height={62} viewBox="0 0 62 62">
              <Circle cx={31} cy={31} r={29} fill={VERT_PHARMACIE} stroke={OR_PHARMACIE} strokeWidth={1.5} />
              <Rect x={27} y={16} width={8} height={30} fill={OR_PHARMACIE} />
              <Rect x={16} y={27} width={30} height={8} fill={OR_PHARMACIE} />
            </Svg>
            <View style={styles.ligneEnseigne}>
              <View style={styles.filetOr} />
              <Text style={styles.enseigne}>PHARMACIE ROME VILLAGE</Text>
              <View style={styles.filetOr} />
            </View>
          </View>

          <View style={styles.centre}>
            <Text style={[styles.nomProduit, { fontSize: taillePolicenomProduit(nomProduit) }]}>{nomProduit}</Text>

            <View style={styles.separateurRow}>
              <View style={styles.separateurLigne} />
              <View style={styles.separateurPoint} />
              <View style={styles.separateurLigne} />
            </View>

            <View style={styles.pastilleprix}>
              <Text style={styles.prix}>{formatPrixAffiche(prix)}</Text>
            </View>
          </View>

          <View style={styles.piedDePage}>
            <Svg width={18} height={26} viewBox="0 0 18 26">
              <Path
                d="M9 24 C9 24 1.5 18.5 1.5 9.5 C1.5 4 5 1 9 1 C13 1 16.5 4 16.5 9.5 C16.5 18.5 9 24 9 24 Z"
                fill={OR_PHARMACIE}
              />
              <Rect x={8.5} y={5} width={1} height={18} fill={CREME_PHARMACIE} />
            </Svg>
            <View style={styles.ligneFooter}>
              <View style={styles.filetVert} />
              <View style={styles.espaceFooter} />
              <View style={styles.filetVert} />
            </View>
          </View>
        </View>
      </Page>
    </Document>
  )
}
