# Rapport — Instrumentation debug du clic sur un jour (Mois > Planning équipe / Vue globale)

**Date** : 2026-08-22
**Contexte** : le correctif précédent (commit `55a6376`, `force-dynamic` sur `/agenda`) est en production et n'a pas résolu le symptôme. Vincent confirme, en navigation privée sur le domaine de prod, qu'un clic sur une case du calendrier en vue Mois (Planning équipe **et** Vue globale) ne produit toujours aucun changement visible, y compris sur des jours vides. Ce rapport documente l'instrumentation ajoutée et les vérifications passives faites côté code en attendant son retour.

## 1. Instrumentation ajoutée

Dans `src/components/agenda/planning-equipe-mois.tsx` et `src/components/agenda/agenda-vue-globale-mois.tsx`, le `onClick` du bouton de case déclenche maintenant, **avant** `setJourSelectionne(iso)`, un toast :

```ts
onClick={() => {
  // DEBUG TEMPORAIRE — à retirer après diagnostic
  toast({ type: 'info', message: 'Clic reçu sur ' + iso })
  setJourSelectionne(iso)
}}
```

`planning-equipe-mois.tsx` n'important pas encore `useToast`, l'import et l'appel du hook (`const toast = useToast()`) ont été ajoutés, tous deux marqués `// DEBUG TEMPORAIRE — à retirer après diagnostic`. Le type `'info'` existe déjà dans `toast-provider.tsx` (`succes` | `erreur` | `info`) : aucun nouveau type n'a été introduit.

Chaque ajout est isolé sur sa propre ligne avec le commentaire dédié, pour rester facilement grep-able (`grep -rn "DEBUG TEMPORAIRE" src/`) avant retrait en seconde itération.

**Interprétation attendue** :
- Toast **absent** au clic → l'événement `onClick` n'atteint jamais le composant React (piste : overlay invisible, `touch-action`, bundle JS non chargé/à jour sur l'appareil).
- Toast **présent** mais surlignage/panneau absents → le state `jourSelectionne` se met à jour mais le rendu conditionnel ou les classes Tailwind de surlignage sont en cause.

## 2. Vérifications passives effectuées côté code

### 2a. Overlay invisible / élément superposé au premier plan (`elementFromPoint`)

Test Playwright, viewport mobile 375×812 (émulation Pixel 7, tactile), sur une reproduction du composant `Agenda` (vue Mois, onglet Planning équipe) rendue en **build de production** (voir 2d) : pour les 42 cases de la grille, `document.elementFromPoint(centreDeLaCase)` renvoie systématiquement le bouton lui-même (ou un de ses descendants directs, le `<span>` du chiffre).

**Résultat : aucun problème détecté** — 0 case sur 42 avec un élément superposé. Piste écartée : pas d'overlay (notification, skeleton, reliquat d'animation `agenda-glisse-*`) au-dessus de la grille.

L'animation `agenda-glisse-suivant`/`agenda-glisse-precedent` (`globals.css`) n'anime que `transform`/`opacity` avec `animation-fill-mode: both`, se termine à `translateX(0) / opacity: 1` et ne touche jamais `pointer-events` — cohérent avec l'absence de superposition observée.

### 2b. Montage en double du composant (rendu mobile + desktop simultané masqué en CSS)

Recherche de toutes les références à `PlanningEquipeMois` et `AgendaVueGlobaleMois` dans `src/` : chacun n'est importé et rendu qu'à un seul endroit, dans `src/components/agenda/agenda.tsx`, conditionné en JS par `vue === 'mois'` et `onglet` (pas de variante dupliquée masquée en `hidden lg:block` / `lg:hidden`).

Confirmation en DOM (build de production, même page de test) : une seule grille d'en-têtes (`grid-cols-7`, 7 enfants) et une seule grille de cases (`grid-cols-7`, 42 enfants), toutes deux `display: grid` et visibles — pas de second jeu de cases masqué par CSS.

**Résultat : piste écartée.**

### 2c. CSP ou middleware bloquant l'exécution en production

Recherche de `Content-Security-Policy`, `X-Frame-Options`, `Permissions-Policy` dans `next.config.ts`, `vercel.json` et l'ensemble de `src/` : **aucune CSP n'est définie** dans le projet. Le seul en-tête personnalisé dans `next.config.ts` (`headers()`) est `Cache-Control: no-store, must-revalidate` sur les pages non-statiques (ajouté pour le bug du Cahier de liaison), qui ne bloque rien côté exécution JS.

Le seul middleware du projet est `src/proxy.ts` (authentification de route, redirection vers `/login` si non connecté) — il s'exécute côté serveur avant la réponse HTML et n'a aucun effet sur l'attachement des gestionnaires d'événements côté client.

**Résultat : piste écartée**, aucune CSP ni middleware susceptible de bloquer un `onClick` en production.

### 2d. Divergence build de production (Turbopack) vs `next dev`

`next build` (Turbopack) exécuté en local : compilation et vérification TypeScript réussies sans erreur, `/agenda` reste bien listé en rendu dynamique (`ƒ`) comme attendu. Le build a ensuite été servi avec `next start` et testé avec le même scénario Playwright tactile (tap sur une case du 12 août) : la case se surligne (classe `bg-track` ajoutée) et le panneau de détail apparaît, sans aucune erreur console (`console.error` ni exception JS).

**Résultat : aucune divergence dev/prod détectée** — le comportement du build de production est strictement identique à celui déjà validé en `next dev` dans le rapport précédent.

## 3. Bilan des pistes

| Piste | Statut |
|---|---|
| Overlay/élément superposé sur la grille | Écartée (2a) |
| Montage en double (mobile+desktop) | Écartée (2b) |
| CSP/middleware bloquant en production | Écartée (2c) |
| Divergence build prod vs dev | Écartée (2d) |
| Cache HTML serveur | Déjà écartée (précédent rapport — persiste en navigation privée) |
| **Événement `onClick` n'atteignant pas React sur l'appareil de Vincent spécifiquement** | **Piste restante, à confirmer par le toast instrumenté** |

Toutes les causes vérifiables sans accès à l'appareil de Vincent ont été écartées. La cause la plus probable reste désormais spécifique à son navigateur/appareil (bundle JS obsolète encore une fois malgré `force-dynamic`, extension ou réglage Chrome Android bloquant les événements tactiles, mode d'économie de données, etc.) — d'où l'instrumentation par toast, qui ne dépend d'aucun accès aux devtools.

## 4. Instructions pour Vincent

1. Ouvrir l'app Officio sur le téléphone (Chrome Android, comme d'habitude — pas besoin de navigation privée ni de manipulation particulière).
2. Aller sur **Agenda > Mois**, onglet **Planning équipe** (ou **Vue globale**, les deux sont instrumentés).
3. Cliquer/taper sur n'importe quel jour du calendrier.
4. Me dire simplement :
   - **Le petit encadré (toast) « Clic reçu sur AAAA-MM-JJ » apparaît-il en bas de l'écran, oui ou non ?**
   - Si oui : est-ce que la case se surligne et/ou un panneau de détail apparaît sous le calendrier, en plus du toast ?

Cette réponse (toast oui/non, et éventuellement surlignage/panneau oui/non) suffit à orienter la correction définitive en seconde itération — aucune autre manipulation n'est nécessaire de son côté.
