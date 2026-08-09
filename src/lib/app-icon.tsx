import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Image source unique pour toutes les tailles d'icône (favicon, apple-touch,
// manifest 192/512) — satori (moteur de next/og) redimensionne cet <img> à
// la taille demandée par chaque route (icon.tsx, apple-icon.tsx, icon-192,
// icon-512), donc un seul fichier source suffit.
const ICONE_BASE64 = readFileSync(join(process.cwd(), 'public/icon-master.png')).toString('base64')

export function AppIconMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- rendu par satori (next/og), pas par le navigateur */}
      <img
        src={`data:image/png;base64,${ICONE_BASE64}`}
        width={size}
        height={size}
        alt=""
      />
    </div>
  )
}
