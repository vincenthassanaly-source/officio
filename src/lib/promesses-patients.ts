import { normaliser } from '@/lib/recherche-texte'

// Utilitaires purs du module "Promesses patients", partagés entre le client
// (filtrage instantané, validation avant envoi) et le serveur (validation
// faisant foi, recherche dans l'historique) : même règle des deux côtés.

// Même normalisation que la colonne générée `recherche` de la table
// promesses_patients (voir scripts/migration-promesses-patients-2026-09-25.sql) :
// minuscules, sans accents, ligatures œ/æ dépliées.
export function normaliserRecherche(texte: string): string {
  return normaliser(texte).replace(/œ/g, 'oe').replace(/æ/g, 'ae').trim()
}

// Plafond de l'historique affiché/retourné par recherche : l'historique
// n'est pas une archive à parcourir mais un filet pour retrouver une
// promesse récente ("on a bien rappelé Mme X ?"). Ici (et non dans
// lib/data) pour être lisible côté client sans importer de code serveur.
export const LIMITE_HISTORIQUE = 50

// ─── Dates ────────────────────────────────────────────────────────────────

// Fuseau fixé (même choix que diagnostics/page.tsx) : ces libellés sont
// calculés une première fois au rendu serveur (Vercel, en UTC) puis au
// client — sans fuseau explicite, "Traitée à 07:39" côté serveur devenait
// "09:39" à l'hydratation, et un "hier"/"aujourd'hui" pouvait basculer
// autour de minuit.
const FUSEAU = 'Europe/Paris'
const FORMAT_JOUR = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, year: 'numeric', month: '2-digit', day: '2-digit' })
const FORMAT_JOUR_MOIS = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: '2-digit', month: '2-digit' })
const FORMAT_HEURE = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hour: '2-digit', minute: '2-digit' })

// Numéro de jour calendaire (à Paris), pour compter des jours écoulés
// indépendamment des heures et du changement d'heure.
function numeroJour(date: Date): number {
  const parties = Object.fromEntries(FORMAT_JOUR.formatToParts(date).map((p) => [p.type, p.value]))
  return Date.UTC(Number(parties.year), Number(parties.month) - 1, Number(parties.day)) / 86_400_000
}

function joursEcoules(iso: string, maintenant: Date): number {
  return numeroJour(maintenant) - numeroJour(new Date(iso))
}

// "Notée aujourd'hui / hier / il y a 4 jours" : ce qui compte au comptoir
// est depuis combien de temps le patient attend, pas l'heure exacte.
export function depuisQuand(iso: string, maintenant = new Date()): string {
  const jours = joursEcoules(iso, maintenant)
  if (jours <= 0) return "Notée aujourd'hui"
  if (jours === 1) return 'Notée hier'
  return `Notée il y a ${jours} jours`
}

// "Traitée aujourd'hui à 10:32" / "hier à …" / "le 24/09 à …" (année
// ajoutée si différente de l'année en cours).
export function quandTraitee(iso: string | null, maintenant = new Date()): string {
  if (!iso) return 'Traitée'
  const date = new Date(iso)
  const heure = FORMAT_HEURE.format(date)
  const jours = joursEcoules(iso, maintenant)
  if (jours <= 0) return `Traitée aujourd'hui à ${heure}`
  if (jours === 1) return `Traitée hier à ${heure}`
  const memeAnnee = FORMAT_JOUR.format(date).slice(-4) === FORMAT_JOUR.format(maintenant).slice(-4)
  return `Traitée le ${memeAnnee ? FORMAT_JOUR_MOIS.format(date) : FORMAT_JOUR.format(date)} à ${heure}`
}

// ─── Téléphone ────────────────────────────────────────────────────────────

// Numéro français (0X XX XX XX XX, +33 X…, 0033 X…) ou international au
// format E.164 (+ suivi de 8 à 15 chiffres). Séparateurs usuels tolérés
// (espaces, points, tirets, parenthèses) : le comptoir tape comme il peut.
// Facultatif : un champ vide est valide (le patient repassera de lui-même,
// ou on n'a pas son numéro sous la main) ; seul un numéro saisi mais
// incomplet/erroné est refusé, pour ne pas enregistrer un numéro inutilisable.
export function validerTelephone(saisie: string): string | null {
  const brut = saisie.trim()
  if (!brut) return null
  const compact = brut.replace(/[\s.\-()]/g, '')
  if (/^(?:\+33|0033|0)[1-9]\d{8}$/.test(compact)) return null
  if (/^\+[1-9]\d{7,14}$/.test(compact)) return null
  return 'Numéro invalide : 10 chiffres (06 12 34 56 78) ou format international (+32…).'
}

// Forme stockée et affichée : "06 12 34 56 78" pour un numéro français
// (quelle que soit la saisie : +33, 0033, points…), sinon la saisie
// compactée telle quelle (+ et chiffres) ; null si rien n'a été saisi. À
// n'appeler qu'après validation.
export function formaterTelephone(saisie: string): string | null {
  const compact = saisie.trim().replace(/[\s.\-()]/g, '')
  if (!compact) return null
  const francais = compact.match(/^(?:\+33|0033|0)([1-9]\d{8})$/)
  if (francais) return `0${francais[1]}`.replace(/(\d{2})(?=\d)/g, '$1 ')
  return compact
}

