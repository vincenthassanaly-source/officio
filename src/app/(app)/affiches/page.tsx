import { LienRetour } from '@/components/lien-retour'
import { AffichesFormulaire } from '@/components/affiches/affiches-formulaire'

// Pas de loading.tsx pour ce module : générateur stateless, aucune donnée
// asynchrone à charger (pas d'appel getOfficineActive ni de requête
// Supabase) — un loading.tsx n'aurait jamais l'occasion de s'afficher.
export default function AffichesPage() {
  return (
    <>
      <LienRetour />
      <h1 className="mb-4 font-heading text-2xl text-ink">Affiches prix</h1>
      <AffichesFormulaire />
    </>
  )
}
