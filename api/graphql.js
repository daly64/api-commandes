// Fonction Vercel : requêtes, mutations et abonnements SSE, explorateur GraphiQL
import { yoga } from '../src/yoga.js';
import { refuserSiExcessive } from '../src/protection.js';

export default function handler(req, res) {
  if (refuserSiExcessive(req, res)) return;

  // Vercel peut transmettre /api/graphql ou /graphql : on ramène l'adresse à celle attendue par Yoga
  const { search } = new URL(req.url, 'http://localhost');
  req.url = yoga.graphqlEndpoint + search;
  return yoga(req, res);
}