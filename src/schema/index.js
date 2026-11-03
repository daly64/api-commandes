// Assemble le schéma exécutable à partir des types et des résolveurs
import { createSchema } from 'graphql-yoga';
import { typeDefs } from './typeDefs.js';
import { resolvers } from './resolvers.js';

export const schema = createSchema({ typeDefs, resolvers });
