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
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
