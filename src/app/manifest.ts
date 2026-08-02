import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Officio — Pharmacie Rome Village',
    short_name: 'Officio',
    description: "Le compagnon numérique de l'officine",
    start_url: '/',
    display: 'standalone',
    background_color: '#EDF1EA',
    theme_color: '#1F4D3D',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
