# Click & Collect Mobile

Application mobile Expo/React Native de commande en ligne avec retrait en magasin.

Le projet gère deux rôles:

- Client: explorer le catalogue, ajouter au panier, valider la commande, suivre le statut.
- Commerçant: gérer ses produits, consulter ses commandes, faire évoluer les statuts.

## Fonctionnalités principales

- Authentification Appwrite (inscription/connexion)
- Gestion des rôles (`client`, `merchant`)
- Catalogue produits avec image, catégorie, prix, statut de stock
- Détail produit côté client
- Panier client (ajout, suppression, quantité)
- Validation de commande et écran de confirmation
- Suivi des commandes client
- File commerçant des commandes (`pending`, `ready`, `done`)
- Dashboard commerçant (indicateurs clés)
- Upload d'image produit vers Appwrite Storage

## Stack technique

- Expo + Expo Router
- React Native + TypeScript (écrans) + JSX (contexts)
- Appwrite (`react-native-appwrite`)
- `expo-image` et `expo-image-picker`

## Structure du projet

- `app/`: écrans via routes Expo Router
- `contexts/`: état global (`User`, `Products`, `Orders`, `Cart`)
- `lib/appwrite.js`: client Appwrite + IDs de base/table/bucket
- `components/`: composants UI réutilisables

## Pré-requis

- Node.js 18+
- npm
- Expo CLI (via `npx expo ...`)
- Compte Appwrite avec:

1. un projet
2. une database
3. les tables `users`, `products`, `orders`
4. un bucket pour les images produits

## Installation

```bash
npm install
```

Note Windows (PowerShell): si la policy bloque `npm`/`npx`, utilisez:

```bash
npm.cmd install
npx.cmd expo start
```

## Lancer le projet

```bash
npm run start
```

Autres scripts utiles:

```bash
npm run android
npm run web
npm run lint
```

## Configuration Appwrite

Les constantes sont actuellement définies dans `lib/appwrite.js`:

- `APPWRITE_ENDPOINT`
- `APPWRITE_PROJECT_ID`
- `DATABASE_ID`
- `TABLE_USERS`
- `TABLE_PRODUCTS`
- `TABLE_ORDERS`
- `BUCKET_PRODUCT_IMAGES`

Pour un déploiement propre, il est recommandé de déplacer ces valeurs vers des variables d'environnement.

## Modèle de données (attendu)

### `users`

- `$id`: identifiant Appwrite
- `email`: email unique
- `name`: nom complet
- `role`: `merchant` ou `client`
- `created_at`: date de création

### `products`

- `$id`
- `name`
- `price`
- `image_id`
- `merchant_id`

### `orders`

- `$id`
- `client_id`
- `merchant_id`
- `status`: `pending`, `ready`, `done`
- `created_at`

## Parcours utilisateur

### Client

1. Se connecter
2. Consulter le catalogue
3. Voir le détail d'un produit
4. Ajouter au panier
5. Valider la commande
6. Voir la confirmation
7. Suivre les commandes

### Commerçant

1. Se connecter
2. Créer/modifier/supprimer ses produits
3. Consulter la file de commandes
4. Passer une commande de `pending` vers `ready`, puis `done`
5. Consulter l'historique

## Permissions recommandées (Appwrite)

- `users`: lecture/modification de son propre profil
- `products`: lecture publique, écriture limitée au propriétaire
- `orders`: accès limité au client concerné et au commerçant concerné
- `product-images`: lecture publique, update/delete propriétaire

## État actuel

Le projet contient l'essentiel du flux Click & Collect côté UI et logique métier.
Pour une conformité complète en production, vérifier et verrouiller les permissions Appwrite au niveau serveur.
