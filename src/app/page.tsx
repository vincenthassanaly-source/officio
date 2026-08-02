import { getCurrentProfil } from '@/lib/data/profils'
import { getMessages } from '@/lib/data/messages'
import { getTaches } from '@/lib/data/taches'
import { getEquipe } from '@/lib/data/equipe'
import { CahierDeLiaison } from '@/components/cahier-de-liaison'
import { signOut } from './actions/auth'

export default async function Home() {
  const [profil, messages, taches, equipe] = await Promise.all([
    getCurrentProfil(),
    getMessages(),
    getTaches(),
    getEquipe(),
  ])

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-5 py-6 sm:px-8">
      <header className="mb-5 flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-primary-light">
            Pharmacie Rome Village
          </p>
          <h1 className="font-serif text-2xl text-ink">Cahier de liaison</h1>
        </div>
        <form action={signOut}>
          <button type="submit" className="text-xs font-semibold text-muted hover:text-ink">
            Se déconnecter
          </button>
        </form>
      </header>

      <CahierDeLiaison
        messages={messages}
        taches={taches}
        equipe={equipe}
        profilActuelId={profil?.id ?? ''}
      />
    </main>
  )
}
