// Serveur autonome : GraphQL (requêtes, mutations, abonnements SSE) et page d'affichage des commandes
import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { yoga } from './yoga.js';
import { refuserSiExcessive } from './protection.js';
import { PORT } from './config.js';

const pageAffichage = await readFile(new URL('../public/index.html', import.meta.url));

const serveur = createServer((req, res) => {
  const chemin = (req.url ?? '/').split('?')[0];
  if (req.method === 'GET' && (chemin === '/' || chemin === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(pageAffichage);
  }

  if (refuserSiExcessive(req, res)) return;

  return yoga(req, res);
});

serveur.listen(PORT, () => {
  console.log(`API commandes : http://localhost:${PORT}/ (affichage) et /graphql (GraphQL)`);
});