// Lien tel: sans séparateurs (certains composeurs Android les refusent).
export function lienTelephone(telephone: string): string {
  return `tel:${telephone.replace(/[\s.\-()]/g, '')}`
}

// ─── Recherche tolérante (liste "En attente") ─────────────────────────────

// Distance d'édition bornée (Damerau restreinte : une inversion de deux
// lettres voisines compte pour une seule faute, "doliprnae" → "doliprane").
// Renvoie dès que `max` est dépassé : on ne cherche qu'à savoir si deux mots
// sont "à une ou deux fautes près".
function distanceAuPlus(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false
  let avantPrecedente: number[] = []
  let precedente = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    const courante = [i]
    let minLigne = i
    for (let j = 1; j <= b.length; j++) {
      const cout = a[i - 1] === b[j - 1] ? 0 : 1
      courante[j] = Math.min(precedente[j] + 1, courante[j - 1] + 1, precedente[j - 1] + cout)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        courante[j] = Math.min(courante[j], avantPrecedente[j - 2] + 1)
      }
      if (courante[j] < minLigne) minLigne = courante[j]
    }
    if (minLigne > max) return false
    avantPrecedente = precedente
    precedente = courante
  }
  return precedente[b.length] <= max
}

// Un fragment tapé correspond à un mot s'il en est une sous-chaîne, ou —
// à partir de 4 lettres, pour ne pas tout faire remonter sur "do" — s'il
// est à une faute de frappe près du début du mot ("amoxcilline" →
// "amoxicilline"), deux à partir de 8 lettres ("levotirox" → "levothyrox").
// Préfixes de longueur n-max à n+max testés pour couvrir des lettres
// oubliées ou en trop.
function fragmentCorrespond(fragment: string, mots: string[], texte: string): boolean {
  if (texte.includes(fragment)) return true
  if (fragment.length < 4) return false
  const max = fragment.length >= 8 ? 2 : 1
  return mots.some((mot) => {
    for (let n = fragment.length - max; n <= fragment.length + max; n++) {
      if (n > 0 && n <= mot.length && distanceAuPlus(fragment, mot.slice(0, n), max)) return true
    }
    return false
  })
}

// Tous les fragments de la recherche doivent correspondre (ordre libre) :
// "doli 1000" trouve "Doliprane 1000 mg".
export function correspondRecherche(texteNormalise: string, rechercheNormalisee: string): boolean {
  const fragments = rechercheNormalisee.split(/\s+/).filter(Boolean)
  if (fragments.length === 0) return true
  const mots = texteNormalise.split(/[^a-z0-9]+/).filter(Boolean)
  return fragments.every((f) => fragmentCorrespond(f, mots, texteNormalise))
}

// ─── Validation du formulaire de création ─────────────────────────────────

export type ChampPromesse = 'nom_medicament' | 'quantite' | 'nom_patient' | 'telephone_patient'
export type ErreursPromesse = Partial<Record<ChampPromesse, string>>

export const LONGUEUR_MAX_MEDICAMENT = 200
export const LONGUEUR_MAX_PATIENT = 120
export const QUANTITE_MAX = 999

// Quantité promise saisie librement : vide = 1 (cas de loin le plus
// fréquent, ne doit rien coûter au comptoir). null si la saisie n'est pas
// un entier entre 1 et QUANTITE_MAX.
export function lireQuantite(saisie: string): number | null {
  const brut = saisie.trim()
  if (!brut) return 1
  if (!/^\d+$/.test(brut)) return null
  const quantite = Number(brut)
  return quantite >= 1 && quantite <= QUANTITE_MAX ? quantite : null
}

export function validerPromesse(champs: {
  nom_medicament: string
  quantite: string
  nom_patient: string
  telephone_patient: string
}): ErreursPromesse {
  const erreurs: ErreursPromesse = {}
  const medicament = champs.nom_medicament.trim()
  const patient = champs.nom_patient.trim()
  if (!medicament) erreurs.nom_medicament = 'Indique le médicament attendu.'
  else if (medicament.length > LONGUEUR_MAX_MEDICAMENT) erreurs.nom_medicament = 'Nom de médicament trop long.'
  if (lireQuantite(champs.quantite) === null) erreurs.quantite = `Quantité : un nombre entier de 1 à ${QUANTITE_MAX}.`
  if (!patient) erreurs.nom_patient = 'Indique le nom du patient.'
  else if (patient.length > LONGUEUR_MAX_PATIENT) erreurs.nom_patient = 'Nom de patient trop long.'
  const erreurTelephone = validerTelephone(champs.telephone_patient)
  if (erreurTelephone) erreurs.telephone_patient = erreurTelephone
  return erreurs
}
