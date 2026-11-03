# API commandes (GraphQL)

API de prise de commande pour le salon de thé. Elle reçoit les commandes des serveurs, suit leur préparation et diffuse chaque changement en temps réel. Le menu est lu depuis l'API `menu-board`.

- **Requêtes et mutations** : `POST /graphql`
- **Abonnements en SSE** : `POST /graphql` avec l'en-tête `Accept: text/event-stream` (fonctionne sur Vercel)
- **Abonnements en WebSocket** : `wss://…/api/ws`, protocole `graphql-ws` (WebSocket natif Vercel, en bêta chez Vercel ; le serveur autonome l'accepte aussi sur `/graphql`)
- **Explorateur GraphiQL** : `/graphql` dans un navigateur
- **Page de test interactive** : `/test.html`
- **Documentation** : `/`

## Démarrage

```bash
npm install
npm start
```

Créez d'abord un fichier `.env` à partir de `.env.example` :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL (Neon, version « pooled » possible) |
| `API_KEY` | oui | Clé d'accès du personnel |
| `DATABASE_URL_DIRECT` | recommandée en production | Connexion **directe** à Neon (sans pooler), utilisée pour écouter les événements. À défaut, `DATABASE_URL` est utilisée |
| `DATABASE_SSL` | non | `false` uniquement pour une base locale (défaut : `true`) |
| `MENU_URL` | non | Adresse du menu (défaut : `https://menu-board-api-murex.vercel.app/menu`) |
| `PORT` | non | Port d'écoute (défaut : `3000`) |

Les tables sont créées automatiquement au premier appel.

## Page de test

`/test.html` permet de tout essayer depuis un navigateur : saisie de la clé, chargement du menu, création d'une commande, changement de statut, et abonnement en direct avec un journal des événements. Ouvrez-la sur deux appareils : une commande créée sur l'un apparaît aussitôt dans le journal de l'autre.

## Authentification

| Canal | Où mettre la clé |
|---|---|
| HTTP et SSE | En-tête `X-Api-Key: VOTRE_CLE` |
| WebSocket | Paramètre de connexion `{ "apiKey": "VOTRE_CLE" }` |

Le menu est public. Toutes les opérations sur les commandes exigent la clé.
Sans clé valide : erreur `UNAUTHENTICATED` (y compris dans un flux SSE) ; connexion WebSocket fermée avec le code `4403`.
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
curl -X POST https://api-commandes-dun.vercel.app/graphql \
  -H "Content-Type: application/json" -H "X-Api-Key: VOTRE_CLE" \
  -d '{"query":"{ commandes { id table statut lignes { produit quantite } } }"}'
```

Créer une commande, puis changer son statut :

```graphql
mutation {
  creerCommande(table: 3, lignes: [{ produit: "Express", quantite: 2 }]) { id statut }
}

mutation {
  changerStatut(id: "1", statut: EN_PREPARATION) { id statut }
}
```

S'abonner en SSE (le flux reste ouvert ; chaque événement arrive sous forme de ligne `data:`) :

```bash
curl -N -X POST https://api-commandes-dun.vercel.app/graphql \
  -H "Content-Type: application/json" -H "Accept: text/event-stream" -H "X-Api-Key: VOTRE_CLE" \
  -d '{"query":"subscription { commandeModifiee { id table statut } }"}'
```

En JavaScript, utilisez `fetch` avec ces en-têtes (voir `/test.html`) ou la librairie `graphql-sse`. L'objet `EventSource` des navigateurs ne permet pas d'envoyer la clé.

S'abonner en WebSocket (paquet `graphql-ws`) :

```js
import { createClient } from 'graphql-ws';

const client = createClient({
  url: 'wss://api-commandes-dun.vercel.app/api/ws',
  connectionParams: { apiKey: 'VOTRE_CLE' },
});

client.subscribe(
  { query: 'subscription { commandeModifiee { id table statut } }' },
  { next: (message) => console.log(message.data), error: console.error, complete() {} },
);
```

Sans librairie, le protocole `graphql-transport-ws` se résume à : ouvrir la connexion avec ce sous-protocole, envoyer `{"type":"connection_init","payload":{"apiKey":"…"}}`, attendre `connection_ack`, envoyer `{"id":"1","type":"subscribe","payload":{"query":"subscription { … }"}}`, puis lire les messages `next`. Répondre `{"type":"pong"}` à chaque `ping`.

L'abonnement reçoit la commande complète à chaque création et à chaque changement de statut. Une commande `PAYEE` doit être retirée de l'affichage côté client. Après une reconnexion, relisez `commandes` pour ne rien manquer.

## Diffusion entre instances

Chaque mutation publie un événement dans PostgreSQL (`NOTIFY commande_modifiee`). Chaque instance de l'API qui a des abonnés écoute ce canal (`LISTEN`) et relaie l'événement. Une commande créée sur une instance arrive donc aux abonnés de toutes les autres, ce qui est indispensable sur Vercel.
La connexion d'écoute n'est ouverte que tant qu'il y a des abonnés (fermeture 30 s après le départ du dernier), pour laisser la base Neon se mettre en veille.

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
Limites HTTP : 300 requêtes par minute et par adresse (`429`), corps de 10 Ko au maximum (`413`). Messages WebSocket : 16 Ko au maximum.

## Déploiement

### Vercel (configuration actuelle)

`api/graphql.js` et `vercel.json` servent requêtes, mutations, **abonnements SSE**, GraphiQL et les pages statiques. Variables à définir dans le projet Vercel : `DATABASE_URL`, `API_KEY` et, de préférence, `DATABASE_URL_DIRECT`.
`api/ws.js` sert les **abonnements WebSocket natifs** de Vercel (bêta publique, Fluid Compute requis) à l'adresse `/api/ws`.
Un flux SSE comme une connexion WebSocket dure au plus la durée maximale d'une fonction (300 s ici) : les clients doivent se reconnecter automatiquement, ce que font la page de test et l'application Android. Le serveur envoie un signal de vie toutes les 25 s et ferme les connexions mortes.

### Serveur permanent (SSE + WebSocket)

Sur une plateforme qui garde un processus Node.js actif (Render, Railway, Fly.io…) : build `npm install`, démarrage `npm start`, mêmes variables. Le port est fourni par la plateforme via `PORT`.

## Structure

```
api/graphql.js                fonction Vercel (HTTP + SSE)
api/ws.js                     fonction Vercel (WebSocket natif)
src/
├── server.js                 serveur autonome : HTTP, SSE, WebSocket, pages, limites
├── websocket.js              abonnements WebSocket (graphql-ws), signal de vie
├── yoga.js                   serveur GraphQL (Yoga) et contexte d'authentification
├── schema/                   schéma, résolveurs, assemblage
├── notification.js           publication des événements (pg_notify)
├── ecoute.js                 écoute PostgreSQL (LISTEN) et relais aux abonnés
├── pubsub.js                 diffusion locale aux abonnés
├── auth.js                   vérification de la clé
├── limiteur.js               limite de débit
├── config.js                 configuration
├── db.js                     PostgreSQL : connexion, tables, transactions
├── services/                 commandes et menu
└── validation/               règles de validation
public/
├── index.html                documentation
└── test.html                 page de test interactive
```

## Limites actuelles

- **Clé partagée** par tout le personnel ; changer `API_KEY` ne coupe pas les flux déjà ouverts.
- **Produits par nom** et **prix non enregistrés** dans la commande.
- **Ordre des statuts non imposé** : tout statut valide est accepté.
- **Limite de débit par instance** : sur Vercel, chaque instance compte ses requêtes séparément.
