# Première connexion Supabase

Projet : Asobi, référence hreureqrfefpoywuxnhm.

## Fichiers

- `.env.local` : URL et clé publique publishable ; ignoré par Git.
- `.env.example` : noms des variables à fournir, sans valeurs.
- `src/lib/supabase/config.ts` : lit et vérifie la configuration.
- `src/lib/supabase/client.ts` : client pour composants navigateur.
- `src/lib/supabase/server.ts` : client serveur utilisant les cookies de la requête.
- `src/lib/supabase/database.types.ts` : types correspondant à la première table.
- `supabase/migrations/20261019150000_create_categories.sql` : création et données initiales.
- `/categories` : première page lisant les catégories depuis la base.

## Droits prévus pour les catégories

Le vocabulaire des catégories est public : lecture permise aux visiteurs et membres connectés. RLS activée explicitement. Aucun droit INSERT/UPDATE/DELETE pour ces rôles. Administration des catégories par SQL pour cette première étape. Aucune donnée utilisateur dans cette table.

La clé publique ne donne pas les privilèges administrateur : les droits SQL et RLS restent déterminants. Ne jamais remplacer cette clé par une clé secret ou service_role dans les variables NEXT_PUBLIC.

## Étapes suivantes

La connexion ne constitue pas encore un système de comptes : ajouter Supabase Auth, le renouvellement de session dans Proxy, et la vérification des utilisateurs avant de créer des pages protégées. La base de profils devra être reliée à auth.users ; ne pas appliquer le DBML complet tel quel. Séparer les données privées des profils publics.

Pour le dashboard Auth : conserver la confirmation email ; configurer les redirections localhost lors de la mise en place des pages de connexion et du callback. Les paramètres de production seront définis avec le domaine final.

Pour appliquer la première migration : utiliser l’éditeur SQL du bon projet. Le fichier ne peut pas être rejoué tel quel si la table existe déjà. Il n’a pas été enregistré dans l’historique du CLI Supabase : appliquer les prochaines migrations avec un processus unique et réconcilier cet historique lors de l’adoption du CLI.

## Verification du 19 octobre 2026

Migration executee dans le dashboard. Lecture REST depuis le projet Next.js : HTTP 200 et 6 categories. Page /categories verifiee dans le navigateur : les 6 libelles sont affiches depuis Supabase. Compilation de production, TypeScript et ESLint reussis. Le probleme initial de connexion interne SQL ne se reproduit plus.

## /doc-api : laboratoire de developpement

La page utilise directement la Data API, avec la cle publique et le jeton du membre connecte. Aucun secret ni contournement RLS. Elle propose connexion/deconnexion, creation de comptes Auth de test, GET/POST/PATCH/DELETE, filtres cumules, selection des colonnes (et relations PostgREST), tri, pagination, JSON brut, tableau et historique en memoire. Aucun jeton ni mot de passe dans les reponses affichees ou historique. Les reponses sont effacees lors des changements de session.

Le catalogue documente les 23 tables du DBML ; seules categories et activities sont actuellement creees. L’inspection sonde le schema expose au role courant, avec repli sur des lectures sans lignes si OpenAPI requiert une cle secrete. Les autres tables renvoient une erreur tant que leurs migrations ne sont pas appliquees. Pas de CRUD admin implicite : categories reste en lecture seule depuis le navigateur.

Migration 20261019160000 : activities relie directement author_id a auth.users. Les profils metier et le controle des 16 ans restent a implementer. Les membres peuvent creer des brouillons, lire leurs fiches, modifier leurs brouillons et supprimer leurs fiches. Les champs auteur, statut, dates techniques ne peuvent pas etre modifies via PATCH. Meme visibility=public ne rend pas encore la fiche lisible par autrui : publication, moderation et deblocage de banque seront ajoutes ensemble.

PATCH et DELETE exigent un filtre egalite et utilisent Prefer: handling=strict,max-affected=1. DELETE demande de retaper le nom de la table. Pour une association, charger tous les champs de sa cle composee. Le JSON des mutations accepte une seule ligne par requete.

Tests SQL : supabase/tests/activities_rls.sql. Tests de creation/lecture/modification/suppression auteur, isolation vis-a-vis du second membre, refus usurpation auteur et publication directe. Test execute avec succes dans le dashboard, donnees fictives annulees par ROLLBACK. Les migrations executees via dashboard doivent etre reconciliees avec le CLI si celui-ci est adopte.

Ne pas confondre ce laboratoire et une interface utilisateur de production : inscription complete, champs publics/prives des profils, roles admin et autres modules restent a construire. Avant ouverture publique, le laboratoire doit etre retire ou reserve a un environnement de developpement.
