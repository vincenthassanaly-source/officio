# FAB création rapide — ajout "Nouvelle régularisation" (2026-08-19)

## Résumé

Ajout d'une troisième option dans le bouton flottant de création rapide (`FabCreationRapide`) :
créer une régularisation d'ordonnance sans quitter l'écran courant, sur le même modèle que
"Nouveau message" et "Nouvelle tâche".

## Fichier modifié

Seul `src/components/fab-creation-rapide.tsx` a été modifié — aucun ajustement n'a été nécessaire
dans `regularisations-liste.tsx` : `ChampsFormulaire` et `CHAMP_CLASS` y étaient déjà exportés et
ont été réutilisés tels quels, sans duplication.

### Détail des changements dans `fab-creation-rapide.tsx`

1. **Imports** : `IconRegularisation` (depuis `nav-icons.tsx`), `ajouterRegularisation` (depuis
   `@/app/actions/regularisations`), `ChampsFormulaire` (depuis
   `@/components/regularisations-liste`), `toISODate` (depuis `@/lib/dates`).
2. **Type `Vue`** étendu : `'ferme' | 'menu' | 'message' | 'tache' | 'regularisation'`.
3. **`MenuChoix`** : nouvelle entrée "Nouvelle régularisation" / "Enregistrer une ordonnance à
   régulariser", avec une puce ronde `bg-purple-soft text-purple` contenant `<IconRegularisation
   />` — même structure exacte (`h-10 w-10 rounded-full`, icône `h-5 w-5`) que les deux entrées
   existantes.
4. **Nouveau composant `FormulaireRegularisation`** (même emplacement/niveau que
   `FormulaireMessage` / `FormulaireTache`) :
   - Rend `<ChampsFormulaire dateRegularisationParDefaut={toISODate(new Date())} />` — aucun champ
     recodé, tous fournis par `regularisations-liste.tsx`.
   - Au submit : `ajouterRegularisation(formData)` puis `onCree()`, dans un `startTransition`,
     exactement le pattern de `FormulaireTache`.
   - Bouton "Ajouter la régularisation", `disabled={isPending}`, mêmes classes Tailwind que les
     boutons de soumission existants (`rounded-xl bg-primary py-2.5 text-[13.5px] font-semibold
     text-white disabled:opacity-60`).
5. **Rendu final** : `{vue === 'regularisation' && <FormulaireRegularisation onCree={fermer} />}`
   ajouté à côté des branches `message` / `tache` existantes.

## Choix de couleur pour la puce du menu

`bg-purple-soft text-purple` (tokens définis dans `globals.css`, déjà utilisés ailleurs dans le
projet : `carnet-adresses.tsx`, `documents-list.tsx`, `fournisseurs-liste.tsx`, la tuile d'accueil
elle-même). Choix délibéré plutôt que `bg-rec-soft text-rec` suggéré en exemple dans la consigne :
`rec` est déjà utilisé dans ce fichier pour la catégorie "Urgent" des messages, et sert par
ailleurs de code couleur "retard" dans le module régularisations lui-même
(`estEnRetard`/`border-rec bg-rec-soft` dans `regularisations-liste.tsx`). Le réutiliser ici
aurait pu laisser croire que l'entrée du menu signale une urgence ou un retard, alors qu'il s'agit
d'une simple action de création. `bg-accent-soft text-accent` était déjà pris par "Nouvelle
tâche" dans ce même menu. `purple` reste distinct des deux autres entrées et cohérent avec le
reste de l'app.

## Confirmation revalidatePath

`ajouterRegularisation` (non modifié, dans `src/app/actions/regularisations.ts`) appelle déjà
`revalidatePath('/regularisations')` après l'insertion. La page `/regularisations` et la Vue
globale de l'Agenda (qui lit les mêmes données) seront donc à jour après un ajout via le FAB, sans
action supplémentaire.

## Vérifications techniques effectuées

- `npx tsc --noEmit` → OK, aucune erreur.
- `npm run lint` → OK, aucune nouvelle erreur introduite (2 erreurs préexistantes et sans rapport
  avec ce fichier, dans `agenda-vue-globale.tsx` et `switch-identite.tsx`, non touchées).
- `npm run build` → build de production réussi (Next.js 16.2.12 / Turbopack), toutes les pages
  compilées et générées sans erreur.
- Test dans le navigateur automatisé : non concluant au-delà du démarrage sans erreur du serveur
  dev — l'app est protégée par une page de connexion à laquelle je n'ai pas de compte de test
  dans cet environnement.

## Écarts par rapport au prompt

Aucun écart fonctionnel. Le seul point tranché de mon propre jugement (autorisé explicitement par
la consigne "à toi de juger") est la couleur `purple` plutôt que `rec` pour la puce du menu,
justifié ci-dessus.
