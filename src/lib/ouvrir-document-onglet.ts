// Ouvre un document dans un nouvel onglet sans perdre le geste utilisateur
// qui a déclenché l'action. `obtenirUrl` (obtention d'une URL signée
// Supabase, asynchrone) s'exécute après l'ouverture de la fenêtre : appeler
// `window.open(url, ...)` seulement une fois l'URL connue déconnecte cet
// appel du clic d'origine (il a lieu après un `await`), ce qu'iOS Safari
// traite comme une ouverture non sollicitée et bloque silencieusement.
//
// La fenêtre est donc ouverte vide, de façon synchrone, avant le premier
// `await` (tout ce qui précède le premier `await` d'une fonction async
// s'exécute encore dans le même tick que l'appel, donc dans la portée du
// geste) ; son adresse n'est renseignée qu'une fois l'URL obtenue.
// `fenetre.opener = null` neutralise la référence vers cette page sans
// utiliser le flag `noopener` de `window.open`, qui aurait empêché de
// récupérer une référence à réutiliser ensuite.
export async function ouvrirDocumentDansOnglet(
  obtenirUrl: () => Promise<string>
): Promise<{ succes: true } | { succes: false; message: string }> {
  const fenetre = window.open('', '_blank')
  if (fenetre) fenetre.opener = null

  try {
    const url = await obtenirUrl()

    if (!fenetre) {
      return {
        succes: false,
        message:
          "Le navigateur a bloqué l'ouverture du document. Autorisez les fenêtres pop-up pour ce site puis réessayez.",
      }
    }

    fenetre.location.href = url
    return { succes: true }
  } catch (err) {
    fenetre?.close()
    return {
      succes: false,
      message: err instanceof Error ? err.message : "Impossible d'ouvrir le document.",
    }
  }
}
