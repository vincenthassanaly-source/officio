# Deep-link notifications — correctif sw.js + extension Notes — rapport

## Contexte

Le deep-linking précis "notification → élément exact" était déjà en place pour
`messages`, `taches_assignees`, `taches_non_assignees`
(`scripts/RAPPORT-notifications-urls-precises-2026-08-20.md`), avec un bug
connu et documenté mais non corrigé : `public/sw.js` ne comparait que le
`pathname` de l'URL cible pour décider si un onglet déjà ouvert devait juste
être focus ou aussi naviguer — un onglet `/liaison` déjà ouvert restait donc
figé sur son ancienne cible après un tap sur une notification système, sans
scroll ni surlignage.

`notes` n'avait pas encore ce deep-linking du tout : url générique `/notes`,
pas de lecture de `searchParams`, pas d'`id` DOM sur les cartes.

## Ce qui a été fait (3 commits, comme demandé)

### 1. `public/sw.js` + relais client (commit `784210e`)

- **`public/sw.js`** (`notificationclick`) : compare désormais
  `pathname + search` (au lieu de `pathname` seul) pour détecter un client
  déjà affiché exactement sur la cible.
  - Correspondance exacte → `focus()` puis `postMessage({ type:
    'notification-cible', url })` au client — un service worker ne peut pas
    dispatcher un évènement directement sur le DOM de la page, ce
    `postMessage` est le seul canal disponible pour relayer l'info.
  - Client de même origine sans correspondance exacte → `focus()` puis
    `navigate(url)` (comportement déjà correct, conservé à l'identique).
  - Aucun client → `clients.openWindow(url)` (inchangé).
- **`src/components/ecouteur-reprise-app.tsx`** : nouvel effet qui écoute
  `navigator.serviceWorker`'s `message` event ; si `event.data.type ===
  'notification-cible'`, redispatch `window.dispatchEvent(new
  CustomEvent(EVENEMENT_NOTIFICATION_CIBLE, { detail: { url } }))` — réutilise
  tel quel l'écouteur déjà présent dans `fil-de-messages.tsx` / `notes.tsx`
  (et bientôt tout futur écouteur similaire), sans dupliquer la logique de
  scroll/surlignage. Le type `'notification-cible'` est un littéral partagé
  entre les deux fichiers (aucun import possible : `sw.js` n'est pas passé
  par le bundler) — synchronisation documentée en commentaire des deux côtés.

### 2. Migration SQL Notes (commit `f08fd1d`)

`scripts/migration-notifications-notes-url-precise.sql` (nouveau fichier,
append-only — ne modifie pas `scripts/migration-notifications-notes.sql` déjà
appliquée) : `create or replace function notifier_nouvelle_note()`, seule la
valeur de `url` change, `'/notes'` → `'/notes?note=' || new.id`, dans le
payload envoyé à `send-push` et dans la ligne insérée dans `notifications`.
Même nom de fonction → le trigger `notes_push` existant s'y raccroche
automatiquement, pas besoin de le recréer.

**Appliquée pour de vrai** au projet Supabase `hjerdcehdzfjhzefnnel` (officio)
via le MCP Supabase, `execute_sql`. Vérifié après coup par relecture de
`pg_proc.prosrc` : la nouvelle valeur d'url est bien en place.

`get_advisors` (security + performance) exécuté après la migration : aucune
alerte nouvelle. Les avertissements retournés (extensions `pg_net`/`vector`
dans le schéma `public`, fonctions `SECURITY DEFINER` exposées en RPC,
protection mot de passe divulgué désactivée, clés étrangères non indexées)
sont tous préexistants et sans rapport avec `notifier_nouvelle_note()` — cette
fonction était déjà `SECURITY DEFINER` exposée en RPC avant ce correctif,
seule sa valeur d'url change.

### 3. UI Notes — deep-link + scroll + surlignage (commit `49d8ea3`)

Même pattern que Messages/Tâches, répliqué à l'identique :

- **`src/app/(app)/notes/page.tsx`** — lit désormais `searchParams` (prop
  serveur async, `{ note?: string }`), pose une `key` sur `<Notes>` dérivée de
  `note` pour forcer un remontage propre à **chaque nouvelle cible** (pas
  seulement au premier chargement). `useSearchParams` (utilisé dans `Notes`)
  exige une frontière `<Suspense>`, ajoutée ici.
- **`src/components/notes.tsx`** (`Notes` + `CarteNote`) :
  - `Notes` lit `?note=` via `useSearchParams()` → état initial `idSurligne`
    (`useState(() => searchParams.get('note'))`).
  - Effet de montage : si `idSurligne`, `scrollIntoView({behavior: 'smooth',
    block: 'center'})` vers `#note-<id>`.
  - Écouteur sur `EVENEMENT_NOTIFICATION_CIBLE` : rejoue scroll + surlignage
    sans remontage (cas "déjà sur `/notes`", émis soit par
    `notifications-cloche.tsx` — même URL —, soit désormais relayé depuis le
    service worker via `ecouteur-reprise-app.tsx`).
  - Disparition en fondu du surlignage après ~2s (`setTimeout` +
    `setIdSurligne(null)`).
  - `CarteNote` porte `id={`note-${note.id}`}` et la classe `ring-2
    ring-primary` (transition 300ms) quand `idSurligne === note.id`.
- **`src/components/notifications-cloche.tsx`** : aucun changement de
  logique nécessaire (déjà générique sur `n.url`) — confirmé par le test
  manuel du scénario "déjà sur la bonne page" (voir Vérifications).

## Constat sur `agenda_rappel` — confirmé, hors périmètre

Audit frais du repo (avant et pendant cette tâche) : `agenda_rappel` reste
déclarée dans `src/lib/notifications/types.ts` et dans les contraintes
`CHECK` (`notification_preferences.categorie`, `notifications.categorie`),
mais **aucun code du repo ne l'envoie actuellement**.
`ls src/app/api/cron/` ne montre que `rappels-taches/` — pas de
`rappels-agenda/route.ts`, malgré la mention dans un commentaire de
`migration-notifications-urls-precises.sql`. `grep -rn agenda_rappel` sur
`src/` et `scripts/` ne remonte que des références dans les types, les
contraintes `CHECK` et des commentaires/rapports historiques — aucun
déclencheur réel. Confirmation du constat déjà documenté dans
`scripts/RAPPORT-notifications-urls-precises-2026-08-20.md` : **rien construit
ici pour `agenda_rappel`**, conformément au périmètre de la tâche.

## Vérifications techniques

- `npm install` (node_modules absent au démarrage de la session).
- `npx tsc --noEmit` : 0 erreur, après chaque commit.
- `npm run lint` : 0 erreur/warning sur les fichiers modifiés/créés. Les 5
  problèmes restants (1 erreur, 4 warnings) dans `src/components/switch-
  identite.tsx` sont préexistants, sans rapport avec cette tâche, non
  modifiés ici.
- `npm run build` : build de production réussi après le commit UI Notes.

### Vérification `public/sw.js` (Node, service worker mocké)

Script Node (`vm.runInContext`) chargeant le vrai `public/sw.js` dans un
bac à sable simulant `self.clients.matchAll`, `focus()`, `navigate()`,
`postMessage()`, `clients.openWindow()`. 5 scénarios exécutés :

1. Client déjà affiché avec `pathname+search` **identiques** à la cible →
   `focus()` + `postMessage({type: 'notification-cible', url})`, ni
   `navigate` ni `openWindow` appelés. ✅
2. Client déjà affiché sur le **même pathname mais une query différente**
   (le bug exact décrit dans la tâche : `/liaison?onglet=fil&message=abc`
   ouvert, notification vers `/liaison?onglet=taches&tache=xyz`) →
   `focus()` + `navigate(url)` — navigation désormais effective, alors
   qu'avant le correctif ce cas tombait à tort dans la branche "déjà
   ouvert" (comparaison sur le seul `pathname`) et ne naviguait jamais. ✅
3. Client sur un chemin non lié → `focus()` + `navigate(url)` (fallback
   existant, inchangé). ✅
4. Plusieurs clients ouverts, un seul correspond exactement → seul celui-là
   est focus/postMessage, les autres inchangés. ✅
5. Aucun client ouvert → `clients.openWindow(url)`. ✅

### Vérification navigateur réelle (Playwright, Chromium headless)

Comme pour le correctif précédent, pas de compte de test disponible dans cet
environnement pour un vrai aller-retour Supabase authentifié. Page de test
temporaire construite à l'identique de la structure réelle (Server Component
+ `searchParams` + `Suspense` + `key`, données de notes fictives, montage de
`EcouteurRepriseApp` + `Notes`), exemptée temporairement du middleware
d'authentification (`src/proxy.ts`, `PUBLIC_PREFIX`), servie par `npm run dev`
(env Supabase factices, aucune vraie requête réseau déclenchée dans ce
scénario). **Page de test, exemption middleware et process `next dev`
supprimés/arrêtés avant les commits** — `git status` confirmé propre après
coup.

