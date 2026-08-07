// Exporte un instantané complet de la table chaussures (avant corrections) pour
// servir de référence à l'étape 1 (audit) et au rapport de comparaison.
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createClient } from '@supabase/supabase-js'

const contenu = readFileSync(new URL('../.env.local', import.meta.url), 'utf-8')
for (const ligne of contenu.split('\n')) {
  const trimmed = ligne.trim()
  if (!trimmed || trimmed.startsWith('#')) continue
  const index = trimmed.indexOf('=')
  if (index === -1) continue
  const cle = trimmed.slice(0, index).trim()
  const valeur = trimmed.slice(index + 1).trim()
  if (!(cle in process.env)) process.env[cle] = valeur
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})

const NOM_OFFICINE = 'Pharmacie Rome Village'

const { data: officine, error: erreurOfficine } = await supabase
  .from('officines')
  .select('id')
  .eq('nom', NOM_OFFICINE)
  .single()

if (erreurOfficine || !officine) {
  console.error("Impossible de trouver l'officine :", erreurOfficine?.message)
  process.exit(1)
}

const { data: rows, error } = await supabase
  .from('chaussures_orthopediques')
  .select(
    'id, nom_modele, description, genre, categorie, reference, pointures, prix, photo_url, url_source, variantes:chaussures_variantes(id, couleur, photo_url)'
  )
  .eq('officine_id', officine.id)
  .order('nom_modele', { ascending: true })

if (error) {
  console.error(error)
  process.exit(1)
}

mkdirSync(new URL('./output/', import.meta.url), { recursive: true })
writeFileSync(
  new URL('./output/baseline-avant-correction.json', import.meta.url),
  JSON.stringify({ officineId: officine.id, exporteLe: new Date().toISOString(), total: rows.length, produits: rows }, null, 2)
)

console.log(`Baseline exportée : ${rows.length} produits, ${rows.reduce((s, r) => s + r.variantes.length, 0)} variantes couleur.`)
