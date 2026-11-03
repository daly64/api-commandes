// Protection HTTP commune : limite de débit par adresse et taille maximale du corps
import { LIMITE_DEBIT, TAILLE_MAX_CORPS } from './config.js';

const DUREE_FENETRE_MS = 60_000;
const compteurs = new Map();
// Remise à zéro à chaque fenêtre ; unref() n'empêche pas le processus de s'arrêter
setInterval(() => compteurs.clear(), DUREE_FENETRE_MS).unref();

// Adresse du client ; derrière un hébergeur, elle arrive dans X-Forwarded-For
function adresse(req) {
  const transmise = req.headers['x-forwarded-for'];
  return (typeof transmise === 'string' && transmise.split(',')[0].trim()) || req.socket?.remoteAddress || 'inconnue';
}

function depasseDebit(cle) {
  const total = (compteurs.get(cle) ?? 0) + 1;
  compteurs.set(cle, total);
  return total > LIMITE_DEBIT;
}

// Renvoie true si la requête est refusée ; la réponse d'erreur est alors déjà envoyée
export function refuserSiExcessive(req, res) {
  let statut;
  let message;
  if (depasseDebit(adresse(req))) {
    statut = 429;
    message = 'Trop de requêtes, réessayez dans une minute';
  } else if (Number(req.headers['content-length'] ?? 0) > TAILLE_MAX_CORPS) {
    statut = 413;
    message = 'Requête trop volumineuse';
  } else {
    return false;
  }
  res.writeHead(statut, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ errors: [{ message }] }));
  return true;
}