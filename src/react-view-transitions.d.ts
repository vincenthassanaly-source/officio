// Le paquet `react` installé (19.2.4, canal stable) n'expose pas `ViewTransition`
// dans ses types par défaut — cette API n'existe que dans les canaux
// canary/experimental de React, que Next.js substitue en interne au moment du
// build quand `experimental.viewTransition` est activé (voir next.config.ts).
// Cette référence charge uniquement les *types* correspondants (aucun import
// runtime : @types/react les fournit indépendamment de la version réelle de
// React installée), pour que `import { ViewTransition } from 'react'` type-check.
/// <reference types="react/experimental" />
