// Recherche insensible aux accents, réutilisée par la recherche globale de
// l'accueil (recherche.ts) — même logique que fil-de-messages.tsx (cahier de
// liaison), extraite ici dans un utilitaire partagé plutôt que dupliquée, sans
// toucher à fil-de-messages.tsx (fonction locale identique conservée telle
// quelle pour ne prendre aucun risque de régression sur le cahier de liaison).
export function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
}
