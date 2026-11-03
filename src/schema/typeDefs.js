// Schéma GraphQL. Les descriptions apparaissent dans la documentation de GraphiQL.
export const typeDefs = /* GraphQL */ `
  "Catégorie du menu (cafés, boissons, viennoiseries…)"
  type Categorie {
    id: ID!
    nom: String!
    "false si la catégorie est masquée sur le menu"
    visible: Boolean!
  }

  "Produit du menu"
  type Produit {
    id: ID!
    nom: String!
    "Prix en dinars"
    prix: Float!
    categorieId: ID!
    "false si le produit est masqué sur le menu"
    visible: Boolean!
  }

  "Menu lu depuis l'API menu-board (cache d'une minute)"
  type Menu {
    categories: [Categorie!]!
    produits: [Produit!]!
  }

  "Étape de préparation d'une commande"
  enum Statut {
    "Commande reçue, pas encore lancée"
    EN_ATTENTE
    "En cours de préparation en cuisine ou au bar"
    EN_PREPARATION
    "Prête à être servie"
    PRETE
    "Apportée à la table"
    SERVIE
    "Encaissée : n'apparaît plus dans la liste des commandes"
    PAYEE
  }

  type LigneCommande {
    "Nom du produit"
    produit: String!
    quantite: Int!
  }

  type Commande {
    id: ID!
    "Numéro de table (1 à 10)"
    table: Int!
    lignes: [LigneCommande!]!
    statut: Statut!
    "Date de création (ISO 8601)"
    creeeLe: String!
  }

  input LigneCommandeInput {
    "Nom du produit, 100 caractères au maximum"
    produit: String!
    "Entre 1 et 50"
    quantite: Int!
  }

  type Query {
    "Menu du salon"
    menu: Menu!
    "Commandes non payées, de la plus ancienne à la plus récente"
    commandes: [Commande!]!
    "Une commande par identifiant, ou null"
    commande(id: ID!): Commande
  }

  type Mutation {
    "Crée une commande (de 1 à 20 lignes)"
    creerCommande(table: Int!, lignes: [LigneCommandeInput!]!): Commande!
    "Change le statut d'une commande"
    changerStatut(id: ID!, statut: Statut!): Commande!
  }

  type Subscription {
    "Reçoit chaque commande créée ou modifiée, en temps réel (flux SSE)"
    commandeModifiee: Commande!
  }
`;