// Serveur GraphQL (Yoga) : requêtes, mutations et abonnements en SSE, explorateur GraphiQL
import { createSchema, createYoga } from 'graphql-yoga';
import { typeDefs } from './schema/typeDefs.js';
import { resolvers } from './schema/resolvers.js';

export const yoga = createYoga({
  schema: createSchema({ typeDefs, resolvers }),
  graphqlEndpoint: '/graphql',
  landingPage: false,
  graphiql: {
    title: 'API commandes',
    subscriptionsProtocol: 'SSE',
  },
});