# API commandes (GraphQL)

API de prise de commande pour le salon de thé. Elle reçoit les commandes des serveurs, suit leur préparation et diffuse chaque changement en temps réel par WebSocket. Le menu est lu depuis l'API `menu-board`.

- **Requêtes et mutations** : `POST /graphql` (HTTP)
- **Abonnements** : `ws://…/graphql` ou `wss://…/graphql` (protocole `graphql-ws`)
- **Explorateur GraphiQL** : `/graphql` dans un navigateur (schéma documenté, autocomplétion)
- **Page de documentation** : `/`

## Démarrage

```bash
npm install
npm start
```

Créez d'abord un fichier `.env` à partir de `.env.example` :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL (Neon) |
| `API_KEY` | oui | Clé d'accès du personnel |
| `DATABASE_SSL` | non | `false` uniquement pour une base locale (défaut : `true`) |
| `MENU_URL` | non | Adresse du menu (défaut : `https://menu-board-api-murex.vercel.app/menu`) |
| `PORT` | non | Port d'écoute (défaut : `3000`) |

Les tables sont créées automatiquement au premier appel.

## Authentification

| Canal | Où mettre la clé |
|---|---|
| HTTP | En-tête `X-Api-Key: VOTRE_CLE` |
| WebSocket | Paramètre de connexion `{ "apiKey": "VOTRE_CLE" }` |

Le menu est public. Toutes les opérations sur les commandes exigent la clé.
Sans clé valide : erreur `UNAUTHENTICATED` en HTTP ; connexion WebSocket fermée avec le code `4403`.
Sans `API_KEY` configurée sur le serveur, tout est refusé.

## Schéma

```graphql
type Query {
  menu: Menu!                       # public
  commandes: [Commande!]!           # non payées, des plus anciennes aux plus récentes
  commande(id: ID!): Commande
}

type Mutation {
  creerCommande(table: Int!, lignes: [LigneCommandeInput!]!): Commande!
  changerStatut(id: ID!, statut: Statut!): Commande!
}

type Subscription {
  commandeModifiee: Commande!       # chaque commande créée ou modifiée
}

type Commande {
  id: ID!
  table: Int!
  lignes: [LigneCommande!]!
  statut: Statut!
  creeeLe: String!                  # ISO 8601
}

type LigneCommande { produit: String!  quantite: Int! }
input LigneCommandeInput { produit: String!  quantite: Int! }

enum Statut { EN_ATTENTE  EN_PREPARATION  PRETE  SERVIE  PAYEE }

type Menu { categories: [Categorie!]!  produits: [Produit!]! }
type Categorie { id: ID!  nom: String!  visible: Boolean! }
type Produit { id: ID!  nom: String!  prix: Float!  categorieId: ID!  visible: Boolean! }
```

## Exemples

Lister les commandes en cours :

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" -H "X-Api-Key: VOTRE_CLE" \
  -d '{"query":"{ commandes { id table statut lignes { produit quantite } } }"}'
```

Créer une commande :

```graphql
mutation {
  creerCommande(table: 3, lignes: [{ produit: "Express", quantite: 2 }]) {
    id
    statut
  }
}
```

Changer le statut :

```graphql
mutation {
  changerStatut(id: "1", statut: EN_PREPARATION) { id statut }
}
```

S'abonner aux changements (JavaScript, paquet `graphql-ws`) :

```js
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'ws://localhost:3000/graphql',
  connectionParams: { apiKey: 'VOTRE_CLE' },
});

client.subscribe(
  { query: 'subscription { commandeModifiee { id table statut } }' },
  { next: (message) => console.log(message.data), error: console.error, complete() {} },
);
```

L'abonnement reçoit la commande complète à chaque création et à chaque changement de statut. Une commande `PAYEE` doit être retirée de l'affichage côté client.

## Règles de validation

| Champ | Règle |
|---|---|
| `table` | Entier entre 1 et 10 |
| `lignes` | De 1 à 20 lignes |
| `lignes[].produit` | Texte non vide, 100 caractères au maximum |
| `lignes[].quantite` | Entier entre 1 et 50 |
| `statut` | Une valeur de l'énumération `Statut` |

## Erreurs

Les erreurs suivent le format GraphQL (`errors[].message` et `errors[].extensions.code`) :

| Code | Cas |
|---|---|
| `UNAUTHENTICATED` | Clé absente ou invalide |
| `BAD_USER_INPUT` | Données invalides (la liste détaillée est dans `extensions.erreurs`) |
| `NOT_FOUND` | Commande introuvable |
| `MENU_INDISPONIBLE` | L'API menu-board ne répond pas |

Les erreurs internes sont masquées (« Unexpected error. ») et journalisées côté serveur.
Limites HTTP : 300 requêtes par minute et par adresse (`429`), corps de 10 Ko au maximum (`413`).

## Déploiement

Les abonnements utilisent une connexion WebSocket permanente : **ils ne fonctionnent pas sur des fonctions serverless comme Vercel**. Hébergez l'API sur une plateforme qui garde un processus Node.js actif, par exemple **Render**, **Railway** ou **Fly.io** :

- commande de build : `npm install` ;
- commande de démarrage : `npm start` ;
- variables : `DATABASE_URL`, `API_KEY` (et `MENU_URL` si besoin).

Le port est fourni par la plateforme via la variable `PORT`.

## Structure

```
src/
├── server.js                 serveur HTTP + WebSocket, page d'accueil, limites
├── yoga.js                   serveur GraphQL (Yoga) et contexte d'authentification
├── schema/
│   ├── typeDefs.js           schéma GraphQL documenté
│   ├── resolvers.js          requêtes, mutations, abonnements
│   └── index.js              assemblage du schéma
├── pubsub.js                 diffusion des événements aux abonnés
├── auth.js                   vérification de la clé
├── limiteur.js               limite de débit
├── config.js                 configuration
├── db.js                     PostgreSQL : connexion, tables, transactions
├── services/
│   ├── commandes.service.js  lecture et écriture des commandes
│   └── menu.service.js       lecture du menu (cache d'une minute)
└── validation/
    └── commandes.validation.js
public/index.html             page de documentation
```

## Limites actuelles

- **Une seule instance** : les événements sont diffusés en mémoire. Avec plusieurs instances, il faudra un canal partagé (PostgreSQL `LISTEN/NOTIFY` ou Redis).
- **Clé partagée** par tout le personnel.
- **Produits par nom** et **prix non enregistrés** dans la commande.
- **Ordre des statuts non imposé** : tout statut valide est accepté.