3 scénarios vérifiés dans un vrai navigateur :

1. Chargement direct `/notes?note=<id>` → anneau (`ring-2 ring-primary`)
   présent au montage, élément effectivement scrollé au centre du viewport,
   anneau disparu après ~2.2s (fondu). ✅
2. Évènement custom `officio:notification-cible` dispatché directement sur
   `window` (équivalent à `notifications-cloche.tsx` quand on est déjà sur
   `/notes`) vers une autre note → scroll + surlignage rejoués sans
   remontage. ✅
3. `MessageEvent` simulé sur `navigator.serviceWorker` (équivalent au
   `postMessage()` réel envoyé par `sw.js` après un `focus()` sur une cible
   déjà affichée) → relayé par `EcouteurRepriseApp` en
   `officio:notification-cible`, capté par `Notes`, scroll + surlignage
   rejoués. ✅

Aucune erreur console/page dans les 3 scénarios.

**Non testé en conditions réelles** (nécessiterait un vrai abonnement push +
compte authentifié, hors de cet environnement) : le trajet complet
notification système → tap → `sw.js` → `postMessage` → app déjà ouverte au
premier plan, de bout en bout sur un appareil réel. La logique de `sw.js`
elle-même est vérifiée isolément (section précédente) et le relais
client (`ecouteur-reprise-app.tsx` → évènement custom → `notes.tsx`) est
vérifié en navigateur réel (scénario 3 ci-dessus) — seule l'intégration
`sw.js` réel ↔ navigateur réel n'a pas pu être exercée bout en bout.

