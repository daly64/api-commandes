// Toute la communication avec l'API passe par ce fichier
const CLE_STOCKEE = 'cleApi';

// Erreur levée quand la clé d'accès est absente ou refusée
export class ErreurAcces extends Error {}

export function enregistrerCle(cle) {
  sessionStorage.setItem(CLE_STOCKEE, cle);
}

async function requete(url, options = {}, { securisee = false } = {}) {
  const entetes = { 'Content-Type': 'application/json' };
  if (securisee) {
    entetes['X-Api-Key'] = sessionStorage.getItem(CLE_STOCKEE) ?? '';
  }

  const reponse = await fetch(url, { ...options, headers: entetes });
  const donnees = await reponse.json().catch(() => ({}));

  if (reponse.status === 401) {
    throw new ErreurAcces(donnees.erreur ?? 'Clé refusée');
  }
  if (!reponse.ok) {
    const messages = donnees.erreurs ?? [donnees.erreur ?? `Erreur ${reponse.status}`];
    throw new Error(messages.join(' ; '));
  }
  return donnees;
}

export const api = {
  menu: () => requete('/api/menu'),
  commandes: () => requete('/api/commandes', {}, { securisee: true }),
  creerCommande: (corps) =>
    requete('/api/commandes', { method: 'POST', body: JSON.stringify(corps) }, { securisee: true }),
  changerStatut: (id, statut) =>
    requete(
      `/api/commandes/${id}/statut`,
      { method: 'PATCH', body: JSON.stringify({ statut }) },
      { securisee: true },
    ),
};
