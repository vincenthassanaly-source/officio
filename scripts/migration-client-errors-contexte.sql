-- Contexte facultatif d'une erreur journalisée dans client_errors : nom de la
-- fonction source pour un échec de fetch isolé sur l'accueil (ex:
-- "getRendezVous", cf. Promise.allSettled dans src/app/(app)/page.tsx), ou
-- nom de l'écran pour un crash intercepté par un error boundary (ex:
-- "error-boundary-app" / "error-boundary-root", cf. src/app/(app)/error.tsx
-- et src/app/error.tsx). Sans ce champ, message/digest ne distinguaient pas
-- une requête spécifique en échec parmi les 16 lancées par l'accueil.
alter table client_errors add column contexte text null;
