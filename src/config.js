// Configuration centralisée : tout ce qui peut changer selon l'environnement est ici.
// Les valeurs sensibles (DATABASE_URL, API_KEY) viennent du fichier .env ou des variables Vercel, jamais du code.
export const DATABASE_URL = process.env.DATABASE_URL;
export const API_KEY = process.env.API_KEY;
export const PORT = process.env.PORT ?? 3000;
export const MENU_URL = process.env.MENU_URL ?? 'https://menu-board-api-murex.vercel.app/menu';
export const NOMBRE_TABLES = 10;
export const STATUTS = ['en_attente', 'en_preparation', 'prete', 'servie', 'payee'];
