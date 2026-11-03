# API commandes (GraphQL)

API de prise de commande pour le salon de thé. Elle reçoit les commandes des serveurs, suit leur préparation et diffuse chaque changement en temps réel par SSE. Le menu est lu depuis l'API `menu-board`. L'API est ouverte : il n'y a plus de clé d'accès.

- **Page d'affichage en direct** : `/` (liste et état des commandes)
- **Requêtes et mutations** : `POST /graphql`
- **Abonnements en SSE** : `POST /graphql` avec l'en-tête `Accept: text/event-stream`
- **Explorateur GraphiQL** : `/graphql` dans un navigateur

## Démarrage

```bash
npm install
npm start
```

Créez un fichier `.env` à partir de `.env.example` :

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL (Neon, version « pooled » possible) |
| `DATABASE_URL_DIRECT` | recommandée | Connexion **directe** à Neon (sans pooler), utilisée pour écouter les événements. À défaut, `DATABASE_URL` est utilisée |
| `DATABASE_SSL` | non | `false` uniquement pour une base locale (défaut : `true`) |
| `MENU_URL` | non | Adresse du menu (défaut : `https://menu-board-api-murex.vercel.app/menu`) |
| `PORT` | non | Port d'écoute (défaut : `3000`) |

Les tables sont créées automatiquement au premier appel.

## Schéma

```graphql
type Query {
  menu: Menu!                       # menu du salon
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
```

Le cycle d'une commande est `EN_ATTENTE` → `EN_PREPARATION` → `PRETE` → `SERVIE` → `PAYEE`. Une commande `PAYEE` n'apparaît plus dans `commandes`.

## Exemples

Lister les commandes en cours :

```bash
curl -X POST https://api-commandes-dun.vercel.app/graphql \
  -H "Content-Type: application/json" \
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
  -H "Content-Type: application/json" -H "Accept: text/event-stream" \
  -d '{"query":"subscription { commandeModifiee { id table statut } }"}'
```

Le client JavaScript de la page `/` lit ce flux avec `fetch` (l'objet `EventSource` ne permet pas d'envoyer un corps en POST). Le flux se ferme après la durée maximale de la fonction Vercel (300 s) : le client doit alors recharger `commandes` puis se réabonner.

## Diffusion entre instances

Chaque mutation publie un événement dans PostgreSQL (`NOTIFY commande_modifiee`). Chaque instance qui a des abonnés écoute ce canal (`LISTEN`) et relaie l'événement. Une commande créée sur une instance arrive donc aux abonnés de toutes les autres, ce qui est indispensable sur Vercel.
La connexion d'écoute n'est ouverte que tant qu'il y a des abonnés (fermeture 30 s après le départ du dernier), pour laisser la base Neon se mettre en veille.

## Règles de validation

| Champ | Règle |
|---|---|
| `table` | Entier entre 1 et 10 |
| `lignes` | De 1 à 20 lignes |
| `lignes[].produit` | Texte non vide, 100 caractères au maximum |
| `lignes[].quantite` | Entier entre 1 et 50 |

## Erreurs

Les erreurs suivent le format GraphQL (`errors[].message` et `errors[].extensions.code`) :

| Code | Cas |
|---|---|
| `BAD_USER_INPUT` | Données invalides (la liste détaillée est dans `extensions.erreurs`) |
| `NOT_FOUND` | Commande introuvable |
| `MENU_INDISPONIBLE` | L'API menu-board ne répond pas |

Les erreurs internes sont masquées et journalisées côté serveur.
Limites HTTP : 300 requêtes par minute et par adresse (`429`), corps de 10 Ko au maximum (`413`).

## Déploiement

### Vercel

`api/graphql.js` et `vercel.json` servent requêtes, mutations, abonnements SSE, GraphiQL et la page d'affichage (dossier `public/`). Variables à définir dans le projet : `DATABASE_URL` et, de préférence, `DATABASE_URL_DIRECT`.

### Serveur permanent

Sur une plateforme qui garde un processus Node.js actif (Render, Railway, Fly.io…) : build `npm install`, démarrage `npm start`, mêmes variables. Le port est fourni par la plateforme via `PORT`.

## Structure

```
api/graphql.js                fonction Vercel (HTTP + SSE)
public/index.html             page d'affichage des commandes en direct
src/
├── server.js                 serveur autonome : pages, GraphQL, protection
├── yoga.js                   serveur GraphQL (Yoga) et GraphiQL
├── protection.js             limite de débit et taille des requêtes
├── schema/                   schéma GraphQL et résolveurs
├── services/                 commandes (PostgreSQL) et menu
├── validation/               règles de validation
├── notification.js           publication des événements (pg_notify)
├── ecoute.js                 écoute PostgreSQL (LISTEN) et relais aux abonnés
├── pubsub.js                 diffusion locale aux abonnés SSE
├── db.js                     connexion PostgreSQL, tables, transactions
└── config.js                 configuration
```

## Limites actuelles

- **API ouverte** : quiconque connaît l'adresse peut lire et modifier les commandes. La limite de débit freine les abus sans les empêcher.
- **Limite de débit par instance** : sur Vercel, chaque instance compte ses requêtes séparément.
- **Produits par nom** et **prix non enregistrés** dans la commande.
- **Ordre des statuts non imposé** : tout statut valide est accepté.