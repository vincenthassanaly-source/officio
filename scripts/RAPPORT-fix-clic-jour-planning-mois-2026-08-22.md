# Rapport — Clic sur un jour sans effet en /agenda > Mois > Planning équipe

**Date** : 2026-08-22
**Symptôme signalé** : Vincent (titulaire, PWA Android installée) — en vue Mois > Planning équipe, cliquer sur un jour du calendrier ne surligne pas la case et n'affiche pas le panneau de détail des créneaux.

## Cause racine

**Le bug ne se reproduit pas en local / desktop.** Le code de `src/components/agenda/planning-equipe-mois.tsx` (onClick → `setJourSelectionne(iso)` → re-render du surlignage `bg-track` et du panneau `{jourSelectionne && (...)}`) est correct et fonctionne comme attendu.

Vérifications effectuées :

1. **Baseline en navigateur desktop (clic souris)** : reproduction du composant `PlanningEquipeMois` isolé (données factices, contournement temporaire de l'authentification Supabase le temps du test) dans une page de test locale, pilotée par Playwright (Chromium headless). Résultat : le clic ajoute bien la classe `bg-track` sur la case et affiche le panneau avec l'employé, la pastille de couleur, le type (Travail/Repos/Congé) et les horaires. Aucune erreur console.
2. **Baseline avec émulation tactile (tap Android)** : même test, cette fois en montant l'arborescence complète `Agenda` (avec les gestionnaires `onTouchStart/onTouchMove/onTouchEnd` du swipe de période qui enveloppent la grille) sous émulation d'un appareil mobile (Pixel 7, Playwright `devices`). Résultat identique : le `tap()` sur la case déclenche correctement le surlignage et le panneau, sans interférence des gestionnaires de swipe.
3. **Historique git** : `git log` sur `planning-equipe-mois.tsx` ne montre qu'un seul commit (création initiale, `d62ab23`) — aucun bug de ce type n'a jamais été corrigé sur ce fichier, ce qui exclut une régression de code récente.
4. **EcouteurRepriseApp** (`src/components/ecouteur-reprise-app.tsx`) est monté globalement dans `src/app/(app)/layout.tsx`, qui enveloppe toutes les routes du groupe `(app)` — dont `/agenda`. Aucune exclusion de route : `/agenda` bénéficie donc déjà du `router.refresh()` sur `pageshow`/reprise d'app, exactement comme le Cahier de liaison.

**Conclusion** : il s'agit du même type de problème que celui déjà rencontré et corrigé sur le Cahier de liaison — un instantané obsolète de la page conservé par le cache disque HTTP et/ou la restauration de processus du WebAPK Android, spécifique à l'appareil de Vincent, et non un bug de code. Contrairement au cas du Cahier de liaison, cette fois le symptôme touche même l'interactivité purement locale (React state), ce qui pointe vers un JS bundle figé/obsolète servi par l'app Android installée plutôt que vers une simple donnée serveur périmée.

## Correctif appliqué

Bien que la cause soit côté appareil et non côté code, la page serveur `/agenda` (`src/app/(app)/agenda/page.tsx`) ne portait pas encore les directives de cache déjà appliquées au tableau de bord (`src/app/(app)/page.tsx`) pour le même type de symptôme (cache serveur Next.js sur une page dont les données doivent toujours être fraîches après reprise d'app). Par cohérence et prudence, exactement le même pattern a été appliqué :

```ts
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'
```

Aucune autre modification de code n'a été nécessaire : `EcouteurRepriseApp` couvrait déjà `/agenda`, et aucun composant dupliqué ou route conflictuelle n'a été trouvé (`planning-equipe-mois.tsx` est le seul composant de ce nom, `agenda/page.tsx` est la seule page pour cette route).

## Test manuel de non-régression

Aucune infrastructure Playwright (config, dossier de tests) n'existe dans le dépôt — seule la dépendance `playwright` est présente dans `devDependencies`, sans usage constitué. Conformément à la consigne de ne pas introduire de nouvelle infrastructure de test, la vérification a été faite manuellement (scripts Playwright ad hoc, non commités, dans un répertoire temporaire) plutôt que via un fichier de test ajouté au dépôt :

- Étape 1 : ouvrir `/agenda`, passer en vue **Mois**, onglet **Planning équipe**.
- Étape 2 : cliquer/taper sur un jour du calendrier contenant des créneaux.
- Résultat attendu et observé (desktop clic + émulation tactile Android) : la case se surligne (fond `bg-track`) et le panneau apparaît sous la grille avec la liste des créneaux (employé, pastille de couleur, type, horaires pour les créneaux de travail).

## Actions recommandées pour Vincent (cause probable côté appareil)

Puisque le bug ne se reproduit pas avec le code actuel, la piste la plus probable reste un instantané obsolète conservé par l'app Android installée. À faire, dans l'ordre :

1. **Fermer complètement l'app Officio** (la retirer des apps récentes / multitâche), pas seulement la mettre en arrière-plan, puis la rouvrir et retester le clic sur un jour en vue Mois > Planning équipe.
2. Si le problème persiste : **Paramètres du téléphone > Applications > Officio > Stockage > Vider le cache** (ne pas utiliser « Vider les données », qui déconnecterait le compte), puis rouvrir l'app et retester.
3. Si le problème persiste encore : **désinstaller le raccourci Officio** de l'écran d'accueil (WebAPK), puis retourner sur le site dans Chrome et **réinstaller l'app** via « Ajouter à l'écran d'accueil » / l'invite d'installation PWA, afin de forcer le téléchargement d'un JS bundle à jour.
4. Si le bug persiste malgré ces trois étapes, il faudra qu'il puisse partager une courte vidéo du problème sur l'appareil concerné (avec la console distante Chrome DevTools via USB si possible) pour investiguer plus finement côté appareil.