## Comment tester manuellement (en conditions réelles)

1. **Note (nouveau deep-link)** : ouvrir `/notes` avec deux comptes/onglets
   différents de la même officine. Depuis le compte A, créer une note. Sur le
   compte B, la cloche affiche la notification — cliquer dessus doit amener
   sur `/notes?note=<id>`, faire défiler jusqu'à la note et la surligner
   brièvement.
2. **Cas "même page"** : rester affiché sur `/notes?note=X` et cliquer une
   seconde fois sur la même notification depuis la cloche (sans recharger) :
   la note doit se re-surligner immédiatement.
3. **Notification push, app déjà ouverte sur une autre cible (le bug
   corrigé)** : avec les notifications push activées (voir NOTIFICATIONS.md),
   ouvrir `/liaison?onglet=fil&message=X` (ou `/notes?note=X`) sur un
   appareil, puis déclencher une nouvelle notification vers une cible
   **différente** sur la même page (ex: une nouvelle tâche assignée pendant
   que le fil est affiché, ou une nouvelle note pendant qu'une autre note est
   affichée). Taper sur la notification système doit désormais faire basculer
   l'app vers la nouvelle cible précise (scroll + surlignage), plutôt que de
   simplement repasser au premier plan sans rien changer.
4. **Notification push, app déjà ouverte exactement sur la cible** :
   redéclencher une notification vers l'URL déjà affichée à l'identique.
   Taper dessus doit focus l'onglet et rejouer scroll + surlignage (via le
   nouveau relais `postMessage`), sans rechargement de page.

## Fichiers modifiés/créés

- `public/sw.js`
- `src/components/ecouteur-reprise-app.tsx`
- `scripts/migration-notifications-notes-url-precise.sql` (créé, appliqué en
  base)
- `src/app/(app)/notes/page.tsx`
- `src/components/notes.tsx`

Non modifiés (hors périmètre ou déjà corrects) : `supabase/functions/send-
push/index.ts` (transmet déjà l'url reçue telle quelle),
`src/components/notifications-cloche.tsx` (déjà générique sur `n.url`),
`scripts/migration-notifications-notes.sql` et
`scripts/migration-notifications-urls-precises.sql` (historiques, non
modifiées — append-only respecté).

---

Cette branche (`claude/notes-deep-link-notifications-47o37u`) est prête.
Dis-moi si tu veux que je pousse sur `officio` (jamais `main`).
