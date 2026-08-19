'use server'

import { createClient } from '@/lib/supabase/server'
import { getOfficineActive } from '@/lib/data/officine-active'

const VOYAGE_URL = 'https://api.voyageai.com/v1/multimodalembeddings'
const MODEL = 'voyage-multimodal-3.5'
const DIMENSIONS = 1024

// Seuils de confiance sur la similarité cosinus (0 à 1) renvoyée par la RPC
// rechercher_chaussures_similaires. Valeurs provisoires faute de recul sur
// de vraies photos prises au comptoir — à recalibrer une fois le scanner
// testé en situation réelle (voir rapport).
const SEUIL_TRES_PROBABLE = 0.9
const SEUIL_POSSIBLE = 0.8

export type NiveauConfiance = 'très probable' | 'possible' | 'peu probable'

export type CandidatChaussure = {
  id: string
  nom_modele: string
  categorie: string
  photo_url: string | null
  similarite: number
  confiance: NiveauConfiance
}

// Modélisé en valeur de retour plutôt qu'en exception : une Server Action qui
// throw voit son message remplacé en production par le message générique
// Next.js ("The specific message is omitted...") avant d'atteindre le client.
// Le détail réel est systématiquement loggé côté serveur (console.error, visible
// dans Vercel > Logs) pour le débogage, et un message clair est renvoyé au client.
export type ResultatScan =
  | { succes: true; candidats: CandidatChaussure[] }
  | { succes: false; message: string }

const MESSAGE_ERREUR_GENERIQUE =
  "Une erreur inattendue est survenue pendant l'analyse de la photo. Réessayez ; si le problème persiste, contactez le support."

function calculerConfiance(similarite: number): NiveauConfiance {
  if (similarite >= SEUIL_TRES_PROBABLE) return 'très probable'
  if (similarite >= SEUIL_POSSIBLE) return 'possible'
  return 'peu probable'
}

export async function identifierChaussure(formData: FormData): Promise<ResultatScan> {
  try {
    const photo = formData.get('photo')
    if (!(photo instanceof File) || photo.size === 0) {
      return { succes: false, message: 'Merci de prendre une photo.' }
    }

    const apiKey = process.env.VOYAGE_API_KEY
    if (!apiKey) {
      console.error('[scanner-chaussures] VOYAGE_API_KEY absente de l’environnement serveur')
      return {
        succes: false,
        message: "Le scanner n'est pas encore configuré (clé Voyage AI manquante). Contactez le support.",
      }
    }

    const officine = await getOfficineActive()
    if (!officine) return { succes: false, message: 'Non connecté.' }

    const buffer = Buffer.from(await photo.arrayBuffer())
    const imageBase64 = `data:${photo.type || 'image/jpeg'};base64,${buffer.toString('base64')}`

    const reponse = await fetch(VOYAGE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        // input_type "query" (vs "document" pour les embeddings du catalogue
        // générés par scripts/generate-embeddings-chaussures.mjs) : Voyage
        // optimise différemment l'embedding selon le rôle recherche/indexé.
        inputs: [{ content: [{ type: 'image_base64', image_base64: imageBase64 }] }],
        input_type: 'query',
      }),
    })

    if (!reponse.ok) {
      const detail = await reponse.text().catch(() => '')
      console.error(`[scanner-chaussures] Échec Voyage AI (code ${reponse.status}) : ${detail}`)
      return { succes: false, message: "Échec de l'analyse de la photo. Réessayez dans quelques instants." }
    }

    const donnees = await reponse.json()
    const embedding = donnees?.data?.[0]?.embedding

    if (!Array.isArray(embedding) || embedding.length !== DIMENSIONS) {
      console.error('[scanner-chaussures] Réponse Voyage AI inattendue :', JSON.stringify(donnees).slice(0, 500))
      return { succes: false, message: "Réponse inattendue du service de reconnaissance d'image. Réessayez." }
    }

    const supabase = await createClient()
    const { data, error } = await supabase.rpc('rechercher_chaussures_similaires', {
      embedding_recherche: embedding,
      officine_id_cible: officine.officine_id,
      limite: 10,
    })

    if (error) {
      console.error('[scanner-chaussures] Erreur RPC Supabase :', error.message)
      return { succes: false, message: 'Erreur lors de la recherche dans le catalogue. Réessayez.' }
    }

    const candidats = (data ?? []).map(
      (candidat: Omit<CandidatChaussure, 'confiance'>): CandidatChaussure => ({
        ...candidat,
        confiance: calculerConfiance(candidat.similarite),
      })
    )

    return { succes: true, candidats }
  } catch (err) {
    console.error('[scanner-chaussures] Erreur inattendue :', err)
    return { succes: false, message: MESSAGE_ERREUR_GENERIQUE }
  }
}
