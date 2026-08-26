import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Officio — Pharmacie Rome Village',
    short_name: 'Officio',
    description: "Le compagnon numérique de l'officine",
    start_url: '/',
    display: 'standalone',
    background_color: '#1A1A2E',
    theme_color: '#4F46E5',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
