// Point d'entrée : charge le fichier .env, démarre le serveur en local ; sur Vercel, l'app est exportée
import 'dotenv/config';
import app from './app.js';
import { PORT } from './config.js';

export default app;

if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`API commandes : http://localhost:${PORT}`));
}
