// Fonction Vercel : requêtes et mutations GraphQL en HTTP, explorateur GraphiQL.
// Les abonnements WebSocket ne fonctionnent pas sur Vercel : ils exigent le serveur permanent (npm start).
import { yoga } from '../src/yoga.js';
import { creerLimiteur } from '../src/limiteur.js';
import { LIMITE_DEBIT, TAILLE_MAX_CORPS } from '../src/config.js';

const depasseLimite = creerLimiteur(LIMITE_DEBIT, 60_000);

function repondreErreur(res, statut, message) {
  res.statusCode = statut;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify({ errors: [{ message }] }));
}

export default function handler(req, res) {
  const transmise = req.headers['x-forwarded-for'];
  const adresse = (typeof transmise === 'string' && transmise.split(',')[0].trim()) || 'inconnue';

  if (depasseLimite(adresse)) {
    return repondreErreur(res, 429, 'Trop de requêtes, réessayez dans une minute');
  }
  if (Number(req.headers['content-length'] ?? 0) > TAILLE_MAX_CORPS) {
    return repondreErreur(res, 413, 'Requête trop volumineuse');
  }

  // Vercel peut transmettre /api/graphql ou /graphql : on ramène l'adresse à celle attendue par Yoga
  const { search } = new URL(req.url, 'http://localhost');
  req.url = yoga.graphqlEndpoint + search;
  return yoga(req, res);
}
