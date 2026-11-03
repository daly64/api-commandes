// Logique métier des commandes, stockées dans PostgreSQL (Neon)
import { requete, transaction } from '../db.js';

// Ramène une ligne SQL au format de l'API
function versApi(ligne) {
  return {
    id: ligne.id,
    table: ligne.table_numero,
    lignes: ligne.lignes,
    statut: ligne.statut,
    creeeLe: ligne.cree_le.toISOString(),
  };
}

// Une commande et ses lignes, regroupées en un seul résultat
const SELECT_COMMANDES = `
  SELECT c.id, c.table_numero, c.statut, c.cree_le,
         COALESCE(
           json_agg(json_build_object('produit', l.produit, 'quantite', l.quantite) ORDER BY l.id)
             FILTER (WHERE l.id IS NOT NULL),
           '[]'
         ) AS lignes
  FROM commande c
  LEFT JOIN ligne_commande l ON l.commande_id = c.id
`;

// Renvoie la commande, ou null si elle n'existe pas
export async function lireCommande(id) {
  const { rows } = await requete(`${SELECT_COMMANDES} WHERE c.id = $1 GROUP BY c.id`, [id]);
  return rows[0] ? versApi(rows[0]) : null;
}

// Commandes non payées, de la plus ancienne à la plus récente
export async function listerActives() {
  const { rows } = await requete(
    `${SELECT_COMMANDES} WHERE c.statut <> 'payee' GROUP BY c.id ORDER BY c.cree_le, c.id`,
  );
  return rows.map(versApi);
}

export async function creer({ table, lignes }) {
  // La commande et ses lignes sont enregistrées ensemble, ou pas du tout
  const id = await transaction(async (client) => {
    const { rows } = await client.query(
      'INSERT INTO commande (table_numero) VALUES ($1) RETURNING id',
      [table],
    );
    const commandeId = rows[0].id;

    for (const ligne of lignes) {
      await client.query(
        'INSERT INTO ligne_commande (commande_id, produit, quantite) VALUES ($1, $2, $3)',
        [commandeId, ligne.produit.trim(), ligne.quantite],
      );
    }
    return commandeId;
  });

  return lireCommande(id);
}

// Renvoie la commande modifiée, ou null si elle n'existe pas
export async function changerStatut(id, statut) {
  const { rowCount } = await requete('UPDATE commande SET statut = $2 WHERE id = $1', [id, statut]);
  if (rowCount === 0) return null;
  return lireCommande(id);
}
