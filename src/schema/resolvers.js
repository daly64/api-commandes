// Résolveurs : relient le schéma GraphQL aux services (base de données, menu)
import { GraphQLError } from 'graphql';
import { chargerMenu } from '../services/menu.service.js';
import { listerActives, lireCommande, creer, changerStatut } from '../services/commandes.service.js';
import { validerCommande } from '../validation/commandes.validation.js';
import { pubsub, EVENEMENT_COMMANDE } from '../pubsub.js';
import { notifierCommande } from '../notification.js';
import { abonner, avecLiberation } from '../ecoute.js';

function erreur(message, code, extensions = {}) {
  return new GraphQLError(message, { extensions: { code, ...extensions } });
}

// Les opérations sur les commandes exigent la clé d'accès
function exigerAcces(contexte) {
  if (!contexte.autorise) {
    throw erreur('Clé API invalide ou absente', 'UNAUTHENTICATED', { http: { status: 401 } });
  }
}

function idCommande(id) {
  const n = Number(id);
  if (!Number.isInteger(n) || n < 1) throw erreur('Commande introuvable', 'NOT_FOUND');
  return n;
}

export const resolvers = {
  // Correspondance entre l'énumération GraphQL et les valeurs stockées en base
  Statut: {
    EN_ATTENTE: 'en_attente',
    EN_PREPARATION: 'en_preparation',
    PRETE: 'prete',
    SERVIE: 'servie',
    PAYEE: 'payee',
  },

  Query: {
    menu: async () => {
      try {
        return await chargerMenu();
      } catch {
        throw erreur('Menu indisponible', 'MENU_INDISPONIBLE');
      }
    },

    commandes: (_parent, _args, contexte) => {
      exigerAcces(contexte);
      return listerActives();
    },

    commande: (_parent, { id }, contexte) => {
      exigerAcces(contexte);
      return lireCommande(idCommande(id));
    },
  },

  Mutation: {
    creerCommande: async (_parent, { table, lignes }, contexte) => {
      exigerAcces(contexte);
      const erreurs = validerCommande({ table, lignes });
      if (erreurs.length > 0) {
        throw erreur(erreurs.join(' ; '), 'BAD_USER_INPUT', { erreurs });
      }
      const commande = await creer({ table, lignes });
      // Diffusion via PostgreSQL : toutes les instances de l'API préviennent leurs abonnés
      await notifierCommande(commande.id);
      return commande;
    },

    changerStatut: async (_parent, { id, statut }, contexte) => {
      exigerAcces(contexte);
      const commande = await changerStatut(idCommande(id), statut);
      if (!commande) throw erreur('Commande introuvable', 'NOT_FOUND');
      await notifierCommande(commande.id);
      return commande;
    },
  },

  Subscription: {
    commandeModifiee: {
      // Fonctionne en SSE (HTTP) et en WebSocket. L'écoute PostgreSQL est ouverte au premier abonné.
      subscribe: async (_parent, _args, contexte) => {
        exigerAcces(contexte);
        const liberer = await abonner();
        return avecLiberation(pubsub.subscribe(EVENEMENT_COMMANDE), liberer);
      },
      resolve: (commande) => commande,
    },
  },
};
