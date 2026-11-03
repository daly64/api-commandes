// Point d'entrée : serveur HTTP (GraphQL + page d'accueil) et serveur WebSocket (abonnements)
import 'dotenv/config';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { yoga } from './yoga.js';
import { cleValide } from './auth.js';
import { creerLimiteur } from './limiteur.js';
import { API_KEY, PORT, LIMITE_DEBIT, TAILLE_MAX_CORPS } from './config.js';

const pageAccueil = await readFile(new URL('../public/index.html', import.meta.url));
const depasseLimite = creerLimiteur(LIMITE_DEBIT, 60_000);

// Adresse du client ; derrière un hébergeur, elle arrive dans X-Forwarded-For
function adresse(req) {
  const transmise = req.headers['x-forwarded-for'];
  return (typeof transmise === 'string' && transmise.split(',')[0].trim()) || req.socket.remoteAddress || 'inconnue';
}

function repondreErreur(res, statut, message) {
  res.writeHead(statut, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ errors: [{ message }] }));
}

const serveur = createServer((req, res) => {
  // Page d'accueil : documentation de l'API
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(pageAccueil);
  }

  if (depasseLimite(adresse(req))) {
    return repondreErreur(res, 429, 'Trop de requêtes, réessayez dans une minute');
  }

  if (Number(req.headers['content-length'] ?? 0) > TAILLE_MAX_CORPS) {
    return repondreErreur(res, 413, 'Requête trop volumineuse');
  }

  return yoga(req, res);
});

// Abonnements GraphQL sur WebSocket (protocole graphql-ws), à la même adresse que l'API : /graphql
const serveurWs = new WebSocketServer({ server: serveur, path: yoga.graphqlEndpoint });

useServer(
  {
    // La clé est vérifiée dès la connexion ; sans clé valide, la connexion est fermée (code 4403)
    onConnect: (ctx) => cleValide(ctx.connectionParams?.apiKey),
    execute: (args) => args.rootValue.execute(args),
    subscribe: (args) => args.rootValue.subscribe(args),
    onSubscribe: async (ctx, message) => {
      const { schema, execute, subscribe, contextFactory, parse, validate } = yoga.getEnveloped({
        ...ctx,
        req: ctx.extra.request,
        socket: ctx.extra.socket,
        params: message.payload,
      });

      const args = {
        schema,
        operationName: message.payload.operationName,
        document: parse(message.payload.query),
        variableValues: message.payload.variables,
        contextValue: await contextFactory(),
        rootValue: { execute, subscribe },
      };

      const erreurs = validate(args.schema, args.document);
      if (erreurs.length > 0) return erreurs;
      return args;
    },
  },
  serveurWs,
);

if (!API_KEY) {
  console.warn('Attention : API_KEY absente, toutes les opérations sur les commandes seront refusées.');
}

serveur.listen(PORT, () => {
  console.log(`API commandes (GraphQL) : http://localhost:${PORT}/graphql`);
  console.log(`Abonnements WebSocket   : ws://localhost:${PORT}/graphql`);
});
