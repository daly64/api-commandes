// Canal de diffusion des événements vers les abonnés SSE.
// En mémoire : valable pour une seule instance du serveur.
import { createPubSub } from 'graphql-yoga';

export const EVENEMENT_COMMANDE = 'commandeModifiee';
export const pubsub = createPubSub();
