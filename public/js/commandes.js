// Affichage de la liste des commandes en cours
import { echapper } from './utils.js';

const LIBELLES = {
  en_attente: 'En attente',
  en_preparation: 'En préparation',
  prete: 'Prête',
  servie: 'Servie',
  payee: 'Payée',
};

const SUIVANT = {
  en_attente: 'en_preparation',
  en_preparation: 'prete',
  prete: 'servie',
  servie: 'payee',
};

const ACTION = {
  en_attente: 'Démarrer',
  en_preparation: 'Marquer prête',
  prete: 'Marquer servie',
  servie: 'Marquer payée',
};

// Annulation possible uniquement tant que la commande est en attente
const ANNULABLE = ['en_attente'];

function carte(commande) {
  const id = echapper(commande.id);
  const actions = [];

  if (SUIVANT[commande.statut]) {
    actions.push(
      `<button class="principal" data-id="${id}" data-statut="${SUIVANT[commande.statut]}">${ACTION[commande.statut]}</button>`,
    );
  }
  if (ANNULABLE.includes(commande.statut)) {
    actions.push(`<button class="danger" data-action="annuler" data-id="${id}">Annuler</button>`);
  }

  const produits = commande.lignes
    .map((l) => `${echapper(l.quantite)} × ${echapper(l.produit)}`)
    .join('<br>');

  return `
    <article class="commande">
      <header><strong>Table ${echapper(commande.table)}</strong> <span class="statut">· ${LIBELLES[commande.statut]}</span></header>
      <p>${produits}</p>
      <div class="actions">${actions.join('')}</div>
    </article>`;
}

export function afficherCommandes(conteneur, commandes) {
  if (commandes.length === 0) {
    conteneur.textContent = 'Aucune commande en cours.';
    return;
  }
  conteneur.innerHTML = commandes.map(carte).join('');
}
