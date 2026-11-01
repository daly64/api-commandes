// Toute la communication avec l'API passe par ce fichier
async function requete(url, options = {}) {
  const reponse = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json' },
  });
  const donnees = await reponse.json().catch(() => ({}));
  if (!reponse.ok) {
    const messages = donnees.erreurs ?? [donnees.erreur ?? `Erreur ${reponse.status}`];
    throw new Error(messages.join(' ; '));
  }
  return donnees;
}

export const api = {
  menu: () => requete('/api/menu'),
  commandes: () => requete('/api/commandes'),
  creerCommande: (corps) => requete('/api/commandes', { method: 'POST', body: JSON.stringify(corps) }),
  changerStatut: (id, statut) =>
    requete(`/api/commandes/${id}/statut`, { method: 'PATCH', body: JSON.stringify({ statut }) }),
};
