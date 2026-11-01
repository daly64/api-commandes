// Point d'entrée de l'interface : vérifie la clé, charge le menu, affiche les commandes, rafraîchit
import { api, ErreurAcces, cleEnregistree, enregistrerCle, effacerCle } from './api.js';
import { afficherCommandes } from './commandes.js';
import { initFormulaire, majMenu } from './formulaire.js';

const INTERVALLE_MS = 3000;

const liste = document.getElementById('liste');
const etat = document.getElementById('etat');
const acces = document.getElementById('acces');
const champCle = document.getElementById('cle');
const sectionsContenu = document.querySelectorAll('.contenu');

let menuCharge = false;

// Sans clé valide, seul le champ de saisie est visible
function afficherAcces() {
  sectionsContenu.forEach((s) => (s.hidden = true));
  acces.hidden = false;
}

function afficherContenu() {
  acces.hidden = true;
  sectionsContenu.forEach((s) => (s.hidden = false));
}

async function rafraichir() {
  // Aucune requête tant qu'aucune clé n'a été saisie
  if (!cleEnregistree()) {
    afficherAcces();
    return;
  }

  // Le menu est rechargé à chaque cycle tant qu'il n'a pas réussi une fois
  if (!menuCharge) {
    try {
      majMenu(await api.menu());
      menuCharge = true;
    } catch {
      etat.textContent = 'Menu indisponible';
    }
  }

  try {
    afficherCommandes(liste, await api.commandes());
    afficherContenu();
    if (menuCharge) etat.textContent = '';
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      effacerCle();
      afficherAcces();
      etat.textContent = 'Clé refusée';
    } else {
      etat.textContent = 'Connexion perdue, nouvelle tentative…';
    }
  }
}

document.getElementById('valider-cle').addEventListener('click', () => {
  const cle = champCle.value.trim();
  if (!cle) return;
  enregistrerCle(cle);
  champCle.value = '';
  rafraichir();
});

// Actions de statut : délégation d'événement sur la liste
liste.addEventListener('click', async (e) => {
  const bouton = e.target.closest('button[data-id]');
  if (!bouton) return;
  if (bouton.dataset.action === 'annuler' && !confirm('Annuler cette commande ?')) return;
  bouton.disabled = true;
  try {
    if (bouton.dataset.action === 'annuler') {
      await api.annulerCommande(bouton.dataset.id);
    } else {
      await api.changerStatut(bouton.dataset.id, bouton.dataset.statut);
    }
  } catch (erreur) {
    etat.textContent = erreur.message;
  }
  rafraichir();
});

initFormulaire(rafraichir);
rafraichir();
setInterval(rafraichir, INTERVALLE_MS);

// En arrière-plan, le navigateur suspend les minuteurs : on recharge au retour sur la page
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') rafraichir();
});
