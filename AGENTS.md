<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Design

Lire `PRODUCT.md` et `DESIGN.md` avant toute modification d'interface (composants établis, tokens, motifs "Do/Don't").

Règles non négociables sur toute nouvelle interface :
- Cibles tactiles ≥ 44 px (padding invisible + marge négative si l'élément visible doit rester petit).
- Champs de saisie (`input`/`textarea`/`select`) à 16 px, jamais moins.
- Texte porteur d'information ≥ 12 px (exception documentée : micro-badge de grille dense avec détail complet au tap).
- `focus-visible` sur tout bouton/lien/champ interactif.
- `rec`/`rec-soft` réservés à l'alerte et à la suppression, jamais autre chose.

Pour toute sheet/modale : `usePiegeFocus` (`src/lib/use-piege-focus.ts`) et `useFermerAvecRetour` (`src/lib/use-fermer-avec-retour.ts`), jamais réimplémentés localement.

Voir `scripts/RAPPORT-refonte-visuelle-*.md` pour l'historique des motifs établis et des compromis assumés.
