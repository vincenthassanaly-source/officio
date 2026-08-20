import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

const URL_CIS_BDPM = 'https://base-donnees-publique.medicaments.gouv.fr/download/file/CIS_bdpm.txt'
const TAILLE_LOT = 500

// Le job traite ~15 000 lignes en plusieurs lots d'upsert : plus long que
// les autres crons du projet (rappels-taches, rappels-agenda), d'où ce
// budget explicite plutôt que le défaut de la plateforme.
export const maxDuration = 60

type LigneBdpm = {
  cis: string
  denomination: string
  forme_pharmaceutique: string | null
  lien_bdpm: string
}

/**
 * CIS_bdpm.txt n'a pas d'en-tête et n'expose aucune colonne "Lien BDPM" —
 * ses colonnes réelles (tabulations, position 0-indexée) sont : 0 = CIS,
 * 1 = dénomination, 2 = forme pharmaceutique, 3 = voies d'administration,
 * 4 = statut admin. AMM, 5 = type de procédure, 6 = état de
 * commercialisation, 7 = date d'AMM, 8 = statut BDM, 9 = n° autorisation
 * européenne, 10 = titulaire(s), 11 = surveillance renforcée. On ne retient
 * que les 3 premières et on reconstruit le lien direct vers la fiche à
 * partir du CIS (voir scripts/RAPPORT-grossesse-allaitement-2026-08-20.md).
 */
function parserLigne(ligne: string): LigneBdpm | null {
  const colonnes = ligne.split('\t')
  const cis = colonnes[0]?.trim()
  const denomination = colonnes[1]?.trim()
  if (!cis || !denomination) return null

  return {
    cis,
    denomination,
    forme_pharmaceutique: colonnes[2]?.trim() || null,
    lien_bdpm: `https://base-donnees-publique.medicaments.gouv.fr/extrait.php?specid=${cis}`,
  }
}

// Le fichier est historiquement encodé en ISO-8859-1 (Latin-1) — on tente un
// décodage UTF-8 strict d'abord (au cas où l'ANSM l'aurait fait évoluer) et
// on bascule sur Latin-1 s'il échoue.
function decoderTexte(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer)
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer)
  }
}

/**
 * Cron hebdomadaire (voir vercel.json) : synchronise l'index léger
 * `bdpm_index` (nom de médicament -> lien direct vers sa fiche officielle)
 * depuis le fichier ouvert CIS_bdpm.txt. Ne calcule et ne stocke aucune
 * information de compatibilité grossesse/allaitement — uniquement de quoi
 * retrouver la fiche officielle.
 */
export async function GET(request: Request) {
  const enTete = request.headers.get('authorization')
  if (enTete !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 })
  }

  let reponse: Response
  try {
    reponse = await fetch(URL_CIS_BDPM)
  } catch (e) {
    console.error('sync-bdpm: téléchargement', e)
    return NextResponse.json({ erreur: 'Téléchargement du fichier CIS_bdpm.txt impossible.' }, { status: 502 })
  }

  if (!reponse.ok) {
    console.error('sync-bdpm: téléchargement', reponse.status)
    return NextResponse.json({ erreur: `Téléchargement échoué (${reponse.status}).` }, { status: 502 })
  }

  const texte = decoderTexte(await reponse.arrayBuffer())
  const lignes = texte.split(/\r?\n/).filter((ligne) => ligne.trim().length > 0)

  const enregistrements: LigneBdpm[] = []
  let ignorees = 0
  for (const ligne of lignes) {
    const parsed = parserLigne(ligne)
    if (parsed) enregistrements.push(parsed)
    else ignorees++
  }

  const supabase = createServiceRoleClient()
  const maintenant = new Date().toISOString()

  let importees = 0
  let erreurs = 0

  for (let i = 0; i < enregistrements.length; i += TAILLE_LOT) {
    const lot = enregistrements.slice(i, i + TAILLE_LOT).map((e) => ({ ...e, updated_at: maintenant }))
    const { error } = await supabase.from('bdpm_index').upsert(lot, { onConflict: 'cis' })

    if (error) {
      console.error('sync-bdpm: upsert', error)
      erreurs += lot.length
    } else {
      importees += lot.length
    }
  }

  const resultat = { total: lignes.length, importees, ignorees, erreurs }
  console.log('sync-bdpm', resultat)

  return NextResponse.json(resultat)
}
