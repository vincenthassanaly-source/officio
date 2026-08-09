// Compression client-side avant envoi vers une Server Action. Vercel plafonne
// le corps d'une requête Server Action à 4,5 Mo en dur, indépendamment de la
// config Next.js (voir next.config.ts et src/components/chaussures-scanner.tsx
// qui a le même besoin) — une photo de téléphone à pleine résolution dépasse
// souvent cette limite.
const DIMENSION_MAX_PX = 1600
const QUALITE_JPEG = 0.85

export async function comprimerImage(fichier: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(fichier)
    const ratio = Math.min(1, DIMENSION_MAX_PX / Math.max(bitmap.width, bitmap.height))
    const largeur = Math.round(bitmap.width * ratio)
    const hauteur = Math.round(bitmap.height * ratio)

    const canvas = document.createElement('canvas')
    canvas.width = largeur
    canvas.height = hauteur
    const ctx = canvas.getContext('2d')
    if (!ctx) return fichier

    ctx.drawImage(bitmap, 0, 0, largeur, hauteur)
    bitmap.close()

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', QUALITE_JPEG))
    if (!blob) return fichier

    const nomBase = fichier.name.replace(/\.\w+$/, '')
    return new File([blob], `${nomBase || 'photo'}.jpg`, { type: 'image/jpeg' })
  } catch (err) {
    console.error('[comprimerImage] Compression impossible, envoi du fichier original :', err)
    return fichier
  }
}
