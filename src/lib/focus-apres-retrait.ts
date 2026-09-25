// Quand une ligne disparaît d'une liste après une action (« Traitée »,
// « Remettre en attente »…), le bouton qui avait le focus est démonté et le
// focus retombe sur <body> : un utilisateur clavier ou lecteur d'écran perd
// sa place. À appeler AVANT le retrait : repère le bouton équivalent de la
// ligne suivante (à défaut, de la précédente) via un attribut `data-*`
// commun, et renvoie une fonction qui lui donne le focus une fois la ligne
// retirée — seulement si le focus était bien sur le bouton déclencheur.
export function preparerFocusApresRetrait(bouton: HTMLElement | null, attribut: string): () => void {
  if (!bouton || document.activeElement !== bouton) return () => {}
  const candidats = Array.from(document.querySelectorAll<HTMLElement>(`[${attribut}]`))
  const index = candidats.indexOf(bouton)
  const cible = candidats[index + 1] ?? candidats[index - 1] ?? null
  return () => {
    if (cible?.isConnected && (document.activeElement === document.body || !document.activeElement?.isConnected)) {
      cible.focus()
    }
  }
}
