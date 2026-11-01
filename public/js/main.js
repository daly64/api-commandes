// Point d'entrée de l'interface : charge le menu, affiche les commandes, rafraîchit
import { api, ErreurAcces, enregistrerCle } from './api.js';
import { afficherCommandes } from './commandes.js';
import { initFormulaire, majMenu } from './formulaire.js';

const INTERVALLE_MS = 3000;

const liste = document.getElementById('liste');
const etat = document.getElementById('etat');
const acces = document.getElementById('acces');
const champCle = document.getElementById('cle');

let menuCharge = false;

async function rafraichir() {
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
    acces.hidden = true;
    if (menuCharge) etat.textContent = '';
  } catch (erreur) {
    if (erreur instanceof ErreurAcces) {
      acces.hidden = false;
      etat.textContent = 'Accès requis';
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
  bouton.disabled = true;
  try {
    await api.changerStatut(bouton.dataset.id, bouton.dataset.statut);
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
