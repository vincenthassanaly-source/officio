# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Titulaire, adjoints et préparateurs de la Pharmacie Rome Village. Ils utilisent l'app debout au comptoir, souvent interrompus par un client ou un appel, principalement sur mobile (375 px) et parfois sur un poste fixe à l'arrière de l'officine.

Aujourd'hui, une seule officine (Pharmacie Rome Village) utilise réellement l'app ; son ouverture à d'autres officines est une possibilité future, pas un usage actuel.

## Product Purpose

Une PWA de gestion d'équipe pour une pharmacie d'officine, conçue par Vincent (pharmacien titulaire) pour sa propre équipe. Elle réunit dans un seul outil les usages métier observés dans le code : cahier de liaison (messages, tâches), agenda, documents, entretiens pharmaceutiques, carnet, fournisseurs, notes, activité, ainsi que des modules plus spécialisés (vaccins, ruptures de stock, suivi CNO, régularisations d'ordonnances, huiles essentielles, chaussures orthopédiques, plan de posologie, suggestions).

## Operating Context

- Utilisation au comptoir : debout, interruptions fréquentes (client, téléphone), séquences d'usage courtes.
- Mobile d'abord (375 px), avec un usage secondaire sur poste fixe (desktop, sidebar de navigation dédiée).
- Installée comme PWA (manifest, icônes) ; certaines pages sont notifiées en push (mentionné dans le code : notifications in-app et push).
- Un mode « réaliser un entretien » (Entretiens pharmaceutiques) reste ouvert à l'écran pendant l'échange avec un patient, avec verrou d'écran allumé.

## Capabilities and Constraints

- Stack existante : Next.js (App Router), React, Tailwind v4, Supabase (Postgres, Auth, Storage), déploiement Vercel.
- Certaines pages sont à fraîcheur immédiate obligatoire (`Cache-Control: no-store`) : accueil, cahier de liaison, agenda, entretiens pharmaceutiques — les données y changent en continu entre plusieurs membres de l'équipe.
- Multi-officine techniquement supporté (notion d'adhésion à une officine, switch d'officine) même si une seule officine l'utilise en pratique aujourd'hui.
- Interface entièrement en français, vocabulaire métier officine conservé tel quel (pas de traduction/i18n prévue).
- Pas de logo ni de charte graphique externe imposée : l'identité visuelle vit dans le code (tokens `globals.css`, typographies Space Grotesk/Inter) et relève de DESIGN.md, pas de ce document.

## Evidence on Hand

Aucun témoignage, étude de cas ou donnée d'usage réelle formalisée à ce jour. Les données utilisées pour les mesures et bancs d'essai (Lot 1, refonte des Entretiens) sont fictives et ne doivent pas être présentées comme des preuves d'usage réel.

## Product Principles

1. Le comptoir prime sur le bureau : toute décision d'interface doit d'abord fonctionner debout, sur mobile, en cas d'interruption.
2. Sobriété professionnelle : ton neutre, vocabulaire métier, français partout, pas d'effet superflu.
3. L'accessibilité est une exigence de base, pas une option : cibles tactiles, contraste, clavier et lecteurs d'écran sont soignés par défaut sur toute nouvelle interface.
4. L'app reste au service d'une équipe réelle et de son fonctionnement quotidien (titulaire, adjoints, préparateurs) avant toute ambition de généralisation à d'autres officines.

## Accessibility & Inclusion

Bonnes pratiques par défaut, sans référentiel formel visé (ni RGAA ni un niveau WCAG précis pour l'instant) : cibles tactiles ≥ 44 px, contraste suffisant, navigation clavier complète avec focus visible, et structure compatible lecteur d'écran (rôles ARIA, libellés accessibles) sur toute nouvelle interface.
