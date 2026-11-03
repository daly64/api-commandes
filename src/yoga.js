// Serveur GraphQL (requêtes et mutations en HTTP, GraphiQL comme documentation interactive)
import { createYoga } from 'graphql-yoga';
import { schema } from './schema/index.js';
import { cleValide } from './auth.js';

export const yoga = createYoga({
  schema,
  graphqlEndpoint: '/graphql',
  landingPage: false,
  graphiql: {
    title: 'API commandes',
    // Dans GraphiQL, les abonnements passent par SSE : cela fonctionne aussi sur Vercel
    subscriptionsProtocol: 'SSE',
  },
  // HTTP : en-tête X-Api-Key. WebSocket : connectionParams.apiKey
  context: ({ request, connectionParams }) => ({
    autorise: cleValide(request?.headers?.get('x-api-key') ?? connectionParams?.apiKey),
  }),
});
