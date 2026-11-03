// Configuration centralisée : tout ce qui peut changer selon l'environnement est ici.
// Les valeurs sensibles (DATABASE_URL, API_KEY) viennent du fichier .env ou de l'hébergeur, jamais du code.
export const DATABASE_URL = process.env.DATABASE_URL;
// SSL obligatoire pour Neon ; « false » uniquement pour une base locale de développement
export const DATABASE_SSL = process.env.DATABASE_SSL !== 'false';
export const API_KEY = process.env.API_KEY;
export const PORT = Number(process.env.PORT ?? 3000);
export const MENU_URL = process.env.MENU_URL ?? 'https://menu-board-api-murex.vercel.app/menu';

export const NOMBRE_TABLES = 10;
export const STATUTS = ['en_attente', 'en_preparation', 'prete', 'servie', 'payee'];

// Protection du serveur HTTP
export const LIMITE_DEBIT = 300;             // requêtes par minute et par adresse
export const TAILLE_MAX_CORPS = 10 * 1024;   // octets
