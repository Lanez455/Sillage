# Moto Club

Application mobile (iOS / Android) pour organiser des sorties à moto entre motards.
Expo (Expo Router, TypeScript) · Supabase · Mapbox · TanStack Query.

## Fonctionnalités

- **Sorties** : liste filtrable (Route / Circuit, à venir / passées), détail avec carte du parcours,
  distance, durée, dénivelé, niveau, lieu de rendez-vous et grille des inscrits avec leur moto.
- **Création** : tracé à la main sur la carte (chaque appui ajoute un point, distance calculée en direct,
  boucle, annuler), puis titre, date et heure, type, niveau (Détente → Expert), places, description.
  Le lieu de rendez-vous est prérempli par géocodage inverse, la durée est estimée et modifiable,
  le dénivelé positif est calculé via l'API d'altitude Open-Meteo.
- **Inscription** : le motard choisit une de ses motos, rejoint la grille, peut changer de moto ou se
  désinscrire jusqu'au départ. Le nombre de places est garanti côté base (verrou + trigger).
- **Garage** : motos (marque, modèle, année, cylindrée, km), fiche avec photo (caméra ou galerie),
  description libre, préparation et équipements.
- **Profil pilote** façon MotoGP : XP, niveaux (1 à 50), rangs (Rookie → Moto3 → Moto2 → MotoGP →
  Champion du monde → Légende), 14 trophées avec progression, carte de pilote avec numéro de course.

## Démarrage

1. **Dépendances** : `npm install`
2. **Variables** : copier `.env.example` en `.env` et renseigner les clés Supabase et Mapbox.
3. **Supabase** :
   - appliquer `supabase/migrations/20261006000000_init.sql` (`supabase db push` ou éditeur SQL) ;
   - Authentication → URL Configuration : ajouter `motoclub://auth/callback` aux Redirect URLs ;
   - Authentication → Providers : activer Email, Apple et Google.
     Pour Apple natif sur iOS, ajouter le bundle id `com.motoclub.app` dans les Client IDs Apple.
4. **Build de développement** (Mapbox et Sign in with Apple ne fonctionnent pas dans Expo Go) :
   ```bash
   npx expo run:ios       # ou npx expo run:android
   # ou dans le cloud :
   npx eas-cli@latest build --profile development
   ```
   Le plugin Mapbox lit `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` (jeton secret `sk.…` avec le scope `DOWNLOADS:READ`).

## Vérifications

```bash
npm run typecheck
npm run lint
```

## Structure

```
src/app/            écrans (Expo Router)
  (tabs)/           Sorties · Garage · Pilote
  ride/new.tsx      création en deux étapes (tracé puis infos)
  ride/[id]/        détail et carte plein écran
  bike/             ajout et fiche moto
  pilot/[id].tsx    profil public d'un motard
src/components/     UI, cartes Mapbox, grille, carte pilote, trophées
src/hooks/          requêtes et mutations TanStack Query
src/lib/            Supabase, auth, géo, gamification, photos, formatage
supabase/migrations schéma, RLS, triggers, vue pilot_stats, buckets de stockage
```

## Règles côté base

- RLS sur toutes les tables : lecture pour les membres connectés, écriture sur ses propres lignes.
- `ride_participants` : un trigger verrouille la sortie et refuse l'inscription si elle est complète,
  déjà partie, ou si la moto n'appartient pas au motard. L'organisateur ne peut pas quitter sa sortie
  (il la supprime) et personne ne se désinscrit après le départ.
- `create_ride` crée la sortie et inscrit l'organisateur avec sa moto dans la même transaction.
- `pilot_stats` calcule l'XP à partir des sorties passées uniquement : s'inscrire ne rapporte rien
  tant que la sortie n'a pas eu lieu. Barème détaillé dans `src/lib/gamification.ts`.
- Stockage : buckets publics `bike-photos` et `avatars`, écriture limitée au dossier `<uid>/`.
