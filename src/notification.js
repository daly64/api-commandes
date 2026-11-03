// Publication des événements dans PostgreSQL : chaque instance de l'API qui écoute le canal les reçoit
import { requete } from './db.js';

export const CANAL = 'commande_modifiee';

// Signale qu'une commande a été créée ou modifiée. Une erreur ici ne doit pas faire échouer la mutation.
export async function notifierCommande(id) {
  try {
    await requete('SELECT pg_notify($1, $2)', [CANAL, String(id)]);
  } catch (erreur) {
    console.error('[notification] envoi impossible :', erreur.message);
  }
}
