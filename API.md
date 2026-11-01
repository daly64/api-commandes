# API commandes

API de prise de commande pour le salon de thé. Elle reçoit les commandes des serveurs, les transmet à la cuisine et au bar, et fournit le menu affiché sur l'interface.

**Adresse de base** : `http://localhost:3000` en local (variable `PORT` pour changer le port).

Toutes les données échangées sont au format JSON (`Content-Type: application/json`).

**Authentification** : les routes `/api/commandes` exigent l'en-tête `X-Api-Key`, dont la valeur est celle de la variable `API_KEY`. Une clé absente ou fausse renvoie `401`. Le menu (`/api/menu`) reste public.

**Débit** : 300 requêtes par minute et par adresse. Au-delà, l'API renvoie `429 Too Many Requests`.

---

## Sommaire

- [Démarrage](#démarrage)
- [Endpoints](#endpoints)
  - [GET /api/menu](#get-apimenu)
  - [GET /api/commandes](#get-apicommandes)
  - [POST /api/commandes](#post-apicommandes)
  - [PATCH /api/commandes/:id/statut](#patch-apicommandesidstatut)
- [Statuts d'une commande](#statuts-dune-commande)
- [Règles de validation](#règles-de-validation)
- [Erreurs](#erreurs)
- [Configuration](#configuration)
- [Limites actuelles](#limites-actuelles)

---

## Démarrage

```bash
npm install
npm start
```

Avant de lancer le serveur, créez un fichier `.env` à la racine du projet (modèle : `.env.example`) avec :

- `DATABASE_URL` : la chaîne de connexion PostgreSQL fournie par Neon ;
- `API_KEY` : une longue chaîne aléatoire, à transmettre au personnel.

Le fichier `.env` n'est jamais versionné. Les tables de la base sont créées automatiquement au premier appel.

Puis ouvrir `http://localhost:3000` pour l'interface. Pour appeler l'API directement, joignez la clé d'accès :

```bash
curl -H "X-Api-Key: votre-cle" http://localhost:3000/api/commandes
```

---

## Endpoints

### GET /api/menu

Renvoie les catégories du menu, chacune avec ses produits. Les données viennent de l'API `menu-board`, avec un cache d'une minute.

**Réponse `200 OK`**

```json
{
  "categories": [
    { "id": "6", "nom": "cafes", "visible": true }
  ],
  "produits": [
    { "id": "14", "nom": "Express", "prix": 2, "categorieId": "6", "visible": true }
  ]
}
```

| Champ | Type | Description |
|---|---|---|
| `categories[].id` | string | Identifiant de la catégorie |
| `categories[].nom` | string | Nom affiché |
| `categories[].visible` | boolean | `false` si la catégorie est masquée |
| `produits[].id` | string | Identifiant du produit |
| `produits[].nom` | string | Nom affiché |
| `produits[].prix` | number | Prix (en dinars) |
| `produits[].categorieId` | string | Catégorie du produit |
| `produits[].visible` | boolean | `false` si le produit est masqué |

**Réponse `502 Bad Gateway`** : l'API `menu-board` est injoignable ou a renvoyé une erreur.

```json
{ "erreur": "Menu indisponible (statut 500)" }
```

---

### GET /api/commandes

Renvoie les commandes **non payées**, de la plus ancienne à la plus récente.

**Réponse `200 OK`**

```json
[
  {
    "id": 1,
    "table": 3,
    "lignes": [{ "produit": "Thé vert", "quantite": 2 }],
    "statut": "en_attente",
    "creeeLe": "2026-11-01T18:42:10.512Z"
  }
]
```

Une liste vide est renvoyée sous la forme `[]`.

---

### POST /api/commandes

Crée une commande pour une table.

**Corps de la requête**

```json
{
  "table": 3,
  "lignes": [
    { "produit": "Thé vert", "quantite": 2 },
    { "produit": "Croissant", "quantite": 1 }
  ]
}
```

| Champ | Type | Obligatoire | Description |
|---|---|---|---|
| `table` | entier | oui | Numéro de table, entre 1 et 10 |
| `lignes` | tableau | oui | De 1 à 20 lignes |
| `lignes[].produit` | string | oui | Nom du produit, non vide |
| `lignes[].quantite` | entier | oui | Entre 1 et 50 |

**Réponse `201 Created`** : la commande créée, avec `statut: "en_attente"`.

```json
{
  "id": 2,
  "table": 3,
  "lignes": [
    { "produit": "Thé vert", "quantite": 2 },
    { "produit": "Croissant", "quantite": 1 }
  ],
  "statut": "en_attente",
  "creeeLe": "2026-11-01T18:45:03.120Z"
}
```

**Réponse `400 Bad Request`** : une ou plusieurs règles ne sont pas respectées. Toutes les erreurs sont listées.

```json
{ "erreurs": ["table doit être un entier entre 1 et 10"] }
```

---

### PATCH /api/commandes/:id/statut

Modifie le statut d'une commande.

**Paramètre d'URL** : `id`, l'identifiant de la commande (entier).

**Corps de la requête**

```json
{ "statut": "en_preparation" }
```

**Réponse `200 OK`** : la commande modifiée.

**Réponse `400 Bad Request`** : statut absent ou inconnu.

```json
{ "erreur": "Statut invalide" }
```

**Réponse `404 Not Found`** : aucune commande ne correspond à cet identifiant.

```json
{ "erreur": "Commande introuvable" }
```

---

## Statuts d'une commande

| Statut | Signification |
|---|---|
| `en_attente` | Commande reçue, pas encore lancée |
| `en_preparation` | En cours de préparation en cuisine ou au bar |
| `prete` | Prête à être servie |
| `servie` | Apportée à la table |
| `payee` | Encaissée. La commande n'apparaît plus dans `GET /api/commandes` |

Le cycle normal est `en_attente → en_preparation → prete → servie → payee`. Pour l'instant, l'API accepte **n'importe quel statut valide** à chaque modification ; l'ordre n'est pas imposé.

---

## Règles de validation

| Champ | Règle |
|---|---|
| `table` | Entier entre 1 et 10 |
| `lignes` | Tableau de 1 à 20 éléments |
| `lignes[].produit` | Texte non vide (les espaces en début et fin sont retirés) |
| `lignes[].quantite` | Entier entre 1 et 50 |
| `lignes[].produit` (taille) | 100 caractères au maximum |
| `lignes` (nombre) | 20 lignes au maximum |
| `statut` | Une des valeurs de la section [Statuts](#statuts-dune-commande) |

---

## Erreurs

| Code | Quand |
|---|---|
| `400` | Données invalides (validation échouée) |
| `401` | Clé d'accès absente ou invalide |
| `404` | Commande introuvable |
| `429` | Trop de requêtes dans la minute |
| `502` | Menu indisponible (`GET /api/menu` uniquement) |

Le corps d'erreur contient soit `erreurs` (liste de messages), soit `erreur` (un message).

---

## Configuration

Variables d'environnement facultatives :

| Variable | Valeur par défaut | Rôle |
|---|---|---|
| `DATABASE_URL` | (obligatoire) | Chaîne de connexion PostgreSQL fournie par Neon |
| `API_KEY` | (obligatoire) | Clé d'accès du personnel, envoyée dans l'en-tête `X-Api-Key` |
| `PORT` | `3000` | Port d'écoute en local |
| `MENU_URL` | `https://menu-board-api-murex.vercel.app/menu` | Adresse du menu |
| `VERCEL` | (absente) | Si définie, le serveur ne démarre pas et l'app est exportée |

Les constantes `NOMBRE_TABLES` et `STATUTS` sont dans `src/config.js`.

---

## Limites actuelles

- **Base de données** : les commandes sont stockées dans PostgreSQL (Neon). Le menu, lui, est toujours lu depuis l'API `menu-board`.
- **Produits par nom** : une ligne désigne le produit par son nom, pas par son identifiant. Un renommage du produit dans le menu ne met pas à jour les commandes existantes.
- **Pas de contrôle des transitions** : un statut peut être changé vers n'importe quelle valeur valide.
- **Clé partagée** : tout le personnel utilise la même clé. Elle se révoque en changeant `API_KEY`, mais elle ne permet pas de savoir qui a fait quoi. Une connexion individuelle sera nécessaire si l'équipe grandit.
- **Prix non enregistrés** : le prix n'est pas copié dans la commande, il faudra l'ajouter avec la base de données.
