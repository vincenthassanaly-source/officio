export function initialesDepuisNom(nom: string): string {
  const mots = nom.trim().split(/\s+/).filter(Boolean)
  const lettres = mots.slice(0, 2).map((m) => m[0]?.toUpperCase() ?? '')
  return lettres.join('') || '?'
}
