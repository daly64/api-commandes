// Connexion à PostgreSQL (Neon) et création des tables au premier usage
import pg from 'pg';
import { DATABASE_URL, DATABASE_SSL } from './config.js';

if (!DATABASE_URL) {
  throw new Error('DATABASE_URL manquante : ajoutez-la dans le fichier .env ou dans les variables de l\'hébergeur');
}

// Neon impose une connexion chiffrée (SSL) ; elle peut être désactivée pour une base locale
const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_SSL ? { rejectUnauthorized: true } : false,
  max: 5,
});

// « IF NOT EXISTS » : sans effet si les tables existent déjà
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS commande (
    id SERIAL PRIMARY KEY,
    table_numero INTEGER NOT NULL CHECK (table_numero BETWEEN 1 AND 10),
    statut TEXT NOT NULL DEFAULT 'en_attente'
      CHECK (statut IN ('en_attente', 'en_preparation', 'prete', 'servie', 'payee')),
    cree_le TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS ligne_commande (
    id SERIAL PRIMARY KEY,
    commande_id INTEGER NOT NULL REFERENCES commande(id) ON DELETE CASCADE,
    produit TEXT NOT NULL,
    quantite INTEGER NOT NULL CHECK (quantite > 0)
  );
`;

// Le schéma est créé une seule fois, à la première utilisation de la base
let schemaPret = null;
export function assurerSchema() {
  schemaPret ??= pool.query(SCHEMA).catch((erreur) => {
    schemaPret = null; // on réessaiera à la prochaine requête
    throw erreur;
  });
  return schemaPret;
}

export async function requete(texte, valeurs = []) {
  await assurerSchema();
  return pool.query(texte, valeurs);
}

// Exécute plusieurs requêtes dans une même transaction : tout ou rien
export async function transaction(fonction) {
  await assurerSchema();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultat = await fonction(client);
    await client.query('COMMIT');
    return resultat;
  } catch (erreur) {
    await client.query('ROLLBACK');
    throw erreur;
  } finally {
    client.release();
  }
}

// Ferme les connexions (arrêt propre du serveur)
export function fermer() {
  return pool.end();
}
