// Création de l'application Express : sécurité, fichiers statiques, routes et gestion d'erreurs
import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import commandesRouter from './routes/commandes.routes.js';
import menuRouter from './routes/menu.routes.js';

const app = express();

// Derrière le proxy de Vercel, on lit l'adresse réelle du client pour le limiteur de débit
app.set('trust proxy', 1);

// En-têtes de sécurité (helmet) et taille maximale du corps des requêtes
app.use(helmet());
app.use(express.json({ limit: '10kb' }));

// Limite de débit par adresse : 300 requêtes par minute, large pour plusieurs tablettes sur le même Wi-Fi
app.use(
  '/api',
  rateLimit({
    windowMs: 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
);

app.use(express.static(fileURLToPath(new URL('../public', import.meta.url))));

app.use('/api/commandes', commandesRouter);
app.use('/api/menu', menuRouter);

// Erreurs : corps mal formé ou trop grand -> 400 ; autre erreur -> 500 sans détails techniques
app.use((erreur, req, res, next) => {
  if (erreur.type === 'entity.parse.failed' || erreur.type === 'entity.too.large') {
    return res.status(400).json({ erreur: 'Requête invalide' });
  }
  console.error(erreur);
  res.status(500).json({ erreur: 'Erreur serveur' });
});

export default app;
