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
        // Pages à fraîcheur immédiate obligatoire : l'accueil (aperçus
        // liaison/agenda + cloche notifications), le Cahier de liaison et
        // l'agenda. `no-store` empêche à la fois le cache HTTP disque et,
        // sous Chrome/WebAPK Android, l'éligibilité de la page au bfcache —
        // c'est ce second effet qui évite de resservir un instantané
        // obsolète (ex. messages non lus) après fermeture complète puis
        // réouverture de la PWA. Voir EcouteurRepriseApp pour le cas des
        // pages hors de cette liste, qui elles restent bfcache-éligibles.
        source: '/',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/liaison',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        source: '/agenda',
        headers: [{ key: 'Cache-Control', value: 'no-store, must-revalidate' }],
      },
      {
        // Toutes les autres pages (documents, carnet, fournisseurs, profil,
        // huiles essentielles, chaussures, etc.) : leurs données changent
        // rarement en cours de session, un court cache navigateur évite de
        // refaire un aller-retour réseau complet à chaque navigation sans
        // risquer un contenu significativement périmé. `private` car le
        // contenu est propre à l'officine/l'utilisateur connecté (pas de
        // cache partagé/CDN). Assets statiques Next (hashés, immuables) non
        // concernés par cette règle : exclus explicitement, comme les 3
        // routes ci-dessus (`.+` plutôt que `.*` exclut aussi la racine `/`
        // elle-même, dont le nombre de caractères après le `/` est nul).
        source: '/((?!_next/static|_next/image|liaison|agenda).+)',
        headers: [{ key: 'Cache-Control', value: 'private, max-age=10, must-revalidate' }],
      },
    ]
  },
};

export default nextConfig;
