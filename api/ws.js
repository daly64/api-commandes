// Fonction Vercel : abonnements GraphQL en WebSocket natif (protocole graphql-ws).
// Adresse : wss://<domaine>/api/ws — la clé est envoyée dans connectionParams.apiKey.
// Vercel ferme chaque connexion à la durée maximale de la fonction : le client doit se reconnecter.
import http from 'node:http';
import { brancherWebSocket } from '../src/websocket.js';

const serveur = http.createServer((req, res) => {
  // Une requête HTTP ordinaire n'a rien à faire ici
  res.writeHead(426, { 'Content-Type': 'application/json; charset=utf-8', Upgrade: 'websocket' });
  res.end(JSON.stringify({
    errors: [{ message: 'Cette adresse accepte uniquement les connexions WebSocket (protocole graphql-ws).' }],
  }));
});

brancherWebSocket(serveur);

export default serveur;
