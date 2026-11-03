// Vérification de la clé d'accès du personnel (HTTP : en-tête X-Api-Key ; WebSocket : connectionParams.apiKey)
import { timingSafeEqual } from 'node:crypto';
import { API_KEY } from './config.js';

// Comparaison en temps constant : le temps de réponse ne révèle pas la clé.
// Sans clé configurée sur le serveur, tout est refusé (mode fermé).
export function cleValide(fournie) {
  if (!API_KEY || typeof fournie !== 'string') return false;
  const tamponFourni = Buffer.from(fournie);
  const tamponAttendu = Buffer.from(API_KEY);
  return tamponFourni.length === tamponAttendu.length && timingSafeEqual(tamponFourni, tamponAttendu);
}
