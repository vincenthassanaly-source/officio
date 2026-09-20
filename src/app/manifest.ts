import type { MetadataRoute } from 'next'

// #4e56d3/#f7f8fb = valeurs sRGB réelles des tokens --color-primary et
// --color-bg de globals.css (oklch(52% 0.19 275) / oklch(98% 0.004 260))
// une fois converties — un manifeste PWA ne peut pas référencer un token
// CSS. Corrigé du Lot 5 (theme_color était #4F46E5, une teinte visiblement
// différente jamais alignée sur le token ; background_color était #F7F7F9,
// écart négligeable mais aligné par cohérence).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Officio — Pharmacie Rome Village',
    short_name: 'Officio',
    description: "Le compagnon numérique de l'officine",
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8fb',
    theme_color: '#4e56d3',
    icons: [
      { src: '/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512', sizes: '512x512', type: 'image/png' },
    ],
  }
}
