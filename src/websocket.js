// Abonnements GraphQL en WebSocket (protocole graphql-ws), partagés entre le serveur autonome et Vercel
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { yoga } from './yoga.js';
import { cleValide } from './auth.js';

const TAILLE_MAX_MESSAGE = 16 * 1024;   // la valeur par défaut de la librairie ws est de 100 Mo
const INTERVALLE_SIGNAL_MS = 25_000;    // signal de vie, pour détecter les connexions mortes

// Attache un serveur WebSocket à un serveur HTTP Node. Sans « chemin », toutes les adresses sont acceptées.
export function brancherWebSocket(serveurHttp, chemin) {
  const serveurWs = new WebSocketServer({
    server: serveurHttp,
    maxPayload: TAILLE_MAX_MESSAGE,
    ...(chemin ? { path: chemin } : {}),
  });

  // Signal de vie : une connexion qui ne répond pas entre deux signaux est fermée
  serveurWs.on('connection', (socket) => {
    socket.vivante = true;
    socket.on('pong', () => {
      socket.vivante = true;
    });
  });
  const minuteur = setInterval(() => {
    for (const socket of serveurWs.clients) {
      if (!socket.vivante) {
        socket.terminate();
        continue;
      }
      socket.vivante = false;
      socket.ping();
    }
  }, INTERVALLE_SIGNAL_MS);
  minuteur.unref?.();
  serveurWs.on('close', () => clearInterval(minuteur));

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

  return serveurWs;
}
