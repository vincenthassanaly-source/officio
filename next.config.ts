import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'hjerdcehdzfjhzefnnel.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      // Une vraie photo de comptoir (caméra téléphone, non compressée) dépasse
      // largement la limite par défaut de 1 Mo et faisait échouer le Scanner
      // chaussures en production avec un 413 avant même d'atteindre l'action.
      // Plafonné à 4 Mo (et non plus haut) car Vercel impose de toute façon un
      // maximum absolu et non configurable de 4,5 Mo par requête de fonction :
      // voir compresserPhoto() dans chaussures-scanner.tsx, qui redimensionne
      // la photo côté client bien en-dessous de cette limite avant l'envoi.
      bodySizeLimit: '4mb',
    },
    // Active l'intégration Next.js du <ViewTransition> de React (utilisé dans
    // src/app/(app)/layout.tsx pour la transition entre pages). Voir
    // src/react-view-transitions.d.ts pour les types correspondants.
    viewTransition: true,
  },
  async headers() {
    return [
      {
        // Empêche le cache HTTP disque du navigateur/de l'OS de resservir un
        // instantané obsolète des pages après fermeture complète puis
        // réouverture de la PWA (notamment WebAPK Android) : la fraîcheur
        // des données (ex. messages non lus du Cahier de liaison) doit
        // toujours venir d'une requête réseau. Les assets statiques Next
        // (hashés, immuables) ne sont pas concernés par cette exclusion.
        source: '/((?!_next/static|_next/image).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
        ],
      },
    ]
  },
};

export default nextConfig;
