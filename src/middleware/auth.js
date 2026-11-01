// Vérifie la clé d'accès envoyée dans l'en-tête X-Api-Key
import { timingSafeEqual } from 'node:crypto';
import { API_KEY } from '../config.js';

// Comparaison en temps constant : le temps de réponse ne révèle pas la clé
function identiques(a, b) {
  const tamponA = Buffer.from(a);
  const tamponB = Buffer.from(b);
  return tamponA.length === tamponB.length && timingSafeEqual(tamponA, tamponB);
}

export function exigerCleApi(req, res, next) {
  // Sans clé configurée, on refuse tout : on échoue en mode fermé
  if (!API_KEY) {
    return res.status(500).json({ erreur: 'Clé API non configurée sur le serveur' });
  }
  const fournie = req.get('X-Api-Key') ?? '';
  if (!identiques(fournie, API_KEY)) {
    return res.status(401).json({ erreur: 'Clé API invalide ou absente' });
  }
  next();
}
